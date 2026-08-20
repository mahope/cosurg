import type { Lang } from "@/lib/tree/types";

export const t = {
  title: { da: "CoSurg", en: "CoSurg" },
  tagline: {
    da: "Stemmestyret klinisk beslutningsstøtte",
    en: "Voice-driven clinical decision support",
  },
  start: { da: "Start vurdering", en: "Start assessment" },
  aboutTeam: { da: "Om & Team", en: "About & Team" },
  aboutTeamIntro: {
    da: "CoSurg er et stemmestyret klinisk beslutningsstøtteværktøj til vurdering og behandling af brandsår, bygget under Corti Hack for Health 2026. Anbefalingen kommer altid fra et klinisk valideret beslutningstræ — AI bruges kun til at fortolke det der bliver sagt, aldrig til at generere selve anbefalingen.",
    en: "CoSurg is a voice-driven clinical decision-support tool for assessment and treatment of surgical and burns patients.",
  },
  aboutTeamSectionTitle: { da: "Teamet bag CoSurg", en: "Our International Expert Panel" },
  aboutTeamSectionIntro: {
    da: "CoSurgs kliniske grundlag er valideret af Nordic Surgery Labs internationale ekspertpanel.",
    en: "",
  },
  aboutOurTeamTitle: { da: "Vores team", en: "Our Team" },
  aboutOurTeamIntro: {
    da: "Redaktører, bidragydere og skabere bag Nordic Surgery Labs platforme.",
    en: "The editors, contributors and creators who build and maintain Nordic Surgery Lab's platforms.",
  },
  listening: { da: "Lytter", en: "Listening" },
  micOff: { da: "Mikrofon slukket", en: "Microphone off" },
  orMode: { da: "Håndfri tilstand", en: "Handsfree mode" },
  orModeOn: { da: "HÅNDFRI TILSTAND AKTIV", en: "HANDSFREE MODE ACTIVE" },
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
    en: "Write note and insert ICD-10 code",
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
    da: "Bygget på valideret faglig viden",
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
  orExit: { da: "Afslut håndfri tilstand", en: "Exit handsfree mode" },

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
  ackOrMode: { da: "Håndfri tilstand aktiv.", en: "Handsfree mode active." },
  needAnswer: {
    da: "Jeg mangler et svar først.",
    en: "I need an answer first.",
  },

  /*
   * Indgangen. Ordet "beslutningstræ" optræder bevidst ikke — det er vores
   * begreb, ikke lægens. Selve invitationen står længere nede, samlet med
   * resten af forsidens tekster.
   */
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

  /* ================================================================== *
   * OPLEVELSEN — ventetid, tomme tilstande, fejlsider, skærmlæsere
   *
   * Lå tidligere i `components/ui/uiText.ts`. Den fil fandtes kun fordi
   * flere agenter skrev i repoet samtidig og en fælles ordbog var det der
   * oftest kolliderede. Der er ro nu, og en app med tre ordbøger taber før
   * eller siden en streng på det ene sprog.
   *
   * Regel som ovenfor: ingen streng må ende blindt. Siger vi at noget tager
   * tid, siger vi hvor lang tid; siger vi at noget gik galt, siger vi hvad
   * man gør i stedet.
   * ================================================================== */

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

  // Tomme tilstande
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

  // Skærmlæser og tastatur
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

  // Svarfeltet — knapper der før stod som løse strenge inde i ResponseBar
  micStart: { da: "Start mikrofon", en: "Start microphone" },
  micStop: { da: "Stop mikrofon", en: "Stop microphone" },
  sendAnswer: { da: "Send svar", en: "Send answer" },

  // Fejlsider
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

  /* ================================================================== *
   * DET SAMLEDE FORLØB — opslag midt i en vurdering
   *
   * Lå tidligere i `components/unified/text.ts`. Sprogtonen er den samme som
   * resten af appen: der tales om «forløb» og «opslag», aldrig om
   * «beslutningstræer» og «chat». Lægen skal ikke kende vores inddeling.
   * ================================================================== */

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

  // Tvivl om hvad ytringen var
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

  // Tilbuddet om at gå fra opslag til handling
  offerTitle: { da: "Skal jeg føre dig gennem vurderingen?", en: "Shall I take you through the assessment?" },
  offerAccept: { da: "Ja — før mig igennem", en: "Yes — take me through" },
  offerDismiss: { da: "Ikke nu", en: "Not now" },
  offerSpoken: {
    da: "Skal jeg føre dig gennem vurderingen? Sig ja.",
    en: "Shall I take you through the assessment? Say yes.",
  },

  /*
   * Behandlingsopslaget — vores egen vidensbase, i klinisk rækkefølge.
   * `guideFetching` hed `guideWorking` i den gamle fil; navnet var optaget af
   * guidesidens egen ventetekst, og de to siger ikke det samme.
   */
  guideAck: { da: "Jeg henter behandlingen.", en: "Fetching the treatment." },
  guideFetching: { da: "Henter behandlingen fra kilderne…", en: "Fetching the treatment from the sources…" },
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

  // Faldgruber i forløbet
  pitfallsAtStep: { da: "Pas på her", en: "Watch out here" },

  /* ================================================================== *
   * INDGANGEN — appens forside, og dermed hele produktet
   *
   * Forsiden skal på egen hånd sige hvad CoSurg ER: ét felt, hvor lægen siger
   * hvad han har, og systemet finder ud af hvad han har brug for — og viser
   * hvor svaret kommer fra. Teksterne herunder må derfor aldrig indsnævre
   * invitationen til «beskriv en patient»; alle tre veje skal nævnes hver gang.
   * ================================================================== */

  intakeThinking: { da: "Et øjeblik — jeg finder ud af hvad du mener…", en: "One moment — working out what you mean…" },

  intakeQuestion: { da: "Sig hvad du står med.", en: "Say what you are looking at." },
  intakeHelp: {
    da: "En patient, et fagligt spørgsmål eller et behandlingsopslag — samme felt. Jeg finder selv ud af hvad du har brug for, og viser hvor svaret kommer fra.",
    en: "A patient, a clinical question or a treatment lookup — one field. I work out what you need, and show you where the answer comes from.",
  },
  intakePlaceholder: {
    da: "Beskriv patienten, stil et spørgsmål, eller slå en behandling op…",
    en: "Describe the patient, ask a question, or look up a treatment…",
  },

  /*
   * Genkendelsen mens den sker. Formen er bevidst «Det ser ud som X — så gør
   * jeg Y»: første halvdel er hvad appen har forstået, anden halvdel er hvad
   * den vil gøre ved det. Lægen skal kunne standse os FØR vi gør det, ikke
   * bagefter.
   */
  senseLabel: { da: "Jeg læser det som", en: "I read this as" },
  sensePathway: { da: "En patient", en: "A patient" },
  sensePathwayDoes: { da: "jeg fører dig gennem vurderingen", en: "I will take you through the assessment" },
  senseQuestion: { da: "Et fagligt spørgsmål", en: "A clinical question" },
  senseQuestionDoes: { da: "jeg slår det op i kilderne", en: "I will look it up in the sources" },
  senseGuide: { da: "Et behandlingsopslag", en: "A treatment lookup" },
  senseGuideDoes: { da: "jeg henter behandlingen fra vidensbasen", en: "I will fetch the treatment from the knowledge base" },
  senseUnsure: { da: "Noget jeg ikke tør afgøre endnu", en: "Something I dare not decide yet" },
  senseUnsureDoes: { da: "skriv lidt mere, så spørger jeg hellere end at gætte", en: "write a little more — I would rather ask than guess" },
  senseIdle: {
    da: "Jeg genkender selv hvad du skriver — beskrivelse, spørgsmål eller opslag.",
    en: "I recognise what you write on my own — description, question or lookup.",
  },

  /*
   * De tre eksempler. De er hverken en menu eller en fanebjælke: et klik
   * FYLDER feltet i stedet for at navigere væk, så det eneste der sker er at
   * genkendelsen tænder. Lægen ser altså evnen blive brugt, ikke beskrevet.
   */
  intakeTry: { da: "Prøv en af disse — de udfylder feltet", en: "Try one — it fills the field" },
  intakeExamplePatient: {
    da: "Mand på 34, kogende vand over højre hånd for en halv time siden",
    en: "34-year-old man, boiling water over the right hand half an hour ago",
  },
  intakeExampleQuestion: {
    da: "Hvor meget væske skal en mand på 80 kilo med 30 procent have?",
    en: "How much fluid does an 80 kg man with 30 % need?",
  },
  intakeExampleGuide: {
    da: "Behandling af cirkulær forbrænding på underarmen",
    en: "Treatment of a circumferential forearm burn",
  },

  /* Sporbarheden — den anden halvdel af påstanden, og lige så synlig. */
  provenanceTitle: { da: "Hvert svar peger på en navngiven kilde", en: "Every answer points to a named source" },
  provenanceBody: {
    da: "Anbefalingen kommer fra et forløb skrevet af plastikkirurger. Opslag citeres ordret fra vidensbasen. Ingen af delene kommer fra en sprogmodels hukommelse — og står der intet i kilderne, siger appen netop det.",
    en: "The recommendation comes from a pathway written by plastic surgeons. Lookups are quoted verbatim from the knowledge base. Neither comes from a language model's memory — and when the sources are silent, the app says exactly that.",
  },
  provenanceSource1: { da: "Dansk Brandsårsforening — brandsaar.dk", en: "Danish Burn Association — brandsaar.dk" },
  provenanceSource2: { da: "VIP-instrukser, Rigshospitalet", en: "VIP guidelines, Rigshospitalet" },
  provenanceSource3: { da: "Afsnit 6052, plastikkirurgi og brandsår", en: "Section 6052, plastic surgery and burns" },

  /* Kvitteringen bagefter: hvad blev genkendt, og hvorfor netop det. */
  recognisedAs: { da: "Genkendt som", en: "Recognised as" },
  recognisedBecause: { da: "fordi", en: "because" },
  originFrom: { da: "Svaret kommer fra", en: "The answer comes from" },
  intakeAlsoAsk: {
    da: "Du kan lige så godt bare stille et spørgsmål — så slår jeg det op med kilder først.",
    en: "You can just as well ask a question — then I look it up with sources first.",
  },
} satisfies Record<string, Record<Lang, string>>;

export function tr(key: keyof typeof t, lang: Lang): string {
  return t[key][lang];
}

/**
 * Begge sprog på én linje. Fejlsider ligger uden for sprogvælgeren — den bor i
 * en tilstand der netop er gået tabt — og skal kunne læses af alle i lokalet.
 */
export function both(key: keyof typeof t): { da: string; en: string } {
  return t[key];
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
