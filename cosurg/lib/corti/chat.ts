import { CORTI_API_BASE, cortiHeaders, getAccessToken } from "./auth";

/**
 * Den kliniske chat: et frit spørgsmål ind, et KILDEBELAGT svar ud.
 *
 * Forskellen på denne agent og resten af CoSurg er hvor viden kommer fra.
 * Beslutningstræet er skrevet af klinikere og eksekveres deterministisk. Chatten
 * kan ikke bruge træet — spørgsmålet er frit — så den næstbedste garanti er at
 * agenten ikke svarer af hukommelsen: den SKAL slå op i Cortis registry-eksperter
 * (PubMed først) og aflevere sit svar sammen med de kilder svaret hviler på.
 *
 * Derfor er `sources` et påkrævet felt i schema-connectoren, og `evidence` siger
 * hvor stærkt belægget er. Kan agenten ikke belægge et svar, skal den sige det —
 * en ærlig "det kan jeg ikke belægge" er brugbar, et flydende gæt er farligt.
 *
 * Mønstret (ensureAgent + struktureret output via schema-connector med
 * transition: "complete") er det samme som i lib/corti/agent.ts. Det er skrevet
 * ud her frem for genbrugt direkte, fordi `AgentSpec` i agent.ts kun rummer
 * schema-connectorer — chatten har også registry- og MCP-connectorer.
 */

/** En agent der fanger ud til flere eksperter er langsom: målt 35-70 s pr. svar. */
const CHAT_TIMEOUT_MS = 180_000;

/** Hvor lang tids stilstand der får os til at gensende et resumé til agenten. */
export const CONTEXT_STALE_MS = 10 * 60_000;

/**
 * Hvor stærkt svaret står.
 *
 * `extrapolated` er tilføjet fordi "ingen dækning" ikke må være enden på
 * samtalen. En læge der spørger om noget vi ikke har en retningslinje for,
 * står stadig med en patient — og så er det rigtige svar ikke tavshed, men et
 * fagligt ræsonnement der er MÆRKET som ræsonnement. Det er hele forskellen:
 * et blandet svar uden mærkat er farligere end intet svar, fordi man så ikke
 * kan vurdere hvor meget man tør stole på det.
 */
export type Evidence =
  /** Hver klinisk påstand er dækket af en vedlagt kilde. */
  | "sourced"
  /** Kernen er belagt; dele er ikke. */
  | "partial"
  /** Ingen retningslinje dækker spørgsmålet. Svaret er litteratur plus ræsonnement. */
  | "extrapolated"
  /** Der kunne ikke svares fagligt forsvarligt. */
  | "unsupported";

/** Hvor kilden kom fra. De to vejer ikke ens for en dansk kliniker. */
export type SourceOrigin =
  /** CoSurgs egen kuraterede vidensbase — dansk praksis, ordret. */
  | "knowledge-base"
  /** Litteratur og guidelines hentet af Cortis eksperter. */
  | "literature";

export interface ChatSource {
  title: string;
  /** PMID, NCT-nummer eller anden stabil identifikator, når kilden har en. */
  identifier?: string;
  url?: string;
  /** Hvad præcis i svaret denne kilde understøtter. */
  supports: string;
  origin?: SourceOrigin;
}

export interface ChatAnswer {
  answer: string;
  evidence: Evidence;
  /**
   * Den del af svaret der IKKE står i en kilde: almen faglig ræsonneren, ofte
   * anvendt på det lægen har fortalt om patienten. Vises for sig selv og
   * mærket, aldrig blandet ind i det belagte.
   */
  reasoning?: string;
  /** Brugte agenten det lægen tidligere har fortalt om denne patient? */
  usedContext?: boolean;
  limitations?: string;
  /** Kort udgave til oplæsning — hele svaret læst højt er ubrugeligt hands-free. */
  spokenSummary?: string;
  /**
   * 2-4 korte forslag til lægens NÆSTE replik — sandsynlige svar på det
   * spørgsmål svaret slutter med, eller det naturlige næste kliniske skridt.
   * Vises som chips man kan trykke på; teksten sendes som lægens egen besked.
   * Samtalen må aldrig ende blindt i et enkeltstående opslag-svar.
   */
  suggestions?: string[];
  sources: ChatSource[];
}

