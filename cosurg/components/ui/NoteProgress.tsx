"use client";

import { useEffect, useState } from "react";
import type { Lang } from "@/lib/tree/types";
import { WorkingDots } from "./Working";
import { t, tr } from "@/lib/i18n";

/**
 * Fremdrift for det langsomste kald i appen.
 *
 * Journalnotatet er målt til 14–16 sekunder, og ruten laver tre ting i træk:
 * den samler beslutningsvejen, beder Corti skrive notatet, og henter koderne.
 * Trinnene herunder følger DEN rækkefølge — de er en beskrivelse af arbejdet,
 * ikke en fremdriftsbjælke der bevæger sig for at berolige.
 *
 * Tiderne er sat konservativt inden for den målte latens, så teksten aldrig
 * påstår at være længere fremme end kaldet er. Tager det længere end målt,
 * siger linjen præcis det i stedet for at stå og lyve på sidste trin.
 */
const STAGES: Array<{ at: number; key: keyof typeof t }> = [
  { at: 0, key: "noteStage1" },
  { at: 1500, key: "noteStage2" },
  { at: 7000, key: "noteStage3" },
  { at: 12000, key: "noteStage4" },
  { at: 18000, key: "noteStageLate" },
];

export function NoteProgress({ lang }: { lang: Lang }) {
  const [stage, setStage] = useState(0);

  useEffect(() => {
    const timers = STAGES.slice(1).map((s, i) =>
      window.setTimeout(() => setStage(i + 1), s.at),
    );
    return () => timers.forEach(window.clearTimeout);
  }, []);

  const late = stage === STAGES.length - 1;

  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
      <p
        aria-live="polite"
        aria-atomic="true"
        className="flex items-center gap-2 text-sm font-medium text-[var(--ink)]"
      >
        <WorkingDots />
        <span>{tr(STAGES[stage].key, lang)}</span>
      </p>
      {!late && (
        <span className="font-[family-name:var(--font-mono)] text-[11px] text-[var(--ink-faint)]">
          {tr("noteEta", lang)}
        </span>
      )}
    </div>
  );
}
