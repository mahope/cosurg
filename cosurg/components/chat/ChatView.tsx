"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { BrandMark, BrandWatermark } from "@/components/BrandMark";
import { LangSwitch } from "@/components/LangSwitch";
import { AboutTeamLink } from "@/components/AboutTeamLink";
import { speak, stopSpeaking } from "@/lib/audio/speak";
import { useTranscribe } from "@/lib/audio/useTranscribe";
import { micMessage, tr } from "@/lib/i18n";
import type { ChatAnswer } from "@/lib/corti/chat";
import type { Lang } from "@/lib/tree/types";
import { spokenText } from "@/components/unified/spoken";
import { AnswerCard } from "./AnswerCard";
import { ChatComposer } from "./ChatComposer";
import { ProgressTrail } from "./ProgressTrail";
import { expertLabel } from "./experts";
import { useClinicalChat } from "./useClinicalChat";

/**
 * Den kliniske chat — den lange samtale.
 *
 * Den er IKKE længere vejen ind. Forsiden svarer selv på faglige spørgsmål midt
 * i et forløb (`app/page.tsx` + `components/unified/`), så lægen aldrig skal
 * vælge mellem "forløb" og "chat". Denne side er blevet det den altid burde
 * være: stedet hvor man bliver hængende i en tråd — flere spørgsmål i træk, med
 * agentens hukommelse imellem — når man ikke står med en patient foran sig.
 *
 * Den bliver liggende på sin egen rute af én teknisk grund, og den er stadig
 * gyldig: der er kun ÉN mikrofon. Både forsiden og denne side vil have
 * `getUserMedia`, og to lyttere om samme lyd giver en app der svarer på det
 * forkerte spørgsmål. Ruterne kan aldrig være fremme samtidig, så lytteren er
 * altid alene. Derfor deler de to flader oplæsningen (`unified/spoken.ts`) og
 * samtalen (`useClinicalChat`) — men aldrig en mikrofon.
 */

/** Hvor længe efter egen tale vi ignorerer mikrofonen, så appen ikke hører sig selv. */
const ECHO_TAIL_MS = 900;

/** Den hørbare kvittering er én kort sætning — så længe er mikrofonen døv for den. */
const ACK_DEAF_MS = 6_000;

/** Kortere end dette er ikke et spørgsmål — det er en rømmen sig. */
const MIN_UTTERANCE = 5;

