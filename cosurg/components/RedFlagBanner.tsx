"use client";

import { useEffect, useRef } from "react";
import type { Lang } from "@/lib/tree/types";
import { tr } from "@/lib/i18n";

interface RedFlagBannerProps {
  message: string;
  lang: Lang;
  orMode: boolean;
  onAcknowledge: () => void;
  /**
   * Det forud-formulerede opslag om netop dette flag, skrevet i træet.
   *
   * Et rødt flag siger hvad der er galt. Det næste spørgsmål er altid "og hvad
   * gør jeg så?", og indtil nu skulle lægen selv formulere det. Nu står emnet
   * der, med navn — ét greb, ikke et spørgsmål man skal opfinde.
   */
  lookup?: { label: string; question: string } | null;
  onElaborate?: (question: string) => void;
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
export function RedFlagBanner({
  message,
  lang,
  orMode,
  onAcknowledge,
  lookup,
  onElaborate,
}: RedFlagBannerProps) {
  const ackRef = useRef<HTMLButtonElement>(null);
  /*
   * Håndfri behøver ingen handler: dér er grebet et ORD kirurgen siger, og
   * banneret viser kun ordlyden. På den lyse skærm er det et tryk, og så skal
   * der være noget at trykke PÅ — ellers står der en knap der intet gør.
   */
  const kanUddybe = orMode ? !!lookup : !!lookup && !!onElaborate;

  useEffect(() => {
    // preventScroll: flaget står allerede øverst; et ryk i scrollen ville
    // flytte skærmen under hånden på en der er ved at trykke.
    ackRef.current?.focus({ preventScroll: true });
  }, []);

  if (orMode) {
    return (
      <div
        role="alert"
        className="motion-flag overflow-hidden rounded-2xl border-2 border-[var(--or-red)] bg-[var(--or-red-deep)] px-8 py-10"
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
          className="mt-8 rounded-xl border-2 border-[var(--or-ink)] px-6 py-3 text-lg font-semibold text-[var(--or-ink)] transition-colors hover:bg-[var(--or-ink)] hover:text-[var(--or-red-deep)]"
        >
          OK
        </button>
        {/*
          Håndfri: kirurgen er steril og kan ikke trykke. Grebet er derfor et
          ORD, og ordet står på skærmen — man skal ikke kunne en kommando
          udenad for at få den viden der ligger et sekund væk.
        */}
        {kanUddybe && (
          <p className="mt-5 text-xl leading-relaxed text-[var(--or-ink)] opacity-80">
            {tr("elaborateSay", lang)} — {lookup!.label}
          </p>
        )}
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
        <p className="font-[family-name:var(--font-mono)] text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--red)]">
          {tr("redFlag", lang)}
        </p>
        <p className="mt-2 font-[family-name:var(--font-display)] text-xl font-semibold leading-snug text-[var(--ink)]">
          {message}
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <button
            ref={ackRef}
            onClick={onAcknowledge}
            aria-label={`OK — ${tr("redFlagAnnounce", lang)}`}
            className="rounded-lg border border-[var(--red-line)] bg-[var(--paper-raised)] px-4 py-2 text-sm font-medium text-[var(--ink)] transition-colors hover:bg-white"
          >
            OK
          </button>
          {/* Grebet ud i kilderne, med træets egen ordlyd om netop dette flag.
              Det står ved siden af kvitteringen og ikke i stedet for den:
              flaget skal stadig ses, før noget andet kan ske. */}
          {kanUddybe && (
            <button
              type="button"
              onClick={() => onElaborate!(lookup!.question)}
              className="rounded-lg border border-[var(--red-line)] bg-[var(--paper-raised)] px-4 py-2 text-sm font-medium text-[var(--ink-soft)] transition-colors hover:bg-white hover:text-[var(--ink)]"
            >
              {lookup!.label}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
