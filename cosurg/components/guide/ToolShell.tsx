"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import type { Lang } from "@/lib/tree/types";
import { tr } from "@/lib/i18n";
import { BrandMark, BrandWatermark } from "@/components/BrandMark";
import { LangSwitch } from "@/components/LangSwitch";
import { AboutTeamLink } from "@/components/AboutTeamLink";

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

export type ToolId = "guide" | "pitfalls" | "interview" | "chat";

interface Vaerktoej {
  id: ToolId;
  href: string;
  key: "toolGuide" | "toolPitfalls" | "toolInterview" | "toolChat";
}

/**
 * Chatten står med her, og forsiden har til gengæld INGEN værktøjslinje.
 *
 * Det er ét valg, ikke to. Forsiden afgør selv om en ytring er en patient, et
 * behandlingsopslag eller et litteraturspørgsmål — og en fanebjælke dér ville
 * bede lægen om at træffe præcis det valg vi lige har taget fra ham. Den ville
 * også være usand: fanen "chat" ville pege væk fra den side der allerede
 * svarer på spørgsmål.
 *
 * Men de fire flader må ikke være uopnåelige for den der VIL browse. Derfor
 * bor listen her, på opslagssiderne, hvor man i forvejen er gået hen for at
 * vide noget frem for at behandle nogen. Chatten hørte til i den liste og
 * manglede kun fordi den engang var forsidens genvej.
 */
const VAERKTOEJER: Vaerktoej[] = [
  { id: "guide", href: "/guide", key: "toolGuide" },
  { id: "pitfalls", href: "/pitfalls", key: "toolPitfalls" },
  { id: "interview", href: "/interview", key: "toolInterview" },
  { id: "chat", href: "/chat", key: "toolChat" },
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
    <main className="app-gradient-bg relative min-h-screen px-4 py-6 text-[var(--ink)] sm:px-6 sm:py-8">
      <BrandWatermark />
      <div className="relative z-10 mx-auto max-w-5xl">
        <header className="mb-7">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="flex items-center gap-3">
              <Link href="/" className="shrink-0 transition-opacity hover:opacity-80">
                <BrandMark size={34} />
              </Link>
              <div>
                <Link href="/" className="transition-opacity hover:opacity-80">
                  <h1 className="font-[family-name:var(--font-display)] text-[22px] font-semibold leading-tight tracking-tight text-[var(--ink)]">
                    {title}
                  </h1>
                </Link>
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
              <LangSwitch lang={lang} onToggleLang={onToggleLang} />
              <AboutTeamLink lang={lang} />
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