export type ChatEvent =
  | { kind: "context"; contextId: string }
  | { kind: "progress"; expert: string | null; text: string }
  | { kind: "answer"; answer: ChatAnswer }
  | { kind: "error"; message: string };

type Connector =
  | { type: "registry"; name: string; config?: Record<string, unknown> }
  | { type: "mcp"; name: string; url: string; auth?: { type: "none" | "bearer" } }
  | {
      type: "schema";
      name: string;
      description: string;
      transition: "complete";
      schema: Record<string, unknown>;
    };

/**
 * Registry-eksperterne. Verificeret mod `GET /v2/agentic/registry/connectors` med
 * vores egne credentials 20/8 — alle fire findes i vores tenant.
 *
 * PubMed er den vigtige: den henter rigtige citationer med PMID. De øvrige er
 * med fordi et brandsårsspørgsmål ofte er et regnestykke (Parkland), et
 * guideline-opslag der er nyere end litteraturen, eller et spørgsmål om
 * igangværende studier.
 */
const REGISTRY_EXPERTS: Connector[] = [
  { type: "registry", name: "pubmed-expert" },
  { type: "registry", name: "web-search-expert" },
  { type: "registry", name: "medical-calculator-expert" },
  { type: "registry", name: "clinical-trials-expert" },
];

/** Navnet connectoren får hos Corti. Samme navn som på teamets egen agent. */
const MCP_CONNECTOR_NAME = "cosurg-viden";

/**
 * Teamets egen MCP-server: den kuraterede danske brandsårsviden (brandsaar.dk
 * og PlastSurgeon-materialet). Den er grunden til at chatten kan svare med
 * dansk praksis og et ordret citat, hvor PubMed kun kan give international
 * litteratur.
 *
 * Serveren autentificerer med et token i STIEN, ikke i en header — derfor
 * bygges URL'en af MCP_URL + MCP_AUTH_TOKEN, præcis som connectoren er
 * registreret på `cosurg-clinical-expert`. COSURG_MCP_URL er en udvej hvis
 * nogen skal pege et andet sted hen uden at røre kode.
 *
 * Findes serveren ikke, kører chatten videre på registry-eksperterne alene.
 * En vidensbase der er nede må gøre svaret fattigere, ikke slå chatten ihjel.
 */
function mcpConnectors(): Connector[] {
  const explicit = process.env.COSURG_MCP_URL?.trim();
  const base = process.env.MCP_URL?.trim().replace(/\/+$/, "");
  const token = process.env.MCP_AUTH_TOKEN?.trim();

  const url = explicit || (base && token ? `${base}/${token}` : undefined);
  if (!url) return [];
  return [{ type: "mcp", name: MCP_CONNECTOR_NAME, url }];
}

