"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { ChatImage } from "@/components/attachments";
import burnsTree from "@/content/trees/burns.json";
import { advance, getDisposition, getNode, goBack, questionText, startSession } from "@/lib/tree/engine";
import type { AnsweredStep, DecisionTree, Lang, SessionState, TreeNode } from "@/lib/tree/types";
import { useTranscribe } from "@/lib/audio/useTranscribe";
import { useDictation } from "@/lib/audio/useDictation";
import { prefetchSpeech, speak, stopSpeaking } from "@/lib/audio/speak";
import { failureMessage, micMessage, tr } from "@/lib/i18n";
import { ControlRail } from "@/components/ControlRail";
import { QuestionCard } from "@/components/QuestionCard";
import { DispositionCard } from "@/components/DispositionCard";
import { RedFlagBanner } from "@/components/RedFlagBanner";
import { SidebarPath } from "@/components/SidebarPath";
import { TranscriptPanel } from "@/components/TranscriptPanel";
import { NotePanel, type NoteResult } from "@/components/NotePanel";
import { OrView } from "@/components/OrView";
import type { TreeSummary } from "@/components/TreePicker";
import { BrandWatermark } from "@/components/BrandMark";
import { isEcho, matchCommand, type VoiceCommand } from "@/components/voiceCommands";
import { IntakeCard } from "@/components/IntakeCard";
import { followUpTreeId } from "@/components/treeRouting";
import type { SessionUsage } from "@/components/UsagePanel";
import { useClinicalChat } from "@/components/chat/useClinicalChat";
import type { ChatAnswer } from "@/lib/corti/chat";
import {
  classifyUtterance,
  looksLikeGuideTopic,
  looksLikeQuestion,
  matchAffirmative,
  matchIntentChoice,
  matchNoteRequest,
} from "@/components/unified/intent";
import { IntentChoiceCard, LookupCard, type LookupPayload } from "@/components/unified/LookupCard";
import { ChatThread } from "@/components/unified/ChatThread";
import { fetchGuide, type GuideSvar } from "@/components/unified/guide";
import { spokenText } from "@/components/unified/spoken";
import { PitfallRail } from "@/components/pitfalls/PitfallRail";
import { NoteSkeleton } from "@/components/ui/Skeleton";

/**
 * Brandsårstræet er bundtet med, så første skærmbillede står med det samme —
 * ingen loading-tilstand foran demoen. Alle andre træer hentes fra /api/tree.
 */
const initialTree = burnsTree as unknown as DecisionTree;

/** Motorens kvitteringsværdi for en trin-node: kanten er "*", så alt matcher. */
const STEP_VALUE = "done";

/*
 * Frister på klientens netværkskald.
 *
 * Uden dem findes ventetiden "for evigt": en fetch mod et dødt net hænger til
 * nogen genindlæser siden, og imens står der "Fortolker…" på skærmen. Kirurgen
 * på scenen ved ikke at han skal genindlæse — så appen skal selv give op og
 * sige hvad man gør i stedet.
 *
 * Fristerne er sat ud fra MÅLT latens (interpret 1,4–2,8 s varm, note 14–16 s)
 * med rigelig luft, så et kald der ville være lykkedes aldrig afbrydes. Det
 * første kald i en session er markant langsommere end de følgende — en frist
 * på 8 s afbrød her et fortolkningskald der var på vej til at lykkes — så
 * loftet ligger et godt stykke over den varme måling. Notatet får sin egen,
 * meget længere frist: det er langsomt af natur, ikke i uføre.
 */
const TIMEOUT_INTERPRET = 15_000;
const TIMEOUT_NOTE = 40_000;
const TIMEOUT_TREE = 10_000;

/**
 * En trin-node er en instruktion uden svar — procedureguidens tolv trin. Den
 * kvitteres med "næste" i stedet for at besvares. Vi behandler også en ren
 * gennemgangsnode (ingen svarmuligheder, én "*"-kant) som et trin, så et træ
 * kan lægge information ind uden at skulle erklære en ny svartype.
 */
/**
 * Hvor et opslag skal hentes fra.
 *
 * "auto" er hovedvejen: appen afgør selv. De to andre findes kun så lægen kan
 * skifte til den anden kilde uden at stille spørgsmålet igen.
 */
type LookupMode = "auto" | "chat" | "guide";

function isStepLike(node: TreeNode): boolean {
  if (node.answerType === "step") return true;
  if (node.answerType === "number") return false;
  if (node.options && node.options.length > 0) return false;
  return node.edges.length === 1 && node.edges[0].when === "*";
}

