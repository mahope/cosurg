"use client";

import { useCallback, useRef, useState } from "react";
import type { ChatAnswer, ChatEvent } from "@/lib/corti/chat";
import type { Lang } from "@/lib/tree/types";
import { tr } from "@/lib/i18n";

/**
 * Samtalens tilstand på klienten.
 *
 * Hukommelsen ligger to steder med vilje. Corti husker tråden via `contextId`,
 * så "og hvis han er et barn?" giver mening uden at vi gentager hele samtalen.
 * Men agentens kontekst kan udløbe når tråden ligger stille, og API'et siger det
 * ikke — den svarer bare uden at kende historikken. Derfor holder vi ALTID vores
 * egen kopi af samtalen, og har der været stille længe nok, sender vi et kort
 * resumé med og siger det tydeligt i UI'et.
 */

/** Efter så lang tids stilstand regnes agentens egen kontekst som muligvis tabt. */
const STALE_MS = 10 * 60_000;

/** Hvor mange tidligere ture der kommer med i resuméet. */
const RECAP_TURNS = 3;
const RECAP_ANSWER_CHARS = 500;

export interface Turn {
  id: string;
  question: string;
  answer?: ChatAnswer;
  error?: string;
  /** Sat når vi gensendte et resumé fordi tråden havde ligget stille. */
  restored?: boolean;
  /** Statuslinjer fra agenten mens den arbejder. */
  progress: Array<{ expert: string | null; text: string }>;
  done: boolean;
}

function newId(): string {
  return `t-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

/** Netværksfejl oversat til noget klinikeren kan handle på. */
function failureText(err: unknown, lang: Lang): string {
  if (typeof navigator !== "undefined" && navigator.onLine === false) return tr("chatOffline", lang);
  if (err instanceof Error && (err.name === "TimeoutError" || err.name === "AbortError")) {
    return tr("chatTimedOut", lang);
  }
  return tr("chatFailed", lang);
}

export function useClinicalChat(lang: Lang) {
  const [turns, setTurns] = useState<Turn[]>([]);
  const [busy, setBusy] = useState(false);

  const contextIdRef = useRef<string | undefined>(undefined);
  const lastActivityRef = useRef<number>(0);
  const turnsRef = useRef<Turn[]>([]);
  const abortRef = useRef<AbortController | null>(null);

  const write = useCallback((next: Turn[]) => {
    turnsRef.current = next;
    setTurns(next);
  }, []);

  const patch = useCallback(
    (id: string, change: Partial<Turn> | ((t: Turn) => Partial<Turn>)) => {
      write(
        turnsRef.current.map((t) =>
          t.id === id ? { ...t, ...(typeof change === "function" ? change(t) : change) } : t,
        ),
      );
    },
    [write],
  );

  const buildRecap = useCallback((): string | undefined => {
    const past = turnsRef.current.filter((t) => t.answer);
    if (past.length === 0) return undefined;
    return past
      .slice(-RECAP_TURNS)
      .map((t) => `Q: ${t.question}\nA: ${t.answer!.answer.slice(0, RECAP_ANSWER_CHARS)}`)
      .join("\n\n");
  }, []);

  const stop = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
    setBusy(false);
  }, []);

  const reset = useCallback(() => {
    stop();
    contextIdRef.current = undefined;
    lastActivityRef.current = 0;
    write([]);
  }, [stop, write]);

  /**
   * Stiller spørgsmålet og streamer svaret ind. Returnerer turens id sammen med
   * det færdige svar, så kalderen kan læse netop den tur op — hooken kender ikke
   * til lyd, og kalderen skal ikke gætte hvilken tur der lige blev besvaret.
   */
  const ask = useCallback(
    async (
      question: string,
      /**
       * Hvad appen ved om patienten lige nu — de besvarede trin i
       * beslutningsforløbet. Sendes med så et generelt svar kan gøres konkret;
       * agenten mærker selv hvad der er ræsonnement og hvad der er kilde.
       */
      patientContext?: string,
    ): Promise<{ id: string; answer: ChatAnswer | null }> => {
      const text = question.trim();
      if (!text || abortRef.current) return { id: "", answer: null };

      const stale =
        lastActivityRef.current > 0 && Date.now() - lastActivityRef.current > STALE_MS;
      const recap = stale ? buildRecap() : undefined;

      const id = newId();
      write([
        ...turnsRef.current,
        { id, question: text, progress: [], done: false, restored: Boolean(recap) },
      ]);
      setBusy(true);

      const controller = new AbortController();
      abortRef.current = controller;
      let answer: ChatAnswer | null = null;

      try {
        const res = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            question: text,
            lang,
            contextId: contextIdRef.current,
            recap,
            patientContext,
          }),
          signal: controller.signal,
        });

        if (!res.ok || !res.body) {
          const detail = res.status === 429 ? tr("chatTimedOut", lang) : tr("chatFailed", lang);
          patch(id, { error: detail, done: true });
          return { id, answer: null };
        }

        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";

        for (;;) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });

          let split: number;
          while ((split = buffer.indexOf("\n\n")) !== -1) {
            const block = buffer.slice(0, split);
            buffer = buffer.slice(split + 2);

            for (const line of block.split("\n")) {
              if (!line.startsWith("data:")) continue;
              const payload = line.slice(5).trim();
              if (!payload) continue;

              let event: ChatEvent;
              try {
                event = JSON.parse(payload) as ChatEvent;
              } catch {
                continue;
              }

              if (event.kind === "context") {
                contextIdRef.current = event.contextId;
              } else if (event.kind === "progress") {
                patch(id, (t) => ({
                  progress: [...t.progress, { expert: event.expert, text: event.text }],
                }));
              } else if (event.kind === "answer") {
                answer = event.answer;
                patch(id, { answer: event.answer, done: true });
              } else if (event.kind === "error") {
                // Serverens egen tekst ("Agent-kald fejlede: 401 …") siger en
                // læge ingenting. Skærmen får beskeden han kan handle på;
                // detaljen bliver i konsollen, hvor vi kan finde den.
                console.error("chat-agent:", event.message);
                patch(id, { error: tr("chatFailed", lang), done: true });
              }
            }
          }
        }

        if (!answer && !turnsRef.current.find((t) => t.id === id)?.error) {
          patch(id, { error: tr("chatFailed", lang), done: true });
        }
      } catch (err) {
        // Brugerens eget afbryd efterlader turen som den er, uden fejlbesked.
        if (controller.signal.aborted) {
          patch(id, { done: true });
        } else {
          patch(id, { error: failureText(err, lang), done: true });
        }
      } finally {
        lastActivityRef.current = Date.now();
        abortRef.current = null;
        setBusy(false);
      }

      return { id, answer };
    },
    [buildRecap, lang, patch, write],
  );

  return { turns, busy, ask, stop, reset };
}
