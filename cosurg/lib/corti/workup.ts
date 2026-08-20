import { advance, getDisposition, getNode } from "@/lib/tree/engine";
import { treeSource } from "@/lib/tree/loader";
import type {
  AnsweredStep,
  DecisionTree,
  Disposition,
  Lang,
  SessionState,
  TreeNode,
} from "@/lib/tree/types";
import { INTERPRETER_SPEC, askAgent, ensureAgent } from "./agent";
import { MODELS, kaldModelJson } from "./models";

/**
 * Udredning i samtalen: træet holder op med at være en brugerflade og bliver
 * agentens protokol.
 *
 * En patientbeskrivelse skifter aldrig skærm. Den starter et gennemløb af det
 * samme kliniske træ som før — men spørgsmålene stilles i chatten, ét ad
 * gangen, og alt det lægen ALLEREDE har sagt er besvaret før første spørgsmål
 * stilles. "50-årig mand med brandsår på hele armen" har allerede svaret på
 * lokalisation; at spørge om den igen er forskellen på en formular og en
 * kollega.
 *
 * DETERMINISMEN OVERLEVER FLYTNINGEN — det er hele pointen med modulet:
 *
 * - Modellen må kun ét: oversætte lægens ord til en værdi nodens svarskema
 *   i forvejen tillader. Værdien valideres mod skemaet FØR motoren ser den;
 *   en værdi skemaet ikke kender, kasseres som ubesvaret.
 * - Hvor gennemløbet lander — næste node, rødt flag, disposition — afgøres af
 *   `lib/tree/engine.ts` alene: et opslag i kanter skrevet af plastikkirurger.
 * - Tilstanden bæres af klienten som en liste (nodeId, value) og GENAFSPILLES
 *   gennem motoren på hvert kald. En klient kan derfor ikke teleportere sig
 *   til en disposition: en sti motoren ikke selv ville have gået, afvises.
 */

/* ------------------------------------------------------------------ */
/* Klient-tilstanden og genafspilningen                                */
/* ------------------------------------------------------------------ */

/**
 * Det klienten sender tilbage pr. tur. Bevidst minimalt — resten genafspilles.
 *
 * `pending` er svar lægen HAR givet, men som gennemløbet endnu ikke er nået
 * frem til. "50-årig mand med brandsår på hele armen" besvarer lokalisationen
 * fem trin før lokalisations-noden — kasserede vi det, ville vi spørge om
 * noget lægen lige har fortalt, og det er hele forskellen på en formular og
 * en kollega. Svarene forbruges automatisk når gennemløbet når frem, og et
 * nyere udsagn om samme node vinder altid over et gammelt.
 */
export interface WorkupKlientState {
  treeId: string;
  path: Array<{ nodeId: string; value: string; rawAnswer?: string }>;
  pending?: UdtrukketSvar[];
}

const MAX_STI = 40;
const MAX_PENDING = 20;

/** Valider klientens workup-felt strukturelt. Indholdet prøves i genafspilningen. */
export function validerWorkup(raw: unknown): WorkupKlientState | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  if (typeof o.treeId !== "string" || !o.treeId) return null;
  if (!Array.isArray(o.path) || o.path.length > MAX_STI) return null;

  const path: WorkupKlientState["path"] = [];
  for (const entry of o.path) {
    const s = (entry ?? {}) as Record<string, unknown>;
    if (typeof s.nodeId !== "string" || typeof s.value !== "string") return null;
    path.push({
      nodeId: s.nodeId.slice(0, 64),
      value: s.value.slice(0, 64),
      rawAnswer: typeof s.rawAnswer === "string" ? s.rawAnswer.slice(0, 300) : undefined,
    });
  }

  const pending: UdtrukketSvar[] = [];
  if (Array.isArray(o.pending)) {
    for (const entry of o.pending.slice(0, MAX_PENDING)) {
      const s = (entry ?? {}) as Record<string, unknown>;
      if (typeof s.nodeId !== "string" || typeof s.value !== "string") continue;
      pending.push({
        nodeId: s.nodeId.slice(0, 64),
        value: s.value.slice(0, 64),
        quote: typeof s.quote === "string" ? s.quote.slice(0, 200) : undefined,
      });
    }
  }
  return { treeId: o.treeId.slice(0, 64), path, pending };
}

