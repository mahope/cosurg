import type { Lang } from "@/lib/tree/types";

export const t = {
  title: { da: "CoSurg", en: "CoSurg" },
  tagline: {
    da: "Stemmestyret klinisk beslutningsstøtte",
    en: "Voice-driven clinical decision support",
  },
  start: { da: "Start vurdering", en: "Start assessment" },
  listening: { da: "Lytter", en: "Listening" },
  micOff: { da: "Mikrofon slukket", en: "Microphone off" },
  orMode: { da: "OR-tilstand", en: "OR mode" },
  orModeOn: { da: "OR-tilstand AKTIV", en: "OR MODE ACTIVE" },
  voiceFull: { da: "Fuld stemmedialog", en: "Full voice dialogue" },
  voiceKey: { da: "Kun nøglemomenter", en: "Key moments only" },
  redFlag: { da: "RØDT FLAG", en: "RED FLAG" },
  recommendation: { da: "Anbefaling", en: "Recommendation" },
  path: { da: "Beslutningsvej", en: "Decision path" },
  transcript: { da: "Transskript", en: "Transcript" },
  generateNote: { da: "Generér journalnotat", en: "Generate note" },
  note: { da: "Journalnotat", en: "Clinical note" },
  codes: { da: "Koder", en: "Codes" },
  dictate: { da: "Diktér tillæg", en: "Dictate addendum" },
  stopDictate: { da: "Stop diktering", en: "Stop dictation" },
  restart: { da: "Ny vurdering", en: "New assessment" },
  back: { da: "Tilbage", en: "Back" },
  repeat: { da: "Gentag", en: "Repeat" },
  unclear: { da: "Uklart svar — spørger igen", en: "Unclear answer — asking again" },
  thinking: { da: "Fortolker…", en: "Interpreting…" },
  sources: { da: "Kilder", en: "Sources" },
  sourceNote: {
    da: "Anbefalingen kommer fra det kliniske træ — ikke fra en sprogmodel.",
    en: "The recommendation comes from the clinical tree — not from a language model.",
  },
  orHint: {
    da: "Sig «næste», «gentag», «tilbage» — eller svar direkte.",
    en: "Say “next”, “repeat”, “back” — or just answer.",
  },
  step: { da: "Trin", en: "Step" },
  answerPlaceholder: {
    da: "Skriv eller sig dit svar…",
    en: "Type or say your answer…",
  },
  dictationPlaceholder: {
    da: "Skriv eller diktér tillægget…",
    en: "Type or dictate the addendum…",
  },
  orExit: { da: "Afslut OR-tilstand", en: "Exit OR mode" },

  // Trin-noder (procedureguide): der er intet svar, kun en kvittering.
  nextStep: { da: "Næste trin", en: "Next step" },
  stepDone: { da: "Udført", en: "Done" },

  /*
   * Hørbare kvitteringer. Agenten svarer FØR den rykker, så kirurgen ved at
   * kommandoen blev forstået. Ordene er bevidst valgt så de IKKE selv er
   * kommandoord — den åbne mikrofon hører appens egen stemme, og "Næste."
   * som kvittering ville kunne udløse endnu et spring.
   */
  ackNext: { da: "Modtaget.", en: "Got it." },
  ackRepeat: { da: "Gentager.", en: "Repeating." },
  ackBack: { da: "Går et trin tilbage.", en: "Going one step back." },
  ackFlag: { da: "Kvitteret.", en: "Acknowledged." },
  ackOrMode: { da: "OR-tilstand aktiv.", en: "OR mode active." },
  needAnswer: {
    da: "Jeg mangler et svar først.",
    en: "I need an answer first.",
  },

  // Træ-vælger
  tree: { da: "Klinisk træ", en: "Clinical tree" },
  switchTree: { da: "Skift træ", en: "Switch tree" },
  engineNote: {
    da: "Samme motor, andet indhold — træet er data, ikke kode.",
    en: "Same engine, different content — the tree is data, not code.",
  },

  // OR-tilstand
  orCommands: { da: "Stemmekommandoer", en: "Voice commands" },
  heard: { da: "Hørt", en: "Heard" },
  micOpen: { da: "Mikrofon åben", en: "Microphone open" },
  micClosed: { da: "MIKROFON LUKKET", en: "MICROPHONE CLOSED" },
  stepPlaceholder: {
    da: "Sig «næste» når trinnet er udført…",
    en: "Say “next” when the step is done…",
  },

  /*
   * Fejlbeskeder klinikeren kan HANDLE på.
   *
   * To regler gælder dem alle:
   *   1. Ingen rå browser- eller serverstreng når frem til skærmen. "Permission
   *      denied" fortæller en kirurg på scenen ingenting.
   *   2. Hver besked ender i en vej videre. Appen har altid en: klik og skrift
   *      går uden om både mikrofon og agent, så et netværksudfald må aldrig
   *      kunne standse en beslutning — kun gøre den langsommere.
   */
  offline: {
    da: "Ingen forbindelse — svar med knapperne i stedet",
    en: "No connection — answer with the buttons instead",
  },
  timedOut: {
    da: "Serveren svarer ikke — svar med knapperne i stedet",
    en: "The server is not responding — answer with the buttons instead",
  },
  interpretFailed: {
    da: "Svaret kunne ikke fortolkes — svar med knapperne i stedet",
    en: "Could not interpret the answer — answer with the buttons instead",
  },
  noteOffline: {
    da: "Ingen forbindelse — notatet kan ikke skrives nu. Beslutningsvejen står stadig på skærmen.",
    en: "No connection — the note cannot be written now. The decision path is still on screen.",
  },
  noteTimedOut: {
    da: "Notatet tog for lang tid — prøv igen. Beslutningsvejen står stadig på skærmen.",
    en: "The note took too long — try again. The decision path is still on screen.",
  },
  noteFailed: {
    da: "Notatet kunne ikke skrives — prøv igen. Beslutningsvejen står stadig på skærmen.",
    en: "Could not write the note — try again. The decision path is still on screen.",
  },
  noteWorking: { da: "Skriver notat…", en: "Writing note…" },
  treeOffline: {
    da: "Ingen forbindelse — det nuværende træ kører videre",
    en: "No connection — the current tree keeps running",
  },
  treeFailed: {
    da: "Kunne ikke hente træet — det nuværende træ kører videre",
    en: "Could not load the tree — the current tree keeps running",
  },

  /*
   * Browser- og mikrofonfejl. Årsag og udvej står hver for sig, fordi udvejen
   * afhænger af tilstanden: i standardtilstand kan man skrive, men i
   * OR-tilstand er kirurgen steril og har kun skærmens knapper (og tastaturet,
   * som assistenten betjener). At love et skrivefelt der ikke findes, er værre
   * end ingen besked.
   */
  micDenied: {
    da: "Mikrofonen har ikke adgang — tryk på hængelåsen i adresselinjen og tillad mikrofon",
    en: "The microphone is blocked — click the padlock in the address bar and allow the microphone",
  },
  micMissing: {
    da: "Ingen mikrofon fundet — tilslut en mikrofon",
    en: "No microphone found — connect one",
  },
  micBusy: {
    da: "Mikrofonen bruges af et andet program — luk det",
    en: "The microphone is in use by another app — close it",
  },
  micInsecure: {
    da: "Mikrofonen kræver en sikker forbindelse (https)",
    en: "The microphone requires a secure connection (https)",
  },
  micFailed: {
    da: "Mikrofonen kunne ikke startes",
    en: "Could not start the microphone",
  },
  voiceServiceFailed: {
    da: "Stemmetjenesten svarer ikke",
    en: "The voice service is not responding",
  },
  fallbackType: {
    da: ", eller skriv svaret i feltet nedenfor.",
    en: ", or type your answer in the field below.",
  },
  fallbackButtons: {
    da: ". Brug knapperne på skærmen imens.",
    en: ". Use the buttons on screen meanwhile.",
  },
  audioGesture: {
    da: "Klik ét sted på siden for at slå oplæsning til — browseren blokerer lyd indtil da.",
    en: "Click anywhere on the page to enable spoken guidance — the browser blocks audio until then.",
  },
} satisfies Record<string, Record<Lang, string>>;

