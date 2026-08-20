import type { Disposition, Lang } from "@/lib/tree/types";
import { tr } from "@/lib/i18n";
import { StepImages } from "./StepImages";
import { ResponseBar } from "./ResponseBar";

interface DispositionCardProps {
  disposition: Disposition;
  lang: Lang;
  /** Tillægsfeltet er åbnet. Uafhængigt af om mikrofonen faktisk kom op. */
  addendumOpen: boolean;
  /** Diktat kører — Cortis dictation-strøm, ikke den ambiente lytning. */
  dictating: boolean;
  dictation: string;
  /**
   * Ubehandlet forhåndsvisning fra diktatet. Den indeholder stadig ordet
   * "punktum" og må derfor kun VISES — aldrig skrives ind i tillægget.
   */
  interim: string;
  onToggleAddendum: () => void;
  onToggleDictationMic: () => void;
  onSubmitFreeText: (text: string) => void;
  onGenerateNote: () => void;
  /** Notatet er undervejs — knappen spærres, så utålmodige klik ikke sender kaldet igen. */
  noteBusy: boolean;
  onRestart: () => void;
  /** Det oplagte næste forløb, hvis anbefalingen peger på et. */
  followUpName?: string | null;
  onFollowUp?: () => void;
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
  addendumOpen,
  dictating,
  dictation,
  interim,
  onToggleAddendum,
  onToggleDictationMic,
  onSubmitFreeText,
  onGenerateNote,
  noteBusy,
  onRestart,
  followUpName,
  onFollowUp,
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

      {/*
        Det næste skridt, tilbudt hvor anbefalingen står. Ét klik — lægen skal
        ikke lede efter proceduren i en menu bagefter. Det er et TILBUD: appen
        skifter aldrig forløb af sig selv.
      */}
      {followUpName && onFollowUp && (
        <button
          onClick={onFollowUp}
          className="mt-5 flex w-full items-center justify-between gap-3 rounded-xl border border-[var(--teal)] bg-[var(--paper-raised)] px-4 py-3 text-left transition-colors hover:bg-[var(--teal-tint)]"
        >
          <span>
            <span className="block font-[family-name:var(--font-mono)] text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--ink-faint)]">
              {tr("nextPathway", lang)}
            </span>
            <span className="mt-0.5 block text-sm font-semibold text-[var(--teal-deep)]">{followUpName}</span>
          </span>
          <span aria-hidden="true" className="shrink-0 text-lg text-[var(--teal-deep)]">
            →
          </span>
        </button>
      )}

      <div className="mt-6 flex flex-wrap items-center gap-2">
        <button
          onClick={onToggleAddendum}
          aria-pressed={addendumOpen}
          className={`rounded-lg border px-4 py-2 text-sm font-medium transition-colors ${
            addendumOpen
              ? "border-[var(--teal)] bg-[var(--teal-tint)] text-[var(--teal-deep)]"
              : "bg-[var(--paper-raised)] text-[var(--ink)] hover:border-[var(--teal)]"
          }`}
        >
          {addendumOpen ? tr("stopDictate", lang) : tr("dictate", lang)}
        </button>
        <button
          onClick={onGenerateNote}
          disabled={noteBusy}
          aria-busy={noteBusy}
          className="rounded-lg bg-[var(--teal-deep)] px-4 py-2 text-sm font-semibold text-white transition-colors enabled:hover:bg-[var(--teal)] disabled:opacity-50"
        >
          {noteBusy ? tr("noteWorking", lang) : tr("generateNote", lang)}
        </button>
        <button
          onClick={onRestart}
          className="rounded-lg border bg-[var(--paper-raised)] px-4 py-2 text-sm font-medium text-[var(--ink)]"
        >
          {tr("restart", lang)}
        </button>
      </div>

      {addendumOpen && (
        <div className="mt-4">
          {/* Mikrofonringen i feltet styrer KUN diktatet — skriftvejen skal
              blive stående selv når lyden er slået fra eller nægtet. */}
          <ResponseBar
            lang={lang}
            placeholder={tr("dictationPlaceholder", lang)}
            listening={dictating}
            interim={interim}
            onToggleMic={onToggleDictationMic}
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
