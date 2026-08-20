import { MODELS, cortiModelsKonfigureret, kaldModelJson } from "./models";

/**
 * Triage: det hurtige lag der afgør HVAD lægen har gang i, før noget dyrt sættes i gang.
 *
 * Baggrunden er en måling. Et svar gennem det agentiske framework tager 35-72
 * sekunder, fordi agenten fanger ud til PubMed og vidensbasen for hvert eneste
 * spørgsmål — også de spørgsmål vores egne kilder svarer fuldt ud på. Corti
 * Models (`corti-s1-instant`) afgør på 0,7-2,0 sekunder om den tur er nødvendig.
 *
 * Triagen skriver ALDRIG klinisk indhold. Den svarer på fire ting:
 *
 *   1. Hvad er det for en slags ytring?
 *   2. Skal der søges i litteraturen, eller rækker vores egne kilder?
 *   3. Hvad hedder emnet på dansk — de ord vores kilder faktisk er skrevet med?
 *   4. Hvilken kontekst skal faldgruberne matches på?
 *
 * Alle fire er billige at tage fejl af og dyre at undvære. Fejler kaldet, eller
 * er nøglen ikke sat, falder vi tilbage på en lokal heuristik: dårligere, men
 * aldrig blokerende. Reserven vælger altid det GRUNDIGE spor — en unødig
 * litteratursøgning koster tid, en sprunget søgning koster et dårligt svar.
 */

/** Hvad ytringen er. Bevidst tættere på produktet end på grammatikken. */
export type TriageKind =
  /** "hvordan behandler jeg …" — hele forløbet for en tilstand skal frem. */
  | "treatment"
  /** Et afgrænset fagligt spørgsmål: en dosis, et tal, en grænse, en kilde. */
  | "fact"
  /** En beskrivelse af en patient — et forløb skal åbnes, ikke et opslag. */
  | "patient"
  /** Hverken-eller. Et gyldigt svar; appen spørger så lægen hvad der var ment. */
  | "other";

export interface Triage {
  kind: TriageKind;
  /**
   * Rækker vores egne kilder, eller skal Cortis litteratur-eksperter i sving?
   *
   * Sand er det dyre svar (35-72 s). Reserven sætter den derfor altid sand:
   * mister vi triagen, mister vi hastigheden — ikke grundigheden.
   */
  needsLiterature: boolean;
  /** Kort dansk emnetitel, egnet som overskrift og som nøgle til guiden. */
  topic: string;
  /** 4-8 danske søgeord, mest specifikke først. Vores kilder er skrevet på dansk. */
  terms: string[];
  /** Fritekst faldgruberne matches på — det kliniske træk, ikke hele spørgsmålet. */
  pitfallContext: string;
  /** Én sætning om hvad der afgjorde det. Vises ikke, men logges og fejlsøges på. */
  reason: string;
  /** Hvem der afgjorde det. `lokal` betyder at Models ikke svarede. */
  routedBy: "corti-models" | "lokal";
}

const SYSTEM = [
  "You triage ONE utterance from a clinician using a burn-care decision-support app.",
  "You never answer the utterance and you never write clinical advice.",
  "",
  "Reply with ONLY a JSON object, no prose and no code fence:",
  '{"kind":"treatment|fact|patient|other","needsLiterature":true|false,',
  '"topic":"short Danish topic title","terms":["danish","clinical","search","terms"],',
  '"pitfallContext":"short Danish phrase naming the clinical situation","reason":"one short sentence"}',
  "",
  "kind:",
  "- 'treatment': asks how a condition is managed — the whole course is wanted.",
  "- 'fact': a bounded clinical question — a dose, a formula, a threshold, a source, a criterion.",
  "- 'patient': describes a patient or an injury to be assessed, rather than asking anything.",
  "- 'other': you cannot tell, or it is not clinical. A correct and useful answer.",
  "",
  "needsLiterature — this is the expensive decision, so weigh it:",
  "The app has its own curated Danish burn knowledge base (brandsaar.dk, Rigshospitalet VIP instructions,",
  "the PlastSurgeon handbook, peer-reviewed burn cases). It covers standard Danish burn management:",
  "depth assessment, TBSA, cooling, fluid resuscitation, dressings, transfer criteria, follow-up, hand burns.",
  "Set needsLiterature=false when the question is standard Danish burn practice — the local sources answer it.",
  "Set needsLiterature=true when the question needs the international literature: drug dosing beyond the basics,",
  "comparative evidence, ongoing trials, rare mechanisms, paediatric or pregnancy specifics, comorbidity",
  "interactions, anything outside burns, or anything where being out of date would matter.",
  "When genuinely in doubt, set it to true. A needless literature search costs time; a skipped one costs the answer.",
  "",
  "terms: 4-8 lowercase Danish clinical search terms, most specific first, no punctuation.",
  "Danish burn sources use words like forbrænding, skoldning, ætsning, brandsår, dybde, dyb dermal,",
  "fuldhudsskade, TBSA, arealberegning, afkøling, skylning, bullae, forbinding, væskebehandling, Parkland,",
  "inhalationsskade, cirkulær, aflastende incisioner, overflytning, ambulant kontrol.",
  "Translate the clinician's words into those, even when the utterance is in English.",
].join("\n");