export function tr(key: keyof typeof t, lang: Lang): string {
  return t[key][lang];
}

/** Hvad gik galt i et netværkskald — set fra brugeren, ikke fra stakken. */
type FailureKind = "offline" | "timeout" | "failed";

/** Hvilket kald der fejlede. Konsekvensen er forskellig, og det skal beskeden sige. */
export type FetchScope = "interpret" | "note" | "tree";

const failureText: Record<FetchScope, Record<FailureKind, keyof typeof t>> = {
  interpret: { offline: "offline", timeout: "timedOut", failed: "interpretFailed" },
  note: { offline: "noteOffline", timeout: "noteTimedOut", failed: "noteFailed" },
  tree: { offline: "treeOffline", timeout: "treeFailed", failed: "treeFailed" },
};

function classify(err: unknown): FailureKind {
  // navigator.onLine er upålidelig til at love forbindelse, men helt pålidelig
  // til at melde fravær af den — og det er netop den sag vi vil skille ud.
  if (typeof navigator !== "undefined" && navigator.onLine === false) return "offline";
  if (err instanceof Error && (err.name === "TimeoutError" || err.name === "AbortError")) return "timeout";
  return "failed";
}

/**
 * Oversætter en afvist fetch til en besked der siger både hvad der skete og
 * hvad man gør nu. Bruges alle steder hvor klienten rører netværket.
 */
export function failureMessage(err: unknown, scope: FetchScope, lang: Lang): string {
  return tr(failureText[scope][classify(err)], lang);
}

/**
 * Oversætter mikrofon-/stemmefejl til handlingsanvisninger.
 *
 * Browserens egne beskeder ("Permission denied", "Requested device not found")
 * er engelske, tekniske og uden vej videre — de må aldrig stå på skærmen som
 * de er. Vi matcher på undtagelsesteksten frem for på navnet, fordi laget
 * under os kun giver os `Error.message`.
 */
export function micMessage(raw: string | null | undefined, lang: Lang, orMode = false): string | null {
  if (!raw) return null;
  const s = raw.toLowerCase();

  const cause = ((): keyof typeof t => {
    if (s.includes("corti-token") || s.includes("transskription")) return "voiceServiceFailed";
    if (
      s.includes("denied") ||
      s.includes("not allowed") ||
      s.includes("notallowed") ||
      s.includes("dismissed") ||
      s.includes("permission")
    )
      return "micDenied";
    if (s.includes("not found") || s.includes("notfound") || s.includes("requested device")) return "micMissing";
    if (s.includes("could not start") || s.includes("notreadable") || s.includes("in use") || s.includes("busy"))
      return "micBusy";
    if (s.includes("secure") || s.includes("https") || s.includes("mediadevices")) return "micInsecure";
    return "micFailed";
  })();

  return tr(cause, lang) + tr(orMode ? "fallbackButtons" : "fallbackType", lang);
}
