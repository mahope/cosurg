"use client";

import { useState } from "react";
import type { Lang } from "@/lib/tree/types";
import { tr } from "@/lib/i18n";
import { SourceCard } from "@/components/guide/SourceCard";
import type { LoestFaldgrube } from "./types";

/**
 * Ét faldgrube-kort.
 *
 * Farven er klinisk og ikke dekorativ: rød betyder at patienten kan tage skade
 * af at overse den, gul at behandlingen bliver forkert. Der findes ingen tredje
 * farve, fordi der ikke findes en tredje slags faldgrube.
 *
 * Kortet skiller skarpt mellem VORES formulering og KILDENS. Overskriften og
 * konsekvenslinjen er skrevet af os som en tro omskrivning; belægget nedenunder
 * er ordret og bærer sin URL. Kan vidensbasen ikke belægge faldgruben, står det
 * med rene ord — vi lader den ikke stå tilbage som en påstand uden afsender.
 */

interface PitfallCardProps {
  faldgrube: LoestFaldgrube;
  lang: Lang;
  /** Skinnen ved siden af et forløb: kortet starter foldet sammen. */
  kompakt?: boolean;
}

export function PitfallCard({ faldgrube, lang, kompakt = false }: PitfallCardProps) {
  const [aabent, setAabent] = useState(!kompakt);
  const kritisk = faldgrube.alvor === "critical";

  const ramme = kritisk ? "border-[var(--red-line)] bg-[var(--red-tint)]" : "border-[var(--amber-line)] bg-[var(--amber-tint)]";
  const maerkat = kritisk ? "text-[var(--red)]" : "text-[var(--amber)]";

  return (
    <section className={`rounded-xl border ${ramme} p-4`}>
      <div className="flex items-start gap-2.5">
        <span
          aria-hidden="true"
          className={`mt-[3px] flex h-4 w-4 shrink-0 items-center justify-center rounded-full border-2 ${
            kritisk ? "border-[var(--red)]" : "border-[var(--amber)]"
          }`}
        >
          <span className={`h-1.5 w-1.5 rounded-full ${kritisk ? "bg-[var(--red)]" : "bg-[var(--amber)]"}`} />
        </span>

        <div className="min-w-0 flex-1">
          <p
            className={`font-[family-name:var(--font-mono)] text-[11px] font-semibold uppercase tracking-[0.14em] ${maerkat}`}
          >
            {tr(kritisk ? "pitfallsCritical" : "pitfallsImportant", lang)}
          </p>
          <h3 className="mt-1 font-[family-name:var(--font-display)] text-lg font-semibold leading-snug tracking-tight text-[var(--ink)]">
            {faldgrube.title[lang]}
          </h3>
          <p className="mt-1.5 text-sm leading-relaxed text-[var(--ink-soft)]">{faldgrube.consequence[lang]}</p>
        </div>
      </div>

      <div className="mt-3 border-t border-[rgba(16,41,43,0.14)] pt-3">
        {!aabent ? (
          <button
            onClick={() => setAabent(true)}
            className="font-[family-name:var(--font-mono)] text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--teal)] hover:underline"
          >
            {tr("sourceVerbatim", lang)} →
          </button>
        ) : faldgrube.coverage === "ok" && faldgrube.evidence ? (
          <>
            <p className="mb-2 text-[11px] italic text-[var(--ink-faint)]">{tr("pitfallsOurWording", lang)}</p>
            <SourceCard uddrag={faldgrube.evidence} lang={lang} tæt />
          </>
        ) : (
          <p className="rounded-lg border border-[var(--line)] bg-[var(--paper-raised)] px-3 py-2.5 text-sm text-[var(--ink-soft)]">
            {tr(faldgrube.coverage === "error" ? "sourceLookupFailed" : "sourceNoCoverage", lang)}
          </p>
        )}
      </div>
    </section>
  );
}
