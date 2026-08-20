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
  orMode: { da: "Handsfree mode", en: "Handsfree mode" },
  orModeOn: { da: "OR-tilstand AKTIV", en: "OR MODE ACTIVE" },
  // "Fra" skal betyde fra: netværks-TTS afregnes pr. tegn, så en tvetydig
  // mærkat koster penge hos enhver der tror den er slukket.
  voiceFull: { da: "Oplæsning til", en: "Speech on" },
  voiceKey: { da: "Oplæsning fra", en: "Speech off" },
  redFlag: { da: "RØDT FLAG", en: "RED FLAG" },
  recommendation: { da: "Anbefaling", en: "Recommendation" },
  path: { da: "Beslutningsvej", en: "Decision path" },
  transcript: { da: "Transskript", en: "Transcript" },
  generateNote: { da: "Generér journalnotat", en: "Generate note" },
  intakeGenerateNote: {
    da: "Skriv notat og indsæt ICD-10 kode",
    en: "Skriv notat og indsæt ICD-10 kode",
  },
  note: { da: "Journalnotat", en: "Clinical note" },
  codes: { da: "Koder", en: "Codes" },
  codesSource: {
    da: "Fra Cortis kodnings-API",
    en: "From Corti's coding API",
  },
  candidates: { da: "Forslag til gennemgang", en: "Suggested for review" },
  candidatesNote: {
    da: "Valgfrie koder — en kliniker skal godkende dem, før de sættes.",
    en: "Optional codes — a clinician must approve them before they are used.",
  },
  alternatives: { da: "Alternativer", en: "Alternatives" },
  noCodes: {
    da: "Ingen koder returneret. Koder skal sættes manuelt.",
    en: "No codes returned. Codes must be assigned manually.",
  },
  dictate: { da: "Diktér tillæg", en: "Dictate addendum" },
  stopDictate: { da: "Stop diktering", en: "Stop dictation" },
  restart: { da: "Ny vurdering", en: "New assessment" },
  back: { da: "Tilbage", en: "Back" },
  repeat: { da: "Gentag", en: "Repeat" },
  unclear: { da: "Uklart svar — spørger igen", en: "Unclear answer — asking again" },
  thinking: { da: "Fortolker…", en: "Interpreting…" },
  sources: { da: "Kilder", en: "Sources" },
  sourceNote: {
    da: "Build on validated expert content",
    en: "Build on validated expert content",
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

  /*
   * Indgangen. Lægen beskriver patienten; appen finder forløbet. Ordet
   * "beslutningstræ" optræder bevidst ikke — det er vores begreb, ikke hans.
   */
  intakeQuestion: { da: "Hvad kan jeg hjælpe dig med?", en: "What is this about?" },
  intakeHelp: {
    da: "Beskriv patienten med tale eller tekst - Så hjælper jeg med udredning og behandling.",
    en: "Describe the patient by voice or text — I will find the right pathway.",
  },
  intakePlaceholder: {
    da: "Fx «kogende vand over hånden»…",
    en: "e.g. “boiling water over the hand”…",
  },
  intakeAmbiguous: {
    da: "Det kan være flere forløb — vælg hvilket:",
    en: "This could be more than one pathway — pick which:",
  },
  intakeUnknown: {
    da: "Det kunne jeg ikke henføre til et forløb. Prøv igen, eller vælg selv:",
    en: "I could not match that to a pathway. Try again, or choose yourself:",
  },
  intakePick: { da: "Vælg forløb", en: "Choose pathway" },
  intakeManual: { da: "Eller vælg selv", en: "Or choose yourself" },
  intakeMatched: { da: "Genkendt", en: "Matched" },
  nextPathway: { da: "Næste skridt", en: "Next step" },
  newIntake: { da: "Nyt forløb", en: "New pathway" },

  /*
   * Forbrugspanelet: interessant for os og for dommerne, støj for klinikeren.
   * Det ligger bag et info-ikon og siger kun hvad vi kan gøre rede for.
   */
  usageTitle: { da: "Corti-forbrug i denne session", en: "Corti usage this session" },
  usageUsed: { da: "brugt", en: "used" },
  usageUnused: { da: "ikke brugt", en: "not used" },
  usageCredits: { da: "Credits forbrugt", en: "Credits consumed" },
  usageNoCredits: { da: "ikke oplyst", en: "not reported" },
  usageNote: {
    da: "Credits tælles kun for de kald hvor Corti selv oplyser forbruget. Kodesystemet er icd10int-outpatient — danske SKS-koder er ikke tilgængelige med vores adgang.",
    en: "Credits are counted only for the calls where Corti reports consumption. The coding system is icd10int-outpatient — Danish SKS codes are not available with our access.",
  },
  areaAmbient: { da: "Ambient STT", en: "Ambient STT" },
  areaDictation: { da: "Dictation STT", en: "Dictation STT" },
  areaAgentic: { da: "Agentic framework (fortolkninger)", en: "Agentic framework (interpretations)" },
  areaText: { da: "Text generation (notater)", en: "Text generation (notes)" },
  areaCoding: { da: "Medical coding (system)", en: "Medical coding (system)" },

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

  /*
   * Klinisk chat (/chat). Beslutningstræet svarer på "hvad gør jeg med DENNE
   * patient"; chatten svarer på "hvad siger litteraturen". Sproget her skal
   * holde de to fra hinanden, så ingen forveksler et litteraturopslag med en
   * anbefaling til en konkret patient.
   */
  chatTitle: { da: "Klinisk chat", en: "Clinical chat" },
  chatTagline: {
    da: "Spørg frit — svaret kommer med kilder",
    en: "Ask freely — the answer comes with sources",
  },
  chatBack: { da: "Beslutningstræ", en: "Decision tree" },
  chatPlaceholder: {
    da: "Spørg om brandsår — skriv eller tal…",
    en: "Ask about burns — type or speak…",
  },
  chatSend: { da: "Send spørgsmål", en: "Send question" },
  chatMicStart: { da: "Start mikrofon", en: "Start microphone" },
  chatMicStop: { da: "Stop mikrofon", en: "Stop microphone" },
  chatStop: { da: "Afbryd", en: "Stop" },
  chatNewThread: { da: "Ny samtale", en: "New conversation" },
  chatHandsFree: { da: "Håndfri", en: "Hands-free" },
  chatHandsFreeHint: {
    da: "Mikrofonen er åben, spørgsmål sendes automatisk, og svaret læses op.",
    en: "The microphone stays open, questions are sent automatically, and answers are read aloud.",
  },
  chatWorking: { da: "Arbejder…", en: "Working…" },
  chatSearching: { da: "Søger i litteraturen…", en: "Searching the literature…" },
  chatAckHeard: { da: "Modtaget. Jeg søger i litteraturen.", en: "Got it. Searching the literature." },
  chatSpeakAnswer: { da: "Læs svaret op", en: "Read the answer aloud" },
  chatStopSpeaking: { da: "Stop oplæsning", en: "Stop reading" },
  chatYou: { da: "Læge", en: "Clinician" },
  chatAgentName: { da: "CoSurg", en: "CoSurg" },

  evidenceSourced: { da: "Kildebelagt", en: "Source-backed" },
  evidencePartial: { da: "Delvist belagt", en: "Partly backed" },
  evidenceUnsupported: { da: "Ikke belagt", en: "Not substantiated" },
  chatUnsupportedNote: {
    da: "Agenten fandt ingen kilde der belægger svaret. Behandl det som ubekræftet.",
    en: "The agent found no source that substantiates this. Treat it as unconfirmed.",
  },
  chatLimitations: { da: "Forbehold", en: "Limitations" },
  chatExperts: { da: "Koblet på", en: "Connected to" },
  chatGrounding: {
    da: "Svaret hentes gennem kilderne herunder — ikke fra modellens hukommelse.",
    en: "Answers are retrieved through the sources listed below — not from the model's memory.",
  },
  chatDisclaimer: {
    da: "Litteraturopslag, ikke en ordination. Anbefalingen til en konkret patient kommer fra beslutningstræet.",
    en: "A literature lookup, not a prescription. The recommendation for a specific patient comes from the decision tree.",
  },
  chatRestored: {
    da: "Tråden havde ligget stille — agenten fik et resumé af samtalen med.",
    en: "The thread had been idle — the agent was given a recap of the conversation.",
  },
  chatEmptyTitle: { da: "Hvad vil du vide?", en: "What do you need to know?" },
  chatExample1: {
    da: "Hvor meget væske skal en 80-kilos mand med 30 % forbrænding have det første døgn?",
    en: "How much fluid does an 80 kg man with 30 % TBSA burns need in the first 24 hours?",
  },
  chatExample2: {
    da: "Hvornår skal jeg overveje eskarotomi?",
    en: "When should I consider escharotomy?",
  },
  chatExample3: {
    da: "Hvilke kriterier udløser overflytning til brandsårscenter?",
    en: "Which criteria trigger transfer to a burn centre?",
  },
  chatOffline: {
    da: "Ingen forbindelse — spørgsmålet blev ikke sendt. Prøv igen når nettet er tilbage.",
    en: "No connection — the question was not sent. Try again once you are back online.",
  },
  chatTimedOut: {
    da: "Agenten svarede ikke i tide. Stil spørgsmålet igen, gerne kortere.",
    en: "The agent did not answer in time. Ask again, ideally more briefly.",
  },
  chatFailed: {
    da: "Svaret kunne ikke hentes. Prøv igen.",
    en: "Could not retrieve the answer. Try again.",
  },

  /*
   * De tre opslagsværktøjer: behandlingsguide, faldgruber og struktureret
   * anamnese. De hører til samme app som beslutningstræet, men svarer på et
   * andet spørgsmål: træet siger "hvad gør jeg med DENNE patient", værktøjerne
   * siger "hvad ved vi om det her". Sproget skal holde de to fra hinanden.
   */
  toolTree: { da: "Beslutningsforløb", en: "Decision pathway" },
  toolGuide: { da: "Behandlingsguide", en: "Treatment guide" },
  toolPitfalls: { da: "Faldgruber", en: "Pitfalls" },
  toolInterview: { da: "Anamnese", en: "History taking" },
  toolChat: { da: "Klinisk chat", en: "Clinical chat" },
  toolsLabel: { da: "Opslag", en: "Look up" },

  // Fælles om kilder
  sourceVerbatim: { da: "Ordret fra kilden", en: "Verbatim from the source" },
  sourceOpen: { da: "Åbn kilden", en: "Open the source" },
  sourceDocument: { da: "Dokument", en: "Document" },
  sourceNoCoverage: {
    da: "Ingen dækning i vidensbasen — vi har ikke en kilde til det her.",
    en: "No coverage in the knowledge base — we have no source for this.",
  },
  sourceLookupFailed: {
    da: "Vidensbasen svarede ikke. Det er ikke det samme som at der ingen dækning er.",
    en: "The knowledge base did not answer. That is not the same as there being no coverage.",
  },
  sourceFrom: {
    da: "Alt indhold hentes fra CoSurgs egen vidensbase — brandsaar.dk og teamets materiale.",
    en: "All content comes from CoSurg's own knowledge base — brandsaar.dk and the team's material.",
  },
  sourcesDanish: {
    da: "Kilderne er danske og vises ordret. Overskrifter og forklaringer er oversat.",
    en: "The sources are Danish and shown verbatim. Headings and explanations are translated.",
  },

  // Behandlingsguide
  guideTitle: { da: "Behandlingsguide", en: "Treatment guide" },
  guideTagline: {
    da: "Slå en tilstand op — og få behandlingen i rækkefølge, med kilder",
    en: "Look up a condition — get the treatment in order, with sources",
  },
  guideQuestion: { da: "Hvilken tilstand skal du slå op?", en: "Which condition are you looking up?" },
  guideHelp: {
    da: "Beskriv skaden med stemme eller tekst — fx «dyb dermal forbrænding på hånden».",
    en: "Describe the injury by voice or text — e.g. “deep dermal burn of the hand”.",
  },
  guidePlaceholder: { da: "Fx «cirkulær forbrænding på underarm»…", en: "e.g. “circumferential forearm burn”…" },
  guideWorking: { da: "Slår op i vidensbasen…", en: "Looking it up in the knowledge base…" },
  guideExamples: { da: "Prøv fx", en: "Try for example" },
  guideRoutedCorti: {
    da: "Søgeordene blev oversat til dansk af Cortis agent",
    en: "The search terms were translated to Danish by Corti's agent",
  },
  guideRoutedLocal: {
    da: "Søgeordene kom fra din egen formulering — agenten svarede ikke",
    en: "The search terms came from your own wording — the agent did not answer",
  },
  guideNothing: {
    da: "Ingen af vores kilder dækker det emne. Vi svarer ikke ud fra almen viden.",
    en: "None of our sources cover that topic. We do not answer from general knowledge.",
  },
  guideOffTopic: {
    da: "Vidensbasen dækker brandsår, skoldninger, ætsninger og forfrysninger — ikke dette.",
    en: "The knowledge base covers burns, scalds, chemical burns and frostbite — not this.",
  },
  guideSectionEmpty: { da: "Ingen dækning i vores kilder", en: "No coverage in our sources" },
  guideStartTree: { da: "Før mig gennem forløbet", en: "Take me through the pathway" },
  guideFailed: {
    da: "Opslaget kunne ikke gennemføres. Prøv igen.",
    en: "The lookup could not be completed. Try again.",
  },

  // Faldgruber
  pitfallsTitle: { da: "Faldgruber", en: "Pitfalls" },
  pitfallsTagline: {
    da: "Det erfarne ved — og som overses når det går stærkt",
    en: "What the experienced know — and what gets missed under pressure",
  },
  pitfallsHere: { da: "Relevant lige her", en: "Relevant right here" },
  pitfallsWhyItMatters: { da: "Hvad der går galt", en: "What goes wrong" },
  pitfallsCritical: { da: "Kritisk", en: "Critical" },
  pitfallsImportant: { da: "Vigtig", en: "Important" },
  pitfallsOurWording: {
    da: "Overskriften er vores. Udsagnet nedenunder er kildens.",
    en: "The headline is ours. The statement below is the source's.",
  },
  pitfallsNoneHere: {
    da: "Ingen faldgruber knyttet til dette trin.",
    en: "No pitfalls attached to this step.",
  },
  pitfallsLoading: { da: "Henter faldgruber…", en: "Loading pitfalls…" },
  pitfallsAll: { da: "Alle faldgruber", en: "All pitfalls" },

  // Struktureret anamnese
  interviewTitle: { da: "Struktureret anamnese", en: "Structured history" },
  interviewTagline: {
    da: "Fortæl om patienten — jeg holder styr på hvad der mangler",
    en: "Tell me about the patient — I keep track of what is missing",
  },
  interviewPlaceholder: {
    da: "Fx «34-årig mand, kogende vand over højre hånd for 40 minutter siden, ingen allergier, tager Eliquis»…",
    en: "e.g. “34-year-old man, boiling water over the right hand 40 minutes ago, no allergies, on apixaban”…",
  },
  interviewMissing: { da: "Mangler stadig", en: "Still missing" },
  interviewCaptured: { da: "Optaget", en: "Recorded" },
  interviewComplete: { da: "Anamnesen er komplet", en: "The history is complete" },
  interviewAskNext: { da: "Spørg om det næste", en: "Ask the next one" },
  interviewAskAloud: { da: "Læs spørgsmålet op", en: "Read the question aloud" },
  interviewOptional: { da: "Valgfrit", en: "Optional" },
  interviewRequired: { da: "Skal med", en: "Required" },
  interviewClear: { da: "Ryd", en: "Clear" },
  interviewReset: { da: "Ny anamnese", en: "New history" },
  interviewSummary: { da: "Anamnese til journalen", en: "History for the record" },
  interviewCopy: { da: "Kopiér", en: "Copy" },
  interviewCopied: { da: "Kopieret", en: "Copied" },
  interviewHeard: { da: "Hørt og henført", en: "Heard and assigned" },
  interviewNothingHeard: {
    da: "Det kunne jeg ikke henføre til et felt — svar direkte på feltet i stedet.",
    en: "I could not assign that to a field — answer the field directly instead.",
  },
  interviewHowItWorks: {
    da: "Genkendelsen sker her i browseren og er forudsigelig: appen viser hvad den hørte, og hvor den lagde det. Den gætter ikke.",
    en: "Recognition happens here in the browser and is predictable: the app shows what it heard and where it put it. It does not guess.",
  },
  interviewProgress: { da: "udfyldt", en: "recorded" },
  interviewSectionInjury: { da: "Skaden", en: "The injury" },
  interviewSectionPatient: { da: "Patienten", en: "The patient" },
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