const ANSWER_CONNECTOR: Connector = {
  type: "schema",
  name: "submit_clinical_answer",
  description:
    "Submit the final answer together with the sources it rests on. This is the only way to answer.",
  transition: "complete",
  schema: {
    type: "object",
    properties: {
      answer: {
        type: "string",
        description:
          "The clinical answer in the requested language. Plain text with '- ' bullets and **bold** where it helps. No headings.",
      },
      evidence: {
        type: "string",
        enum: ["sourced", "partial", "extrapolated", "unsupported"],
        description:
          "'sourced': every clinical claim is backed by a listed source. 'partial': the core is sourced but parts are not. 'extrapolated': no guideline or study answers this directly, so the answer rests on related literature plus clinical reasoning — put that reasoning in the 'reasoning' field. 'unsupported': you could not answer responsibly at all.",
      },
      reasoning: {
        type: "string",
        description:
          "The part of the answer that is NOT in any source: general clinical reasoning, and how it applies to what the clinician has told you about THIS patient earlier in the conversation. Leave empty when every claim is sourced. Never put a sourced claim here, and never put reasoning in 'answer' without repeating it here.",
      },
      usedContext: {
        type: "boolean",
        description:
          "True if you used what the clinician told you earlier in this conversation (age, mechanism, area, comorbidity) to make the answer specific.",
      },
      limitations: {
        type: "string",
        description:
          "What this answer does NOT establish: conflicting evidence, missing local guidelines, weak study designs. Empty only if there are none.",
      },
      spokenSummary: {
        type: "string",
        description:
          "At most 3 sentences and 400 characters, same language, meant to be read aloud to a clinician whose hands are busy. No markdown, no citations.",
      },
      suggestions: {
        type: "array",
        items: { type: "string" },
        description:
          "2-4 short options for what the clinician most plausibly SAYS next, phrased in their own words in the same language (2-6 words each). If your answer ends with a question, these are the likely answers to it (e.g. 'Ja, kun overfladisk' / 'Nej, den er cirkulær'). Otherwise the natural next clinical ask (e.g. 'Hvordan forbinder jeg det?' / 'Hvad med smertedækning?'). Never commands to yourself, never headlines.",
      },
      sources: {
        type: "array",
        description:
          "One entry per source actually retrieved and used. Never invent a source, a PMID or a URL. Empty only when nothing at all was retrieved.",
        items: {
          type: "object",
          properties: {
            title: { type: "string", description: "Title as returned by the expert." },
            identifier: { type: "string", description: "PMID, NCT number or similar, as returned." },
            url: { type: "string", description: "URL as returned by the expert." },
            supports: {
              type: "string",
              description: "Which specific claim in the answer this source supports.",
            },
            origin: {
              type: "string",
              enum: ["knowledge-base", "literature"],
              description:
                "'knowledge-base' if it came from cosurg-viden (the team's own curated Danish sources). 'literature' for anything from pubmed-expert, web-search-expert or clinical-trials-expert.",
            },
          },
          required: ["title", "supports"],
        },
      },
    },
    required: ["answer", "evidence", "sources"],
  },
};

const SYSTEM_PROMPT = [
  "You are a clinical reference assistant used by emergency physicians and plastic surgeons, mainly about burns.",
  "You answer free clinical questions. You are NOT the decision tree in this app: the tree owns patient-specific recommendations, you own the evidence behind them.",
  "This is a CONVERSATION, not a series of isolated lookups. The clinician is standing with a patient.",
  "",
  "RETRIEVAL LADDER — work down it, and never stop at the first rung:",
  "0. READ WHAT IS ALREADY IN THE PROMPT FIRST. The app often retrieves the relevant knowledge-base excerpts",
  "   and the applicable pitfalls before calling you, and puts them under headings marked '--- FROM OUR OWN",
  "   KNOWLEDGE BASE ---' and '--- PITFALLS THAT APPLY HERE ---'. Those are real sources, already retrieved.",
  "   Use them, cite them with origin='knowledge-base', and do not spend a search re-finding them.",
  "   The pitfalls are not an appendix: work the relevant ones into the clinical advice itself, whether or not",
  "   the clinician asked about them. Answering only the question that was asked is what a lookup does.",
  "   A colleague says the thing you did not know to ask about.",
  "1. cosurg-viden when the prompt does not already cover it: the team's own curated Danish burn knowledge base",
  "   (brandsaar.dk and the PlastSurgeon material). It is the authority on Danish clinical practice.",
  "   Where it and the international literature differ — for example the fluid formula — state the Danish practice first",
  "   and note the international variant as such.",
  "2. If it answers 'INGEN DAEKNING I VIDENSBASEN', or covers the topic only in general terms, DO NOT STOP THERE.",
  "   That means we have no local guideline — not that the question is unanswerable.",
  "   Go on to pubmed-expert for the peer-reviewed literature, web-search-expert for guidelines outside it,",
  "   clinical-trials-expert for ongoing studies, and medical-calculator-expert whenever a number must be computed.",
  "3. Then look at THIS CONVERSATION. If the clinician has already told you about the patient — age, mechanism,",
  "   burn area, depth, comorbidity, time since injury — use it to make a general answer concrete for this patient.",
  "   Set usedContext=true when you do, and say which facts you leaned on.",
  "4. Only if all three fail, say you cannot answer it responsibly — and say it the way a colleague would:",
  "   what you looked for, what you did not find, and what would let you help (a detail about the patient, a narrower question).",
  "   A dead end with a way forward is useful. A bare 'no coverage' is not.",
  "",
  "MARKING — this is the part that must never slip:",
  "The clinician has to be able to tell three things apart, and the fields exist for exactly that.",
  "- What rests on a retrieved source goes in 'answer', and every such claim maps to an entry in 'sources'.",
  "- What is general clinical reasoning, or reasoning applied to this patient, goes in 'reasoning' — ALWAYS.",
  "- 'evidence' says which of the two dominates: 'sourced', 'partial', 'extrapolated' or 'unsupported'.",
  "A blended answer that does not separate them is more dangerous than no answer, because it cannot be weighed.",
  "",
  "ALWAYS:",
  "- Answer only through submit_clinical_answer.",
  "- NEVER invent a source, a PMID, a URL or a quotation. Only list sources an expert actually returned to you.",
  "- Mark each source's origin: 'knowledge-base' for cosurg-viden, 'literature' for everything else.",
  "- Named local protocols, unfamiliar syndromes and product names that no source confirms must be called out as unconfirmed, not paraphrased as if real.",
  "- Formulas are starting estimates. Say so, and say what the number must be titrated against.",
  "- Reasoning is never a licence to guess a dose, a threshold or a drug. If a number is not in a source, say it is not.",
  "- Write in the language the user asks for. Do not switch language, not even for a greeting.",
  "- Be brief. A clinician is reading this between patients.",
].join("\n");

