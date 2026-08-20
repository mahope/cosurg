"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import burnsTree from "@/content/trees/burns.json";
import { advance, getDisposition, getNode, goBack, questionText, startSession } from "@/lib/tree/engine";
import type { DecisionTree, Lang, SessionState, TreeNode } from "@/lib/tree/types";
import { useTranscribe } from "@/lib/audio/useTranscribe";
import { prefetchSpeech, speak, stopSpeaking } from "@/lib/audio/speak";
import { failureMessage, micMessage, tr } from "@/lib/i18n";
import { ControlRail } from "@/components/ControlRail";
import { QuestionCard } from "@/components/QuestionCard";
import { DispositionCard } from "@/components/DispositionCard";
import { RedFlagBanner } from "@/components/RedFlagBanner";
import { SidebarPath } from "@/components/SidebarPath";
import { TranscriptPanel } from "@/components/TranscriptPanel";
import { NotePanel } from "@/components/NotePanel";
import { OrView } from "@/components/OrView";
import type { TreeSummary } from "@/components/TreePicker";
import { BrandWatermark } from "@/components/BrandMark";
import { isEcho, matchCommand, type VoiceCommand } from "@/components/voiceCommands";

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
 * Fristerne er sat ud fra MÅLT latens (interpret 1,5–2,1 s, note 14–16 s) med
 * rigelig luft, så et kald der ville være lykkedes aldrig afbrydes. Notatet får
 * derfor en helt anden frist end de øvrige kald — det er langsomt af natur.
 */
const TIMEOUT_INTERPRET = 8_000;
const TIMEOUT_NOTE = 30_000;
const TIMEOUT_TREE = 8_000;

interface NoteResult {
  note: string;
  codes: Array<{ code: string; system?: string; description: string; rationale?: string }>;
}

/**
 * En trin-node er en instruktion uden svar — procedureguidens tolv trin. Den
 * kvitteres med "næste" i stedet for at besvares. Vi behandler også en ren
 * gennemgangsnode (ingen svarmuligheder, én "*"-kant) som et trin, så et træ
 * kan lægge information ind uden at skulle erklære en ny svartype.
 */
function isStepLike(node: TreeNode): boolean {
  if (node.answerType === "step") return true;
  if (node.answerType === "number") return false;
  if (node.options && node.options.length > 0) return false;
  return node.edges.length === 1 && node.edges[0].when === "*";
}

