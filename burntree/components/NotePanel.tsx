import type { Lang } from "@/lib/tree/types";
import { tr } from "@/lib/i18n";

interface NoteResult {
  note: string;
  codes: Array<{ code: string; system?: string; description: string; rationale?: string }>;
}

interface NotePanelProps {
  note: NoteResult;
  lang: Lang;
  orMode?: boolean;
}

/** Journalnotat + koder — sat i mono, samme konvention som et journaludtræk. */
export function NotePanel({ note, lang, orMode }: NotePanelProps) {
  const surface = orMode ? "border-[var(--or-line)] bg-[var(--or-surface)]" : "bg-[var(--paper-raised)]";
  const ink = orMode ? "text-[var(--or-ink)]" : "text-[var(--ink)]";
  const faint = orMode ? "text-[var(--or-ink-soft)]" : "text-[var(--ink-faint)]";
  const accent = orMode ? "text-[var(--or-accent)]" : "text-[var(--teal-deep)]";

  return (
    <div className={`mt-6 rounded-2xl border p-6 sm:p-7 ${surface}`}>
      <h3 className={`font-[family-name:var(--font-display)] text-lg font-semibold ${ink}`}>{tr("note", lang)}</h3>
      <pre className={`mt-3 whitespace-pre-wrap font-[family-name:var(--font-mono)] text-[13px] leading-relaxed ${ink}`}>
        {note.note}
      </pre>

      <h4 className={`mt-6 font-[family-name:var(--font-mono)] text-xs font-semibold uppercase tracking-[0.14em] ${faint}`}>
        {tr("codes", lang)}
      </h4>
      <ul className={`mt-2 space-y-1.5 font-[family-name:var(--font-mono)] text-sm ${ink}`}>
        {note.codes.map((c) => (
          <li key={c.code}>
            <span className={`font-semibold ${accent}`}>{c.code}</span> — {c.description}
            {c.rationale && <span className={faint}> ({c.rationale})</span>}
          </li>
        ))}
      </ul>
    </div>
  );
}