/**
 * Genafspil klientens sti gennem motoren.
 *
 * Returnerer null hvis stien ikke er en sti motoren selv ville have gået —
 * forkert node-rækkefølge, ugyldig værdi, skridt efter en disposition. Det er
 * værnet der gør klient-båret tilstand forsvarlig: serveren stoler aldrig på
 * klientens påstand om HVOR den er, kun på dens svar — og kun de gyldige.
 */
export function genafspil(
  tree: DecisionTree,
  klient: WorkupKlientState,
  lang: Lang,
): SessionState | null {
  let state: SessionState = {
    treeId: tree.id,
    lang,
    currentNodeId: tree.rootNodeId,
    path: [],
    dispositionId: null,
    redFlags: [],
  };

  for (const skridt of klient.path) {
    if (!state.currentNodeId || state.currentNodeId !== skridt.nodeId) return null;
    const node = getNode(tree, skridt.nodeId);
    if (!node || !erGyldigVaerdi(node, skridt.value)) return null;
    state = advance(tree, state, skridt.value, skridt.rawAnswer ?? skridt.value).state;
  }
  return state;
}

/** Er værdien én nodens svarskema faktisk tillader? Skemaet bestemmer — altid. */
export function erGyldigVaerdi(node: TreeNode, value: string): boolean {
  if (node.answerType === "number") {
    const num = Number(value);
    if (Number.isNaN(num)) return false;
    if (node.min !== undefined && num < node.min) return false;
    if (node.max !== undefined && num > node.max) return false;
    return true;
  }
  if (node.answerType === "step") return value === "next";
  return (node.options ?? []).some((o) => o.value === value);
}

/* ------------------------------------------------------------------ */
/* Udtræk: hvad har lægen ALLEREDE svaret på?                          */
/* ------------------------------------------------------------------ */

export interface UdtrukketSvar {
  nodeId: string;
  value: string;
  /** Lægens egne ord der bar svaret — vises som "fra din beskrivelse". */
  quote?: string;
}

const UDTRAEK_SYSTEM = [
  "You extract answers from ONE clinician utterance for a clinical decision protocol.",
  "You are given the protocol's questions with their allowed machine values.",
  "",
  "Reply with ONLY a JSON object, no prose and no code fence:",
  '{"answers":[{"nodeId":"...","value":"...","quote":"the clinician\'s own words that answered it"}]}',
  "",
  "THE RULES — the safe direction is to leave a question unanswered:",
  "- Fill a value ONLY when the clinician's words state it explicitly. Certainty, not plausibility.",
  "- ABSENCE IS NOT 'no'. That the clinician did not mention soot does not answer the inhalation question.",
  "- NEVER infer numbers. 'The whole arm' is not a TBSA percentage — only an actually stated number counts,",
  "  and only if it plainly refers to what the question asks.",
  "- The word 'burn'/'brandsår' alone does NOT answer a mechanism question. Flame, scald, contact, chemical and",
  "  electrical are different mechanisms, and 'burn' names none of them.",
  "- Use only the allowed machine values listed for each question. Synonym hints show which words map to which value.",
  "- A value may come from any part of the utterance — the clinician often answers several questions in one breath.",
  "- If nothing is answered, return {\"answers\":[]}. That is a correct and common result.",
].join("\n");