/** Ord der peger på et behandlingsforløb frem for et enkeltstående faktum. */
const BEHANDLINGSORD =
  /\b(behandl|behandling|håndter|forbind|forbinding|dress|manage|management|treat|treatment|plan|guide|procedure)/i;

/** Spørgsmål der næsten altid kræver litteratur ud over vores egne danske kilder. */
const LITTERATUR_ORD =
  /\b(studie|studier|evidens|metaanalyse|randomiseret|trial|pubmed|litteratur|forskning|dosering|dosis|mg\/kg|graviditet|pregnan|gravid|antibiotika|antibiotic|sammenlign|compared?|versus|nyeste|latest)\b/i;

const STOPORD = new Set([
  "en", "et", "den", "det", "de", "og", "eller", "med", "til", "for", "på", "i", "af", "som", "der",
  "hvad", "hvordan", "hvor", "gør", "man", "ved", "jeg", "skal", "kan", "er", "min", "the", "a", "an",
  "and", "or", "with", "to", "on", "in", "of", "how", "what", "do", "does", "is", "are", "should", "my",
]);

function lokaleTermer(tekst: string): string[] {
  return tekst
    .toLowerCase()
    .split(/[^\p{L}\p{N}%]+/u)
    .filter((w) => w.length > 2 && !STOPORD.has(w))
    .slice(0, 8);
}

/**
 * Reserven. Den vælger med vilje det dyre spor, undtagen når ytringen tydeligt
 * er en behandlingsforespørgsel uden litteratur-signaler — dér er vores egne
 * kilder det rigtige sted at starte, også uden en model til at sige det.
 */
export function lokalTriage(utterance: string): Triage {
  const termer = lokaleTermer(utterance);
  const behandling = BEHANDLINGSORD.test(utterance);
  const litteratur = LITTERATUR_ORD.test(utterance);
  return {
    kind: behandling ? "treatment" : "fact",
    needsLiterature: litteratur || !behandling,
    topic: utterance.slice(0, 120),
    terms: termer.length > 0 ? termer : [utterance.slice(0, 60)],
    pitfallContext: utterance.slice(0, 200),
    reason: "Corti Models svarede ikke — lokal reserve",
    routedBy: "lokal",
  };
}

function rensTermer(v: unknown): string[] {
  if (!Array.isArray(v)) return [];
  return v
    .filter((t): t is string => typeof t === "string")
    .map((t) => t.trim().toLowerCase().slice(0, 60))
    .filter(Boolean)
    .slice(0, 8);
}

function rensKind(v: unknown): TriageKind {
  return v === "treatment" || v === "fact" || v === "patient" || v === "other" ? v : "fact";
}

export interface TriageInput {
  utterance: string;
  lang: "da" | "en";
  /** Hvad appen allerede ved om patienten. Gør emne og søgeord mere præcise. */
  patientContext?: string;
  signal?: AbortSignal;
}

/**
 * Triagér en ytring. Kaster aldrig — en fejlet triage giver den lokale reserve,
 * fordi appen skal kunne svare uden Corti Models.
 */