function agentName(): string {
  const extra = mcpConnectors()
    .map((c) => c.name)
    .join("+");
  // Navnet bærer connector-sættet, så en tilføjet MCP-server ikke kan ende med
  // at genbruge en agent der ikke har den.
  // Versionen skal følge SKEMAET. Et agent-navn er bundet til sit skema hos
  // Corti, så et nyt felt uden et nyt navn ville genbruge den gamle kontrakt.
  // v3: +suggestions (forslag til lægens næste replik, vist som chips).
  return extra ? `cosurg-clinical-chat-v3-${extra}` : "cosurg-clinical-chat-v3";
}

let agentIdPromise: Promise<string> | null = null;

async function createChatAgent(): Promise<string> {
  const token = await getAccessToken();
  const res = await fetch(`${CORTI_API_BASE}/v2/agentic/agents`, {
    method: "POST",
    headers: cortiHeaders(token),
    body: JSON.stringify({
      name: agentName(),
      description: "Answers free clinical questions about burn care, grounded in retrieved sources.",
      systemPrompt: SYSTEM_PROMPT,
      lifecycle: "persistent",
      connectors: [ANSWER_CONNECTOR, ...REGISTRY_EXPERTS, ...mcpConnectors()],
    }),
    cache: "no-store",
    signal: AbortSignal.timeout(30_000),
  });
  if (!res.ok) {
    throw new Error(`Kunne ikke oprette chat-agenten: ${res.status} ${await res.text()}`);
  }
  const data = (await res.json()) as { id: string };
  return data.id;
}

/**
 * Agenten oprettes én gang pr. proces. Løftet caches — ikke id'et — så to
 * samtidige spørgsmål på en kold server ikke opretter hver sin agent.
 */
export function ensureChatAgent(): Promise<string> {
  if (!agentIdPromise) {
    agentIdPromise = createChatAgent().catch((err) => {
      agentIdPromise = null;
      throw err;
    });
  }
  return agentIdPromise;
}

/** Hvilke connectorer der faktisk er koblet på — bruges af /api/chat til at være ærlig i UI'et. */
export function attachedExperts(): string[] {
  return [...REGISTRY_EXPERTS, ...mcpConnectors()].map((c) => c.name);
}