export default function Home() {
  const [lang, setLang] = useState<Lang>("da");
  const [orMode, setOrMode] = useState(false);
  /*
   * Oplæsning er slået FRA indtil klinikeren selv slår den til. Netværks-TTS
   * afregnes pr. tegn, og en app der taler uopfordret koster penge hos enhver
   * der åbner den — også dem der sidder uden lyd på maskinen.
   */
  const [fullVoice, setFullVoice] = useState(false);
  const [tree, setTree] = useState<DecisionTree>(initialTree);
  /*
   * Listen sås med det bundtede træ. Uden det ville et netværksudfald efterlade
   * indgangsskærmen uden ét eneste forløb at vælge — appen ville være tom fra
   * første sekund. Ruten fylder resten på når den svarer.
   */
  const [trees, setTrees] = useState<TreeSummary[]>([
    {
      id: initialTree.id,
      name: initialTree.name,
      version: initialTree.version,
      authors: initialTree.authors,
    },
  ]);
  const [treeBusy, setTreeBusy] = useState(false);
  /*
   * Sessionen er ikke begyndt før et forløb er valgt. Indtil da står der ét
   * spørgsmål på skærmen — "Hvad kan jeg hjælpe dig med?" — og træet bagved er blot
   * det bundtede udgangspunkt, ikke et valg vi har truffet for lægen.
   */
  const [started, setStarted] = useState(false);
  /** Ytringen vi ikke kunne henføre, og de forløb der var i spil. */
  const [intakeMiss, setIntakeMiss] = useState<{ text: string; candidates: string[] } | null>(null);
  /*
   * Kladden i indgangsfeltet. Den bor HER og ikke kun i feltet, fordi
   * MIKROFONEN skriver ind i den: hvert færdigt talesegment lægges bagest, så
   * lægen kan tale en hel case ind, se ordene komme, rette i dem og først
   * sende når han er færdig. Talen sender altså ikke af sig selv på forsiden —
   * det ville gøre en tænkepause til en afsendelse.
   */
  const [draft, setDraft] = useState("");
  const [state, setState] = useState<SessionState>(() => startSession(initialTree, "da"));
  const [transcript, setTranscript] = useState<string[]>([]);
  const [status, setStatus] = useState<string | null>(null);
  const [flash, setFlash] = useState<string | null>(null);
  const [note, setNote] = useState<NoteResult | null>(null);
  const [dictation, setDictation] = useState("");
  /*
   * Tillægsfeltet er en EGEN tilstand, ikke det samme som "mikrofonen kører".
   * Nægtes mikrofonen, ville et felt bundet til diktatets tilstand aldrig komme
   * frem — og så ville beskeden "skriv svaret i feltet nedenfor" pege på et felt
   * der ikke findes. Feltet åbner derfor på klik, uanset om lyden kom op.
   */
  const [addendumOpen, setAddendumOpen] = useState(false);
  const [noteBusy, setNoteBusy] = useState(false);
  /*
   * Hvad vi faktisk har brugt hos Corti. Feltet tælles først op når kaldet er
   * lykkedes — et forsøg er ikke et forbrug, og vi vil kunne stå inde for hvert
   * tal vi viser.
   */
  const [usage, setUsage] = useState<SessionUsage>({
    ambient: false,
    dictation: false,
    interpretations: 0,
    notes: 0,
    codingSystem: null,
    credits: null,
  });
  const busyRef = useRef(false);

  /*
   * OPSLAGET — det der før var en selvstændig chatside.
   *
   * Lægen skal ikke vide at vi internt har "træer" og "chat". Han taler, og
   * appen finder ud af om ytringen er et svar i forløbet eller et fagligt
   * spørgsmål. Samtalen er den samme hook som chatsiden bruger; den er blot
   * flyttet ind i forløbet i stedet for at ligge ved siden af det.
   *
   * Der er stadig kun ÉN mikrofon. `useClinicalChat` rører ikke lyd — den
   * sender tekst og læser SSE — så den ene lytter i `useTranscribe` kan dele
   * sin tekst mellem de to formål uden at nogen slås om `getUserMedia`.
   */
  const {
    turns: lookupTurns,
    ask: askLookup,
    reset: resetLookup,
    currentWorkup,
  } = useClinicalChat(lang);
  const [lookupOpen, setLookupOpen] = useState(false);
  const [lookupStatus, setLookupStatus] = useState<string | null>(null);
  /*
   * Behandlingsopslaget. Det bor for sig selv og ikke i chattens tur-liste,
   * fordi det er en anden slags svar fra en anden kilde: vores egen vidensbase,
   * ordret og i klinisk rækkefølge, i stedet for litteraturen. Kun ét ad gangen
   * — et opslagsværk har ingen tråd at huske.
   */
  const [guideLookup, setGuideLookup] = useState<{
    question: string;
    guide: GuideSvar | null;
    error: string | null;
  } | null>(null);
  const [speakingTurn, setSpeakingTurn] = useState<string | null>(null);
  /** Ytringen vi ikke turde afgøre — vist som et valg frem for et gæt. */
  const [ambiguity, setAmbiguity] = useState<{ text: string; reasons: string[] } | null>(null);
  /** Tilbuddet om at gå fra opslag til forløb, når svaret er landet. */
  const [offer, setOffer] = useState<{ treeId: string; name: string } | null>(null);
  /**
   * Proceduren vist i tråden — alle trin med Rigshospitalets fotos.
   *
   * Den bor her og ikke i samtalen, fordi den ikke ER en samtale: det er et
   * opslagsværk lægen bad om at få vist. Kun ét ad gangen; en ny anmodning
   * afløser den forrige.
   */
  const [procedure, setProcedure] = useState<{ question: string; tree: DecisionTree } | null>(null);
  const lookupBusyRef = useRef(false);
  /**
   * Notatfunktionen, nået gennem et ref.
   *
   * `handleUtterance` skal kunne udløse den ("skriv notatet"), men står før
   * den i filen. Reffet holder altid den nyeste udgave, så ordren aldrig
   * kommer til at kalde en funktion der husker en forældet session.
   */
  const generateNoteRef = useRef<(fra?: { treeId: string; path: AnsweredStep[] }) => void>(() => {});

  const node = state.currentNodeId ? getNode(tree, state.currentNodeId) : undefined;
  const disposition = state.dispositionId ? getDisposition(tree, state.dispositionId) : undefined;
  const speakAll = orMode || fullVoice;
  const canAdvance = !!node && isStepLike(node);

  /*
   * Lægens tillæg dikteres — det er et andet Corti-produkt end den ambiente
   * lytning, og forskellen er reel i journalen: her bliver "komma" og "punktum"
   * til tegn, og tal og mål sættes som i et journalnotat. Kun det færdige
   * segment (onFinal) skrives ind; hookets `interim` er ubehandlet
   * forhåndsvisning og indeholder stadig selve ordet "punktum".
   */
  const appendDictation = useCallback((text: string) => {
    setDictation((prev) => `${prev} ${text}`.trim());
  }, []);

  const {
    dictating,
    interim: dictationInterim,
    error: dictationError,
    start: startDictation,
    stop: stopDictation,
  } = useDictation({ lang, onFinal: appendDictation });

  /*
   * Ekko-spærre. I OR-tilstand står mikrofonen altid åben, også mens appen selv
   * taler — så TTS'ens ord kommer retur som transskript. Uden dette ville en
   * kvittering kunne udløse den kommando den kvitterede for, i ring.
   *
   * Spærren er et TIDSSTEMPEL og ikke et flag: bliver en oplæsning afbrudt midt
   * i (speak() stopper altid den forrige), kan et flag hænge fast for evigt og
   * gøre appen døv. Et tidsstempel heler sig selv.
   */
  const quietUntilRef = useRef(0);
  const spokenRef = useRef("");

  const say = useCallback(
    (text: string): Promise<void> => {
      spokenRef.current = text;
      // Grovt varighedsestimat; strammes ind når oplæsningen faktisk er slut.
      const estimate = 1200 + text.length * 70;
      quietUntilRef.current = Date.now() + estimate;

      /*
       * Oplæsningen kappes af et loft. speak() lover at resolve når lyden er
       * slut, men en afbrudt <audio> eller en browserstemme uden onend kan lade
       * løftet hænge for evigt — og alt der venter på kvitteringen ville så
       * aldrig ske. Klinisk styring må ikke kunne dø af en lydfejl.
       */
      const capped = new Promise<void>((resolve) => setTimeout(resolve, estimate + 2000));
      return Promise.race([speak(text, lang), capped]).then(() => {
        quietUntilRef.current = Math.min(quietUntilRef.current, Date.now() + 700);
      });
    },
    [lang],
  );

  /**
   * Er ytringen vores egen stemme? Kommandoer spærres altid, mens svar kun
   * spærres når de er lange nok til utvivlsomt at være ekko — et kort svar må
   * aldrig tabes bare fordi ordet også stod i spørgsmålet.
   */
  const isSelfEcho = useCallback((text: string, isCommand: boolean) => {
    if (Date.now() >= quietUntilRef.current) return false;
    if (!isEcho(text, spokenRef.current)) return false;
    return isCommand || text.trim().split(/\s+/).length >= 4;
  }, []);

  const askCurrent = useCallback(
    (s: SessionState, t: DecisionTree = tree) => {
      const n = s.currentNodeId ? getNode(t, s.currentNodeId) : undefined;
      if (!n) return;
      if (speakAll) void say(questionText(n, s.lang, orMode));
    },
    [speakAll, orMode, say, tree],
  );

  /*
   * Et opslag varer målt 35-70 sekunder, og imens kan lægen have svaret på
   * noden, være rykket videre eller have skiftet forløb. Den asynkrone
   * afslutning må derfor ikke lukke op i den tilstand den startede med — den
   * skal se på hvor vi ER, når svaret lander.
   */
  const stateRef = useRef(state);
  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  /**
   * Slå spørgsmålet op, og vend tilbage til præcis samme sted i forløbet.
   *
   * "Vend tilbage" er et lidt for stort ord for hvad der faktisk sker, og det er
   * med vilje: vi forlader ALDRIG noden. Beslutningsvejen røres ikke, det aktive
   * spørgsmål bliver stående på skærmen, og opslaget lægger sig under det. Der
   * er derfor ingen tilstand at gemme og hente frem igen — og dermed intet der
   * kan gå tabt undervejs. Det eneste vi gør bagefter er at stille spørgsmålet
   * højt igen, så den der ikke kigger på skærmen ved hvor han er.
   */
  const runLookup = useCallback(
    async (
      question: string,
      suggestTreeId?: string | null,
      mode: LookupMode = "auto",
      /**
       * Billeder lægen sendte med. De rejser KUN til litteraturvejen:
       * behandlingsopslaget er ordret tekst fra vores egen vidensbase og har
       * intet at se med. Et billede er derfor i sig selv et valg af vej.
       */
      images?: ChatImage[],
    ) => {
      if (lookupBusyRef.current) return;
      lookupBusyRef.current = true;

      /*
       * Ytringen er et spørgsmål, ikke en oplysning om patienten. Nåede den
       * transskriptet — fordi vi først var i tvivl og spurgte — tages den ud
       * igen her. Ét sted, så det gælder uanset hvilken vej opslaget kom i
       * gang. Transskriptet fodrer både journalnotatet og kodningen, og et
       * spørgsmål derinde kan blive til en påstand om patienten.
       */
      setTranscript((prev) => {
        const i = prev.lastIndexOf(question);
        return i === -1 ? prev : [...prev.slice(0, i), ...prev.slice(i + 1)];
      });

      setAmbiguity(null);
      setOffer(null);
      setLookupOpen(true);

      /*
       * Hvilken slags svar? Se `looksLikeGuideTopic` for hvorfor det valg
       * TRÆFFES frem for at blive lagt ud til lægen.
       *
       * I OR-tilstand vælger vi dog altid litteraturen, uanset spørgsmålets
       * form. Kirurgen er steril og kigger ikke på skærmen — den viser
       * proceduretrinnet — og chatten er den eneste af de to der kan læses HØJT
       * som ét kort, kildebelagt svar. Et opslagsværk i otte afsnit kan ikke.
       */
      const hasImages = !!images && images.length > 0;
      const useGuide =
        !hasImages && (mode === "guide" || (mode === "auto" && !orMode && looksLikeGuideTopic(question)));

      setLookupStatus(tr(useGuide ? "guideFetching" : "lookupWorking", lang));
      if (speakAll) void say(tr(useGuide ? "guideAck" : "lookupAck", lang));

      /** Fælles afslutning: tilbyd forløbet, læs op, og vend tilbage til noden. */
      const finish = async (spoken: string | null) => {
        if (suggestTreeId) {
          const t = trees.find((x) => x.id === suggestTreeId);
          if (t) setOffer({ treeId: t.id, name: t.name[lang] });
        }
        if (!speakAll || !spoken) return;
        await say(spoken);
        if (suggestTreeId) {
          void say(tr("offerSpoken", lang));
        } else if (stateRef.current.currentNodeId) {
          await say(tr("lookupSpokenResume", lang));
          askCurrent(stateRef.current);
        }
      };

      try {
        if (useGuide) {
          setGuideLookup({ question, guide: null, error: null });
          try {
            const guide = await fetchGuide(question, lang);
            setGuideLookup({ question, guide, error: null });
            // Guiden har intet talt resumé — otte afsnit ordret fra kilderne kan
            // ikke læses højt. Vi siger at den står der, og lader øjnene om det.
            await finish(guide.covered > 0 ? tr("guideSpokenFound", lang) : tr("guideEmpty", lang));
          } catch (err) {
            setGuideLookup({ question, guide: null, error: failureMessage(err, "tree", lang) });
          }
          return;
        }

        setGuideLookup(null);
        /*
         * Det appen allerede ved om patienten sendes med.
         *
         * Det er hele forskellen på et opslagsværk og en kollega: "hvor meget
         * væske?" kan ikke besvares uden arealet, og arealet står allerede i
         * beslutningsvejen. Vi sender de BESVAREDE trin — lægens egne ord, ikke
         * vores maskinværdier — så agenten kan gøre et generelt svar konkret.
         *
         * Anbefalingen kommer stadig fra træet. Agenten får konteksten som
         * OPLYSNINGER og skal selv mærke hvad der er ræsonnement.
         */
        const patientContext =
          stateRef.current.path.length > 0
            ? stateRef.current.path.map((p) => `- ${p.question} ${p.rawAnswer}`).join("\n")
            : undefined;

        const { answer } = await askLookup(question, patientContext, images);
        if (answer) await finish(spokenText(answer, lang));
      } finally {
        lookupBusyRef.current = false;
        setLookupStatus(null);
      }
    },
    [lang, orMode, speakAll, say, askCurrent, askLookup, trees],
  );

  /**
   * Skift til den anden slags svar på det samme spørgsmål.
   *
   * Fordi valget mellem behandlingsguide og litteratur er TRUFFET og ikke
   * spurgt om, skal det kunne gøres om uden at spørgsmålet skal stilles igen.
   */
  const switchLookup = useCallback(() => {
    const spoergsmaal = guideLookup?.question ?? lookupTurns[lookupTurns.length - 1]?.question;
    if (!spoergsmaal) return;
    void runLookup(spoergsmaal, null, guideLookup ? "chat" : "guide");
  }, [guideLookup, lookupTurns, runLookup]);

  const resetSession = useCallback(
    (t: DecisionTree, nextLang: Lang) => {
      stopSpeaking();
      stopDictation();
      const fresh = startSession(t, nextLang);
      setState(fresh);
      setTranscript([]);
      setNote(null);
      setDictation("");
      setAddendumOpen(false);
      setFlash(null);
      setStatus(null);
      /*
       * Et nyt forløb er en ny patient. Opslaget fra den forrige — og Cortis
       * tråd bag det — hører ikke med over: "og hvis han er et barn?" må ikke
       * kunne henvise til en anden patients spørgsmål.
       */
      resetLookup();
      setGuideLookup(null);
      setProcedure(null);
      setLookupOpen(false);
      setLookupStatus(null);
      setAmbiguity(null);
      setOffer(null);
      return fresh;
    },
    [stopDictation, resetLookup],
  );

  /**
   * Hent et forløb. Det bundtede brandsårstræ leveres uden netværkskald — det
   * er både hurtigere og det eneste forløb der stadig kan startes hvis nettet
   * er væk midt i demoen.
   */
  const loadTree = useCallback(async (id: string): Promise<DecisionTree> => {
    if (id === initialTree.id) return initialTree;
    const res = await fetch(`/api/tree?id=${encodeURIComponent(id)}`, {
      signal: AbortSignal.timeout(TIMEOUT_TREE),
    });
    if (!res.ok) throw new Error("tree");
    return (await res.json()) as DecisionTree;
  }, []);

  /**
   * Start et forløb. Altid en frisk session: en halv beslutningsvej fra et
   * andet forløb ville være klinisk meningsløs.
   */
  const beginTree = useCallback(
    async (id: string, seedTranscript?: string) => {
      if (treeBusy) return;
      setTreeBusy(true);
      try {
        const next = await loadTree(id);
        setTree(next);
        setIntakeMiss(null);
        setStarted(true);
        setDraft("");
        askCurrent(resetSession(next, lang), next);
        // Lægens egen beskrivelse er den første kliniske oplysning i sagen —
        // den skal med i transskriptet og dermed i notatet, ikke kasseres som
        // en menu-betjening.
        if (seedTranscript) setTranscript([seedTranscript]);
      } catch (err) {
        // Det aktive forløb står urørt tilbage — et mislykket skift må ikke
        // efterlade sessionen halvt i ét forløb og halvt i et andet.
        setStatus(failureMessage(err, "tree", lang));
      } finally {
        setTreeBusy(false);
      }
    },
    [treeBusy, lang, loadTree, askCurrent, resetSession],
  );

  /**
   * Indgangen: lægen siger hvad det drejer sig om, og appen finder ud af resten.
   *
   * Der er to slags ytringer her, og de ligner hinanden mere end man skulle tro.
   * "En mand har fået kogende vand over hånden" er en PATIENT — den skal starte
   * et forløb. "Hvornår skal en brandsårspatient overflyttes?" er et
   * SPØRGSMÅL — og det rammer præcis de samme ord i forløbets ordliste. Uden
   * spørgsmålsprøven ville appen starte en vurdering af en patient der ikke
   * findes, og lægen ville stå med "Hvad er skadesmekanismen?" på et opslag.
   *
   * Forløbsgenkendelsen er konservativ med vilje. Rammer ytringen to forløb
   * lige godt — "forbinding på en hånd med brandsår" gør — så spørger vi. At
   * starte det forkerte forløb er værre end at bruge to sekunder på at spørge.
   */
  const handleIntake = useCallback(
    async (text: string, images?: ChatImage[]) => {
      /*
       * Et billede er altid et spørgsmål.
       *
       * Lægen fotograferer et sår fordi han er i tvivl om det han ser — ikke
       * for at starte et forløb. Vi sender derfor billedet til opslaget og
       * springer forløbsgenkendelsen over: at åbne en brandsårsvurdering på et
       * foto ville være at gætte på en diagnose ud fra en fil.
       */
      if (images && images.length > 0) {
        setIntakeMiss(null);
        void runLookup(text, null, "chat", images);
        return;
      }

      /*
       * ALT går i chatten. Der er ikke længere en anden skærm at komme til.
       *
       * Beslutningstræerne er ikke afskaffet — de har skiftet rolle. Før var
       * en patientbeskrivelse en kommando der skiftede til trævisningen med
       * ét spørgsmål ad gangen og sit eget sidepanel. Nu er træet det agenten
       * UDREDER med: den stiller de manglende spørgsmål som chatbeskeder
       * (`workup`-begivenheden) og springer alt over som lægen allerede har
       * fortalt. Derfor findes der ikke længere en ytring der "hører til" et
       * andet sted end tråden.
       *
       * Det gør indgangen så enkel som forsiden lover: lægen taler eller
       * skriver, og samtalen fortsætter. Ingen vej herfra kan ende blindt —
       * chatten kan altid svare, spørge videre, eller ærligt sige at kilderne
       * er tavse.
       */
      setIntakeMiss(null);
      void runLookup(text, null);
    },
    [runLookup],
  );

  /**
   * Kvittér og ryk. Rækkefølgen er bevidst: skærmen skifter FØRST (den visuelle
   * kvittering må ikke vente på lyd), derefter siger agenten kort at den
   * forstod, og først bagefter læses næste instruktion op. Kirurgen ved altså
   * at "næste" landede, før han hører hvad det næste er.
   */
  const acknowledgeAndAdvance = useCallback(async () => {
    const { state: next, redFlag } = advance(tree, state, STEP_VALUE, tr("stepDone", lang));
    setState(next);
    setStatus(null);

    if (redFlag) {
      setFlash(redFlag.message);
      await say(redFlag.message); // røde flag læses ALTID op
      return;
    }

    if (speakAll) await say(tr("ackNext", lang));

    if (next.dispositionId) {
      const d = getDisposition(tree, next.dispositionId);
      if (d && speakAll) void say(`${d.title[lang]}. ${d.guidance[lang]}`);
    } else {
      askCurrent(next);
    }
  }, [tree, state, lang, speakAll, askCurrent, say]);

  /**
   * Kvittér et rødt flag og kør videre. Et flag der pegede på en disposition
   * efterlod ellers anbefalingen på skærmen uden at nogen sagde den — og det er
   * netop eskaleringen (cirkulær skade, inhalation) hvor lægen ikke kigger på
   * skærmen. Derfor læses dispositionen op her, uanset stemmetilstand.
   */
  const acknowledgeFlash = useCallback(async () => {
    setFlash(null);
    if (speakAll) await say(tr("ackFlag", lang));
    if (state.dispositionId) {
      const d = getDisposition(tree, state.dispositionId);
      if (d && speakAll) void say(`${d.title[lang]}. ${d.guidance[lang]}`);
    } else {
      askCurrent(state);
    }
  }, [state, tree, lang, askCurrent, say, speakAll]);

  /**
   * Kommandoer spærres kun af en kort dublet-vagt, ALDRIG af oplæsningen.
   * STT leverer af og til den samme ytring to gange, og to "næste" i samme
   * øjeblik må ikke springe to trin — men kirurgen skal til gengæld kunne
   * afbryde en lang instruktion med "næste" uden at vente på at den er læst
   * færdig. Derfor et tidsstempel og ikke det busyRef der beskytter
   * svarfortolkningen.
   */
  const lastCommandRef = useRef(0);

  /**
   * Løbenummer på svarfortolkninger. En kommando går FORUD for en igangværende
   * fortolkning: siger nogen noget i baggrunden, sættes et agent-kald i gang, og
   * uden dette ville kirurgens "næste" blive tabt i det sekund kaldet varer.
   * Kommandoen bumper nummeret, og det forældede svar kasseres når det lander.
   */
  const interpretSeqRef = useRef(0);

  const runCommand = useCallback(
    async (cmd: VoiceCommand) => {
      const now = Date.now();
      if (now - lastCommandRef.current < 700) return;
      lastCommandRef.current = now;

      interpretSeqRef.current += 1;
      busyRef.current = false;

      if (cmd === "orMode") {
        if (!orMode) {
          setOrMode(true);
          await say(tr("ackOrMode", lang));
        }
        return;
      }

      // Et rødt flag spærrer alt indtil det er kvitteret — og kirurgen kan
      // ikke trykke OK sterilt, så enhver kommando tæller som kvittering.
      if (flash) {
        await acknowledgeFlash();
        return;
      }

      if (cmd === "acknowledge") return; // betyder kun noget ved et rødt flag

      if (cmd === "repeat") {
        if (speakAll) await say(tr("ackRepeat", lang));
        askCurrent(state);
        return;
      }

      if (cmd === "back") {
        const prev = goBack(state);
        setState(prev);
        if (speakAll) await say(tr("ackBack", lang));
        askCurrent(prev);
        return;
      }

      // "næste": kun en fremrykning på trin-noder. På en spørgsmålsnode ville
      // det være at vælge en klinisk kant uden svar — og vi gætter aldrig.
      const n = state.currentNodeId ? getNode(tree, state.currentNodeId) : undefined;
      if (!n) return;
      if (!isStepLike(n)) {
        if (speakAll) await say(tr("needAnswer", lang));
        askCurrent(state);
        return;
      }
      await acknowledgeAndAdvance();
    },
    [orMode, flash, state, tree, lang, speakAll, askCurrent, acknowledgeAndAdvance, acknowledgeFlash, say],
  );

  /**
   * Spørg agenten hvad lægen havde gang i. Sikkerhedsnet, ikke hovedvej — se
   * app/api/route/agent.ts. Fejler kaldet, er svaret "unclear", og så gør vi
   * det vi altid gør ved tvivl: spørger lægen i stedet for at gætte.
   */
  const routeIntent = useCallback(
    async (text: string, nodeId: string): Promise<string> => {
      try {
        const res = await fetch("/api/route", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ context: "node", lang, utterance: text, treeId: tree.id, nodeId }),
          signal: AbortSignal.timeout(TIMEOUT_INTERPRET),
        });
        const data = (await res.json()) as { intent?: string };
        return typeof data.intent === "string" ? data.intent : "unclear";
      } catch {
        return "unclear";
      }
    },
    [lang, tree.id],
  );

  /**
   * Send ytringen til svarfortolkeren og ryk træet hvis den kan afgøres.
   *
   * `escalate` sættes når det deterministiske lag ikke kunne se hvad ytringen
   * var. Melder fortolkeren så også tvivl, er der to muligheder tilbage: enten
   * var det et dårligt formuleret svar, eller også var det slet ikke et svar.
   * Før spurgte vi bare det samme spørgsmål igen — også når lægen havde stillet
   * sit eget. Nu spørger vi agenten, og slår op hvis det var et spørgsmål.
   */
  const interpretUtterance = useCallback(
    async (text: string, escalate: boolean) => {
      const currentNodeId = stateRef.current.currentNodeId;
      if (!currentNodeId || busyRef.current) return;

      const seq = ++interpretSeqRef.current;
      busyRef.current = true;
      setStatus(tr("thinking", lang));
      try {
        const res = await fetch("/api/interpret", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            treeId: tree.id,
            nodeId: currentNodeId,
            lang,
            utterance: text,
          }),
          signal: AbortSignal.timeout(TIMEOUT_INTERPRET),
        });
        const data = (await res.json()) as {
          value?: string;
          needsClarification?: boolean;
          clarificationQuestion?: string;
          error?: string;
        };

        // Agenten svarede — så er produktområdet reelt brugt, uanset om svaret
        // var entydigt nok til at rykke os videre.
        if (!data.error) setUsage((u) => ({ ...u, interpretations: u.interpretations + 1 }));

        // En kommando har overhalet dette kald — svaret er forældet og
        // beskrives ikke i træet. Kassér det frem for at rykke to gange.
        if (seq !== interpretSeqRef.current) return;

        /*
         * Er vi rykket videre imens — nogen klikkede et svar, eller et rødt
         * flag sprang — så hører fortolkningen til en node vi ikke står på
         * længere. Den ville lande som svar på et andet spørgsmål end det den
         * blev givet til. Kassér den.
         */
        if (stateRef.current.currentNodeId !== currentNodeId) return;

        if (data.error) {
          setStatus(data.error);
          return;
        }

        // Aldrig gæt: uklart svar → spørg igen i stedet for at rykke videre.
        if (data.needsClarification || !data.value) {
          /*
           * Måske var det slet ikke et svar. Det deterministiske lag kunne
           * ikke se det, og fortolkeren tør ikke afgøre det — så er agenten
           * det sidste vi har, før vi ender med at stille det samme spørgsmål
           * for tredje gang til en læge der spurgte om noget andet.
           */
          if (escalate && (await routeIntent(text, currentNodeId)) === "question") {
            setStatus(null);
            void runLookup(text);
            return;
          }
          setStatus(tr("unclear", lang));
          const q = data.clarificationQuestion ?? questionText(getNode(tree, currentNodeId)!, lang, orMode);
          if (speakAll) void say(q);
          return;
        }

        const { state: next, redFlag } = advance(tree, stateRef.current, data.value, text);
        setState(next);
        setStatus(null);

        if (redFlag) {
          setFlash(redFlag.message);
          /*
           * Røde flag læses op når oplæsning er slået til — men aldrig når
           * klinikeren har slået den fra. Flaget afbryder i forvejen hele
           * skærmen og kan ikke overses; at tale mod en slukket højttaler
           * ville kun koste penge.
           */
          if (speakAll) void say(redFlag.message);
          return;
        }

        if (next.dispositionId) {
          const d = getDisposition(tree, next.dispositionId);
          if (d && speakAll) void say(`${d.title[lang]}. ${d.guidance[lang]}`);
        } else {
          askCurrent(next);
        }
      } catch (err) {
        /*
         * Netværket svigtede — og DET er den fejl der kan koste demoen. Uden
         * dette catch blev den afviste fetch til en uncaught rejection, status
         * blev aldrig ryddet, og skærmen stod med "Fortolker…" til nogen
         * genindlæste siden.
         *
         * Nu siger appen i stedet hvad der skete OG hvad man gør: klik og
         * skrift går uden om agenten, så beslutningen kan fortsætte. Beskeden
         * læses også op — i OR-tilstand kigger kirurgen ikke på skærmen, og
         * browserstemmen virker uden net.
         */
        if (seq !== interpretSeqRef.current) return;
        const msg = failureMessage(err, "interpret", lang);
        setStatus(msg);
        if (speakAll) void say(msg);
      } finally {
        // Kun den nyeste fortolkning må frigive spærren — er den overhalet,
        // ejes spærren af den kommando eller det kald der kom efter.
        if (seq === interpretSeqRef.current) busyRef.current = false;
      }
    },
    [tree, lang, orMode, speakAll, askCurrent, say, routeIntent, runLookup],
  );

  /**
   * Én indgang for alt lægen siger og skriver.
   *
   * Det er hele sammenkoblingen samlet på ét sted. Lægen skal ikke vælge mellem
   * "forløb" og "opslag" — han taler, og rækkefølgen herunder finder ud af hvad
   * han ville. Rækkefølgen er ikke tilfældig; hvert trin er billigere og mere
   * sikkert end det næste:
   *
   *   1. Et tilbud eller et valg vi selv har stillet — svaret hører til DET.
   *   2. Journaltillæg, hvis feltet er åbent.
   *   3. Håndfri kommandoer ("næste", "tilbage") — de skal ikke koste et kald.
   *   4. Spørgsmål eller svar, afgjort deterministisk (unified/intent.ts).
   *   5. Svarfortolkning hos Corti, med agent-klassificering som sidste net.
   */
  const handleUtterance = useCallback(
    async (text: string, images?: ChatImage[]) => {
      /*
       * Tog lægen imod tilbuddet om at blive ført gennem forløbet? Det ligger
       * FØRST, fordi tilbuddet står på indgangsskærmen, hvor enhver anden
       * ytring ville blive læst som en ny patientbeskrivelse. Et "ja" med et
       * billede vedhæftet er dog ikke et ja til forløbet — så er billedet
       * ærindet.
       */
      if (offer && !images?.length && matchAffirmative(text)) {
        const id = offer.treeId;
        setOffer(null);
        void beginTree(id);
        return;
      }

      /*
       * "Skriv notatet."
       *
       * Agenten tilbyder selv notatet når udredningen er kørt til ende, men
       * lægen skal kunne bede om det når som helst — også midtvejs, også
       * efter at have afvist tilbuddet. Det er hans journal, ikke appens.
       *
       * Ordren står FØR indgangsruteringen, ellers ville "skriv notatet"
       * blive læst som et fagligt spørgsmål og sendt til kilderne. Er der
       * ingen udredning at skrive om, falder den igennem som en almindelig
       * ytring — så svarer chatten, i stedet for at et klik på ingenting
       * ser ud som om appen ignorerede en ordre.
       */
      if (!images?.length && matchNoteRequest(text)) {
        const w = currentWorkup();
        if (w) {
          // Gennem et ref: notatfunktionen erklæres længere nede, og en
          // direkte reference ville fryse den første udgave af den fast.
          generateNoteRef.current({ treeId: w.treeId, path: w.path });
          return;
        }
      }

      // Før et forløb er valgt, er ytringen enten en patient eller et spørgsmål.
      // Samme vej ind for tale og skrift.
      if (!started) {
        void handleIntake(text, images);
        return;
      }

      /*
       * Er tillægsfeltet åbent, hører alt hvad der skrives eller siges til
       * journaltillægget — ikke til svarfortolkningen, og ikke til
       * transskriptet: transskriptet er hvad der blev sagt i rummet, tillægget
       * er lægens egen formulering til journalen, og notatet får dem hver for
       * sig. Vi ser på FELTET og ikke på om diktatet kører, ellers ville et
       * skrevet tillæg blive tolket som et svar i det øjeblik mikrofonen
       * svigtede.
       */
      if (addendumOpen) {
        appendDictation(text);
        return;
      }

      /*
       * Transskriptet er de kliniske oplysninger om DENNE patient. Det sendes
       * videre til både journalnotatet og kodningen, og derfor må et
       * litteraturspørgsmål ikke lande i det: "hvordan beregner jeg TBSA på et
       * barn?" ville ellers kunne læses som at patienten er et barn, og den
       * fejl ville se fuldstændig troværdig ud i en færdig kode. Vi skriver
       * derfor først ned, når vi ved hvad ytringen var.
       */
      const record = () => setTranscript((prev) => [...prev, text]);

      /*
       * Har vi spurgt "var det et svar eller et spørgsmål?", så er det DET vi
       * hører svaret på nu. Kun korte, entydige ytringer tæller — siger lægen
       * i stedet noget helt nyt, falder valget bort, og den nye ytring
       * behandles forfra.
       */
      if (ambiguity) {
        const choice = matchIntentChoice(text);
        const held = ambiguity.text;
        setAmbiguity(null);
        if (choice === "question") {
          void runLookup(held);
          return;
        }
        if (choice === "answer") {
          await interpretUtterance(held, false);
          return;
        }
      }

      // Håndfri kommandoer før alt andet — de skal ikke koste et agent-kald.
      const current = state.currentNodeId ? getNode(tree, state.currentNodeId) : undefined;
      const cmd = matchCommand(text, {
        softNext: !!current && isStepLike(current),
        awaitingAcknowledge: !!flash,
      });

      if (isSelfEcho(text, !!cmd)) return;
      if (cmd) {
        record();
        await runCommand(cmd);
        return;
      }

      if (flash) {
        record();
        return;
      }

      /*
       * Ingen aktiv node: forløbet er kørt til ende. Der er intet at svare på —
       * men et fagligt spørgsmål skal stadig kunne stilles, og anbefalingen
       * bliver stående på skærmen imens.
       */
      if (!current) {
        if (looksLikeQuestion(text)) {
          void runLookup(text);
          return;
        }
        record();
        return;
      }

      const verdict = classifyUtterance(text, current, lang);

      if (verdict.intent === "question") {
        void runLookup(text);
        return;
      }

      record();

      /*
       * Tvetydig. "Er det dybt?" på dybde-noden kan både være svaret "dyb" og
       * et spørgsmål om hvordan man vurderer dybde. Vi gætter ikke på noget der
       * ender i en journal — vi spørger.
       */
      if (verdict.intent === "ambiguous") {
        setAmbiguity({ text, reasons: verdict.reasons });
        if (speakAll) void say(tr("ambiguousSpoken", lang));
        return;
      }

      await interpretUtterance(text, verdict.intent === "unknown");
    },
    [
      currentWorkup,
      offer,
      beginTree,
      started,
      handleIntake,
      addendumOpen,
      appendDictation,
      ambiguity,
      runLookup,
      interpretUtterance,
      state,
      tree,
      flash,
      isSelfEcho,
      runCommand,
      lang,
      speakAll,
      say,
    ],
  );

  /**
   * Hvad sker der med et færdigt talesegment?
   *
   * Inde i et forløb er det et svar, en kommando eller et spørgsmål — det går
   * direkte videre, som det altid har gjort. På FORSIDEN gør det ikke: dér
   * lægger talen sig i skrivefeltet, så lægen kan tale en hel case ind, se
   * ordene stå der, rette et tal og selv trykke send. Sendte hvert segment sig
   * selv, ville en tænkepause midt i en sætning blive til en afsendelse — og
   * appen ville svare på en halv beskrivelse.
   *
   * Håndfri tilstand er undtagelsen: dér er der ingen der kan trykke send.
   */
  const handleVoiceFinal = useCallback(
    (text: string) => {
      if (!started && !orMode) {
        setDraft((prev) => (prev ? `${prev.trimEnd()} ${text}` : text));
        return;
      }
      void handleUtterance(text);
    },
    [started, orMode, handleUtterance],
  );

  const { listening, interim, error, start, stop } = useTranscribe({ lang, onFinal: handleVoiceFinal });

  // Produktområderne markeres som brugt når strømmen faktisk kom op — ikke når
  // knappen blev trykket. Et forsøg er ikke et forbrug.
  useEffect(() => {
    if (!listening && !dictating) return;
    // Optællingen sker efter renderen, ikke i den: den er ren bogføring til
    // info-panelet og må aldrig kunne skubbe til det klinikeren ser.
    queueMicrotask(() =>
      setUsage((u) => {
        const next = { ...u, ambient: u.ambient || listening, dictation: u.dictation || dictating };
        return next.ambient === u.ambient && next.dictation === u.dictation ? u : next;
      }),
    );
  }, [listening, dictating]);

  // OR-tilstand: mikrofonen skal altid være åben — kirurgen er steril.
  useEffect(() => {
    if (orMode && !listening) void start();
  }, [orMode, listening, start]);

  /*
   * Tastatur som stille reserve i OR-tilstand. Kirurgen bruger den aldrig, men
   * en usteril assistent kan føre demoen videre hvis mikrofonen svigter på
   * venue-wifi. Samme vej gennem motoren som stemmekommandoerne.
   */
  useEffect(() => {
    if (!orMode) return;
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement | null;
      if (el && (el.tagName === "INPUT" || el.tagName === "TEXTAREA" || el.isContentEditable)) return;

      let cmd: VoiceCommand | null = null;
      if (e.key === " " || e.key === "ArrowRight") cmd = "next";
      else if (e.key === "ArrowLeft") cmd = "back";
      else if (e.key.toLowerCase() === "r") cmd = "repeat";
      if (!cmd) return;

      e.preventDefault();
      void runCommand(cmd);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [orMode, runCommand]);

  // Træ-listen er en bonus i UI'et; fejler den, kører brandsårstræet uforstyrret.
  useEffect(() => {
    let cancelled = false;
    fetch("/api/tree", { signal: AbortSignal.timeout(TIMEOUT_TREE) })
      .then((r) => (r.ok ? r.json() : []))
      .then((list: TreeSummary[]) => {
        if (!cancelled && Array.isArray(list)) setTrees(list);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  const restart = () => {
    askCurrent(resetSession(tree, lang));
  };

  /** Logo/titel i headeren: tilbage til intake-skærmen, som var siden lige åbnet. */
  const goHome = () => {
    restart();
    setStarted(false);
    setIntakeMiss(null);
    setDraft("");
  };

  /**
   * Journalnotatet er appens langsomste kald (målt 14–16 s) og derfor det der
   * ligner en frossen app hvis det fejler i stilhed. Det har sin egen, meget
   * længere frist end de øvrige kald — en generøs frist er ikke det samme som
   * ingen frist — og en spærre så et utålmodigt klik ikke sender kaldet igen.
   */
  const generateNote = async (fraUdredning?: { treeId: string; path: AnsweredStep[] }) => {
    if (noteBusy) return;
    setNoteBusy(true);
    setStatus(tr("noteWorking", lang));
    try {
      const res = await fetch("/api/note", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        /*
         * Notatet kan komme to steder fra, og de har hver sin sandhed om
         * hvad der blev afklaret. Kom tilbuddet fra en udredning i chatten,
         * er DENS sti den kanoniske — den er genafspillet på serveren og
         * indeholder de svar agenten trak ud af lægens egen beskrivelse.
         * `state.path` hører til den gamle trævisning og ved intet om dem.
         */
        body: JSON.stringify(
          fraUdredning
            ? {
                treeId: fraUdredning.treeId,
                lang,
                path: fraUdredning.path,
                transcript: transcript.join("\n"),
                dictation,
              }
            : {
                treeId: tree.id,
                lang,
                path: state.path,
                dispositionId: state.dispositionId,
                transcript: transcript.join("\n"),
                dictation,
              },
        ),
        signal: AbortSignal.timeout(TIMEOUT_NOTE),
      });
      const data = (await res.json()) as NoteResult & { error?: string };
      setStatus(data.error ?? null);
      if (!data.error) {
        setNote(data);
        // Kun det Corti selv oplyser tælles med. Er credits ikke i svaret,
        // lader vi feltet stå tomt frem for at opfinde et tal.
        setUsage((u) => ({
          ...u,
          notes: u.notes + 1,
          codingSystem: data.coding?.system ?? u.codingSystem,
          credits:
            typeof data.coding?.credits === "number"
              ? (u.credits ?? 0) + data.coding.credits
              : u.credits,
        }));
      }
    } catch (err) {
      // Anbefalingen kom fra træet og står allerede på skærmen — et manglende
      // notat er en ærgrelse, ikke et tab af beslutningen. Det siger beskeden.
      const msg = failureMessage(err, "note", lang);
      setStatus(msg);
      if (speakAll) void say(msg);
    } finally {
      setNoteBusy(false);
    }
  };

  // Hold reffet på den nyeste udgave, så "skriv notatet" altid rammer den
  // funktion der kender den aktuelle session.
  useEffect(() => {
    generateNoteRef.current = (fra) => void generateNote(fra);
  });

  // Klik-svar (kort/valg) rykker direkte gennem træet — samme motorkald som
  // stemme/tekst-svar, blot uden agent-fortolkning, fordi værdien allerede er
  // entydig. Delt mellem standardtilstand og OR-tilstand.
  const selectOption = useCallback(
    (value: string, rawLabel: string) => {
      const { state: next, redFlag } = advance(tree, state, value, rawLabel);
      setState(next);
      // Klikket ER vejen videre efter en fejl. Står der stadig "Fortolker…"
      // eller en netværksbesked fra forrige forsøg, er den nu usand — og en
      // usand statuslinje er præcis det der får appen til at se død ud.
      setStatus(null);
      if (redFlag) {
        setFlash(redFlag.message);
        if (speakAll) void say(redFlag.message);
      } else if (next.dispositionId) {
        const d = getDisposition(tree, next.dispositionId);
        if (d && speakAll) void say(`${d.title[lang]}. ${d.guidance[lang]}`);
      } else {
        askCurrent(next);
      }
    },
    [tree, state, lang, speakAll, askCurrent, say],
  );

  /*
   * Mikrofonen skal svare i det sekund der trykkes.
   *
   * `start()` henter et Corti-token, åbner en websocket og beder om
   * mikrofontilladelse. Det tager målt et sekund eller to, og indtil da var
   * `listening` stadig falsk — knappen så altså fuldstændig uberørt ud efter
   * klikket. Det er præcis den stilhed der får folk til at trykke igen, eller
   * til at tro at det ikke virker. Vi holder derfor selv fast i at opstarten er
   * i gang, så knappen kan sige det med det samme.
   */
  const [micStarting, setMicStarting] = useState(false);

  const toggleMic = useCallback(() => {
    if (listening) {
      stop();
      return;
    }
    setMicStarting(true);
    void start().finally(() => setMicStarting(false));
  }, [listening, start, stop]);

  /**
   * Det opslag der vises. Kun det seneste — tidligere svar er allerede læst.
   *
   * Behandlingsopslaget vinder når det findes, fordi det altid er det nyeste:
   * hver ny `runLookup` rydder den anden slags væk.
   */
  const activeTurn = lookupTurns.length > 0 ? lookupTurns[lookupTurns.length - 1] : null;

  /*
   * Er samtalen i gang? Fra det øjeblik det første spørgsmål er sendt, viser
   * forsiden tråden i stedet for indgangskortet. `ask` opretter turen straks
   * — også mens svaret stadig arbejder — så skiftet sker i samme sekund der
   * trykkes send, ikke først når svaret lander.
   */
  const hasThread = !started && (lookupTurns.length > 0 || guideLookup !== null || procedure !== null);

  /**
   * Vis forbindingsproceduren — samme to veje som når der spørges om den.
   *
   * Håndfri får den store skærm med ét trin ad gangen; alle andre får den i
   * tråden. Kaldes fra anbefalingens tilbud, hvor træet selv siger at
   * proceduren følger efter.
   */
  const showProcedure = useCallback(async () => {
    const id = followUpTreeId("burns-dk", "disp-treat");
    if (!id) return;
    if (orMode) {
      void beginTree(id);
      return;
    }
    try {
      const t = await loadTree(id);
      setProcedure({ question: tr("procedureShow", lang), tree: t });
    } catch (err) {
      setStatus(failureMessage(err, "tree", lang));
    }
  }, [orMode, beginTree, loadTree, lang]);

  /*
   * UDREDNINGEN LÆST OP.
   *
   * I håndfri tilstand kigger klinikeren ikke på skærmen — han har hænderne
   * i et sår. Landede udredningens spørgsmål kun som tekst, ville hele
   * forløbet stå stille i tavshed, og han ville tro at appen var holdt op med
   * at lytte. Svaret på et opslag læses allerede op af `runLookup`; det her
   * er den anden halvdel: træets spørgsmål, dets røde flag og dets
   * anbefaling.
   *
   * Røde flag læses op UANSET stemmetilstand. De afbryder i forvejen hele
   * skærmen, og en eskalering er det ene sted hvor det er værre at tie end at
   * tale mod en slukket højttaler.
   *
   * Vagten er et ref med det sidst oplæste — uden den ville hver eneste
   * render af tråden (og der er mange, fremdriften tikker) sige det samme
   * højt igen.
   */
  const spokenWorkupRef = useRef<string>("");
  useEffect(() => {
    const turn = lookupTurns[lookupTurns.length - 1];
    if (!turn) return;

    const flag = turn.redflags?.[turn.redflags.length - 1];
    const dispo = turn.disposition;
    const workupQ = turn.workup?.question;

    // Rækkefølgen er klinisk: flaget først, så anbefalingen, så spørgsmålet.
    const [nøgle, tekst, altidHøjt] = flag
      ? [`flag:${turn.id}:${flag.nodeId}`, flag.message, true]
      : dispo
        ? [
            `disp:${turn.id}:${dispo.disposition.dispositionId}`,
            `${dispo.disposition.title}. ${dispo.disposition.guidance}`,
            false,
          ]
        : workupQ
          ? [`q:${turn.id}:${workupQ.nodeId}:${turn.workup?.phase}`, workupQ.question, false]
          : ["", "", false];

    if (!nøgle || !tekst) return;
    if (spokenWorkupRef.current === nøgle) return;
    if (!altidHøjt && !speakAll) return;

    spokenWorkupRef.current = nøgle;
    void say(tekst);
  }, [lookupTurns, speakAll, say]);
  const lookupPayload: LookupPayload | null = guideLookup
    ? { kind: "guide", ...guideLookup }
    : activeTurn
      ? { kind: "chat", turn: activeTurn }
      : null;

  const toggleSpeakAnswer = useCallback(
    (answer: ChatAnswer, turnId: string) => {
      if (speakingTurn === turnId) {
        stopSpeaking();
        setSpeakingTurn(null);
        return;
      }
      setSpeakingTurn(turnId);
      void say(spokenText(answer, lang)).finally(() => setSpeakingTurn(null));
    },
    [speakingTurn, say, lang],
  );

  /**
   * Luk opslaget og vend tilbage til spørgsmålet. Der er intet at genskabe —
   * noden har stået der hele tiden — så det eneste der sker er at vi stiller
   * spørgsmålet højt igen for den der ikke kigger på skærmen.
   */
  const closeLookup = useCallback(() => {
    stopSpeaking();
    setSpeakingTurn(null);
    setLookupOpen(false);
    setOffer(null);
    if (started && stateRef.current.currentNodeId) askCurrent(stateRef.current);
  }, [started, askCurrent]);

  /*
   * Én statuslinje. Svarfortolkning og opslag kan køre samtidig — lægen kan
   * spørge mens agenten stadig tygger på hans forrige svar — og fortolkningen
   * vejer tungest, fordi den er den der flytter beslutningen.
   */
  const liveStatus = status ?? lookupStatus;

  /**
   * Diktat og ambient lytning deler den fysiske mikrofon og må derfor aldrig
   * køre samtidig: to optagere på samme enhed ville sende det samme diktat ind
   * i BÅDE journaltillægget og svarfortolkningen — lægens formulering ville
   * blive tolket som et svar på et spørgsmål. Vi lukker derfor den ambiente
   * strøm først, og appen tier mens der dikteres.
   */
  const startDictationExclusively = useCallback(() => {
    stop();
    stopSpeaking();
    void startDictation();
  }, [startDictation, stop]);

  const toggleDictationMic = useCallback(() => {
    if (dictating) stopDictation();
    else startDictationExclusively();
  }, [dictating, stopDictation, startDictationExclusively]);

  const toggleAddendum = useCallback(() => {
    if (addendumOpen) {
      stopDictation();
      setAddendumOpen(false);
      return;
    }
    setAddendumOpen(true);
    startDictationExclusively();
  }, [addendumOpen, stopDictation, startDictationExclusively]);

  const progress = useMemo(
    () => Math.round((state.path.length / Math.max(tree.nodes.length, 1)) * 100),
    [state.path.length, tree.nodes.length],
  );

  /*
   * Browsere afspiller ikke lyd før siden er blevet rørt. Sker det ikke, taber
   * appen sin første oplæsning i stilhed — og på scenen ligner det at stemmen
   * ikke virker. Vi spørger browseren direkte og fortæller det kun når det
   * faktisk gælder; ved første klik eller tast forsvinder linjen af sig selv.
   */
  const [audioUnlocked, setAudioUnlocked] = useState(false);
  useEffect(() => {
    const unlock = () => setAudioUnlocked(true);

    // Er siden allerede blevet rørt, findes spærren ikke — meld fri straks.
    const activation = (navigator as Navigator & { userActivation?: { hasBeenActive: boolean } }).userActivation;
    if (!activation || activation.hasBeenActive) {
      queueMicrotask(unlock);
      return;
    }

    window.addEventListener("pointerdown", unlock, { once: true });
    window.addEventListener("keydown", unlock, { once: true });
    return () => {
      window.removeEventListener("pointerdown", unlock);
      window.removeEventListener("keydown", unlock);
    };
  }, []);

  /*
   * Én besked-plads for alt der kræver en HANDLING af brugeren — mikrofonen,
   * stemmetjenesten, den blokerede lyd. Rå browserstrenge oversættes her, ét
   * sted, så hverken standardtilstand eller OR-tilstand kan komme til at vise
   * "Permission denied" til en kirurg. Mikrofonfejl vejer tungest: uden den
   * virker intet af det håndfri.
   */
  const notice = useMemo(
    () =>
      micMessage(dictationError ?? error, lang, orMode) ??
      (speakAll && !audioUnlocked ? tr("audioGesture", lang) : null),
    [dictationError, error, lang, orMode, speakAll, audioUnlocked],
  );

  /*
   * Forvarm oplæsningen af de mulige næste spørgsmål, så stemmen starter uden
   * ventetid når klinikeren svarer. Netværks-TTS koster ~1 s uden dette.
   *
   * Men KUN når oplæsning faktisk er slået til: forvarmningen henter lyd for
   * hver eneste kant ud af den aktuelle node, og gjorde den det uanset
   * stemmetilstand, betalte vi for lyd ingen nogensinde hører.
   */
  useEffect(() => {
    if (!node || !speakAll) return;
    const targets = new Set(node.edges.map((e) => e.goto));
    node.redFlags?.forEach((f) => f.goto && targets.add(f.goto));
    targets.forEach((id) => {
      const nextNode = getNode(tree, id);
      if (nextNode) prefetchSpeech(questionText(nextNode, lang, orMode), lang);
    });
    // Kvitteringerne er korte og gentages hele vejen gennem træet — de skal
    // ligge klar, ellers koster hver "næste" en ekstra netværksrundtur.
    [tr("ackNext", lang), tr("ackRepeat", lang), tr("ackBack", lang)].forEach((t) => prefetchSpeech(t, lang));
  }, [node, tree, lang, orMode, speakAll]);

  /*
   * Ambulant behandlet brandsår skal forbindes. I stedet for at lade lægen lede
   * efter proceduren bagefter, tilbyder vi den dér hvor anbefalingen står — som
   * ét klik. Det er et TILBUD; forløbet skifter aldrig af sig selv.
   */
  const followUpId = followUpTreeId(tree.id, state.dispositionId);
  const followUp = followUpId ? (trees.find((t) => t.id === followUpId) ?? null) : null;

  /*
   * Opslaget og tvivlsspørgsmålet deler plads. De kan aldrig optræde samtidig:
   * tvivlen ER spørgsmålet om hvorvidt der skal slås op, så det ene afløser
   * altid det andet. Begge lægger sig UNDER det aktive spørgsmål og skubber
   * derfor aldrig til det lægen er ved at svare på.
   */
  const lookupSlot = ambiguity ? (
    <IntentChoiceCard
      lang={lang}
      utterance={ambiguity.text}
      reasons={ambiguity.reasons}
      onAnswer={() => {
        const held = ambiguity.text;
        setAmbiguity(null);
        void interpretUtterance(held, false);
      }}
      onLookUp={() => {
        const held = ambiguity.text;
        setAmbiguity(null);
        void runLookup(held);
      }}
    />
  ) : lookupOpen && lookupPayload ? (
    <LookupCard
      lang={lang}
      payload={lookupPayload}
      held={started && state.currentNodeId ? { step: state.path.length + 1, total: tree.nodes.length } : null}
      heldDone={started && !!state.dispositionId}
      speaking={!!activeTurn && speakingTurn === activeTurn.id}
      onSpeak={(answer) => activeTurn && toggleSpeakAnswer(answer, activeTurn.id)}
      onClose={closeLookup}
      onSwitch={switchLookup}
      offer={
        offer
          ? {
              name: offer.name,
              onAccept: () => {
                const id = offer.treeId;
                setOffer(null);
                void beginTree(id);
              },
              onDismiss: () => setOffer(null),
            }
          : null
      }
    />
  ) : null;

  // OR-tilstand forudsætter et valgt forløb — der er intet at føre kirurgen
  // igennem før da, og indgangsspørgsmålet hører hjemme på den lyse skærm.
  if (orMode && started) {
    return (
      <OrView
        lang={lang}
        treeName={tree.name[lang]}
        node={node}
        questionText={node ? questionText(node, lang, orMode) : ""}
        disposition={disposition}
        flash={flash}
        onAcknowledgeFlash={() => void acknowledgeFlash()}
        stepNumber={state.path.length + 1}
        totalNodes={tree.nodes.length}
        progress={progress}
        listening={listening}
        /*
         * I OR-tilstand er kirurgen steril og kigger ikke på skærmen. Et opslag
         * har derfor ingen visuel plads her — det leveres som tale, og linjen
         * her er blot livstegnet mens agenten henter kilderne.
         */
        status={liveStatus}
        canAdvance={canAdvance}
        notice={notice}
        onNext={() => void runCommand("next")}
        onSelectOption={selectOption}
        onSubmitNumber={(v) => void handleUtterance(v)}
        onExit={() => {
          setOrMode(false);
          stop();
        }}
        note={note}
        lastHeard={transcript[transcript.length - 1] ?? null}
      />
    );
  }

  return (
    /* `dvh` og ikke `vh`: på iOS regner `100vh` med at browserlinjen er væk,
       og siden bliver derfor højere end skærmen. */
    <main className="app-gradient-bg relative min-h-[100dvh] px-4 pb-6 pt-4 text-[var(--ink)] sm:px-6 sm:pb-8 sm:pt-5">
      <BrandWatermark />
      <div className="relative z-10 mx-auto max-w-5xl">
        <ControlRail
          lang={lang}
          started={started}
          usage={usage}
          treeId={tree.id}
          treeName={tree.name[lang]}
          treeVersion={tree.version}
          trees={trees}
          treeBusy={treeBusy}
          onSelectTree={(id) => void beginTree(id)}
          onGoHome={goHome}
          fullVoice={fullVoice}
          orMode={orMode}
          onToggleLang={() => {
            const next: Lang = lang === "da" ? "en" : "da";
            setLang(next);
            setState((s) => ({ ...s, lang: next }));
          }}
          onToggleVoiceMode={() => setFullVoice((v) => !v)}
          onToggleOrMode={() => {
            setOrMode((v) => !v);
            if (orMode) stop();
          }}
        />

        {/*
          Tekniske problemer er IKKE kliniske. Rød er reserveret til rødt flag
          (se globals.css) — en mikrofon der mangler tilladelse er en irriterende
          hindring, ikke en patient i fare. Derfor står beskeden i brandets nude,
          synlig men uden at låne alvor den ikke har.
        */}
        {/*
          Pladsen er RESERVERET, ikke betinget.

          Beskeden dukker op i det øjeblik mikrofonen bliver nægtet — altså mens
          lægen sidder og prøver at få lyden til at virke. Skubbede den hele
          siden ned netop dér, ville han miste det han kiggede på i samme
          sekund han havde mest brug for at holde fast i det. Prisen er én
          tom linje under instrumentpanelet; den betaler vi gerne.
        */}
        {/* Reservationen er målt til beskedens faktiske højde (py-3 + én
            tekstlinje ≈ 2,875 rem) — rundhåndet plads her skubbede hele
            indholdet længere ned end nødvendigt. */}
        <div className="mb-2 min-h-[3rem]">
          {notice && (
            <div
              role="status"
              /* Beskeden er driftsmæssig — "klik for at slå lyd til", ikke
                 klinisk. Den bar en terrakottaramme og råbte derfor lige så
                 højt som et rødt flag. Nu bærer den kun sin varme flade og en
                 hårfin kant: den kan ses, men den kan ikke forveksles med
                 noget der handler om patienten. */
              className="rounded-lg border border-[var(--line-strong)] bg-[var(--nude-tint)] px-4 py-3 text-sm font-medium leading-relaxed text-[var(--ink)]"
            >
              {notice}
            </div>
          )}
        </div>

        {/*
          Det røde flag stod før HER, over gitteret, og skubbede dermed også
          sidepanelet 207 px ned — beslutningsvej, faldgruber og transskript,
          som intet har med flaget at gøre. Det hører hjemme dér hvor det
          erstatter noget: i stedet for spørgsmålskortet, inde i sektionen.
          Indgangsskærmen har intet gitter, så dér bliver det stående.
        */}
        {flash && !started && (
          <div className="mb-6">
            <RedFlagBanner message={flash} lang={lang} orMode={false} onAcknowledge={() => void acknowledgeFlash()} />
          </div>
        )}

        {/*
          Forsidens to ansigter.

          FØR det første spørgsmål: indgangskortet — overskrift, felt, stor
          mikrofon. EFTER: samtalen har skærmen. Tråden vokser frit nedad
          (siden ruller, ikke en boks), og indgangen er skrumpet til en
          komposer der følger med i bunden af viewportet, så næste spørgsmål
          altid er i rækkevidde uden at skygge for svaret.
        */}
        {!started &&
          (hasThread ? (
            <>
              <div className="pb-6">
                <ChatThread
                  lang={lang}
                  turns={lookupTurns}
                  guide={guideLookup}
                  procedure={procedure}
                  speakingTurn={speakingTurn}
                  onSpeak={toggleSpeakAnswer}
                  onSwitch={switchLookup}
                  offer={
                    offer
                      ? {
                          name: offer.name,
                          onAccept: () => {
                            const id = offer.treeId;
                            setOffer(null);
                            void beginTree(id);
                          },
                          onDismiss: () => setOffer(null),
                        }
                      : null
                  }
                  /* Et hurtig-svar ER lægens næste besked — samme vej ind som
                     hvis han havde skrevet eller sagt ordet selv. */
                  onQuickReply={(t) => void handleUtterance(t)}
                  onWriteNote={(treeId, path) => void generateNote({ treeId, path })}
                  noteBusy={noteBusy}
                  onShowProcedure={() => void showProcedure()}
                />
              </div>
              {/*
                Komposeren klæber til bunden — og skal blive dér OVEN PÅ
                telefonens tastatur. `--kb-inset` er den højde tastaturet
                dækker (se KeyboardInset); uden den lander komposeren bag
                tastaturet i præcis det sekund feltet får fokus.
                `env(safe-area-inset-bottom)` holder den fri af iPhones
                hjemmeindikator når intet tastatur er fremme.
              */}
              <div
                className="sticky z-20"
                style={{ bottom: "calc(var(--kb-inset) + max(1rem, env(safe-area-inset-bottom)))" }}
              >
                <IntakeCard
                  lang={lang}
                  trees={trees}
                  ambiguous={intakeMiss?.candidates ?? []}
                  unresolved={intakeMiss?.text ?? null}
                  listening={listening}
                  starting={micStarting}
                  interim={interim}
                  draft={draft}
                  onDraftChange={setDraft}
                  onToggleMic={toggleMic}
                  onSubmit={(t, images) => void handleUtterance(t, images)}
                  onSelectTree={(id) => void beginTree(id)}
                  compact
                />
              </div>
            </>
          ) : (
            <IntakeCard
              lang={lang}
              trees={trees}
              ambiguous={intakeMiss?.candidates ?? []}
              unresolved={intakeMiss?.text ?? null}
              listening={listening}
              starting={micStarting}
              interim={interim}
              draft={draft}
              onDraftChange={setDraft}
              onToggleMic={toggleMic}
              onSubmit={(t, images) => void handleUtterance(t, images)}
              onSelectTree={(id) => void beginTree(id)}
            />
          ))}

        {/*
          Skelettet står præcis dér hvor notatet lander. Lå det et andet sted —
          eller manglede det — ville siden hoppe når de målte 14-16 sekunders
          skrivning er forbi, og det er netop det øjeblik lægen kigger.
        */}
        {note ? <NotePanel note={note} lang={lang} /> : noteBusy ? <NoteSkeleton lang={lang} /> : null}

        {started && (
        <div className="grid gap-6 md:grid-cols-[1fr_320px]">
          <section>
            {/*
              Flaget ERSTATTER spørgsmålet frem for at lægge sig oven over det.
              Begge er sektionens øverste kort, så skiftet koster ingen
              bevægelse i sidepanelet ved siden af.
            */}
            {flash ? (
              <RedFlagBanner
                message={flash}
                lang={lang}
                orMode={false}
                onAcknowledge={() => void acknowledgeFlash()}
              />
            ) : node ? (
              <QuestionCard
                node={node}
                questionText={questionText(node, lang, orMode)}
                lang={lang}
                stepNumber={state.path.length + 1}
                totalNodes={tree.nodes.length}
                onSelectOption={selectOption}
                onSubmitNumber={(v) => void handleUtterance(v)}
                onSubmitFreeText={(t) => void handleUtterance(t)}
                canAdvance={canAdvance}
                onNext={() => void runCommand("next")}
                listening={listening}
                interim={interim}
                onToggleMic={toggleMic}
              />
            ) : null}

            {disposition && (
              <div className={node && !flash ? "mt-6" : undefined}>
                <DispositionCard
                  disposition={disposition}
                  lang={lang}
                  addendumOpen={addendumOpen}
                  dictating={dictating}
                  dictation={dictation}
                  interim={dictationInterim}
                  onToggleAddendum={toggleAddendum}
                  onToggleDictationMic={toggleDictationMic}
                  onSubmitFreeText={(t) => void handleUtterance(t)}
                  onGenerateNote={generateNote}
                  noteBusy={noteBusy}
                  onRestart={restart}
                  followUpName={followUp ? followUp.name[lang] : null}
                  onFollowUp={followUp ? () => void beginTree(followUp.id) : undefined}
                />
              </div>
            )}

            {/*
              Opslaget lægger sig UNDER spørgsmålet, aldrig i stedet for det.
              Lægen kan se hele vejen igennem at forløbet er intakt — og fordi
              kortet har fast højde, rykker siden sig ikke når svaret skifter
              fra fremdrift til kilder undervejs.
            */}
            {lookupSlot && <div className="mt-6">{lookupSlot}</div>}
          </section>

          <aside className="space-y-4">
            <SidebarPath
              tree={tree}
              path={state.path}
              progress={progress}
              stepLabel={`${state.path.length}/${tree.nodes.length}`}
              lang={lang}
            />
            {/*
              Faldgruberne for netop dette trin.

              Det er den billigste store gevinst i hele appen. Perfusionsadvarslen
              ved cirkulær forbrænding er værdiløs som opslag man skal huske at
              slå op — og uundværlig i det øjeblik noden spørger om skaden er
              cirkulær. Skinnen får hele konteksten (forløb, node, afgivne svar,
              disposition) og henter kun det der gælder her.

              Loftet er sat til to. Skinnen har selv tre som standard, men her
              deler den plads med beslutningsvejen og transskriptet, og fem
              advarsler på én skærm er ingen advarsel.
            */}
            <PitfallRail
              lang={lang}
              kontekst={{
                treeId: tree.id,
                nodeId: state.currentNodeId,
                values: state.path.map((p) => p.value),
                dispositionId: state.dispositionId,
              }}
              limit={2}
              overskrift={tr("pitfallsAtStep", lang)}
            />

            <TranscriptPanel lines={transcript} interim={interim} listening={listening} status={liveStatus} lang={lang} />

            {tree.authors && <p className="text-xs text-[var(--ink-faint)]">{tree.authors.join(", ")}</p>}
          </aside>
        </div>
        )}
      </div>
    </main>
  );
}
