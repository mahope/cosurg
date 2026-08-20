"use client";

import { useState } from "react";
import Link from "next/link";
import type { Lang } from "@/lib/tree/types";
import { tr } from "@/lib/i18n";
import { BrandMark, BrandWatermark } from "@/components/BrandMark";

/**
 * Om & Team. Indholdet lander i en opfølgende opgave — indtil da holder
 * siden kun rammen: samme mærke, samme skrift, samme vej tilbage som resten
 * af appen, så et link hertil aldrig føles som at forlade CoSurg.
 */
export function AboutTeamView() {
  const [lang, setLang] = useState<Lang>("da");

  return (
    <main className="relative min-h-screen bg-[var(--paper)] px-4 py-6 text-[var(--ink)] sm:px-6 sm:py-8">
      <BrandWatermark />
      <div className="relative z-10 mx-auto max-w-5xl">
        <header className="mb-7 flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <BrandMark size={34} />
            <div>
              <h1 className="font-[family-name:var(--font-display)] text-[22px] font-semibold leading-tight tracking-tight text-[var(--ink)]">
                {tr("aboutTeam", lang)}
              </h1>
              <p className="font-[family-name:var(--font-mono)] text-xs text-[var(--ink-faint)]">
                {tr("aboutTeamTagline", lang)}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Link
              href="/"
              className="rounded-lg border bg-[var(--paper-raised)] px-3 py-2 text-sm font-medium text-[var(--ink)] transition-colors hover:border-[var(--teal)] hover:bg-[var(--teal-tint)]"
            >
              ← {tr("toolTree", lang)}
            </Link>
            <button
              onClick={() => setLang((l) => (l === "da" ? "en" : "da"))}
              className="rounded-lg border bg-[var(--paper-raised)] px-3 py-2 text-sm font-medium text-[var(--ink)] transition-colors hover:border-[var(--teal)]"
            >
              {lang === "da" ? "Dansk" : "English"}
            </button>
          </div>
        </header>

        <div className="rounded-2xl border bg-[var(--paper-raised)] p-6 sm:p-8 shadow-[0_1px_2px_rgba(16,32,30,0.04)]">
          <p className="text-sm leading-relaxed text-[var(--ink-soft)]">{tr("aboutTeamPlaceholder", lang)}</p>
        </div>
      </div>
    </main>
  );
}
