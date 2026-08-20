import type { Lang } from "@/lib/tree/types";
import { tr } from "@/lib/i18n";

interface RedFlagBannerProps {
  message: string;
  lang: Lang;
  orMode: boolean;
  onAcknowledge: () => void;
}

/**
 * Røde flag skal afbryde visuelt, ikke bare farvelægges. Banneret overtager
 * pladsen hvor spørgsmålet ellers stod (styret fra page.tsx via `!flash`),
 * så det rammer som det vigtigste på skærmen, uanset tilstand.
 */
export function RedFlagBanner({ message, lang, orMode, onAcknowledge }: RedFlagBannerProps) {
  if (orMode) {
    return (
      <div className="flag-in rounded-2xl border-2 border-[var(--or-red)] bg-[#2a0f0a] px-8 py-10">
        <p className="font-[family-name:var(--font-mono)] text-base font-semibold uppercase tracking-[0.2em] text-[var(--or-red)]">
          {tr("redFlag", lang)}
        </p>
        <p className="mt-4 font-[family-name:var(--font-display)] text-4xl font-semibold leading-snug text-[var(--or-ink)]">
          {message}
        </p>
        <button
          onClick={onAcknowledge}
          className="mt-8 rounded-xl border-2 border-[var(--or-ink)] px-6 py-3 text-lg font-semibold text-[var(--or-ink)]"
        >
          OK
        </button>
      </div>
    );
  }

  return (
    <div className="flag-in overflow-hidden rounded-2xl border-2 border-[var(--red)] bg-[var(--red-tint)]">
      <div className="h-1.5 bg-[var(--red)]" />
      <div className="px-6 py-5">
        <p className="font-[family-name:var(--font-mono)] text-xs font-semibold uppercase tracking-[0.16em] text-[var(--red)]">
          {tr("redFlag", lang)}
        </p>
        <p className="mt-2 font-[family-name:var(--font-display)] text-xl font-semibold leading-snug text-[var(--ink)]">
          {message}
        </p>
        <button
          onClick={onAcknowledge}
          className="mt-4 rounded-lg border border-[var(--red-line)] bg-[var(--paper-raised)] px-4 py-2 text-sm font-medium text-[var(--ink)] hover:bg-white"
        >
          OK
        </button>
      </div>
    </div>
  );
}
