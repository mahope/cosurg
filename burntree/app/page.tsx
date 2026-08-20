"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import burnsTree from "@/content/trees/burns.json";
import { advance, getDisposition, getNode, goBack, questionText, startSession } from "@/lib/tree/engine";
import type { DecisionTree, Lang, SessionState } from "@/lib/tree/types";
import { useTranscribe } from "@/lib/audio/useTranscribe";
import { prefetchSpeech, speak, stopSpeaking } from "@/lib/audio/speak";
import { tr } from "@/lib/i18n";
import { ControlRail } from "@/components/ControlRail";
import { QuestionCard } from "@/components/QuestionCard";
import { DispositionCard } from "@/components/DispositionCard";
import { RedFlagBanner } from "@/components/RedFlagBanner";
import { SidebarPath } from "@/components/SidebarPath";
import { TranscriptPanel } from "@/components/TranscriptPanel";
import { NotePanel } from "@/components/NotePanel";
import { OrView } from "@/components/OrView";

const tree = burnsTree as unknown as DecisionTree;

interface NoteResult {
  note: string;
  codes: Array<{ code: string; system?: string; description: string; rationale?: string }>;
}

export default function Home() {
  const [lang, setLang] = useState<Lang>("da");
  const [orMode, setOrMode] = useState(false);
  const [fullVoice, setFullVoice] = useState(true);
  const [state, setState] = useState<SessionState>(() => startSession(tree, "da"));
  const [transcript, setTranscript] = useState<string[]>([]);
  const [status, setStatus] = useState<string | null>(null);
  const [flash, setFlash] = useState<string | null>(null);
  const [note, setNote] = useState<NoteResult | null>(null);
  const [dictating, setDictating] = useState(false);
  const [dictation, setDictation] = useState("");
  const busyRef = useRef(false);

  const node = state.currentNodeId ? getNode(tree, state.currentNodeId) : undefined;
  const disposition = state.dispositionId ? getDisposition(tree, state.dispositionId) : undefined;
  const speakAll = orMode || fullVoice;

  const askCurrent = useCallback(
    (s: SessionState) => {
      const n = s.currentNodeId ? getNode(tree, s.currentNodeId) : undefined;
      if (!n) return;
      if (speakAll) void speak(questionText(n, s.lang, orMode), s.lang);
    },
    [speakAll, orMode],
  );

  const handleUtterance = useCallback(
    async (text: string) => {
      setTranscript((prev) => [...prev, text]);

      if (dictating) {
        setDictation((prev) => `${prev} ${text}`.trim());
        return;
      }
      if (!state.currentNodeId || busyRef.current) return;

      // Håndfri kommandoer i OR-tilstand, før svarfortolkning.
      const lower = text.toLowerCase().trim();
      if (orMode) {
        if (/^(næste|next)\b/.test(lower)) return;
        if (/^(gentag|repeat)\b/.test(lower)) {
          askCurrent(state);
          return;
        }
        if (/^(tilbage|back)\b/.test(lower)) {
          const prev = goBack(state);
          setState(prev);
          askCurrent(prev);
          return;
        }
      }

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
        });
        const data = (await res.json()) as {
          value?: string;
          needsClarification?: boolean;
          clarificationQuestion?: string;
          error?: string;
        };

        if (data.error) {
          setStatus(data.error);
          return;
        }

        // Aldrig gæt: uklart svar → spørg igen i stedet for at rykke videre.
        if (data.needsClarification || !data.value) {
          setStatus(tr("unclear", lang));
          const q = data.clarificationQuestion ?? questionText(getNode(tree, state.currentNodeId)!, lang, orMode);
          if (speakAll) void speak(q, lang);
          return;
        }

        const { state: next, redFlag } = advance(tree, state, data.value, text);
        setState(next);
        setStatus(null);

        if (redFlag) {
          setFlash(redFlag.message);
          // Røde flag læses ALTID op, uanset stemmetilstand.
          void speak(redFlag.message, lang);
          return;
        }

        if (next.dispositionId) {
          const d = getDisposition(tree, next.dispositionId);
          if (d && speakAll) void speak(`${d.title[lang]}. ${d.guidance[lang]}`, lang);
        } else {
          askCurrent(next);
        }
      } finally {
        busyRef.current = false;
      }
    },
    [state, lang, orMode, speakAll, askCurrent, dictating],
  );

  const { listening, interim, error, start, stop } = useTranscribe({ lang, onFinal: handleUtterance });

  // OR-tilstand: mikrofonen skal altid være åben — kirurgen er steril.
  useEffect(() => {
    if (orMode && !listening) void start();
  }, [orMode, listening, start]);

  const restart = () => {
    stopSpeaking();
    const fresh = startSession(tree, lang);
    setState(fresh);
    setTranscript([]);
    setNote(null);
    setDictation("");
    setFlash(null);
    setStatus(null);
    askCurrent(fresh);
  };

  const generateNote = async () => {
    setStatus(tr("thinking", lang));
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
    });
    const data = (await res.json()) as NoteResult & { error?: string };
    setStatus(data.error ?? null);
    if (!data.error) setNote(data);
  };

  // Klik-svar (kort/valg) rykker direkte gennem træet — samme motorkald som
  // stemme/tekst-svar, blot uden agent-fortolkning, fordi værdien allerede er
  // entydig. Delt mellem standardtilstand og OR-tilstand.
  const selectOption = useCallback(
    (value: string, rawLabel: string) => {
      const { state: next, redFlag } = advance(tree, state, value, rawLabel);
      setState(next);
      if (redFlag) {
        setFlash(redFlag.message);
        void speak(redFlag.message, lang);
      } else if (next.dispositionId) {
        const d = getDisposition(tree, next.dispositionId);
        if (d && speakAll) void speak(`${d.title[lang]}. ${d.guidance[lang]}`, lang);
      } else {
        askCurrent(next);
      }
    },
    [state, lang, speakAll, askCurrent],
  );

  const toggleMic = useCallback(() => {
    if (listening) stop();
    else void start();
  }, [listening, start, stop]);

  const progress = useMemo(
    () => Math.round((state.path.length / Math.max(tree.nodes.length, 1)) * 100),
    [state.path.length],
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
  }, [node, lang, orMode]);

  if (orMode) {
    return (
      <OrView
        lang={lang}
        node={node}
        questionText={node ? questionText(node, lang, orMode) : ""}
        disposition={disposition}
        flash={flash}
        onAcknowledgeFlash={() => setFlash(null)}
        stepNumber={state.path.length + 1}
        totalNodes={tree.nodes.length}
        listening={listening}
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
    <main className="min-h-screen bg-[var(--paper)] text-[var(--ink)] px-4 py-6 sm:px-6 sm:py-8">
      <div className="mx-auto max-w-5xl">
        <ControlRail
          lang={lang}
          treeName={tree.name[lang]}
          treeVersion={tree.version}
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

        {error && (
          <div className="mb-4 rounded-lg border border-[var(--red-line)] bg-[var(--red-tint)] px-4 py-3 text-sm text-[var(--red)]">
            {error}
          </div>
        )}

        {flash && (
          <div className="mb-6">
            <RedFlagBanner message={flash} lang={lang} orMode={false} onAcknowledge={() => setFlash(null)} />
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
                  onRestart={restart}
                />
              </div>
            )}

            {note && <NotePanel note={note} lang={lang} />}
          </section>

          <aside className="space-y-4">
            <SidebarPath
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
