"use client";

import { useEffect, useRef } from "react";
import type { Lang } from "@/lib/tree/types";
import { tr } from "@/lib/i18n";
import { ui } from "@/components/ui/uiText";

interface RedFlagBannerProps {
  message: string;
  lang: Lang;
  orMode: boolean;
  onAcknowledge: () => void;
}

/**
 * Røde flag skal afbryde visuelt, ikke bare farvelægges. Banneret overtager
 * pladsen hvor spørgsmålet ellers stod (styret fra page.tsx via `!flash`),
 * så det rammer som det vigtigste på skærmen, uanset tilstand.
 *
 * Bevægelsen er valgt med omhu. Den skal ikke kunne overses — men den må
 * heller ikke blinke: en advarselslampe der bliver ved, er noget man lærer at
 * kigge forbi, og det er den præcis modsatte reaktion af den vi vil have.
 * Banneret sætter sig derfor ÉN gang med et kort, tungt greb (`motion-flag`),
 * den røde streg løber ud fra midten (`motion-flag-rule`) — og så står det
 * helt stille indtil nogen kvitterer.
 *
 * Skærmlæser: `role="alert"` afbryder oplæsningen som flaget afbryder skærmen,
 * og fokus flyttes til kvitteringsknappen, så en tastaturbruger står præcis
 * hvor handlingen er.
 */
export function RedFlagBanner({ message, lang, orMode, onAcknowledge }: RedFlagBannerProps) {
  const ackRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    // preventScroll: flaget står allerede øverst; et ryk i scrollen ville
    // flytte skærmen under hånden på en der er ved at trykke.
    ackRef.current?.focus({ preventScroll: true });
  }, []);

  if (orMode) {
    return (
      <div
        role="alert"
        className="motion-flag overflow-hidden rounded-2xl border-2 border-[var(--or-red)] bg-[#2a0f0a] px-8 py-10"
      >
        <p className="font-[family-name:var(--font-mono)] text-base font-semibold uppercase tracking-[0.2em] text-[var(--or-red)]">
          {tr("redFlag", lang)}
        </p>
        <p className="mt-4 font-[family-name:var(--font-display)] text-4xl font-semibold leading-snug text-[var(--or-ink)]">
          {message}
        </p>
        <button
          ref={ackRef}
          onClick={onAcknowledge}
          className="mt-8 rounded-xl border-2 border-[var(--or-ink)] px-6 py-3 text-lg font-semibold text-[var(--or-ink)] transition-colors hover:bg-[var(--or-ink)] hover:text-[#2a0f0a]"
        >
          OK
        </button>
      </div>
    );
  }

  return (
    <div
      role="alert"
      className="motion-flag overflow-hidden rounded-2xl border-2 border-[var(--red)] bg-[var(--red-tint)]"
    >
      <div className="motion-flag-rule h-1.5 bg-[var(--red)]" />
      <div className="px-6 py-5">
        <p className="font-[family-name:var(--font-mono)] text-xs font-semibold uppercase tracking-[0.16em] text-[var(--red)]">
          {tr("redFlag", lang)}
        </p>
        <p className="mt-2 font-[family-name:var(--font-display)] text-xl font-semibold leading-snug text-[var(--ink)]">
          {message}
        </p>
        <button
          ref={ackRef}
          onClick={onAcknowledge}
          aria-label={`OK — ${ui("redFlagAnnounce", lang)}`}
          className="mt-4 rounded-lg border border-[var(--red-line)] bg-[var(--paper-raised)] px-4 py-2 text-sm font-medium text-[var(--ink)] transition-colors hover:bg-white"
        >
          OK
        </button>
      </div>
    </div>
  );
}
