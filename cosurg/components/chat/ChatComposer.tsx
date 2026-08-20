"use client";

import { useEffect, useRef, useState } from "react";
import type { Lang } from "@/lib/tree/types";
import { tr } from "@/lib/i18n";

interface ChatComposerProps {
  lang: Lang;
  listening: boolean;
  interim: string;
  busy: boolean;
  onToggleMic: () => void;
  onSubmit: (text: string) => void;
  onStop: () => void;
}

/**
 * Ét felt til både tale og skrift, som i beslutningstræet: mikrofonen sidder
 * inde i feltet, og den løbende tale vises som pladsholder i samme linje. Det
 * er samme kontrol, ikke to konkurrerende.
 *
 * Feltet vokser med teksten — et klinisk spørgsmål er tit to linjer langt, og
 * en enkeltlinjeinput der scroller vandret er ubrugelig under tidspres.
 */
export function ChatComposer({
  lang,
  listening,
  interim,
  busy,
  onToggleMic,
  onSubmit,
  onStop,
}: ChatComposerProps) {
  const [value, setValue] = useState("");
  const boxRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const el = boxRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 160)}px`;
  }, [value]);

  const submit = () => {
    const text = value.trim();
    if (!text || busy) return;
    onSubmit(text);
    setValue("");
  };

  return (
    <div className="flex items-end gap-1 rounded-2xl border bg-[var(--paper-raised)] px-1.5 py-1.5 shadow-[0_1px_2px_rgba(16,32,30,0.04)] transition-colors focus-within:border-[var(--teal)]">
      <button
        type="button"
        onClick={onToggleMic}
        aria-pressed={listening}
        aria-label={tr(listening ? "chatMicStop" : "chatMicStart", lang)}
        className={`relative mb-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl transition-colors ${
          listening
            ? "text-[var(--teal)]"
            : "text-[var(--ink-soft)] hover:bg-[var(--teal-tint)] hover:text-[var(--teal-deep)]"
        }`}
      >
        {listening && (
          <>
            <span
              className="zone-pulse-ring absolute inset-1 rounded-full border"
              style={{ borderColor: "var(--teal)" }}
            />
            <span
              className="zone-pulse-ring absolute inset-1 rounded-full border"
              style={{ borderColor: "var(--teal)", animationDelay: "0.6s" }}
            />
          </>
        )}
        <svg viewBox="0 0 24 24" width="19" height="19" fill="none" aria-hidden="true">
          <path
            d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3Z"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M19 10v2a7 7 0 0 1-14 0v-2"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path d="M12 19v3M8.5 22h7" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
        </svg>
      </button>

      <textarea
        ref={boxRef}
        rows={1}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            submit();
          }
        }}
        placeholder={interim || tr("chatPlaceholder", lang)}
        className="min-w-0 flex-1 resize-none bg-transparent px-2 py-2 text-[15px] leading-snug text-[var(--ink)] placeholder:text-[var(--ink-faint)] placeholder:italic focus:outline-none"
      />

      {busy ? (
        <button
          type="button"
          onClick={onStop}
          aria-label={tr("chatStop", lang)}
          className="mb-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border text-[var(--ink-soft)] transition-colors hover:border-[var(--teal)] hover:text-[var(--teal-deep)]"
        >
          <svg viewBox="0 0 20 20" width="13" height="13" aria-hidden="true">
            <rect x="5" y="5" width="10" height="10" rx="1.5" fill="currentColor" />
          </svg>
        </button>
      ) : (
        <button
          type="button"
          onClick={submit}
          disabled={!value.trim()}
          aria-label={tr("chatSend", lang)}
          className="mb-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[var(--teal)] text-white transition-opacity disabled:opacity-25"
        >
          <svg viewBox="0 0 20 20" width="16" height="16" fill="none" aria-hidden="true">
            <path
              d="M4 10h11m0 0-4.5-4.5M15 10l-4.5 4.5"
              stroke="currentColor"
              strokeWidth="1.6"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>
      )}
    </div>
  );
}
