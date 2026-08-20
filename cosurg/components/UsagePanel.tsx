"use client";

import { useEffect, useRef, useState } from "react";
import type { Lang } from "@/lib/tree/types";
import { tr } from "@/lib/i18n";

/**
 * Hvad appen faktisk har brugt i denne session.
 *
 * Feltet er sandt eller tomt — aldrig et gæt. Et produktområde tælles først som
 * brugt når kaldet faktisk lykkedes, og credits vises kun for de kald hvor
 * Corti selv oplyser forbruget. Kan vi ikke gøre rede for et tal, skriver vi
 * ikke et tal.
 */
export interface SessionUsage {
  /** Ambient STT: mikrofonen har været åben og leveret transskript. */
  ambient: boolean;
  /** Dictation STT: lægens tillæg er dikteret. */
  dictation: boolean;
  /** Agentic framework: antal svarfortolkninger der gik igennem. */
  interpretations: number;
  /** Text generation: antal journalnotater skrevet. */
  notes: number;
  /** Medical coding: kodesystemet der faktisk blev kaldt. */
  codingSystem: string | null;
  /** Summerede credits fra de svar der oplyser dem. */
  credits: number | null;
}

interface UsagePanelProps {
  lang: Lang;
  usage: SessionUsage;
}

function Row({ label, value, lang }: { label: string; value: string | null; lang: Lang }) {
  return (
    <li className="flex items-baseline justify-between gap-4 border-t border-[var(--line)] py-1.5 first:border-t-0">
      <span className="text-[var(--ink-soft)]">{label}</span>
      <span className="shrink-0 font-[family-name:var(--font-mono)] text-[var(--ink)]">
        {value ?? tr("usageUnused", lang)}
      </span>
    </li>
  );
}

/**
 * Et diskret info-ikon. Tallene er stærke over for dommere — og ren støj for en
 * læge midt i en patientvurdering. De ligger derfor bag ét klik og aldrig i
 * vejen. Panelet er KROM, ikke klinik: brandets farver, aldrig rød/gul/grøn.
 */
export function UsagePanel({ lang, usage }: UsagePanelProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (e: PointerEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const count = (n: number) => (n > 0 ? `${n}` : null);

  return (
    <div ref={rootRef} className="relative inline-flex">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-label={tr("usageTitle", lang)}
        className="flex h-6 w-6 items-center justify-center rounded-full border border-[var(--line-strong)] text-[var(--ink-faint)] transition-colors hover:border-[var(--teal)] hover:bg-[var(--teal-tint)] hover:text-[var(--teal-deep)]"
      >
        <svg viewBox="0 0 16 16" width="11" height="11" fill="none" aria-hidden="true">
          <path
            d="M8 7v4.5M8 4.6v.1"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="round"
          />
          <circle cx="8" cy="8" r="6.4" stroke="currentColor" strokeWidth="1.2" />
        </svg>
      </button>

      {open && (
        <div className="absolute right-0 top-full z-30 mt-2 w-[min(24rem,calc(100vw-2rem))] rounded-xl border border-[var(--line)] bg-[var(--paper-raised)] p-4 text-left shadow-[0_12px_32px_rgba(0,83,85,0.14)]">
          <p className="font-[family-name:var(--font-mono)] text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--ink-faint)]">
            {tr("usageTitle", lang)}
          </p>

          <ul className="mt-2 text-sm">
            <Row label={tr("areaAmbient", lang)} value={usage.ambient ? tr("usageUsed", lang) : null} lang={lang} />
            <Row
              label={tr("areaDictation", lang)}
              value={usage.dictation ? tr("usageUsed", lang) : null}
              lang={lang}
            />
            <Row label={tr("areaAgentic", lang)} value={count(usage.interpretations)} lang={lang} />
            <Row label={tr("areaText", lang)} value={count(usage.notes)} lang={lang} />
            <Row label={tr("areaCoding", lang)} value={usage.codingSystem} lang={lang} />
          </ul>

          <p className="mt-3 flex items-baseline justify-between gap-4 border-t border-[var(--line)] pt-2.5 text-sm">
            <span className="font-medium text-[var(--ink)]">{tr("usageCredits", lang)}</span>
            <span className="font-[family-name:var(--font-mono)] font-semibold text-[var(--teal-deep)]">
              {usage.credits === null ? tr("usageNoCredits", lang) : usage.credits}
            </span>
          </p>

          <p className="mt-3 text-[11px] leading-snug text-[var(--ink-soft)]">{tr("usageNote", lang)}</p>
        </div>
      )}
    </div>
  );
}