export function ChatView() {
  const [lang, setLang] = useState<Lang>("da");
  const [handsFree, setHandsFree] = useState(false);
  const [speakingId, setSpeakingId] = useState<string | null>(null);
  const [experts, setExperts] = useState<string[]>([]);

  const { turns, busy, ask, stop, reset } = useClinicalChat(lang);

  const busyRef = useRef(false);
  const handsFreeRef = useRef(false);
  const ignoreUntilRef = useRef(0);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    handsFreeRef.current = handsFree;
  }, [handsFree]);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/chat")
      .then((r) => (r.ok ? r.json() : null))
      .then((d: { experts?: string[] } | null) => {
        if (!cancelled && d?.experts) setExperts(d.experts);
      })
      .catch(() => {
        // Listen er kun til visning. Kan den ikke hentes, vises den ikke.
      });
    return () => {
      cancelled = true;
    };
  }, []);

  /**
   * Afbryder igangværende oplæsning. `speak()` lover kun at afslutte når lyden
   * spiller færdig — afbryder man den midtvejs, indfries løftet aldrig. Uden
   * denne udvej ville "stop oplæsning" efterlade mikrofonen døv for altid i
   * håndfri tilstand, fordi ekko-spærren aldrig blev hævet.
   */
  const speechHaltRef = useRef<(() => void) | null>(null);
  const haltSpeech = useCallback(() => {
    stopSpeaking();
    speechHaltRef.current?.();
  }, []);

  const readAloud = useCallback(
    async (turnId: string, answer: ChatAnswer) => {
      setSpeakingId(turnId);
      // Mens appen taler er mikrofonen døv for sig selv. Uden det ville
      // håndfri tilstand stille sit eget svar som næste spørgsmål.
      ignoreUntilRef.current = Number.MAX_SAFE_INTEGER;
      try {
        await new Promise<void>((resolve) => {
          speechHaltRef.current = resolve;
          void speak(spokenText(answer, lang), lang).then(resolve, resolve);
        });
      } finally {
        speechHaltRef.current = null;
        setSpeakingId(null);
        ignoreUntilRef.current = Date.now() + ECHO_TAIL_MS;
      }
    },
    [lang],
  );

  const submit = useCallback(
    async (text: string) => {
      if (busyRef.current) return;
      busyRef.current = true;

      if (handsFreeRef.current) {
        // Kvittér højt med det samme: 35-70 sekunders tavshed uden et ord
        // føles som en app der ikke hørte spørgsmålet. Spærren er et fast
        // vindue frem for et løfte, så den aldrig kan sætte sig fast.
        ignoreUntilRef.current = Date.now() + ACK_DEAF_MS;
        void speak(tr("chatAckHeard", lang), lang);
      }

      let result: { id: string; answer: ChatAnswer | null };
      try {
        result = await ask(text);
      } finally {
        busyRef.current = false;
      }

      if (result.answer && handsFreeRef.current) {
        await readAloud(result.id, result.answer);
      }
    },
    [ask, lang, readAloud],
  );

  const handleFinal = useCallback(
    (text: string) => {
      const t = text.trim();
      if (t.length < MIN_UTTERANCE) return;
      if (busyRef.current) return;
      if (Date.now() < ignoreUntilRef.current) return;
      void submit(t);
    },
    [submit],
  );

  const { listening, interim, error: micError, start, stop: stopMic } = useTranscribe({
    lang,
    onFinal: handleFinal,
  });

  const listeningRef = useRef(false);
  useEffect(() => {
    listeningRef.current = listening;
  }, [listening]);

  // Sprogskift ændrer både STT-sprog og stemme. Socket'en er bundet til det
  // sprog den blev åbnet med, så mikrofonen lukkes frem for at lytte videre på
  // det gamle sprog — og oplæsningen på det gamle sprog stoppes.
  const changeLang = useCallback(
    (next: Lang) => {
      if (next === lang) return;
      if (listeningRef.current) stopMic();
      haltSpeech();
      setHandsFree(false);
      setLang(next);
    },
    [haltSpeech, lang, stopMic],
  );

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [turns]);

  /*
   * `listening` bliver først sandt efter token-hentning, socket-opkobling og
   * en mulig tilladelsesdialog. I hele det vindue ser knappen slukket ud, så et
   * andet klik ville starte mikrofonen én gang til — og den første MediaStream
   * ville blive hængende åben uden at nogen kan lukke den. Ét klik ad gangen.
   */
  const micStartingRef = useRef(false);
  const startMic = useCallback(() => {
    if (micStartingRef.current || listeningRef.current) return;
    micStartingRef.current = true;
    void start().finally(() => {
      micStartingRef.current = false;
    });
  }, [start]);

  const toggleMic = useCallback(() => {
    if (listening) {
      stopMic();
      setHandsFree(false);
    } else {
      startMic();
    }
  }, [listening, startMic, stopMic]);

  const toggleHandsFree = useCallback(() => {
    // Bivirkningerne ligger uden for state-opdateringen med vilje: en updater
    // kan køres to gange, og mikrofonen skal ikke startes to gange.
    const next = !handsFreeRef.current;
    if (next) startMic();
    else haltSpeech();
    setHandsFree(next);
  }, [haltSpeech, startMic]);

  /*
   * Forlader lægen siden midt i et svar, må intet køre videre: SSE-kaldet
   * bruger Corti-credits i op til tre minutter, mikrofonen ville blive stående
   * åben, og oplæsningen ville tale videre fra en side der ikke er der mere.
   */
  useEffect(() => {
    return () => {
      stop();
      stopMic();
      haltSpeech();
    };
  }, [haltSpeech, stop, stopMic]);

  const toggleSpeak = useCallback(
    (turnId: string, answer: ChatAnswer) => {
      if (speakingId === turnId) {
        haltSpeech();
        return;
      }
      void readAloud(turnId, answer);
    },
    [haltSpeech, readAloud, speakingId],
  );

  const micNotice = micMessage(micError, lang);
  const examples = [tr("chatExample1", lang), tr("chatExample2", lang), tr("chatExample3", lang)];

  return (
    <div className="relative flex min-h-full flex-1 flex-col">
      <BrandWatermark />

      <header className="sticky top-0 z-10 border-b bg-[color-mix(in_srgb,var(--paper)_92%,transparent)] backdrop-blur">
        <div className="mx-auto flex w-full max-w-3xl flex-wrap items-center gap-x-3 gap-y-2 px-4 py-3 sm:px-6">
          <Link href="/" className="shrink-0 transition-opacity hover:opacity-80">
            <BrandMark size={30} />
          </Link>
          <div className="min-w-0">
            <Link href="/" className="transition-opacity hover:opacity-80">
              <h1 className="font-[family-name:var(--font-display)] text-[17px] font-semibold leading-tight tracking-tight text-[var(--ink)]">
                {tr("chatTitle", lang)}
              </h1>
            </Link>
            <p className="truncate text-[12.5px] leading-tight text-[var(--ink-soft)]">
              {tr("chatTagline", lang)}
            </p>
          </div>

          <div className="ml-auto flex items-center gap-1.5">
            <button
              type="button"
              onClick={toggleHandsFree}
              aria-pressed={handsFree}
              title={tr("chatHandsFreeHint", lang)}
              className={`rounded-lg border px-2.5 py-1.5 text-[12.5px] font-medium transition-colors ${
                handsFree
                  ? "border-[var(--teal)] bg-[var(--teal)] text-white"
                  : "text-[var(--ink-soft)] hover:border-[var(--teal)] hover:bg-[var(--teal-tint)] hover:text-[var(--teal-deep)]"
              }`}
            >
              {tr("chatHandsFree", lang)}
            </button>

            <LangSwitch lang={lang} onToggleLang={() => changeLang(lang === "da" ? "en" : "da")} />

            <AboutTeamLink lang={lang} />

            {turns.length > 0 && (
              <button
                type="button"
                onClick={() => {
                  haltSpeech();
                  reset();
                }}
                className="rounded-lg border px-2.5 py-1.5 text-[12.5px] font-medium text-[var(--ink-soft)] transition-colors hover:border-[var(--teal)] hover:bg-[var(--teal-tint)] hover:text-[var(--teal-deep)]"
              >
                {tr("chatNewThread", lang)}
              </button>
            )}

            <Link
              href="/"
              className="flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-[12.5px] font-medium text-[var(--ink-soft)] transition-colors hover:border-[var(--teal)] hover:bg-[var(--teal-tint)] hover:text-[var(--teal-deep)]"
            >
              <svg viewBox="0 0 20 20" width="13" height="13" fill="none" aria-hidden="true">
                <path
                  d="M12 4 6.5 10l5.5 6"
                  stroke="currentColor"
                  strokeWidth="1.7"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              {tr("chatBack", lang)}
            </Link>
          </div>
        </div>
      </header>

      <main className="relative z-[1] mx-auto w-full max-w-3xl flex-1 px-4 py-6 sm:px-6">
        {turns.length === 0 ? (
          <div className="rounded-2xl border bg-[var(--paper-raised)] p-6 sm:p-7">
            <h2 className="font-[family-name:var(--font-display)] text-[22px] font-semibold tracking-tight text-[var(--ink)]">
              {tr("chatEmptyTitle", lang)}
            </h2>
            <p className="mt-2 text-[14px] leading-relaxed text-[var(--ink-soft)]">
              {tr("chatGrounding", lang)}
            </p>
            <div className="mt-5 flex flex-col gap-2">
              {examples.map((q) => (
                <button
                  key={q}
                  type="button"
                  onClick={() => void submit(q)}
                  className="rounded-xl border px-3.5 py-2.5 text-left text-[14px] leading-snug text-[var(--ink)] transition-colors hover:border-[var(--teal)] hover:bg-[var(--teal-tint)]"
                >
                  {q}
                </button>
              ))}
            </div>
            {experts.length > 0 && (
              <p className="mt-5 flex flex-wrap items-center gap-1.5 border-t border-[var(--line)] pt-4 font-[family-name:var(--font-mono)] text-[11px] uppercase tracking-[0.1em] text-[var(--ink-faint)]">
                {tr("chatExperts", lang)}
                {experts.map((e) => (
                  <span
                    key={e}
                    className="rounded border border-[var(--line)] bg-[var(--paper)] px-1.5 py-px normal-case tracking-normal"
                  >
                    {expertLabel(e, lang)}
                  </span>
                ))}
              </p>
            )}
          </div>
        ) : (
          <div className="space-y-5">
            {turns.map((turn) => (
              <div key={turn.id} className="space-y-3">
                <div className="flex justify-end">
                  <div className="max-w-[85%] rounded-2xl rounded-br-md bg-[var(--teal-deep)] px-4 py-2.5 text-[15px] leading-snug text-white">
                    {turn.question}
                  </div>
                </div>

                {turn.restored && (
                  <p className="text-center font-[family-name:var(--font-mono)] text-[11px] uppercase tracking-[0.1em] text-[var(--ink-faint)]">
                    {tr("chatRestored", lang)}
                  </p>
                )}

                {turn.answer ? (
                  <AnswerCard
                    answer={turn.answer}
                    lang={lang}
                    speaking={speakingId === turn.id}
                    onSpeak={() => toggleSpeak(turn.id, turn.answer!)}
                  />
                ) : turn.error ? (
                  <p className="rounded-2xl border border-dashed border-[var(--nude-deep)] bg-[var(--nude-tint)] px-4 py-3 text-[14px] leading-relaxed text-[var(--nude-deep)]">
                    {turn.error}
                  </p>
                ) : (
                  <ProgressTrail progress={turn.progress} lang={lang} />
                )}
              </div>
            ))}
            <div ref={bottomRef} />
          </div>
        )}
      </main>

      <div className="sticky bottom-0 z-10 border-t bg-[color-mix(in_srgb,var(--paper)_92%,transparent)] backdrop-blur">
        <div className="mx-auto w-full max-w-3xl px-4 py-3 sm:px-6">
          {micNotice && (
            <p className="mb-2 rounded-lg border border-dashed border-[var(--nude-deep)] bg-[var(--nude-tint)] px-3 py-2 text-[13px] leading-relaxed text-[var(--nude-deep)]">
              {micNotice}
            </p>
          )}
          {handsFree && (
            <p className="mb-2 text-center text-[12.5px] text-[var(--ink-soft)]">
              {tr("chatHandsFreeHint", lang)}
            </p>
          )}
          <ChatComposer
            lang={lang}
            listening={listening}
            interim={interim}
            busy={busy}
            onToggleMic={toggleMic}
            onSubmit={(text) => void submit(text)}
            onStop={stop}
          />
          <p className="mt-2 text-center text-[11.5px] leading-relaxed text-[var(--ink-faint)]">
            {tr("chatDisclaimer", lang)}
          </p>
        </div>
      </div>
    </div>
  );
}