function nodeBeskrivelse(node: TreeNode, lang: Lang): string {
  const linjer = [`nodeId: ${node.id}`, `question: ${node.question[lang]}`];
  if (node.answerType === "number") {
    linjer.push(
      `allowed: a number${node.unit ? ` in ${node.unit}` : ""}${
        node.min !== undefined ? `, ${node.min}-${node.max}` : ""
      } (digits only)`,
    );
  } else {
    const opts = (node.options ?? [])
      .map((o) => {
        const syn = [...(o.synonyms?.da ?? []), ...(o.synonyms?.en ?? [])];
        return `"${o.value}" (${o.label[lang]}${syn.length ? `; hints: ${syn.join(", ")}` : ""})`;
      })
      .join(", ");
    linjer.push(`allowed: ${opts}`);
  }
  return linjer.join("\n");
}

/**
 * Ét Models-kald: hvilke af disse noder besvarer ytringen ALLEREDE?
 *
 * Bruges to steder med samme regler: ved starten (hele træet — spørg aldrig om
 * noget lægen lige har fortalt) og pr. tur (den aktuelle node plus resten —
 * "dyb dermal, og den er cirkulær" besvarer to noder i én mundfuld).
 *
 * Alt valideres mod svarskemaet bagefter; modellens output er et FORSLAG, og
 * skemaet er dommeren. Fejler kaldet, returneres tom liste — så stilles
 * spørgsmålene bare ét ad gangen, hvilket er langsommere men aldrig forkert.
 */
export async function udtraekSvar(
  utterance: string,
  nodes: TreeNode[],
  lang: Lang,
  signal?: AbortSignal,
): Promise<UdtrukketSvar[]> {
  if (nodes.length === 0) return [];
  try {
    const raw = await kaldModelJson<{ answers?: unknown }>({
      model: MODELS.triage,
      system: UDTRAEK_SYSTEM,
      user: [
        `The clinician (${lang === "da" ? "Danish" : "English"}) said:`,
        `"${utterance}"`,
        "",
        "The protocol's open questions:",
        ...nodes.map((n) => `---\n${nodeBeskrivelse(n, lang)}`),
        "",
        "Return the JSON object now.",
      ].join("\n"),
      maxTokens: 500,
      timeoutMs: 8_000,
      signal,
    });

    if (!Array.isArray(raw.answers)) return [];
    const svar: UdtrukketSvar[] = [];
    for (const entry of raw.answers) {
      const o = (entry ?? {}) as Record<string, unknown>;
      if (typeof o.nodeId !== "string" || typeof o.value !== "string") continue;
      const node = nodes.find((n) => n.id === o.nodeId);
      // Skemaet er dommeren: en værdi noden ikke tillader, er ikke et svar.
      if (!node || !erGyldigVaerdi(node, o.value.trim())) continue;
      svar.push({
        nodeId: o.nodeId,
        value: o.value.trim(),
        quote: typeof o.quote === "string" ? o.quote.slice(0, 200) : undefined,
      });
    }
    return svar;
  } catch {
    return [];
  }
}

/**
 * Reserven når Models ikke kunne afgøre svaret: Cortis agent-fortolker, samme
 * spec som `/api/interpret` bruger. Langsommere (en agent-rundtur), men den
 * har kørt hele produktets levetid — og en udredning der går i stå fordi ét
 * Models-kald fejlede, ville være et tilbageskridt fra træ-visningen.
 *
 * Returnerer enten et valideret svar, en opklaring at stille lægen, eller
 * ingenting — og ingenting betyder "spørg igen med nodens eget spørgsmål".
 */
export async function fortolkAktuelNode(
  node: TreeNode,
  utterance: string,
  lang: Lang,
): Promise<{ svar?: UdtrukketSvar; clarification?: string }> {
  try {
    const agentId = await ensureAgent(INTERPRETER_SPEC);
    const { result } = await askAgent<{
      value?: unknown;
      needsClarification?: unknown;
      clarificationQuestion?: unknown;
    }>(
      agentId,
      [
        `Question asked (${lang}): ${node.question[lang]}`,
        `Answer type: ${node.answerType}`,
        `Allowed values:\n${nodeBeskrivelse(node, lang)}`,
        `Clinician's answer: "${utterance}"`,
        "",
        "Map it to exactly one allowed value with submit_answer. If unclear, set needsClarification=true",
        `and give clarificationQuestion in ${lang === "da" ? "Danish" : "English"}.`,
      ].join("\n"),
    );

    if (result.needsClarification === true) {
      return {
        clarification:
          typeof result.clarificationQuestion === "string"
            ? result.clarificationQuestion.slice(0, 300)
            : undefined,
      };
    }
    const value = typeof result.value === "string" ? result.value.trim() : "";
    if (value && erGyldigVaerdi(node, value)) {
      return { svar: { nodeId: node.id, value } };
    }
    return {};
  } catch {
    return {};
  }
}

