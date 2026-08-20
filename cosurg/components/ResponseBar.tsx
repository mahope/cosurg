"use client";

import { useEffect, useRef, useState } from "react";
import type { Lang } from "@/lib/tree/types";
import { ui } from "./ui/uiText";

interface ResponseBarProps {
  lang: Lang;
  placeholder: string;
  listening: boolean;
  interim: string;
  onToggleMic: () => void;
  onSubmit: (text: string) => void;
  autoFocus?: boolean;
}

/**
 * Ét samlet svarfelt for klik, tale og skrift. Skrift og tale rammer nøjagtig
 * samme vej ind (onSubmit → handleUtterance i page.tsx) — feltet er blot to
 * forskellige måder at fylde det på. Mikrofonen sidder inde i feltet, ikke som
 * en separat knap et andet sted på siden, og den løbende tale vises som
 * spøgelsestekst i samme linje som det man selv skriver.
 */
export function ResponseBar({
  lang,
  placeholder,
  listening,
  interim,
  onToggleMic,
  onSubmit,
  autoFocus,
}: ResponseBarProps) {
  const [value, setValue] = useState("");
  /*
   * Kort kvittering på at svaret forlod feltet. Den er sand uanset hvad
   * agenten svarer bagefter — derfor må den ikke ligne en arbejdsindikator,
   * og derfor forsvinder den af sig selv. Uden den er et tomt felt det eneste
   * tegn på at man overhovedet trykkede.
   */
  const [sent, setSent] = useState(false);
  const sentTimer = useRef<number | undefined>(undefined);

  useEffect(() => () => window.clearTimeout(sentTimer.current), []);

  const submit = () => {
    const text = value.trim();
    if (!text) return;
    onSubmit(text);
    setValue("");
    setSent(true);
    window.clearTimeout(sentTimer.current);
    sentTimer.current = window.setTimeout(() => setSent(false), 1400);
  };

  return (
    <div className="w-full">
      <div className="relative flex items-center gap-1 rounded-xl border bg-[var(--paper-raised)] pr-1 pl-1.5 py-1.5 focus-within:border-[var(--teal)] transition-colors">
        <button
          type="button"
          onClick={onToggleMic}
          aria-pressed={listening}
          aria-label={listening ? tr(lang, "Stop mikrofon", "Stop microphone") : tr(lang, "Start mikrofon", "Start microphone")}
          className={`relative flex h-8 w-8 shrink-0 items-center justify-center rounded-lg transition-colors ${
            listening
              ? "text-[var(--teal)]"
              : "text-[var(--ink-soft)] hover:bg-[var(--teal-tint)] hover:text-[var(--teal-deep)]"
          }`}
        >
          {listening && (
            <>
              <span
                className="zone-pulse-ring absolute inset-0.5 rounded-full border"
                style={{ borderColor: "var(--teal)" }}
              />
              <span
                className="zone-pulse-ring absolute inset-0.5 rounded-full border"
                style={{ borderColor: "var(--teal)", animationDelay: "0.6s" }}
              />
            </>
          )}
          <svg viewBox="0 0 24 24" width="18" height="18" fill="none" aria-hidden="true">
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

        <input
          type="text"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") submit();
          }}
          autoFocus={autoFocus}
          placeholder={interim ? interim : placeholder}
          className="min-w-0 flex-1 bg-transparent px-1.5 py-1 text-[15px] leading-tight text-[var(--ink)] placeholder:text-[var(--ink-faint)] placeholder:italic focus:outline-none"
        />

        {/*
          Kvitteringen ligger OVEN PÅ feltets højre kant i stedet for i rækken.
          Lå den i rækken, ville skrivefeltet blive smallere i det sekund den
          var fremme — og feltet ville altså skifte størrelse hver gang man
          svarede. Den toner ind og ud i en plads der ikke er nogens.
        */}
        <span
          aria-hidden={!sent}
          className={`pointer-events-none absolute right-11 top-1/2 -translate-y-1/2 bg-[var(--paper-raised)] pl-2 font-[family-name:var(--font-mono)] text-[11px] font-medium uppercase tracking-[0.12em] text-[var(--teal-deep)] transition-opacity duration-200 ${
            sent ? "opacity-100" : "opacity-0"
          }`}
        >
          {ui("sent", lang)}
        </span>

        <button
          type="button"
          onClick={submit}
          disabled={!value.trim()}
          aria-label={tr(lang, "Send svar", "Send answer")}
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[var(--teal)] text-white transition-opacity disabled:opacity-25"
        >
          <svg viewBox="0 0 20 20" width="15" height="15" fill="none" aria-hidden="true">
            <path
              d="M4 10h11m0 0-4.5-4.5M15 10l-4.5 4.5"
              stroke="currentColor"
              strokeWidth="1.6"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>
      </div>
    </div>
  );
}

function tr(lang: Lang, da: string, en: string) {
  return lang === "da" ? da : en;
}
