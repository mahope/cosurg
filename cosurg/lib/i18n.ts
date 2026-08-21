import type { Lang } from "@/lib/tree/types";

export const t = {
  title: { da: "CoSurg", en: "CoSurg" },
  tagline: {
    da: "Stemmestyret klinisk beslutningsstøtte",
    en: "Voice-driven clinical decision support",
  },
  start: { da: "Start vurdering", en: "Start assessment" },
  aboutTeam: { da: "Om & Team", en: "About & Team" },
  aboutTeamBackLink: { da: "Beslutningsstøtte", en: "Decision Support" },
  aboutTeamIntro: {
    da: "CoSurg er et stemmestyret klinisk beslutningsværktøj til udredning og behandling af kirurgiske problemstillinger og brandsårspatienter.",
    en: "CoSurg is a voice-driven clinical decision-support tool for assessment and treatment of surgical and burns patients.",
  },
  aboutTeamSectionTitle: { da: "International Expert Panel", en: "International Expert Panel" },
  aboutTeamSectionIntro: {
    da: "CoSurgs kliniske grundlag er valideret af Nordic Surgery Labs internationale ekspertpanel.",
    en: "",
  },
  aboutOurTeamTitle: { da: "Vores team", en: "Our Team" },
  aboutOurTeamIntro: {
    da: "Redaktører, bidragydere og skabere bag Nordic Surgery Labs platforme.",
    en: "Our editors, contributors and creators building CoSurg.",
  },
  aboutAddressTitle: { da: "Adresse", en: "Address" },
  aboutAddressCompany: { da: "Nordic Surgery Lab", en: "Nordic Surgery Lab" },
  // Gadelinjen er den samme i begge sprog; kun etagen skrives om, så et
  // engelsksproget brev stadig kan skrives af på en dansk konvolut.
  aboutAddressStreet: { da: "Bredgade 58A, 4. sal", en: "Bredgade 58A, 4th floor" },
  aboutAddressCity: { da: "1260 København K", en: "1260 Copenhagen K, Denmark" },
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
    // «uddyb» står med: den viden der ligger et sekund væk, er ubrugelig hvis
    // man skal kunne kommandoen udenad for at få fat i den.
    da: "Sig «næste», «gentag», «tilbage», «uddyb» — eller svar direkte.",
    en: "Say “next”, “repeat”, “back”, “elaborate” — or just answer.",
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

  /* ------------------------------------------------------------------ *
   * Eskalationen — set fra begge sider
   *
   * "Ring til vagthavende brandsårslæge" er rigtigt for den yngre læge og
   * cirkulært for specialisten, der selv ER den vagthavende. Mærkaterne her
   * er det der gør de to roller entydige på et halvt sekund; teksterne selv
   * står i træet, sammen med det øvrige kliniske indhold.
   * ------------------------------------------------------------------ */
  escalationTitle: { da: "Eskalation — og hvad der gøres imens", en: "Escalation — and what is done meanwhile" },
  escalationCalling: { da: "Ringer du op", en: "If you are calling" },
  escalationReceiving: { da: "Er du selv vagthavende", en: "If you are the on-call surgeon" },
  escalationActions: { da: "Konkrete trin for denne patient", en: "Concrete steps for this patient" },
  escalationActionsNote: {
    da: "Trinnene kommer fra beslutningstræet og gælder begge roller — det er hvem der beslutter, der er forskellen. Hvert trin bærer sin instruks og kan foldes ud ordret.",
    en: "The steps come from the decision tree and apply to both roles — who decides is the difference. Each step carries its instruction and can be expanded verbatim.",
  },
  escalationSource: { da: "Instruks", en: "Instruction" },
  escalationLoading: {
    da: "Henter handlingstrinnene og deres belæg fra vidensbasen …",
    en: "Fetching the action steps and their backing from the knowledge base …",
  },
  escalationFailed: {
    da: "Handlingstrinnene kunne ikke hentes. Anbefalingen og dens kilder ovenfor står ved magt.",
    en: "The action steps could not be fetched. The recommendation and its sources above still stand.",
  },
  elaborateFromSources: { da: "Uddyb fra kilderne", en: "Elaborate from the sources" },
  elaboratePitfall: { da: "Hvad siger kilderne om", en: "What do the sources say about" },
  /* Håndfri: kirurgen er steril og kan ikke trykke. Så står grebet som et ord. */
  elaborateSay: { da: "Sig «uddyb»", en: "Say “elaborate”" },
  ackElaborate: { da: "Slår det op i kilderne.", en: "Looking it up in the sources." },
  elaborateNothing: {
    da: "Der er ikke et opslag knyttet til det her sted.",
    en: "There is no lookup attached to this point.",
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
  orSwitch: { da: "Slå håndfri tilstand til eller fra", en: "Turn handsfree mode on or off" },
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

  intakeQuestion: { da: "Sig hvad du står med.", en: "Say what you are looking at." },
  intakeHelp: {
    da: "Tal eller skriv. Jeg finder selv ud af resten.",
    en: "Talk or type. I work out the rest myself.",
  },
  intakePlaceholder: {
    da: "Beskriv patienten, stil et spørgsmål, eller send et billede med…",
    en: "Describe the patient, ask a question, or attach an image…",
  },

  /* ------------------------------------------------------------------ *
   * Mikrofonen og billederne på forsiden
   *
   * Forsiden er ét felt og én mikrofon. Teksterne herunder skal derfor
   * kunne bæres af sig selv: der er ingen knapper der forklarer hvad appen
   * kan, og ingen eksempler der demonstrerer det.
   * ------------------------------------------------------------------ */
  intakeMicHint: { da: "Tryk og tal — ordene kommer med det samme", en: "Tap and talk — the words appear straight away" },
  intakeMicListening: { da: "Jeg lytter — tryk igen for at sende", en: "Listening — tap again to send" },
  intakeMicStarting: { da: "Åbner mikrofonen…", en: "Opening the microphone…" },
  /* Dikteringens stilheds-varsel. Nedtællingen står i selve knappen. */
  intakeMicCountdown: { da: "Sender om", en: "Sending in" },
  intakeMicCancel: { da: "Annullér (Esc)", en: "Cancel (Esc)" },
  intakeSend: { da: "Send", en: "Send" },
  intakeAddImage: { da: "Vedhæft billede", en: "Attach image" },
  intakeRemoveImage: { da: "Fjern billede", en: "Remove image" },
  intakeImageOnly: {
    da: "Hvad ser du på dette billede?",
    en: "What do you see in this image?",
  },
  intakeImageTooLarge: { da: "Billedet er for stort — maks. 8 MB.", en: "That image is too large — 8 MB max." },
  intakeImageTooMany: { da: "Du kan sende op til fire billeder.", en: "You can send up to four images." },
  intakeImageNotAnImage: { da: "Kun billeder kan vedhæftes.", en: "Only images can be attached." },
  intakeImageUnreadable: { da: "Billedet kunne ikke læses.", en: "That image could not be read." },
  intakeDropHere: { da: "Slip billedet her", en: "Drop the image here" },

  /*
   * Billedobservationen ved svaret.
   *
   * Mærkatet siger UDTRYKKELIGT at teksten er modelgenereret og ikke en
   * kilde. Alt andet i appens svar bærer et kildenavn, og en beskrivelse af
   * et foto der stod umærket ville arve den troværdighed uden at have den.
   */
  visionLabel: { da: "Billedobservation — modellens beskrivelse, ikke en kilde", en: "Image observation — model-generated, not a source" },
  visionUncertainty: { da: "Hvad billedet ikke kan afgøre", en: "What the image cannot settle" },
  visionQuality: { da: "Billedkvalitet", en: "Image quality" },
  visionFailedLabel: { da: "Billedet indgik ikke i svaret", en: "The image was not part of the answer" },

  /* Triagens statuslinje — det første livstegn på det tunge spor. */
  triageDeep: { da: "Slår op i litteraturen", en: "Searching the literature" },

  /* Faldgruberne der følger med et chatsvar. Rutens egne, med ordret belæg. */
  answerPitfalls: { da: "Faldgruber ved dette emne", en: "Pitfalls on this topic" },

  /* ------------------------------------------------------------------ *
   * Udredningen i chatten
   *
   * Beslutningstræet er ikke længere en skærm man skifter til — det er det
   * agenten udreder med, inde i samtalen. Teksterne skal derfor lyde som en
   * kollega der spørger videre, ikke som en formular der skal udfyldes.
   * ------------------------------------------------------------------ */
  workupLabel: { da: "Udredning", en: "Work-up" },
  workupProgress: { da: "afklaret", en: "settled" },
  workupOf: { da: "af", en: "of" },
  workupAnswerHint: { da: "Svar med et klik — eller skriv det selv", en: "Answer with a tap — or write it yourself" },
  workupPrefilled: { da: "Taget fra din beskrivelse", en: "Taken from your description" },
  workupRedflag: { da: "Rødt flag", en: "Red flag" },
  workupDisposition: { da: "Anbefaling", en: "Recommendation" },
  workupDispositionSources: { da: "Anbefalingen hviler på", en: "The recommendation rests on" },
  workupNoteOffer: {
    da: "Der er nok til et journalnotat nu.",
    en: "There is enough for a clinical note now.",
  },
  workupNoteWrite: { da: "Skriv notatet", en: "Write the note" },
  workupNoteLater: { da: "Ikke nu", en: "Not now" },

  /* Proceduren vist i tråden — Rigshospitalets trin med fotos. */
  procedureLabel: { da: "Procedure", en: "Procedure" },
  procedureFollowUp: {
    da: "Såret skal forbindes. Skal jeg vise proceduren?",
    en: "The wound needs dressing. Shall I show you the procedure?",
  },
  procedureShow: { da: "Vis proceduren", en: "Show the procedure" },

  /*
   * Her lå genkendelsens tekster («Jeg læser det som …»), de tre eksempel-
   * ytringer og sporbarhedskortet. De er fjernet sammen med de flader de
   * hørte til: forsiden er ét felt og én mikrofon, og alt andet på den var
   * noget lægen skulle læse eller vælge før han kunne komme i gang.
   *
   * Sporbarheden er ikke forsvundet — den står hvor den betyder noget: på
   * selve svaret (`LookupCard`s oprindelsesmærkat) og i instrumentpanelets
   * `sourceNote`. En påstand om kilder hører til ved kilden, ikke på en tom
   * startskærm.
   */
  intakeAlsoAsk: {
    da: "Du kan lige så godt bare stille et spørgsmål — så slår jeg det op med kilder først.",
    en: "You can just as well ask a question — then I look it up with sources first.",
  },

  /* ==================================================================
   * TOOLTIPS OG TASTATURGENVEJE
   *
   * En tooltip der gentager knappens etiket er støj. Teksterne herunder
   * siger derfor hvad der SKER når man trykker — ikke hvad knappen hedder.
   * De er korte, fordi de læses i forbifarten af en der har travlt, og de
   * er skrevet i nutid: «optager og skriver ind», ikke «kan bruges til».
   * ================================================================== */

  /* Instrumentpanelet */
  tipHome: {
    da: "Rydder samtalen og starter forfra på en tom skærm",
    en: "Clears the conversation and starts over on an empty screen",
  },
  tipUsage: {
    da: "Viser hvilke Corti-områder denne session faktisk har brugt, og hvad de kostede",
    en: "Shows which Corti areas this session actually used, and what they cost",
  },
  tipLang: {
    da: "Skifter sprog for både skærmen og talen — spørgsmål, svar og oplæsning følger med",
    en: "Switches the language of both screen and speech — questions, answers and read-aloud follow",
  },
  tipHandsfree: {
    da: "Steril betjening: mikrofonen står åben, svarene læses op, og skærmen viser ét trin ad gangen",
    en: "Sterile operation: the microphone stays open, answers are read aloud, and the screen shows one step at a time",
  },
  tipSpeech: {
    da: "Læser spørgsmål og svar op undervejs",
    en: "Reads questions and answers aloud as you go",
  },
  tipTree: {
    da: "Skifter hvilket klinisk beslutningstræ udredningen følger",
    en: "Switches which clinical decision tree the work-up follows",
  },
  tipAbout: {
    da: "Om CoSurg og ekspertpanelet bag det kliniske indhold",
    en: "About CoSurg and the expert panel behind the clinical content",
  },
  tipShortcuts: {
    da: "Alle tastaturgenveje i appen",
    en: "Every keyboard shortcut in the app",
  },

  /* Skrivefeltet og mikrofonen */
  tipMicStart: {
    da: "Optager og skriver det du siger ind i feltet, ord for ord",
    en: "Records and types what you say into the field, word by word",
  },
  tipMicStop: {
    da: "Stopper optagelsen og sender det du har sagt",
    en: "Stops recording and sends what you said",
  },
  tipAddImage: {
    da: "Vedhæft op til fire fotos af såret. De beskrives — de bliver aldrig diagnosticeret",
    en: "Attach up to four wound photos. They are described — never diagnosed",
  },
  tipSend: {
    da: "Sender feltet af sted. Appen afgør selv om det er et spørgsmål, en patient eller et opslag",
    en: "Sends the field. The app works out whether it is a question, a patient or a lookup",
  },
  tipSendAnswer: {
    da: "Sender svaret og går videre til næste spørgsmål",
    en: "Sends the answer and moves on to the next question",
  },
  tipDictate: {
    da: "Diktér et tillæg til journalnotatet — sig «punktum» og «nyt afsnit» undervejs",
    en: "Dictate an addendum to the note — say “full stop” and “new paragraph” as you go",
  },
  tipGenerateNote: {
    da: "Skriver journalnotatet ud fra beslutningsvejen og henter ICD-10-koderne fra Cortis kodnings-API",
    en: "Writes the clinical note from the decision path and pulls the ICD-10 codes from Corti's coding API",
  },
  tipRestart: {
    da: "Kasserer den nuværende vurdering og begynder forfra",
    en: "Discards the current assessment and starts over",
  },
  tipRemoveImage: {
    da: "Fjerner billedet igen — det er endnu ikke sendt nogen steder hen",
    en: "Removes the image again — it has not been sent anywhere yet",
  },

  /* Svaret og dets belæg */
  tipSpeakAnswer: {
    da: "Læser svaret op, så du kan holde øjnene på patienten",
    en: "Reads the answer aloud so you can keep your eyes on the patient",
  },
  tipStopSpeaking: { da: "Afbryder oplæsningen", en: "Stops the read-aloud" },
  tipEvidenceSourced: {
    da: "Hvert led i svaret kan føres tilbage til en navngiven kilde i listen nedenfor",
    en: "Every step of the answer traces back to a named source in the list below",
  },
  tipEvidencePartial: {
    da: "Dele af svaret har kilde; resten er slutninger. Se ræsonnementet for hvilke",
    en: "Parts of the answer are sourced; the rest are inferences. See the reasoning for which",
  },
  tipEvidenceExtrapolated: {
    da: "Ingen kilde dækker spørgsmålet direkte. Svaret er sluttet ud fra beslægtet materiale",
    en: "No source covers the question directly. The answer is inferred from related material",
  },
  tipEvidenceUnsupported: {
    da: "Kilderne dækker ikke spørgsmålet. Svaret må ikke stå alene for en klinisk beslutning",
    en: "The sources do not cover the question. The answer must not stand alone for a clinical decision",
  },
  tipOriginKnowledgeBase: {
    da: "Fra vores egen validerede vidensbase — dansk klinisk praksis",
    en: "From our own validated knowledge base — Danish clinical practice",
  },
  tipOriginLiterature: {
    da: "Fra litteratursøgning: PubMed, retningslinjer og web",
    en: "From a literature search: PubMed, guidelines and the web",
  },
  tipSourceOpen: {
    da: "Åbner kilden i et nyt faneblad",
    en: "Opens the source in a new tab",
  },

  /* Håndfri tilstand */
  tipOrExit: {
    da: "Tilbage til den almindelige skærm. Mikrofonen lukkes",
    en: "Back to the normal screen. The microphone closes",
  },
  tipOrNext: {
    da: "Kvitterer for trinnet og går videre — det samme som at sige «næste»",
    en: "Acknowledges the step and moves on — the same as saying “next”",
  },
  /* Tastaturet er den usterile assistents reserve når mikrofonen svigter. */
  orKeyFallback: { da: "Eller på tastatur", en: "Or on the keyboard" },
  /* Kort udgave til tastelinjen — den fulde etiket står på selve knappen. */
  orExitShort: { da: "Afslut", en: "Exit" },

  /* ------------------------------------------------------------------ *
   * Genvejsoversigten bag «?»
   * ------------------------------------------------------------------ */
  shortcutsTitle: { da: "Tastaturgenveje", en: "Keyboard shortcuts" },
  shortcutsClose: { da: "Luk oversigten", en: "Close the overview" },
  shortcutsNote: {
    da: "Alt-genvejene virker overalt — også midt i en sætning i skrivefeltet. Browserens egne (Ctrl+F, Ctrl+L) er urørte.",
    en: "The Alt shortcuts work everywhere — even mid-sentence in the text field. The browser's own (Ctrl+F, Ctrl+L) are untouched.",
  },
  shortcutsGroupGlobal: { da: "Overalt", en: "Anywhere" },
  shortcutsGroupField: { da: "I skrivefeltet", en: "In the text field" },
  shortcutsGroupOr: { da: "Håndfri tilstand", en: "Handsfree mode" },

  scHelp: { da: "Vis denne oversigt", en: "Show this overview" },
  scFocusField: { da: "Sæt markøren i skrivefeltet", en: "Put the cursor in the text field" },
  scMic: { da: "Start eller stop mikrofonen", en: "Start or stop the microphone" },
  scHandsfree: { da: "Slå håndfri tilstand til eller fra", en: "Turn handsfree mode on or off" },
  scNew: { da: "Ny samtale", en: "New conversation" },
  scLang: { da: "Skift mellem dansk og engelsk", en: "Switch between Danish and English" },
  scSend: { da: "Send det der står i feltet", en: "Send what is in the field" },
  scNewline: { da: "Ny linje i stedet for at sende", en: "New line instead of sending" },
  scHelpChar: {
    da: "Samme oversigt — når markøren ikke står i feltet",
    en: "The same overview — when the cursor is not in the field",
  },
  scCancelDictation: {
    da: "Fortryd dikteringen mens mikrofonen lytter",
    en: "Cancel the dictation while the microphone is listening",
  },
  scOrNext: { da: "Næste trin", en: "Next step" },
  scOrBack: { da: "Et trin tilbage", en: "One step back" },
  scOrRepeat: { da: "Gentag spørgsmålet", en: "Repeat the question" },
  scOrExit: { da: "Afslut håndfri tilstand", en: "Exit handsfree mode" },

  /* Tastenavne der ikke er ét tegn. Enter, Shift og Esc staves ens på begge
     sprog og har derfor ingen nøgle her. */
  keySpace: { da: "Mellemrum", en: "Space" },

  /* Samtalehistorikken */
  historyTitle: { da: "Tidligere samtaler", en: "Previous conversations" },
  historyEmpty: {
    da: "Ingen gemte samtaler endnu. Samtaler gemmes automatisk mens du arbejder.",
    en: "No saved conversations yet. Conversations are saved automatically as you work.",
  },
  // Klinisk indhold på en delt computer er følsomt — det skal stå i UI'et
  // hvor det gemmes, og at det KUN er lokalt.
  historyLocalOnly: {
    da: "Historikken gemmes kun lokalt i denne browser — aldrig på en server. Ryd den hvis computeren deles.",
    en: "History is stored only locally in this browser — never on a server. Clear it if this computer is shared.",
  },
  historyResumeHint: {
    da: "Åbn en samtale for at se den igen og skrive videre.",
    en: "Open a conversation to review it and continue writing.",
  },
  historyDelete: { da: "Slet samtalen", en: "Delete conversation" },
  historyClear: { da: "Ryd historik", en: "Clear history" },
  historyClearConfirm: { da: "Slet alle samtaler?", en: "Delete all conversations?" },
  historyClose: { da: "Luk historikken", en: "Close history" },
  historyQuestionOne: { da: "spørgsmål", en: "question" },
  historyQuestions: { da: "spørgsmål", en: "questions" },

  /* Epic-notatet: AOP-skabelonen, udfyldt deterministisk af kode. */
  epicNoteTitle: { da: "Epic-klart notat", en: "Epic-ready note" },
  epicNoteTemplate: {
    da: "Rigshospitalets AOP-skabelon, udfyldt deterministisk af udredningens svar. Epic-koderne står ordret; *** er felter kun du kan udfylde.",
    en: "Rigshospitalet's AOP template, filled deterministically from the work-up. Epic codes are preserved verbatim; *** marks fields only you can fill.",
  },
  epicNoteCopy: { da: "Kopiér til Epic", en: "Copy for Epic" },
  epicNoteCopied: { da: "Kopieret — sæt ind i Sundhedsplatformen", en: "Copied — paste into Epic" },
  epicNoteOpenOne: { da: "felt (***) venter på din udfyldning", en: "field (***) awaits your input" },
  epicNoteOpenMany: { da: "felter (***) venter på din udfyldning", en: "fields (***) await your input" },
  epicNoteAllFilled: {
    da: "Alle skabelonens felter er udfyldt fra udredningen",
    en: "Every template field was filled from the work-up",
  },
  epicNoteOmitted: { da: "Udeladt (tilstand ikke fundet)", en: "Omitted (condition not found)" },
  epicNoteParkland: {
    da: "Parkland-beregning — regnet i kode, aldrig af en model",
    en: "Parkland calculation — computed in code, never by a model",
  },
  epicNoteFailed: { da: "Epic-notatet kunne ikke udfyldes", en: "The Epic note could not be filled" },

  /* Instrumentpanelets menu og historik-adgang */
  historyButton: { da: "Historik", en: "History" },
  historyShowAll: { da: "Vis alle samtaler", en: "Show all conversations" },
  menuLabel: { da: "Menu", en: "Menu" },
  menuNewSession: { da: "Ny samtale", en: "New conversation" },
  // Kort udgave til telefonens smalle bar — den lange åd mærkenavnet.
  orModeShort: { da: "Håndfri", en: "Handsfree" },
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