/* ------------------------------------------------------------------ */
/* Trævalg                                                             */
/* ------------------------------------------------------------------ */

/**
 * Hvilket træ passer til beskrivelsen? Models vælger blandt de træer der
 * findes, eller siger "none" — og "none" respekteres: så bliver det en
 * almindelig samtale i stedet for en forkert udredning.
 */
export async function vaelgTrae(
  utterance: string,
  lang: Lang,
  signal?: AbortSignal,
): Promise<DecisionTree | null> {
  const oversigt = await treeSource.list();
  // Procedureguider (step-træer) er ikke udredninger — dem åbner man med vilje.
  const kandidater: DecisionTree[] = [];
  for (const t of oversigt) {
    const trae = await treeSource.get(t.id);
    if (trae && trae.nodes.some((n) => n.answerType !== "step")) kandidater.push(trae);
  }
  if (kandidater.length === 0) return null;

  try {
    const raw = await kaldModelJson<{ treeId?: unknown }>({
      model: MODELS.triage,
      system: [
        "A clinician described a patient. Pick which assessment protocol fits, or none.",
        'Reply with ONLY {"treeId":"..."} using one of the listed ids, or {"treeId":"none"}.',
        "Pick a protocol only when the description clearly belongs to it. When unsure: none.",
      ].join("\n"),
      user: [
        `The clinician said: "${utterance}"`,
        "",
        "Protocols:",
        ...kandidater.map(
          (t) => `- id "${t.id}": ${t.name[lang]}${t.description ? ` — ${t.description[lang]}` : ""}`,
        ),
      ].join("\n"),
      maxTokens: 100,
      timeoutMs: 6_000,
      signal,
    });
    if (typeof raw.treeId !== "string") return null;
    return kandidater.find((t) => t.id === raw.treeId) ?? null;
  } catch {
    return null;
  }
}

/* ------------------------------------------------------------------ */
/* Fremdrift gennem træet                                              */
/* ------------------------------------------------------------------ */

export interface FremdriftsResultat {
  state: SessionState;
  /** Røde flag udløst under DENNE fremrykning, i rækkefølge. */
  redFlags: Array<{ nodeId: string; message: string }>;
  /** De skridt der blev taget nu — til "fra din beskrivelse"-visningen. */
  taget: AnsweredStep[];
}

/**
 * Ryk frem gennem alle noder svarene dækker, i motorens rækkefølge.
 *
 * Svar på noder gennemløbet aldrig når frem til (fx væske-noden når TBSA < 20)
 * bruges ikke — kanten bestemmer vejen, ikke svarlisten.
 */
export function rykFrem(
  tree: DecisionTree,
  state: SessionState,
  svar: UdtrukketSvar[],
  fallbackRaw: string,
): FremdriftsResultat {
  const map = new Map(svar.map((s) => [s.nodeId, s]));
  const redFlags: FremdriftsResultat["redFlags"] = [];
  const foer = state.path.length;

  let nu = state;
  while (nu.currentNodeId && map.has(nu.currentNodeId)) {
    const s = map.get(nu.currentNodeId)!;
    const node = getNode(tree, nu.currentNodeId);
    // Skemaet prøves også her: pending-svar kommer fra klienten og kan i
    // princippet være manipuleret. En ugyldig værdi standser bare gennemløbet.
    if (!node || !erGyldigVaerdi(node, s.value)) break;
    const r = advance(tree, nu, s.value, s.quote ?? fallbackRaw);
    if (r.redFlag) redFlags.push(r.redFlag);
    nu = r.state;
  }
  return { state: nu, redFlags, taget: nu.path.slice(foer) };
}

