import type { Lang } from "@/lib/tree/types";

export const t = {
  title: { da: "BurnTree", en: "BurnTree" },
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
} satisfies Record<string, Record<Lang, string>>;

export function tr(key: keyof typeof t, lang: Lang): string {
  return t[key][lang];
}
