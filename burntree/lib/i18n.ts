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
} satisfies Record<string, Record<Lang, string>>;

export function tr(key: keyof typeof t, lang: Lang): string {
  return t[key][lang];
}