/**
 * De svar der IKKE blev forbrugt af gennemløbet — dem klienten skal huske til
 * næste tur. Kun gyldige værdier for noder der stadig er ubesvarede.
 */
export function restSvar(tree: DecisionTree, state: SessionState, svar: UdtrukketSvar[]): UdtrukketSvar[] {
  const besvarede = new Set(state.path.map((s) => s.nodeId));
  const set = new Set<string>();
  return svar
    .filter((s) => {
      if (besvarede.has(s.nodeId) || set.has(s.nodeId)) return false;
      const node = getNode(tree, s.nodeId);
      if (!node || !erGyldigVaerdi(node, s.value)) return false;
      set.add(s.nodeId);
      return true;
    })
    .slice(0, MAX_PENDING);
}

/**
 * Skøn over det samlede antal spørgsmål: de besvarede plus vejen fra den
 * aktuelle node til nærmeste disposition ad førstevalgs-kanter. Et ærligt
 * skøn — træet forgrener, så tallet kan ændre sig undervejs, og det siger
 * kontrakten også.
 */
export function fremskridt(tree: DecisionTree, state: SessionState): { answered: number; total: number } {
  let rest = 0;
  let id = state.currentNodeId;
  const set = new Set<string>();
  while (id && !set.has(id) && rest < 20) {
    set.add(id);
    const node = getNode(tree, id);
    if (!node) break;
    rest += 1;
    const naeste = node.edges.find((e) => e.when === "*") ?? node.edges[0];
    id = naeste && !getDisposition(tree, naeste.goto) ? naeste.goto : null;
  }
  return { answered: state.path.length, total: state.path.length + rest };
}

/* ------------------------------------------------------------------ */
/* Byggesten til SSE-begivenhederne                                    */
/* ------------------------------------------------------------------ */

export interface WorkupSpoergsmaal {
  nodeId: string;
  question: string;
  answerType: TreeNode["answerType"];
  options?: Array<{ value: string; label: string }>;
  unit?: string;
  help?: string;
}

export function somSpoergsmaal(node: TreeNode, lang: Lang): WorkupSpoergsmaal {
  return {
    nodeId: node.id,
    question: node.question[lang],
    answerType: node.answerType,
    options: node.options?.map((o) => ({ value: o.value, label: o.label[lang] })),
    unit: node.unit,
    help: node.help?.[lang],
  };
}

export interface DispositionUd {
  dispositionId: string;
  severity: Disposition["severity"];
  title: string;
  guidance: string;
  sources: string[];
}

export function somDisposition(disp: Disposition, lang: Lang): DispositionUd {
  return {
    dispositionId: disp.id,
    severity: disp.severity,
    title: disp.title[lang],
    guidance: disp.guidance[lang],
    sources: disp.sources ?? [],
  };
}

/**
 * Patientkontekst til opslag undervejs: de besvarede trin som læselig tekst.
 * Det er den kontekst der gør "hvor meget væske?" konkret — og den bygges af
 * serveren fra den genafspillede sti, ikke af klientens frie tekst.
 */
export function somPatientKontekst(tree: DecisionTree, state: SessionState, lang: Lang): string {
  return state.path
    .map((s) => {
      const node = getNode(tree, s.nodeId);
      const label =
        node?.options?.find((o) => o.value === s.value)?.label[lang] ?? s.value;
      return `${s.question} ${label}`;
    })
    .join("\n");
}

/** Kilden et rødt flag og en disposition hviler på: træets navngivne forfattere. */
export function traeKilde(tree: DecisionTree): string {
  return tree.authors?.join("; ") ?? tree.id;
}
