import type { Lang } from "@/lib/tree/types";
import { tr } from "@/lib/i18n";
import { ZoneMark } from "./ZoneMark";

interface TranscriptPanelProps {
  lines: string[];
  interim: string;
  listening: boolean;
  status: string | null;
  lang: Lang;
}

/** Live-transskriptet — sat som en monitor-udskrift, samme mono-stemme som notat/koder. */
export function TranscriptPanel({ lines, interim, listening, status, lang }: TranscriptPanelProps) {
  return (
    <div className="rounded-xl border bg-[var(--paper-raised)] p-4">
      <div className="flex items-center gap-2">
        <ZoneMark variant="listening" active={listening} size={16} />
        <p className="font-[family-name:var(--font-mono)] text-xs font-semibold uppercase tracking-[0.14em] text-[var(--ink-faint)]">
          {tr("transcript", lang)}
        </p>
      </div>

      {interim && (
        <p className="mt-2 font-[family-name:var(--font-mono)] text-sm italic text-[var(--ink-faint)]">{interim}</p>
      )}

      <ul className="mt-2 space-y-1 font-[family-name:var(--font-mono)] text-sm text-[var(--ink)]">
        {lines.slice(-8).map((line, i) => (
          <li key={i}>{line}</li>
        ))}
      </ul>

      {status && <p className="mt-3 text-xs font-medium text-[var(--amber)]">{status}</p>}
    </div>
  );
}
