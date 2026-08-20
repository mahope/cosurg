import type { Lang } from "@/lib/tree/types";

/**
 * Teksterne til det samlede forløb.
 *
 * De bor her og ikke i `lib/i18n.ts` af én praktisk grund: tre agenter arbejder
 * i repoet samtidig, og en fælles ordbog er den fil der oftest kolliderer. Alt
 * hvad der allerede FINDES i i18n genbruges derfra — det her er kun det nye.
 *
 * Sprogtonen følger resten af appen: appen taler om «forløb» og «opslag», aldrig
 * om «beslutningstræer» og «chat». Lægen skal ikke kende vores inddeling.
 */
const u = {
  /* Opslaget midt i et forløb */
  lookupTitle: { da: "Opslag", en: "Lookup" },
  lookupAsked: { da: "Du spurgte", en: "You asked" },
  lookupAck: { da: "Godt spørgsmål. Jeg slår det op.", en: "Good question. Looking it up." },
  lookupWorking: { da: "Slår op i kilderne…", en: "Looking it up in the sources…" },
  lookupClose: { da: "Luk opslaget", en: "Close the lookup" },

  /*
   * Den vigtigste sætning på hele skærmen: forløbet er der stadig. Lægen skal
   * kunne se det uden at lede, ellers tør han ikke spørge midt i en vurdering.
   */
  lookupHeldStep: { da: "Forløbet står uændret på trin", en: "The pathway is held at step" },
  lookupHeldDone: {
    da: "Forløbet er færdigt — anbefalingen står stadig ovenfor.",
    en: "The pathway is complete — the recommendation is still above.",
  },
  lookupResume: { da: "Tilbage til spørgsmålet", en: "Back to the question" },
  lookupSpokenResume: {
    da: "Tilbage til vurderingen.",
    en: "Back to the assessment.",
  },

  /* Tvivl om hvad ytringen var */
  ambiguousTitle: {
    da: "Var det et svar eller et spørgsmål?",
    en: "Was that an answer or a question?",
  },
  ambiguousBody: {
    da: "Jeg kan læse det begge veje, og jeg gætter ikke på noget der ender i journalen.",
    en: "I can read it both ways, and I do not guess about anything that ends up in the record.",
  },
  ambiguousAsAnswer: { da: "Det var mit svar", en: "That was my answer" },
  ambiguousAsQuestion: { da: "Slå det op", en: "Look it up" },
  ambiguousSpoken: {
    da: "Var det et svar eller et spørgsmål? Sig svar eller opslag.",
    en: "Was that an answer or a question? Say answer or lookup.",
  },
  ambiguousBecause: { da: "Fordi", en: "Because" },

  /* Tilbuddet om at gå fra opslag til handling */
  offerTitle: { da: "Skal jeg føre dig gennem vurderingen?", en: "Shall I take you through the assessment?" },
  offerAccept: { da: "Ja — før mig igennem", en: "Yes — take me through" },
  offerDismiss: { da: "Ikke nu", en: "Not now" },
  offerSpoken: {
    da: "Skal jeg føre dig gennem vurderingen? Sig ja.",
    en: "Shall I take you through the assessment? Say yes.",
  },

  /* Behandlingsopslaget — vores egen vidensbase, i klinisk rækkefølge */
  guideTitle: { da: "Behandlingsguide", en: "Treatment guide" },
  guideAck: { da: "Jeg henter behandlingen.", en: "Fetching the treatment." },
  guideWorking: { da: "Henter behandlingen fra kilderne…", en: "Fetching the treatment from the sources…" },
  guideEmpty: {
    da: "Vores kilder dækker ikke det emne. Vi svarer ikke ud fra almen viden — prøv at spørge litteraturen i stedet.",
    en: "Our sources do not cover that topic. We do not answer from general knowledge — try asking the literature instead.",
  },
  guideSpokenFound: {
    da: "Behandlingen står på skærmen, afsnit for afsnit med kilder.",
    en: "The treatment is on screen, section by section with sources.",
  },
  guideFull: { da: "Åbn hele guiden", en: "Open the full guide" },
  guideAskInstead: { da: "Spørg litteraturen i stedet", en: "Ask the literature instead" },
  guideAsGuideInstead: { da: "Vis behandlingen i stedet", en: "Show the treatment instead" },
  guideSourcesNote: {
    da: "Ordret fra CoSurgs egne kilder. Overskrifterne er vores; teksten er kildens.",
    en: "Verbatim from CoSurg's own sources. The headings are ours; the text is the source's.",
  },

  /*
   * Svarets tre lag. De skal kunne skelnes med et blik: hvad der står i en
   * valideret kilde, hvad der kommer fra litteraturen, og hvad der er
   * ræsonnement. Et blandet svar uden mærkat er farligere end intet svar.
   */
  evidenceExtrapolated: { da: "Ræsonneret", en: "Reasoned" },
  reasoningTitle: { da: "Fagligt ræsonnement — ikke fra en kilde", en: "Clinical reasoning — not from a source" },
  reasoningNote: {
    da: "Ingen af vores kilder svarer direkte på det. Det herunder er slutninger, ikke en retningslinje — vurdér det som sådan.",
    en: "None of our sources answer this directly. What follows is inference, not a guideline — weigh it as such.",
  },
  usedContext: {
    da: "Bygger på det du har fortalt om patienten",
    en: "Built on what you have told me about the patient",
  },
  originKnowledgeBase: { da: "Vidensbase", en: "Knowledge base" },
  originLiterature: { da: "Litteratur", en: "Literature" },

  /* Faldgruber i forløbet */
  pitfallsAtStep: { da: "Pas på her", en: "Watch out here" },

  /* Indgangen */
  intakeThinking: { da: "Et øjeblik — jeg finder ud af hvad du mener…", en: "One moment — working out what you mean…" },
  intakeAlsoAsk: {
    da: "Du kan lige så godt bare stille et spørgsmål — så slår jeg det op med kilder først.",
    en: "You can just as well ask a question — then I look it up with sources first.",
  },
} satisfies Record<string, Record<Lang, string>>;

export function ut(key: keyof typeof u, lang: Lang): string {
  return u[key][lang];
}
