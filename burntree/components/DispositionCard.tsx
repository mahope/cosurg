import type { Disposition, Lang } from "@/lib/tree/types";
import { tr } from "@/lib/i18n";
import { StepImages } from "./StepImages";
import { ResponseBar } from "./ResponseBar";

interface DispositionCardProps {
  disposition: Disposition;
  lang: Lang;
  dictating: boolean;
  dictation: string;
  listening: boolean;
  interim: string;
  onToggleDictate: () => void;
  onToggleMic: () => void;
  onSubmitFreeText: (text: string) => void;
  onGenerateNote: () => void;
  onRestart: () => void;
}

// Kun rødt/gult/grønt bærer klinisk betydning her — "treat" er ikke en
// eskalation og deler derfor visuelt udtryk med "home" (samme som i motoren:
// begge er "ingen overflytning nødvendig").
const severityStyle: Record<Disposition["severity"], { border: string; bg: string; label: string }> = {
  emergency: { border: "var(--red-line)", bg: "var(--red-tint)", label: "var(--red)" },
  refer: { border: "var(--amber-line)", bg: "var(--amber-tint)", label: "var(--amber)" },
  treat: { border: "var(--green-line)", bg: "var(--green-tint)", label: "var(--green)" },
  home: { border: "var(--green-line)", bg: "var(--green-tint)", label: "var(--green)" },
};

/** Resultatet: klinisk begrundet, aldrig AI-genereret — se tillidsbadge i header og kilder herunder. */
export function DispositionCard({
  disposition,
  lang,
  dictating,
  dictation,
  listening,
  interim,
  onToggleDictate,
  onToggleMic,
  onSubmitFreeText,
  onGenerateNote,
  onRestart,
}: DispositionCardProps) {
  const style = severityStyle[disposition.severity];

  return (
    <div
      className="rounded-2xl border-2 p-6 sm:p-7"
      style={{ borderColor: style.border, background: style.bg }}
    >
      <p
        className="font-[family-name:var(--font-mono)] text-xs font-semibold uppercase tracking-[0.16em]"
        style={{ color: style.label }}
      >
        {tr("recommendation", lang)}
      </p>
      <h2 className="mt-2 font-[family-name:var(--font-display)] text-[26px] font-semibold leading-tight text-[var(--ink)]">
        {disposition.title[lang]}
      </h2>
      <p className="mt-3 leading-relaxed text-[var(--ink)]">{disposition.guidance[lang]}</p>

      {disposition.sources && (
        <p className="mt-4 font-[family-name:var(--font-mono)] text-xs text-[var(--ink-faint)]">
          {tr("sources", lang)}: {disposition.sources.join(" · ")}
        </p>
      )}
      <p className="mt-1 text-xs font-medium text-[var(--ink-soft)]">{tr("sourceNote", lang)}</p>

      <StepImages images={disposition.images ?? []} lang={lang} />

      <div className="mt-6 flex flex-wrap items-center gap-2">
        <button
          onClick={onToggleDictate}
          aria-pressed={dictating}
          className={`rounded-lg border px-4 py-2 text-sm font-medium transition-colors ${
            dictating
              ? "border-[var(--teal)] bg-[var(--teal-tint)] text-[var(--teal-deep)]"
              : "bg-[var(--paper-raised)] text-[var(--ink)] hover:border-[var(--teal)]"
          }`}
        >
          {dictating ? tr("stopDictate", lang) : tr("dictate", lang)}
        </button>
        <button
          onClick={onGenerateNote}
          className="rounded-lg bg-[var(--teal-deep)] px-4 py-2 text-sm font-semibold text-white hover:bg-[var(--teal)] transition-colors"
        >
          {tr("generateNote", lang)}
        </button>
        <button
          onClick={onRestart}
          className="rounded-lg border bg-[var(--paper-raised)] px-4 py-2 text-sm font-medium text-[var(--ink)]"
        >
          {tr("restart", lang)}
        </button>
      </div>

      {dictating && (
        <div className="mt-4">
          <ResponseBar
            lang={lang}
            placeholder={tr("dictationPlaceholder", lang)}
            listening={listening}
            interim={interim}
            onToggleMic={onToggleMic}
            onSubmit={onSubmitFreeText}
            autoFocus
          />
        </div>
      )}

      {dictation && (
        <p className="mt-4 rounded-lg bg-[var(--paper-raised)]/80 p-3 text-sm italic text-[var(--ink-soft)]">
          {dictation}
        </p>
      )}
    </div>
  );
}
