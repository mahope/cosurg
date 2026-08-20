import type { Lang } from "@/lib/tree/types";

/**
 * Tekster der hører til OPLEVELSEN, ikke til klinikken.
 *
 * `lib/i18n.ts` bærer det kliniske sprog: spørgsmål, kvitteringer, fejl der
 * kræver en handling af lægen. Her ligger det der beskriver hvad appen selv
 * laver — ventetid, tomme tilstande, fejlsider, skærmlæser-etiketter.
 *
 * De to hører logisk sammen og kan fint smeltes sammen senere. De ligger
 * adskilt nu af én grund: `lib/i18n.ts` redigeres af et andet spor mens dette
 * bygges, og en fælles fil ville betyde flettekonflikter i den fil hele appen
 * afhænger af. Skemaet er identisk (`{da, en}`), så en sammenlægning er et
 * klip-og-indsæt.
 *
 * Regel som i i18n.ts: ingen streng må ende blindt. Siger vi at noget tager
 * tid, siger vi hvor lang tid; siger vi at noget gik galt, siger vi hvad man
 * gør i stedet.
 */
export const uiStrings = {
  // — Ventetid —————————————————————————————————————————————————————
  /*
   * Journalnotatet er målt til 14–16 sekunder. Fjorten sekunders stilstand får
   * en app til at se død ud, så vi fortæller hvad der faktisk sker undervejs.
   * Trinnene følger rutens egen rækkefølge (path → notat → koder), så teksten
   * er sand og ikke en fremdriftsteater-animation.
   */
  noteStage1: { da: "Samler beslutningsvejen…", en: "Collecting the decision path…" },
  noteStage2: { da: "Skriver journalnotatet…", en: "Writing the clinical note…" },
  noteStage3: { da: "Slår koder op hos Corti…", en: "Looking up codes at Corti…" },
  noteStage4: { da: "Sætter belæg på hver kode…", en: "Attaching evidence to each code…" },
  noteStageLate: {
    da: "Det tager længere end normalt — vi venter stadig.",
    en: "This is taking longer than usual — we are still waiting.",
  },
  noteEta: { da: "Tager typisk omkring 15 sekunder", en: "Usually takes about 15 seconds" },
  noteSkeletonLabel: { da: "Journalnotatet skrives", en: "Writing the clinical note" },

  /** Kort kvittering på at et svar blev sendt. Sand uanset hvad agenten svarer. */
  sent: { da: "Sendt", en: "Sent" },
  working: { da: "Arbejder", en: "Working" },

  // — Tomme tilstande ——————————————————————————————————————————————
  transcriptEmpty: {
    da: "Intet hørt endnu. Tænd mikrofonen, eller skriv svaret i feltet.",
    en: "Nothing heard yet. Turn on the microphone, or type your answer in the field.",
  },
  pathEmpty: {
    da: "Ingen svar endnu. Beslutningsvejen bygges her — ét svar ad gangen.",
    en: "No answers yet. The decision path builds here — one answer at a time.",
  },
  noteEmpty: {
    da: "Journalnotatet skrives når du beder om det. Anbefalingen står allerede fast.",
    en: "The note is written when you ask for it. The recommendation already stands.",
  },

  // — Skærmlæser og tastatur ————————————————————————————————————————
  skipToContent: { da: "Gå til indholdet", en: "Skip to content" },
  langSwitchTo: { da: "Skift sproget til engelsk", en: "Switch the language to Danish" },
  voiceSwitch: {
    da: "Slå oplæsning til eller fra",
    en: "Turn spoken guidance on or off",
  },
  orSwitch: { da: "Slå OR-tilstand til eller fra", en: "Turn OR mode on or off" },
  statusRegion: { da: "Status", en: "Status" },
  /** Læses op når et rødt flag tager skærmen. Skærmlæseren skal sige alvoren først. */
  redFlagAnnounce: { da: "Rødt flag", en: "Red flag" },

  // — Fejlsider ————————————————————————————————————————————————————
  notFoundCode: { da: "404", en: "404" },
  notFoundTitle: { da: "Siden findes ikke", en: "Page not found" },
  notFoundBody: {
    da: "Adressen peger ikke på noget i CoSurg. Beslutningsstøtten ligger på forsiden — intet forløb er gået tabt.",
    en: "That address does not point to anything in CoSurg. The decision support lives on the front page — no pathway was lost.",
  },
  errorTitle: { da: "Noget gik galt", en: "Something went wrong" },
  errorBody: {
    da: "CoSurg kunne ikke vise siden. Der gemmes ingen patientdata, så du kan starte forfra uden at miste noget.",
    en: "CoSurg could not render this page. No patient data is stored, so you can start over without losing anything.",
  },
  errorDetailLabel: { da: "Teknisk detalje", en: "Technical detail" },
  retry: { da: "Prøv igen", en: "Try again" },
  goHome: { da: "Til forsiden", en: "Back to the start" },
  loadingApp: { da: "Henter CoSurg…", en: "Loading CoSurg…" },
} satisfies Record<string, Record<Lang, string>>;

export function ui(key: keyof typeof uiStrings, lang: Lang): string {
  return uiStrings[key][lang];
}

/** Begge sprog på én linje. Fejlsider ligger uden for sprogvælgeren og skal kunne læses af alle i lokalet. */
export function both(key: keyof typeof uiStrings): { da: string; en: string } {
  return uiStrings[key];
}
