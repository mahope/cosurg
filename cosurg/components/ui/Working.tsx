"use client";

import type { Lang } from "@/lib/tree/types";
import { tr } from "@/lib/i18n";
import { ui } from "./uiText";

/**
 * Tre prikker der arbejder. Bruges KUN hvor appen faktisk venter på et svar.
 * En arbejdsindikator ved siden af en fejlbesked ville påstå at noget stadig
 * er i gang — og så holder lægen op med at tro på indikatoren.
 */
export function WorkingDots({ tone = "light" }: { tone?: "light" | "or" }) {
  const color = tone === "or" ? "var(--or-accent)" : "var(--teal)";
  return (
    /* Højden følger tekstens linjehøjde (em), så prikkerne står midt på FØRSTE
       linje — også når statuslinjen er sat til at starte foroven og teksten
       ombrydes til to linjer. */
    <span className="inline-flex h-[1.35em] shrink-0 items-center gap-[3px]" aria-hidden="true">
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className="working-dot block h-[4px] w-[4px] rounded-full"
          style={{ background: color, animationDelay: `${i * 0.16}s` }}
        />
      ))}
    </span>
  );
}

/**
 * Appens ene statuslinje.
 *
 * To slags beskeder deler plads her: "jeg arbejder på det" og "det gik galt".
 * De må aldrig ligne hinanden — den første er tålmodighed, den anden er en
 * opfordring til at gøre noget andet. Vi skelner på den tekst ruten selv
 * sætter (`tr("thinking")` / `tr("noteWorking")`), så indikatoren aldrig kan
 * komme til at snurre oven på en fejl.
 *
 * Linjen er et `aria-live`-område: en skærmlæser skal kunne følge med i at
 * appen fortolker, uden at fokus flyttes.
 */
export function isBusyStatus(status: string | null, lang: Lang): boolean {
  if (!status) return false;
  return status === tr("thinking", lang) || status === tr("noteWorking", lang);
}

interface StatusLineProps {
  status: string | null;
  lang: Lang;
  tone?: "light" | "or";
  className?: string;
}

export function StatusLine({ status, lang, tone = "light", className = "" }: StatusLineProps) {
  const busy = isBusyStatus(status, lang);
  const or = tone === "or";
  const color = busy
    ? or
      ? "text-[var(--or-ink-soft)]"
      : "text-[var(--ink-soft)]"
    : or
      ? "text-[var(--or-amber)]"
      : "text-[var(--amber)]";

  return (
    <p
      role="status"
      aria-live="polite"
      aria-atomic="true"
      aria-label={ui("statusRegion", lang)}
      /* `items-start`: en besked på to linjer skal vokse NEDAD fra samme
         øverste kant som en på én linje — ellers flytter teksten sig lodret
         hver gang statussen skifter længde. */
      className={`flex items-start gap-2 ${color} ${className}`}
    >
      {busy && <WorkingDots tone={tone} />}
      <span>{status}</span>
    </p>
  );
}
