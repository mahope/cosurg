"use client";

import type { Lang } from "@/lib/tree/types";
import { tr } from "@/lib/i18n";
import { ResponseBar } from "./ResponseBar";
import type { TreeSummary } from "./TreePicker";

interface IntakeCardProps {
  lang: Lang;
  trees: TreeSummary[];
  /** Forløb vi ikke turde vælge imellem — vises som knapper når vi spørger igen. */
  ambiguous: string[];
  /** Sat når en ytring ikke kunne henføres til et forløb. */
  unresolved: string | null;
  listening: boolean;
  interim: string;
  onToggleMic: () => void;
  onSubmit: (text: string) => void;
  onSelectTree: (id: string) => void;
}

/**
 * Første skærmbillede: ét spørgsmål, ét felt.
 *
 * Lægen beskriver patienten — "en mand har fået kogende vand over hånden" — og
 * appen finder forløbet. Han skal ikke kende vores træer, og han skal ikke
 * vælge i en menu med tidspres i ryggen.
 *
 * Den manuelle vej står stadig på siden, men nede og småt: den er for den der
 * allerede ved hvad han vil, ikke hovedvejen.
 */
export function IntakeCard({
  lang,
  trees,
  ambiguous,
  unresolved,
  listening,
  interim,
  onToggleMic,
  onSubmit,
  onSelectTree,
}: IntakeCardProps) {
  // Ved tvivl viser vi KUN de forløb der var i spil — at vise alle igen ville
  // være at kaste spørgsmålet tilbage uden at have hjulpet med noget.
  const choices = ambiguous.length > 0 ? trees.filter((t) => ambiguous.includes(t.id)) : trees;

  return (
    <div className="rounded-2xl border bg-[var(--paper-raised)] p-6 sm:p-8 shadow-[0_1px_2px_rgba(16,32,30,0.04)]">
      <h2 className="font-[family-name:var(--font-display)] text-2xl sm:text-[28px] font-semibold leading-snug tracking-tight text-[var(--ink)]">
        {tr("intakeQuestion", lang)}
      </h2>
      <p className="mt-2 text-sm leading-relaxed text-[var(--ink-soft)]">{tr("intakeHelp", lang)}</p>

      <div className="mt-5">
        <ResponseBar
          lang={lang}
          placeholder={tr("intakePlaceholder", lang)}
          listening={listening}
          interim={interim}
          onToggleMic={onToggleMic}
          onSubmit={onSubmit}
          autoFocus
        />
      </div>

      {unresolved && (
        <p className="mt-4 rounded-lg border border-[var(--nude-deep)] bg-[var(--nude-tint)] px-4 py-3 text-sm font-medium leading-relaxed text-[var(--ink)]">
          {tr(ambiguous.length > 0 ? "intakeAmbiguous" : "intakeUnknown", lang)}
          <span className="mt-1 block font-normal text-[var(--ink-soft)]">&ldquo;{unresolved}&rdquo;</span>
        </p>
      )}

      <div className="mt-6 border-t border-[var(--line)] pt-4">
        <p className="font-[family-name:var(--font-mono)] text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--ink-faint)]">
          {tr(ambiguous.length > 0 ? "intakePick" : "intakeManual", lang)}
        </p>
        <div className="mt-2 flex flex-wrap gap-2">
          {choices.map((t) => (
            <button
              key={t.id}
              onClick={() => onSelectTree(t.id)}
              className="rounded-lg border px-3.5 py-2 text-sm font-medium text-[var(--ink)] transition-colors hover:border-[var(--teal)] hover:bg-[var(--teal-tint)]"
            >
              {t.name[lang]}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
