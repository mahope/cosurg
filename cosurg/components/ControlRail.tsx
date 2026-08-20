"use client";

import Link from "next/link";
import type { Lang } from "@/lib/tree/types";
import { tr } from "@/lib/i18n";
import { BrandMark } from "./BrandMark";
import { LangSwitch } from "./LangSwitch";
import { AboutTeamLink } from "./AboutTeamLink";
import { TreePicker, type TreeSummary } from "./TreePicker";
import { UsagePanel, type SessionUsage } from "./UsagePanel";
import { SizeLock, widestOf } from "./ui/SizeLock";

interface ControlRailProps {
  lang: Lang;
  /** Er et forløb valgt? Før da er der intet aktivt træ at navngive. */
  started: boolean;
  usage: SessionUsage;
  treeId: string;
  treeName: string;
  treeVersion: string;
  trees: TreeSummary[];
  treeBusy: boolean;
  onSelectTree: (id: string) => void;
  onGoHome: () => void;
  fullVoice: boolean;
  orMode: boolean;
  onToggleLang: () => void;
  onToggleVoiceMode: () => void;
  onToggleOrMode: () => void;
}

/**
 * Instrumentpanelet: mærke + tillidsbudskab (altid synligt, ikke kun ved
 * disposition) + de tre sessionsvalg. Ét segmenteret kontrolbånd frem for
 * spredte enkeltknapper.
 */
export function ControlRail({
  lang,
  started,
  usage,
  treeId,
  treeName,
  treeVersion,
  trees,
  treeBusy,
  onSelectTree,
  onGoHome,
  fullVoice,
  orMode,
  onToggleLang,
  onToggleVoiceMode,
  onToggleOrMode,
}: ControlRailProps) {
  return (
    <header className="mb-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link href="/" onClick={onGoHome} className="shrink-0 transition-opacity hover:opacity-80">
            <BrandMark size={34} />
          </Link>
          <div>
            <Link href="/" onClick={onGoHome} className="transition-opacity hover:opacity-80">
              <h1 className="font-[family-name:var(--font-display)] text-[22px] font-semibold tracking-tight text-[var(--ink)]">
                {tr("title", lang)}
              </h1>
            </Link>
            {/* Før et forløb er valgt, ville trænavnet være et valg vi havde
                truffet for lægen. Der står linjen om hvad appen er i stedet.
                Linjen har fast højde: træ-vælgeren er en knap og taglinen et
                afsnit, og uden en fælles højde ville hele instrumentpanelet
                rykke fire pixel i det øjeblik forløbet starter. */}
            <div className="flex h-5 items-center">
              {started ? (
                <TreePicker
                  lang={lang}
                  trees={trees}
                  activeId={treeId}
                  activeName={treeName}
                  activeVersion={treeVersion}
                  busy={treeBusy}
                  onSelect={onSelectTree}
                />
              ) : (
                <p className="font-[family-name:var(--font-mono)] text-xs text-[var(--ink-faint)]">
                  {tr("tagline", lang)}
                </p>
              )}
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <UsagePanel lang={lang} usage={usage} />

          <LangSwitch lang={lang} onToggleLang={onToggleLang} />

          {/* Opslæsning findes kun som kontrol i håndfri tilstand — uden for
              den er der ingen oplæsning at slå til eller fra. */}
          {orMode && (
            <div className="flex items-center rounded-lg border bg-[var(--paper-raised)] p-0.5">
              <button
                onClick={onToggleVoiceMode}
                disabled={orMode}
                aria-pressed={fullVoice}
                className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors disabled:opacity-40 ${
                  fullVoice ? "bg-[var(--teal-tint)] text-[var(--teal-deep)]" : "text-[var(--ink-soft)]"
                }`}
              >
                {/* "Oplæsning fra" er bredere end "Speech off" — uden en låst
                    bredde flytter knapperne til højre sig hver gang man skifter
                    sprog eller slår oplæsning til. */}
                <SizeLock variants={widestOf("voiceFull", "voiceKey")}>
                  {fullVoice ? tr("voiceFull", lang) : tr("voiceKey", lang)}
                </SizeLock>
              </button>
            </div>
          )}

          {/* Håndfri tilstand kan slås til før et forløb er valgt — lægen skal
              kunne tale fra første spørgsmål, ikke først når et træ er startet. */}
          <button
            onClick={onToggleOrMode}
            aria-pressed={orMode}
            className={`rounded-lg px-4 py-2 text-sm font-semibold transition-colors disabled:opacity-40 ${
              orMode
                ? "bg-[var(--or-accent)] text-[#062422]"
                : "bg-[var(--teal-deep)] text-white enabled:hover:bg-[var(--teal)]"
            }`}
          >
            <SizeLock variants={widestOf("orMode")}>{tr("orMode", lang)}</SizeLock>
          </button>

          <AboutTeamLink lang={lang} />
        </div>
      </div>

      <div className="mt-4 inline-flex items-center gap-2 rounded-full border border-[var(--line)] bg-[var(--nude-tint)] px-3 py-1.5">
        <BrandMark size={14} />
        <p className="text-xs font-medium text-[var(--ink-soft)]">{tr("sourceNote", lang)}</p>
      </div>
    </header>
  );
}