export async function triagér({ utterance, lang, patientContext, signal }: TriageInput): Promise<Triage> {
  if (!cortiModelsKonfigureret()) {
    return { ...lokalTriage(utterance), reason: "CORTI_MODELS_KEY ikke sat — lokal reserve" };
  }

  const bruger = [
    `The clinician writes ${lang === "da" ? "Danish" : "English"} and said:`,
    utterance,
    patientContext ? `\nWhat the app already knows about the patient:\n${patientContext.slice(0, 1_000)}` : "",
    "\nReturn the JSON object now.",
  ]
    .filter(Boolean)
    .join("\n");

  try {
    const raw = await kaldModelJson<Record<string, unknown>>({
      model: MODELS.triage,
      system: SYSTEM,
      user: bruger,
      maxTokens: 350,
      timeoutMs: 6_000,
      signal,
    });

    const terms = rensTermer(raw.terms);
    const reserve = lokalTriage(utterance);

    return {
      kind: rensKind(raw.kind),
      // Kun et eksplicit `false` sparer litteratursøgningen. Alt andet — et
      // manglende felt, en streng, en model der svarede skævt — skal koste tid
      // frem for grundighed.
      needsLiterature: raw.needsLiterature !== false,
      topic: typeof raw.topic === "string" && raw.topic.trim() ? raw.topic.trim().slice(0, 120) : reserve.topic,
      terms: terms.length > 0 ? terms : reserve.terms,
      pitfallContext:
        typeof raw.pitfallContext === "string" && raw.pitfallContext.trim()
          ? raw.pitfallContext.trim().slice(0, 300)
          : reserve.pitfallContext,
      reason: typeof raw.reason === "string" ? raw.reason.trim().slice(0, 300) : "",
      routedBy: "corti-models",
    };
  } catch {
    return lokalTriage(utterance);
  }
}

/* ------------------------------------------------------------------ */
/* Intent-routing — samme model, anden opgave                          */
/* ------------------------------------------------------------------ */

/** Hvad `/api/route` skal kunne svare. Uændret kontrakt fra agent-udgaven. */
export type RoutedIntent = "answer" | "question" | "pathway" | "unclear";

const INTENT_SYSTEM = [
  "A clinician is using a voice-driven clinical decision-support app for burns.",
  "You classify ONE utterance. You do not answer it, and you do not interpret it.",
  "",
  "Reply with ONLY a JSON object, no prose and no code fence:",
  '{"intent":"...","reason":"one short sentence in the clinician\'s language"}',
  "",
  "The categories:",
  "- 'answer': the utterance responds to the question the app just asked.",
  "- 'question': the clinician is asking something and expects information back — a fact, a formula, a guideline, a source.",
  "- 'pathway': the utterance describes a patient or a case, i.e. it is the start of an assessment rather than a question.",
  "- 'unclear': you cannot tell. This is a correct and useful answer whenever the utterance can be read both ways.",
  "",
  "Be conservative. Reading a question as an answer moves a clinical decision forward on a false basis,",
  "and nobody can see afterwards that it happened. Reading an answer as a question only costs a repetition.",
  "When in doubt, choose 'unclear' — the app will then ask the clinician what they meant.",
  "Only the categories the prompt names as allowed may be returned.",
].join("\n");

export interface IntentResultat {
  intent: RoutedIntent;
  reason?: string;
  routedBy: "corti-models" | "lokal";
}

/**
 * Klassificér en ytring med Corti Models.
 *
 * Dette er samme opgave som `ROUTER_SPEC` i `app/api/route/agent.ts` løste med
 * det agentiske framework — bare uden agent-rundturen. Agenten skulle hverken
 * søge eller kalde værktøjer for at klassificere én sætning, så turen var ren
 * ventetid. Fejler kaldet, returnerer vi "unclear": appen spørger så lægen, og
 * det er præcis den fejlmåde ruten er bygget til.
 */
export async function routerIntent(
  prompt: string,
  tilladte: RoutedIntent[],
  signal?: AbortSignal,
): Promise<IntentResultat> {
  if (!cortiModelsKonfigureret()) {
    return { intent: "unclear", reason: "CORTI_MODELS_KEY ikke sat", routedBy: "lokal" };
  }
  try {
    const raw = await kaldModelJson<{ intent?: unknown; reason?: unknown }>({
      model: MODELS.triage,
      system: INTENT_SYSTEM,
      user: prompt,
      maxTokens: 200,
      timeoutMs: 6_000,
      signal,
    });
    const claimed = raw.intent;
    return {
      intent:
        typeof claimed === "string" && (tilladte as string[]).includes(claimed)
          ? (claimed as RoutedIntent)
          : "unclear",
      reason: typeof raw.reason === "string" ? raw.reason.slice(0, 300) : undefined,
      routedBy: "corti-models",
    };
  } catch {
    return { intent: "unclear", reason: undefined, routedBy: "lokal" };
  }
}
