"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import burnsTree from "@/content/trees/burns.json";
import { advance, getDisposition, getNode, goBack, questionText, startSession } from "@/lib/tree/engine";
import type { DecisionTree, Lang, SessionState } from "@/lib/tree/types";
import { useTranscribe } from "@/lib/audio/useTranscribe";
import { prefetchSpeech, speak, stopSpeaking } from "@/lib/audio/speak";
import { tr } from "@/lib/i18n";

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

  const images = node?.images ?? disposition?.images ?? [];

  return (
    <main
      className={
        orMode
          ? "min-h-screen bg-slate-950 text-slate-50 p-8"
          : "min-h-screen bg-slate-50 text-slate-900 p-6"
      }
    >
      <div className="mx-auto max-w-5xl">
        <header className="flex flex-wrap items-center justify-between gap-4 mb-8">
          <div>
            <h1 className={orMode ? "text-4xl font-bold" : "text-2xl font-bold"}>
              {tr("title", lang)}
              <span className={orMode ? "ml-3 text-amber-400" : "ml-3 text-sm font-normal text-slate-500"}>
                {orMode ? tr("orModeOn", lang) : tr("tagline", lang)}
              </span>
            </h1>
            <p className={orMode ? "text-lg text-slate-300 mt-1" : "text-sm text-slate-500"}>
              {tree.name[lang]} · v{tree.version}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => {
                const next: Lang = lang === "da" ? "en" : "da";
                setLang(next);
                setState((s) => ({ ...s, lang: next }));
              }}
              className="rounded-lg border px-3 py-2 text-sm font-medium"
            >
              {lang === "da" ? "🇩🇰 Dansk" : "🇬🇧 English"}
            </button>

            <button
              onClick={() => setFullVoice((v) => !v)}
              disabled={orMode}
              className="rounded-lg border px-3 py-2 text-sm font-medium disabled:opacity-40"
            >
              {fullVoice ? `🔊 ${tr("voiceFull", lang)}` : `🔉 ${tr("voiceKey", lang)}`}
            </button>

            <button
              onClick={() => {
                setOrMode((v) => !v);
                if (orMode) stop();
              }}
              className={
                orMode
                  ? "rounded-lg bg-amber-500 px-4 py-2 text-sm font-bold text-slate-950"
                  : "rounded-lg bg-slate-900 px-4 py-2 text-sm font-bold text-white"
              }
            >
              {tr("orMode", lang)}
            </button>

            <button
              onClick={() => (listening ? stop() : start())}
              className={
                listening
                  ? "rounded-lg bg-red-600 px-4 py-2 text-sm font-bold text-white"
                  : "rounded-lg border px-4 py-2 text-sm font-medium"
              }
            >
              {listening ? `● ${tr("listening", lang)}` : `○ ${tr("micOff", lang)}`}
            </button>
          </div>
        </header>

        {error && (
          <div className="mb-4 rounded-lg bg-red-100 px-4 py-3 text-sm text-red-800">{error}</div>
        )}

        {flash && (
          <div
            className={
              orMode
                ? "mb-6 rounded-xl border-4 border-red-500 bg-red-950 px-6 py-5"
                : "mb-6 rounded-xl border-2 border-red-500 bg-red-50 px-5 py-4"
            }
          >
            <p className={orMode ? "text-2xl font-bold text-red-400" : "text-sm font-bold text-red-700"}>
              ⚠ {tr("redFlag", lang)}
            </p>
            <p className={orMode ? "mt-2 text-3xl leading-snug" : "mt-1 text-base"}>{flash}</p>
            <button
              onClick={() => setFlash(null)}
              className="mt-4 rounded-lg border px-4 py-2 text-sm font-medium"
            >
              OK
            </button>
          </div>
        )}

        <div className="grid gap-6 md:grid-cols-[1fr_320px]">
          <section>
            {node && !flash && (
              <div
                className={
                  orMode
                    ? "rounded-2xl border border-slate-700 bg-slate-900 p-8"
                    : "rounded-2xl border bg-white p-6 shadow-sm"
                }
              >
                <p className={orMode ? "text-sm uppercase tracking-widest text-amber-400" : "text-xs uppercase tracking-wide text-slate-400"}>
                  {state.path.length + 1} / {tree.nodes.length}
                </p>
                <h2 className={orMode ? "mt-3 text-5xl font-bold leading-tight" : "mt-2 text-xl font-semibold"}>
                  {questionText(node, lang, orMode)}
                </h2>

                {node.help && !orMode && (
                  <p className="mt-3 text-sm text-slate-600">{node.help[lang]}</p>
                )}

                <div className="mt-6 flex flex-wrap gap-2">
                  {node.answerType === "number" ? (
                    <input
                      type="number"
                      min={node.min}
                      max={node.max}
                      placeholder={node.unit}
                      className={
                        orMode
                          ? "w-48 rounded-lg bg-slate-800 px-4 py-3 text-2xl"
                          : "w-40 rounded-lg border px-3 py-2"
                      }
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          const v = (e.target as HTMLInputElement).value;
                          if (v) void handleUtterance(v);
                        }
                      }}
                    />
                  ) : (
                    node.options?.map((o) => (
                      <button
                        key={o.value}
                        onClick={() => {
                          const { state: next, redFlag } = advance(tree, state, o.value, o.label[lang]);
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
                        }}
                        className={
                          orMode
                            ? "rounded-xl bg-slate-800 px-6 py-4 text-2xl font-medium hover:bg-slate-700"
                            : "rounded-lg border px-4 py-2 text-sm font-medium hover:bg-slate-100"
                        }
                      >
                        {o.label[lang]}
                      </button>
                    ))
                  )}
                </div>

                {orMode && (
                  <p className="mt-6 text-lg text-slate-400">{tr("orHint", lang)}</p>
                )}
              </div>
            )}

            {disposition && (
              <div
                className={`rounded-2xl border-2 p-6 ${
                  disposition.severity === "emergency"
                    ? "border-red-500 bg-red-50"
                    : disposition.severity === "refer"
                      ? "border-amber-500 bg-amber-50"
                      : "border-emerald-500 bg-emerald-50"
                } ${orMode ? "text-slate-900" : ""}`}
              >
                <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
                  {tr("recommendation", lang)}
                </p>
                <h2 className={orMode ? "mt-2 text-4xl font-bold" : "mt-1 text-2xl font-bold"}>
                  {disposition.title[lang]}
                </h2>
                <p className={orMode ? "mt-4 text-2xl leading-relaxed" : "mt-3 leading-relaxed"}>
                  {disposition.guidance[lang]}
                </p>

                {disposition.sources && (
                  <p className="mt-4 text-xs text-slate-500">
                    {tr("sources", lang)}: {disposition.sources.join(" · ")}
                  </p>
                )}
                <p className="mt-2 text-xs font-medium text-slate-600">{tr("sourceNote", lang)}</p>

                <div className="mt-5 flex flex-wrap gap-2">
                  <button
                    onClick={() => {
                      setDictating((d) => !d);
                      if (!listening) void start();
                    }}
                    className="rounded-lg border bg-white px-4 py-2 text-sm font-medium"
                  >
                    {dictating ? `■ ${tr("stopDictate", lang)}` : `🎙 ${tr("dictate", lang)}`}
                  </button>
                  <button
                    onClick={generateNote}
                    className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-bold text-white"
                  >
                    {tr("generateNote", lang)}
                  </button>
                  <button onClick={restart} className="rounded-lg border bg-white px-4 py-2 text-sm">
                    {tr("restart", lang)}
                  </button>
                </div>

                {dictation && (
                  <p className="mt-4 rounded-lg bg-white/70 p-3 text-sm italic">{dictation}</p>
                )}
              </div>
            )}

            {images.length > 0 && (
              <div className="mt-6 grid gap-4 sm:grid-cols-2">
                {images.map((img) => (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    key={img.src}
                    src={img.src}
                    alt={img.caption?.[lang] ?? ""}
                    className="w-full rounded-xl border object-cover"
                  />
                ))}
              </div>
            )}

            {note && (
              <div className="mt-6 rounded-2xl border bg-white p-6">
                <h3 className="text-lg font-semibold">{tr("note", lang)}</h3>
                <pre className="mt-3 whitespace-pre-wrap font-sans text-sm leading-relaxed">
                  {note.note}
                </pre>
                <h4 className="mt-6 text-sm font-semibold">{tr("codes", lang)}</h4>
                <ul className="mt-2 space-y-1 text-sm">
                  {note.codes.map((c) => (
                    <li key={c.code}>
                      <span className="font-mono font-semibold">{c.code}</span> — {c.description}
                      {c.rationale && <span className="text-slate-500"> ({c.rationale})</span>}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </section>

          <aside className="space-y-4">
            <div className={orMode ? "rounded-xl border border-slate-700 bg-slate-900 p-4" : "rounded-xl border bg-white p-4"}>
              <div className="mb-3 h-1.5 w-full rounded-full bg-slate-200">
                <div className="h-1.5 rounded-full bg-emerald-500" style={{ width: `${progress}%` }} />
              </div>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                {tr("path", lang)}
              </p>
              <ol className="mt-2 space-y-2 text-sm">
                {state.path.map((s, i) => (
                  <li key={`${s.nodeId}-${i}`} className="border-l-2 border-emerald-400 pl-3">
                    <p className={orMode ? "text-slate-300" : "text-slate-500"}>{s.question}</p>
                    <p className="font-medium">
                      {s.value}
                      {s.redFlagged && <span className="ml-2 text-red-500">⚠</span>}
                    </p>
                  </li>
                ))}
                {state.path.length === 0 && (
                  <li className="text-slate-400">—</li>
                )}
              </ol>
            </div>

            <div className={orMode ? "rounded-xl border border-slate-700 bg-slate-900 p-4" : "rounded-xl border bg-white p-4"}>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                {tr("transcript", lang)}
              </p>
              {interim && <p className="mt-2 text-sm italic text-slate-400">{interim}</p>}
              <ul className="mt-2 space-y-1 text-sm">
                {transcript.slice(-8).map((line, i) => (
                  <li key={i}>{line}</li>
                ))}
              </ul>
              {status && <p className="mt-3 text-xs font-medium text-amber-600">{status}</p>}
            </div>

            {tree.authors && (
              <p className="text-xs text-slate-400">
                {tree.authors.join(", ")}
              </p>
            )}
          </aside>
        </div>
      </div>
    </main>
  );
}
