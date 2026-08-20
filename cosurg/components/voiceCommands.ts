/**
 * Håndfri stemmekommandoer.
 *
 * VALG AF METODE — hvorfor mønstre og ikke agenten (COMMAND_SPEC):
 *
 *  1. Latens. Kirurgen siger "næste" og forventer at skærmen skifter med det
 *     samme. Et agent-kald koster ~1–2 s rundtur; det er en evighed når man
 *     står med hænderne i et sår.
 *  2. Robusthed. Kommandolaget må ikke kunne fejle fordi nettet gør. Alt andet
 *     i appen har en fallback — det skal styringen også have, og den bedste
 *     fallback er ingen netværksafhængighed overhovedet.
 *  3. Præcision. Kravet er at baggrundssnak ALDRIG udløser en kommando. Det er
 *     et konservativitetskrav, og en deterministisk regel er nemmere at holde
 *     konservativ end en sprogmodel: en model kan finde på at læse "…så går vi
 *     videre til næste patient" som kommandoen "næste". Reglen her kan ikke.
 *
 * Konservativiteten ligger i tre lag, ikke i ordlisten:
 *   - LÆNGDE: en kommando er en KORT, selvstændig ytring. Alt over fem ord
 *     afvises uanset indhold — sætninger er samtale, ikke styring.
 *   - EKSAKT MATCH: efter normalisering og fjernelse af fyldord skal resten
 *     være PRÆCIS en kendt vending. "Næste" matcher; "vi tager den næste om
 *     lidt" gør ikke.
 *   - KONTEKST: de bløde vendinger ("videre", "færdig", "done") accepteres kun
 *     på trin-noder, hvor der ikke findes et svar de kan forveksles med.
 *
 * COMMAND_SPEC bliver liggende i lib/corti/agent.ts som opgradering: skal
 * kommandosættet vokse (fx "vis billede tre", "spring til trin syv"), er en
 * agent det rigtige værktøj — men så er det et sprog, ikke en knap.
 */

export type VoiceCommand = "next" | "repeat" | "back" | "acknowledge" | "orMode";

export interface CommandContext {
  /**
   * Trin-node: der findes intet svar at forveksle en kommando med, så bløde
   * fremrykningsord ("videre", "færdig") må også tælle som "næste".
   */
  softNext: boolean;
  /** Et rødt flag venter på kvittering — først da betyder "ok" noget. */
  awaitingAcknowledge: boolean;
}

/** Længste ytring der overhovedet kan være en kommando. */
const MAX_WORDS = 5;

/**
 * Fælles form for både dansk og engelsk: æøå foldes til ae/oe/aa, så det er
 * uden betydning om STT skriver "næste" eller "naeste".
 */
function normalize(text: string): string {
  return text
    .toLowerCase()
    .replace(/æ/g, "ae")
    .replace(/ø/g, "oe")
    .replace(/å/g, "aa")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Fyldord der ofte hænger på en kommando uden at ændre den. */
const LEADING = new Set(["ok", "okay", "okey", "saa", "nu", "og", "and", "then", "alright", "hey"]);
const TRAILING = new Set(["tak", "thanks", "thank", "you", "please", "nu", "her", "now"]);

function stripFillers(words: string[]): string[] {
  let start = 0;
  let end = words.length;
  while (start < end && LEADING.has(words[start])) start += 1;
  while (end > start && TRAILING.has(words[end - 1])) end -= 1;
  return words.slice(start, end);
}

const PHRASES: Record<string, VoiceCommand> = {};
function register(command: VoiceCommand, phrases: string[]) {
  phrases.forEach((p) => {
    PHRASES[normalize(p)] = command;
  });
}

register("next", [
  "næste",
  "næste trin",
  "næste skridt",
  "det næste",
  "næste tak",
  "next",
  "next step",
  "next one",
  "go next",
]);

register("repeat", [
  "gentag",
  "gentag det",
  "gentag trinnet",
  "sig det igen",
  "en gang til",
  "repeat",
  "repeat that",
  "say that again",
  "say again",
  "again",
]);

register("back", [
  "tilbage",
  "gå tilbage",
  "et skridt tilbage",
  "forrige",
  "forrige trin",
  "back",
  "go back",
  "previous",
  "previous step",
  "step back",
]);

register("orMode", [
  "or mode",
  "or tilstand",
  "operationsstue",
  "steril tilstand",
  "sterile mode",
  "operating room mode",
]);

/** Kun relevante når et rødt flag står og venter — ellers ren samtalestøj. */
const ACKNOWLEDGE = new Set(
  ["ok", "okay", "forstået", "javel", "modtaget", "understood", "got it", "noted", "acknowledged"].map(normalize),
);

/**
 * Bløde fremrykningsord. De betyder utvetydigt "videre" i en procedureguide,
 * men kunne være et svar i et beslutningstræ — derfor kun på trin-noder.
 */
const SOFT_NEXT = new Set(
  ["videre", "gå videre", "fortsæt", "færdig", "klar", "continue", "go on", "done", "carry on"].map(normalize),
);

export function matchCommand(text: string, ctx: CommandContext): VoiceCommand | null {
  const normalized = normalize(text);
  if (!normalized) return null;

  const words = normalized.split(" ");
  if (words.length > MAX_WORDS) return null;

  // Kvittering testes på den rå form: "ok" er ellers selv et fyldord.
  if (ctx.awaitingAcknowledge && ACKNOWLEDGE.has(normalized)) return "acknowledge";

  const core = stripFillers(words).join(" ");
  if (!core) return null;

  const direct = PHRASES[core];
  if (direct) return direct;

  if (ctx.softNext && SOFT_NEXT.has(core)) return "next";

  return null;
}

/**
 * Er ytringen appens egen stemme der er løbet retur gennem den åbne mikrofon?
 *
 * I OR-tilstand står mikrofonen altid åben mens agenten taler, så TTS'ens egne
 * ord kommer tilbage som transskript. Uden dette filter ville en kvittering
 * kunne udløse den kommando den kvitterede for. Vi tester på indeholdelse frem
 * for at spærre for al tale under oplæsning — kirurgen skal kunne AFBRYDE en
 * lang instruktion med "næste", og hans "næste" er ikke en del af det oplæste.
 */
export function isEcho(heard: string, spoken: string): boolean {
  const a = normalize(heard);
  const b = normalize(spoken);
  if (!a || !b || a.length < 2) return false;
  return b.includes(a);
}