export interface ChatRequest {
  question: string;
  lang: "da" | "en";
  contextId?: string;
  /**
   * Kort resumé af samtalen indtil nu. Sendes KUN når tråden har ligget stille
   * længe nok til at agentens egen kontekst kan være tabt.
   */
  recap?: string;
  /**
   * Hvad appen allerede VED om patienten: de trin lægen har besvaret i
   * beslutningsforløbet. Det er den kontekst der gør et generelt svar konkret —
   * "hvor meget væske?" kan først besvares når arealet er kendt.
   *
   * Den sendes som OPLYSNINGER, ikke som en opgave: anbefalingen til denne
   * patient kommer fra træet, og agenten må kun ræsonnere ud fra tallene og
   * mærke det som ræsonnement.
   */
  patientContext?: string;
  /**
   * Grundlaget vi selv har hentet FØR agenten blev kaldt: uddrag fra
   * vidensbasen og de faldgruber der gælder her, hver med sit ordrette belæg.
   *
   * Det er lagt ind i prompten frem for at være værktøjer agenten selv kan
   * vælge at kalde. Begrundelsen står i `lib/corti/grounding.ts`; kort sagt må
   * en faldgrube ikke kunne udeblive fordi modellen ikke fandt den værd at slå
   * op, og vores egne opslag tager 40-60 ms mod agentens 35-72 sekunder.
   */
  grounding?: string;
  /**
   * Lægen står med en patient. Så skal svaret være en kollega ved sengen —
   * kort, førende, vurdering før afhandling — ikke et litteraturreferat.
   * Mærknings- og kildereglerne er uændrede; kun formen strammes.
   */
  caseMode?: boolean;
  signal?: AbortSignal;
}

function buildPrompt({ question, lang, recap, patientContext, grounding, caseMode }: ChatRequest): string {
  const language = lang === "da" ? "Danish" : "English";
  const lines = [`Answer in ${language}. The clinician asks:`, "", question];

  if (grounding) {
    lines.push("", grounding);
  }

  if (patientContext) {
    lines.push(
      "",
      "--- What this app already knows about the patient in front of the clinician ---",
      "(from the decision pathway he is filling in right now. Use it to make the answer concrete,",
      "and set usedContext=true when you do. The pathway — not you — owns the recommendation itself.)",
      patientContext,
    );
  }

  if (recap) {
    lines.push(
      "",
      "--- Earlier in this conversation (resent because the thread had been idle; treat it as context, do not answer it again) ---",
      recap,
    );
  }

  lines.push(
    "",
    `Answer with submit_clinical_answer in ${language}.`,
    grounding
      ? "Start from the excerpts and pitfalls already given above — they are retrieved sources, not suggestions. Search further only for what they do not cover."
      : "Retrieve evidence first. Work down the retrieval ladder: our own knowledge base, then the literature experts, then this conversation.",
    "Do not stop at 'no coverage in the knowledge base' — that is the first rung, not the answer.",
    "Anything you conclude rather than retrieve belongs in 'reasoning', never unmarked in 'answer'.",
  );

  if (caseMode) {
    lines.push(
      "",
      "STYLE — the clinician is standing with a PATIENT, so answer like the senior colleague at the bedside:",
      "- UNDER 200 words. Short sentences, '- ' bullets, numbered steps for treatment. Never an essay.",
      "- Open with ONE line acknowledging the case (injury, site, key facts). Never ask what they want help with —",
      "  guiding assessment and treatment IS your job, so lead.",
      "- Then '**Vurdering:**' FIRST: what this most likely is — depth, extent, severity — before any treatment.",
      "  An answer that jumps to treatment without committing to an assessment is a lookup, not a colleague.",
      "- Add a '**Røde flag:**' block (2-5 one-line items) when can't-miss findings are relevant to this injury.",
      "- '**Behandling:**' as numbered steps in the order they are done, concrete (agent, dressing, dose where sourced),",
      "  then one line each of '**Pearls:**', '**Pitfalls:**', '**Opfølgning:**' where they earn their place.",
      "- Do not paste quotations into the answer text — the sources are listed separately; write the point in your own words.",
      "- If a decisive detail is missing, end with the SINGLE most important question — one question, never a list.",
      "  If beyond the evidence, recommend conferring with the on-call senior/burn unit.",
      "- Fill 'suggestions' with the clinician's likely replies to that ending question, or the next step",
      "  (e.g. 'Ja, den er cirkulær' | 'Hvordan forbinder jeg det?').",
    );
  } else {
    lines.push(
      "",
      "Fill 'suggestions' with 2-4 natural follow-up questions the clinician would plausibly ask next, in their words.",
    );
  }
  return lines.join("\n");
}

function asString(v: unknown): string | undefined {
  return typeof v === "string" && v.trim() ? v.trim() : undefined;
}