export default function Home() {
  const [lang, setLang] = useState<Lang>("da");
  const [orMode, setOrMode] = useState(false);
  const [fullVoice, setFullVoice] = useState(true);
  const [tree, setTree] = useState<DecisionTree>(initialTree);
  const [trees, setTrees] = useState<TreeSummary[]>([]);
  const [treeBusy, setTreeBusy] = useState(false);
  const [state, setState] = useState<SessionState>(() => startSession(initialTree, "da"));
  const [transcript, setTranscript] = useState<string[]>([]);
  const [status, setStatus] = useState<string | null>(null);
  const [flash, setFlash] = useState<string | null>(null);
  const [note, setNote] = useState<NoteResult | null>(null);
  const [dictating, setDictating] = useState(false);
  const [dictation, setDictation] = useState("");
  const [noteBusy, setNoteBusy] = useState(false);
  const busyRef = useRef(false);

  const node = state.currentNodeId ? getNode(tree, state.currentNodeId) : undefined;
  const disposition = state.dispositionId ? getDisposition(tree, state.dispositionId) : undefined;
  const speakAll = orMode || fullVoice;
  const canAdvance = !!node && isStepLike(node);

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
    await say(tr("ackFlag", lang));
    if (state.dispositionId) {
      const d = getDisposition(tree, state.dispositionId);
      if (d) void say(`${d.title[lang]}. ${d.guidance[lang]}`);
    } else {
      askCurrent(state);
    }
  }, [state, tree, lang, askCurrent, say]);

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

  const handleUtterance = useCallback(
    async (text: string) => {
      setTranscript((prev) => [...prev, text]);

      if (dictating) {
        setDictation((prev) => `${prev} ${text}`.trim());
        return;
      }

      // Håndfri kommandoer før svarfortolkning — de skal ikke koste et agent-kald.
      const current = state.currentNodeId ? getNode(tree, state.currentNodeId) : undefined;
      const cmd = matchCommand(text, {
        softNext: !!current && isStepLike(current),
        awaitingAcknowledge: !!flash,
      });

      if (isSelfEcho(text, !!cmd)) return;
      if (cmd) {
        await runCommand(cmd);
        return;
      }

      if (flash || !state.currentNodeId || busyRef.current) return;

      const seq = ++interpretSeqRef.current;
      busyRef.current = true;
      setStatus(tr("thinking", lang));
      try {
        const res = await fetch("/api/interpret", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            treeId: tree.id,
            nodeId: state.currentNodeId,
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

        // En kommando har overhalet dette kald — svaret er forældet og
        // beskrives ikke i træet. Kassér det frem for at rykke to gange.
        if (seq !== interpretSeqRef.current) return;

        if (data.error) {
          setStatus(data.error);
          return;
        }

        // Aldrig gæt: uklart svar → spørg igen i stedet for at rykke videre.
        if (data.needsClarification || !data.value) {
          setStatus(tr("unclear", lang));
          const q = data.clarificationQuestion ?? questionText(getNode(tree, state.currentNodeId)!, lang, orMode);
          if (speakAll) void say(q);
          return;
        }

        const { state: next, redFlag } = advance(tree, state, data.value, text);
        setState(next);
        setStatus(null);

        if (redFlag) {
          setFlash(redFlag.message);
          // Røde flag læses ALTID op, uanset stemmetilstand.
          void say(redFlag.message);
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
    [state, tree, lang, orMode, speakAll, askCurrent, dictating, flash, runCommand, isSelfEcho, say],
  );

  const { listening, interim, error, start, stop } = useTranscribe({ lang, onFinal: handleUtterance });

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

  const resetSession = useCallback(
    (t: DecisionTree, nextLang: Lang) => {
      stopSpeaking();
      const fresh = startSession(t, nextLang);
      setState(fresh);
      setTranscript([]);
      setNote(null);
      setDictation("");
      setDictating(false);
      setFlash(null);
      setStatus(null);
      return fresh;
    },
    [],
  );

  const restart = () => {
    askCurrent(resetSession(tree, lang));
  };

  /**
   * Skift af træ starter altid en frisk session: en halv beslutningsvej fra et
   * andet træ ville være klinisk meningsløs.
   */
  const selectTree = useCallback(
    async (id: string) => {
      if (id === tree.id || treeBusy) return;
      setTreeBusy(true);
      try {
        const res = await fetch(`/api/tree?id=${encodeURIComponent(id)}`, {
          signal: AbortSignal.timeout(TIMEOUT_TREE),
        });
        if (!res.ok) throw new Error("tree");
        const next = (await res.json()) as DecisionTree;
        setTree(next);
        askCurrent(resetSession(next, lang), next);
      } catch (err) {
        // Det aktive træ står urørt tilbage — en mislykket omskiftning må ikke
        // efterlade sessionen halvt i ét træ og halvt i et andet.
        setStatus(failureMessage(err, "tree", lang));
      } finally {
        setTreeBusy(false);
      }
    },
    [tree.id, treeBusy, lang, askCurrent, resetSession],
  );

  /**
   * Journalnotatet er appens langsomste kald (målt 14–16 s) og derfor det der
   * ligner en frossen app hvis det fejler i stilhed. Det har sin egen, meget
   * længere frist end de øvrige kald — en generøs frist er ikke det samme som
   * ingen frist — og en spærre så et utålmodigt klik ikke sender kaldet igen.
   */
  const generateNote = async () => {
    if (noteBusy) return;
    setNoteBusy(true);
    setStatus(tr("noteWorking", lang));
    try {
      const res = await fetch("/api/note", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          treeId: tree.id,
          lang,
          path: state.path,
          dispositionId: state.dispositionId,
          transcript: transcript.join("\n"),
          dictation,
        }),
        signal: AbortSignal.timeout(TIMEOUT_NOTE),
      });
      const data = (await res.json()) as NoteResult & { error?: string };
      setStatus(data.error ?? null);
      if (!data.error) setNote(data);
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
        void say(redFlag.message);
      } else if (next.dispositionId) {
        const d = getDisposition(tree, next.dispositionId);
        if (d && speakAll) void say(`${d.title[lang]}. ${d.guidance[lang]}`);
      } else {
        askCurrent(next);
      }
    },
    [tree, state, lang, speakAll, askCurrent, say],
  );

  const toggleMic = useCallback(() => {
    if (listening) stop();
    else void start();
  }, [listening, start, stop]);

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
    () => micMessage(error, lang, orMode) ?? (speakAll && !audioUnlocked ? tr("audioGesture", lang) : null),
    [error, lang, orMode, speakAll, audioUnlocked],
  );

  // Forvarm oplæsningen af de mulige næste spørgsmål, så stemmen starter uden
  // ventetid når klinikeren svarer. Netværks-TTS koster ~1 s uden dette.
  useEffect(() => {
    if (!node) return;
    const targets = new Set(node.edges.map((e) => e.goto));
    node.redFlags?.forEach((f) => f.goto && targets.add(f.goto));
    targets.forEach((id) => {
      const nextNode = getNode(tree, id);
      if (nextNode) prefetchSpeech(questionText(nextNode, lang, orMode), lang);
    });
    // Kvitteringerne er korte og gentages hele vejen gennem træet — de skal
    // ligge klar, ellers koster hver "næste" en ekstra netværksrundtur.
    [tr("ackNext", lang), tr("ackRepeat", lang), tr("ackBack", lang)].forEach((t) => prefetchSpeech(t, lang));
  }, [node, tree, lang, orMode]);

  if (orMode) {
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
        status={status}
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
    <main className="relative min-h-screen bg-[var(--paper)] px-4 py-6 text-[var(--ink)] sm:px-6 sm:py-8">
      <BrandWatermark />
      <div className="relative z-10 mx-auto max-w-5xl">
        <ControlRail
          lang={lang}
          treeId={tree.id}
          treeName={tree.name[lang]}
          treeVersion={tree.version}
          trees={trees}
          treeBusy={treeBusy}
          onSelectTree={(id) => void selectTree(id)}
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
        {notice && (
          <div
            role="status"
            className="mb-4 rounded-lg border border-[var(--nude-deep)] bg-[var(--nude-tint)] px-4 py-3 text-sm font-medium leading-relaxed text-[var(--ink)]"
          >
            {notice}
          </div>
        )}

        {flash && (
          <div className="mb-6">
            <RedFlagBanner message={flash} lang={lang} orMode={false} onAcknowledge={() => void acknowledgeFlash()} />
          </div>
        )}

        <div className="grid gap-6 md:grid-cols-[1fr_320px]">
          <section>
            {node && !flash && (
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
            )}

            {disposition && (
              <div className={node && !flash ? "mt-6" : undefined}>
                <DispositionCard
                  disposition={disposition}
                  lang={lang}
                  dictating={dictating}
                  dictation={dictation}
                  listening={listening}
                  interim={interim}
                  onToggleDictate={() => {
                    setDictating((d) => !d);
                    if (!listening) void start();
                  }}
                  onToggleMic={toggleMic}
                  onSubmitFreeText={(t) => void handleUtterance(t)}
                  onGenerateNote={generateNote}
                  noteBusy={noteBusy}
                  onRestart={restart}
                />
              </div>
            )}

            {note && <NotePanel note={note} lang={lang} />}
          </section>

          <aside className="space-y-4">
            <SidebarPath
              tree={tree}
              path={state.path}
              progress={progress}
              stepLabel={`${state.path.length}/${tree.nodes.length}`}
              lang={lang}
            />
            <TranscriptPanel lines={transcript} interim={interim} listening={listening} status={status} lang={lang} />

            {tree.authors && <p className="text-xs text-[var(--ink-faint)]">{tree.authors.join(", ")}</p>}
          </aside>
        </div>
      </div>
    </main>
  );
}
