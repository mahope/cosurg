"use client";

import type { Lang } from "@/lib/tree/types";
import { tr } from "@/lib/i18n";
import { ZoneMark } from "./ZoneMark";

interface ControlRailProps {
  lang: Lang;
  treeName: string;
  treeVersion: string;
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
  treeName,
  treeVersion,
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
          <ZoneMark variant="mark" size={34} />
          <div>
            <h1 className="font-[family-name:var(--font-display)] text-[22px] font-semibold tracking-tight text-[var(--ink)]">
              {tr("title", lang)}
            </h1>
            <p className="font-[family-name:var(--font-mono)] text-xs text-[var(--ink-faint)]">
              {treeName} · v{treeVersion}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={onToggleLang}
            className="rounded-lg border bg-[var(--paper-raised)] px-3 py-2 text-sm font-medium text-[var(--ink)] hover:border-[var(--teal)] transition-colors"
          >
            {lang === "da" ? "Dansk" : "English"}
          </button>

          <div className="flex items-center rounded-lg border bg-[var(--paper-raised)] p-0.5">
            <button
              onClick={onToggleVoiceMode}
              disabled={orMode}
              aria-pressed={fullVoice}
              className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors disabled:opacity-40 ${
                fullVoice ? "bg-[var(--teal-tint)] text-[var(--teal-deep)]" : "text-[var(--ink-soft)]"
              }`}
            >
              {fullVoice ? tr("voiceFull", lang) : tr("voiceKey", lang)}
            </button>
          </div>

          <button
            onClick={onToggleOrMode}
            aria-pressed={orMode}
            className={`rounded-lg px-4 py-2 text-sm font-semibold transition-colors ${
              orMode
                ? "bg-[var(--or-accent)] text-[#062422]"
                : "bg-[var(--teal-deep)] text-white hover:bg-[var(--teal)]"
            }`}
          >
            {tr("orMode", lang)}
          </button>
        </div>
      </div>

      <div className="mt-4 inline-flex items-center gap-2 rounded-full border border-[var(--line)] bg-[var(--paper-raised)] px-3 py-1.5">
        <ZoneMark variant="mark" size={14} />
        <p className="text-xs font-medium text-[var(--ink-soft)]">{tr("sourceNote", lang)}</p>
      </div>
    </header>
  );
}
