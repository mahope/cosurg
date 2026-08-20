"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import type { Lang } from "@/lib/tree/types";
import { tr } from "@/lib/i18n";
import { BrandMark, BrandWatermark } from "@/components/BrandMark";

/**
 * Fælles ramme om de tre opslagsværktøjer: behandlingsguide, faldgruber og
 * struktureret anamnese.
 *
 * De skal føles som dele af SAMME app som beslutningstræet — samme papir, samme
 * mærke, samme skrift — og ikke som tre bolte påsat. Derfor bor rammen ét sted:
 * ændrer den sig, ændrer alle tre sig med.
 *
 * Navigationen sætter beslutningsforløbet først med vilje. Hovedvejen ind i
 * CoSurg er stadig "Hvad drejer det sig om?" — opslagsværktøjerne er dem man
 * går til når man vil VIDE noget, ikke når man står med patienten.
 */

export type ToolId = "guide" | "pitfalls" | "interview";

interface Vaerktoej {
  id: ToolId;
  href: string;
  key: "toolGuide" | "toolPitfalls" | "toolInterview";
}

const VAERKTOEJER: Vaerktoej[] = [
  { id: "guide", href: "/guide", key: "toolGuide" },
  { id: "pitfalls", href: "/pitfalls", key: "toolPitfalls" },
  { id: "interview", href: "/interview", key: "toolInterview" },
];

interface ToolShellProps {
  active: ToolId;
  lang: Lang;
  onToggleLang: () => void;
  title: string;
  tagline: string;
  children: ReactNode;
}

export function ToolShell({ active, lang, onToggleLang, title, tagline, children }: ToolShellProps) {
  return (
    <main className="relative min-h-screen bg-[var(--paper)] px-4 py-6 text-[var(--ink)] sm:px-6 sm:py-8">
      <BrandWatermark />
      <div className="relative z-10 mx-auto max-w-5xl">
        <header className="mb-7">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="flex items-center gap-3">
              <BrandMark size={34} />
              <div>
                <h1 className="font-[family-name:var(--font-display)] text-[22px] font-semibold leading-tight tracking-tight text-[var(--ink)]">
                  {title}
                </h1>
                <p className="font-[family-name:var(--font-mono)] text-xs text-[var(--ink-faint)]">{tagline}</p>
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
                onClick={onToggleLang}
                className="rounded-lg border bg-[var(--paper-raised)] px-3 py-2 text-sm font-medium text-[var(--ink)] transition-colors hover:border-[var(--teal)]"
              >
                {lang === "da" ? "Dansk" : "English"}
              </button>
            </div>
          </div>

          <nav
            aria-label={tr("toolsLabel", lang)}
            className="mt-4 flex flex-wrap items-center gap-1 rounded-xl border border-[var(--line)] bg-[var(--paper-raised)] p-1"
          >
            {VAERKTOEJER.map((v) => {
              const aktiv = v.id === active;
              return (
                <Link
                  key={v.id}
                  href={v.href}
                  aria-current={aktiv ? "page" : undefined}
                  className={`rounded-lg px-3.5 py-1.5 text-sm font-medium transition-colors ${
                    aktiv
                      ? "bg-[var(--teal-tint)] text-[var(--teal-deep)]"
                      : "text-[var(--ink-soft)] hover:bg-[var(--nude-tint)] hover:text-[var(--ink)]"
                  }`}
                >
                  {tr(v.key, lang)}
                </Link>
              );
            })}
            <span className="ml-auto hidden pr-2 text-[11px] text-[var(--ink-faint)] sm:block">
              {tr("sourceFrom", lang)}
            </span>
          </nav>
        </header>

        {children}
      </div>
    </main>
  );
}