/**
 * Kun http(s) slipper igennem som klikbart link.
 *
 * Kilde-URL'en kommer fra agentens output, og agenten læser åbne websider
 * gennem web-search-expert. En side kan derfor forsøge at få modellen til at
 * gengive en `javascript:`-URL, som React IKKE saniterer i href. Systemprompten
 * er en instruktion til modellen, ikke en spærring — spærringen er her.
 * Afvises URL'en, vises kilden stadig, bare uden link.
 */
function asHttpUrl(v: unknown): string | undefined {
  const raw = asString(v);
  if (!raw) return undefined;
  try {
    const parsed = new URL(raw);
    return parsed.protocol === "https:" || parsed.protocol === "http:" ? parsed.href : undefined;
  } catch {
    return undefined;
  }
}

/**
 * Normaliserer agentens output og retter det ét sted hvor modellen kan tage fejl
 * til vores ugunst: siger den "sourced" uden at have vedlagt en eneste kilde,
 * er svaret pr. definition ikke belagt. Vi nedgraderer frem for at vise et
 * kilde-stempel der ikke kan klikkes på.
 */
export function normalizeAnswer(raw: unknown): ChatAnswer {
  const r = (raw ?? {}) as Record<string, unknown>;

  /*
   * Samme kilde kan komme retur flere gange — vidensbasen svarer fx to gange
   * fra samme side om væskebehandling. To identiske linjer i kildelisten ser
   * ud som sjusk, så de slås sammen og deres begrundelser lægges i forlængelse
   * af hinanden. Ingen kilde forsvinder; kun dubletten gør.
   */
  const sources: ChatSource[] = [];
  const seen = new Map<string, ChatSource>();
  if (Array.isArray(r.sources)) {
    for (const entry of r.sources) {
      const o = (entry ?? {}) as Record<string, unknown>;
      const title = asString(o.title);
      if (!title) continue;

      const claimedOrigin = o.origin;
      const source: ChatSource = {
        title,
        identifier: asString(o.identifier),
        url: asHttpUrl(o.url),
        supports: asString(o.supports) ?? "",
        origin:
          claimedOrigin === "knowledge-base" || claimedOrigin === "literature" ? claimedOrigin : undefined,
      };

      const key = (source.url ?? source.identifier ?? title).toLowerCase();
      const existing = seen.get(key);
      if (!existing) {
        seen.set(key, source);
        sources.push(source);
      } else if (source.supports && !existing.supports.includes(source.supports)) {
        existing.supports = existing.supports ? `${existing.supports} ${source.supports}` : source.supports;
      }
    }
  }

  const reasoning = asString(r.reasoning);

  const claimed = r.evidence;
  let evidence: Evidence =
    claimed === "sourced" || claimed === "partial" || claimed === "extrapolated" || claimed === "unsupported"
      ? claimed
      : "partial";

  /*
   * Nedgraderingen ved nul kilder gælder KUN de belagte niveauer.
   *
   * Før satte vi altid "unsupported" når kildelisten var tom, og det var
   * rigtigt dengang svaret enten var belagt eller ingenting. Nu findes en
   * tredje mulighed: et fagligt ræsonnement ud fra det lægen har fortalt om
   * patienten. Det HAR ingen kilde, og det er netop hvad "extrapolated"
   * betyder — at nedgradere det til "unsupported" ville skjule at der faktisk
   * blev tænkt, og gøre etiketten usand den anden vej.
   *
   * Påstår modellen derimod "sourced" eller "partial" uden at have vedlagt en
   * eneste kilde, står den stadig for skud: er der et ræsonnement at falde
   * tilbage på, kaldes det det, ellers er svaret ubelagt.
   */
  if (sources.length === 0 && (evidence === "sourced" || evidence === "partial")) {
    evidence = reasoning ? "extrapolated" : "unsupported";
  }

  /*
   * Forslagene er tekst der bliver til KNAPPER, så de holdes i chip-format her:
   * højst fire, hver højst ~80 tegn, dubletter væk. En model der skriver fem
   * lange sætninger skal ikke kunne fylde skærmen med knapper.
   */
  const suggestions = Array.isArray(r.suggestions)
    ? [
        ...new Set(
          r.suggestions
            .filter((v): v is string => typeof v === "string")
            .map((v) => v.trim())
            .filter((v) => v.length > 0 && v.length <= 80),
        ),
      ].slice(0, 4)
    : [];

  return {
    answer: asString(r.answer) ?? "",
    evidence,
    reasoning,
    usedContext: r.usedContext === true,
    limitations: asString(r.limitations),
    spokenSummary: asString(r.spokenSummary),
    suggestions: suggestions.length > 0 ? suggestions : undefined,
    sources,
  };
}

/** "Calling expert: pubmed-expert" → "pubmed-expert". */
function expertFrom(text: string): string | null {
  const m = /calling expert:\s*([\w@/-]+)/i.exec(text);
  return m ? m[1] : null;
}

interface StreamEnvelope {
  task?: { contextId?: string };
  statusUpdate?: {
    contextId?: string;
    status?: {
      state?: string;
      message?: { parts?: Array<{ text?: string }> };
    };
  };
  artifactUpdate?: {
    contextId?: string;
    artifact?: { parts?: Array<{ data?: unknown }> };
  };
}

/**
 * Sender spørgsmålet og udsender begivenheder undervejs. Corti svarer med
 * Server-Sent Events: først en task, så "Calling expert: …" mens den henter
 * litteratur, og til sidst artefaktet med det strukturerede svar.
 *
 * Vi videresender fremdriften frem for at vente i tavshed. Et svar tager målt
 * 35-70 sekunder, og en skærm uden livstegn så længe føles brudt.
 */
export async function* streamChatAnswer(req: ChatRequest): AsyncGenerator<ChatEvent> {
  const agentId = await ensureChatAgent();
  const token = await getAccessToken();

  const timeout = AbortSignal.timeout(CHAT_TIMEOUT_MS);
  const signal = req.signal ? AbortSignal.any([req.signal, timeout]) : timeout;

  const res = await fetch(`${CORTI_API_BASE}/v2/agentic/agents/${agentId}/a2a/message:stream`, {
    method: "POST",
    headers: { ...cortiHeaders(token), "A2A-Version": "1.0" },
    body: JSON.stringify({
      message: {
        role: "user",
        parts: [{ kind: "text", text: buildPrompt(req) }],
        messageId: `m-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        ...(req.contextId ? { contextId: req.contextId } : {}),
      },
    }),
    cache: "no-store",
    signal,
  });

  if (!res.ok || !res.body) {
    throw new Error(`Chat-kald fejlede: ${res.status} ${await res.text()}`);
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let gotAnswer = false;
  let sentContext = false;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });

    let split: number;
    while ((split = buffer.indexOf("\n\n")) !== -1) {
      const block = buffer.slice(0, split);
      buffer = buffer.slice(split + 2);

      for (const line of block.split("\n")) {
        if (!line.startsWith("data:")) continue;
        const payload = line.slice(5).trim();
        if (!payload) continue;

        let ev: StreamEnvelope;
        try {
          ev = JSON.parse(payload) as StreamEnvelope;
        } catch {
          continue;
        }

        const contextId = ev.task?.contextId ?? ev.statusUpdate?.contextId ?? ev.artifactUpdate?.contextId;
        if (contextId && !sentContext) {
          sentContext = true;
          yield { kind: "context", contextId };
        }

        const progressText = ev.statusUpdate?.status?.message?.parts
          ?.map((p) => p.text ?? "")
          .join(" ")
          .trim();
        if (progressText) {
          yield { kind: "progress", expert: expertFrom(progressText), text: progressText };
        }

        const data = ev.artifactUpdate?.artifact?.parts?.find((p) => p.data !== undefined)?.data;
        if (data !== undefined) {
          gotAnswer = true;
          yield { kind: "answer", answer: normalizeAnswer(data) };
        }

        const state = ev.statusUpdate?.status?.state;
        if (state === "TASK_STATE_FAILED" || state === "TASK_STATE_CANCELED") {
          if (!gotAnswer) yield { kind: "error", message: `Agenten afsluttede med ${state}` };
          return;
        }
        if (state === "TASK_STATE_COMPLETED") return;
      }
    }
  }

  if (!gotAnswer) {
    yield { kind: "error", message: "Agenten leverede intet svar" };
  }
}
