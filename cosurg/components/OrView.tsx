import type { Disposition, Lang, TreeNode } from "@/lib/tree/types";
import { tr } from "@/lib/i18n";
import { ZoneMark } from "./ZoneMark";
import { StepImages } from "./StepImages";
import { RedFlagBanner } from "./RedFlagBanner";
import { NotePanel } from "./NotePanel";

interface NoteResult {
  note: string;
  codes: Array<{ code: string; system?: string; description: string; rationale?: string }>;
}

interface OrViewProps {
  lang: Lang;
  node?: TreeNode;
  questionText: string;
  disposition?: Disposition;
  flash: string | null;
  onAcknowledgeFlash: () => void;
  stepNumber: number;
  totalNodes: number;
  listening: boolean;
  onSelectOption: (value: string, label: string) => void;
  onSubmitNumber: (value: string) => void;
  onExit: () => void;
  note: NoteResult | null;
  lastHeard: string | null;
}

const orSeverity: Record<Disposition["severity"], string> = {
  emergency: "var(--or-red)",
  refer: "var(--or-amber)",
  treat: "var(--or-green)",
  home: "var(--or-green)",
};

/**
 * OR-tilstand: en anden verden, ikke samme side i større skrift. Kirurgen
 * står sterilt, rører aldrig skærmen, og læser fra to meters afstand — så alt
 * andet end det ene aktive spørgsmål og dets billede er fjernet. Al
 * håndfri styring foregår med stemmen (næste/gentag/tilbage, se page.tsx).
 */
export function OrView({
  lang,
  node,
  questionText,
  disposition,
  flash,
  onAcknowledgeFlash,
  stepNumber,
  totalNodes,
  listening,
  onSelectOption,
  onSubmitNumber,
  onExit,
  note,
  lastHeard,
}: OrViewProps) {
  const images = node?.images ?? disposition?.images ?? [];

  return (
    <main className="or-scope min-h-screen bg-[var(--or-bg)] px-6 py-6 sm:px-12 sm:py-8 text-[var(--or-ink)]">
      <div className="mx-auto flex min-h-[calc(100vh-3rem)] max-w-4xl flex-col">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <ZoneMark variant="listening" active={listening} tone="or" size={30} />
            <div>
              <p className="font-[family-name:var(--font-mono)] text-sm font-semibold uppercase tracking-[0.24em] text-[var(--or-accent)]">
                {tr("orModeOn", lang)}
              </p>
              {node && (
                <p className="font-[family-name:var(--font-mono)] text-xs text-[var(--or-ink-soft)]">
                  {tr("step", lang)} {stepNumber} / {totalNodes}
                </p>
              )}
            </div>
          </div>
          <button
            onClick={onExit}
            className="rounded-lg border border-[var(--or-line)] px-3 py-1.5 text-xs font-medium text-[var(--or-ink-soft)] hover:border-[var(--or-accent)] hover:text-[var(--or-accent)] transition-colors"
          >
            {tr("orExit", lang)}
          </button>
        </div>

        <div className="mt-10 flex flex-1 flex-col justify-center">
          {flash ? (
            <RedFlagBanner message={flash} lang={lang} orMode onAcknowledge={onAcknowledgeFlash} />
          ) : disposition ? (
            <div
              className="rounded-2xl border-2 p-8 sm:p-10"
              style={{ borderColor: orSeverity[disposition.severity], background: "var(--or-surface)" }}
            >
              <p
                className="font-[family-name:var(--font-mono)] text-sm font-semibold uppercase tracking-[0.2em]"
                style={{ color: orSeverity[disposition.severity] }}
              >
                {tr("recommendation", lang)}
              </p>
              <h2 className="mt-3 font-[family-name:var(--font-display)] text-4xl sm:text-5xl font-semibold leading-tight">
                {disposition.title[lang]}
              </h2>
              <p className="mt-5 text-xl sm:text-2xl leading-relaxed text-[var(--or-ink-soft)]">
                {disposition.guidance[lang]}
              </p>
              <p className="mt-6 font-[family-name:var(--font-mono)] text-sm text-[var(--or-ink-soft)]">
                {tr("sourceNote", lang)}
              </p>
              {note && <NotePanel note={note} lang={lang} orMode />}
            </div>
          ) : node ? (
            <>
              <h2 className="font-[family-name:var(--font-display)] text-[clamp(2.5rem,6vw,5.5rem)] font-semibold leading-[1.05] tracking-tight">
                {questionText}
              </h2>

              {node.answerType === "number" ? (
                <input
                  type="number"
                  min={node.min}
                  max={node.max}
                  placeholder={node.unit}
                  className="mt-8 w-64 rounded-xl border border-[var(--or-line)] bg-[var(--or-surface)] px-5 py-4 text-3xl text-[var(--or-ink)] focus:border-[var(--or-accent)] focus:outline-none"
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      const v = (e.target as HTMLInputElement).value;
                      if (v) onSubmitNumber(v);
                    }
                  }}
                />
              ) : (
                node.options && node.options.length > 0 && (
                  <div className="mt-8 flex flex-wrap gap-3">
                    {node.options.map((o) => (
                      <button
                        key={o.value}
                        onClick={() => onSelectOption(o.value, o.label[lang])}
                        className="rounded-xl border border-[var(--or-line)] bg-[var(--or-surface)] px-7 py-5 text-2xl font-medium hover:border-[var(--or-accent)] hover:bg-[var(--or-surface-raised)] transition-colors"
                      >
                        {o.label[lang]}
                      </button>
                    ))}
                  </div>
                )
              )}

              <StepImages images={images} lang={lang} large />

              <p className="mt-10 text-lg text-[var(--or-ink-soft)]">{tr("orHint", lang)}</p>
            </>
          ) : null}
        </div>

        <div className="mt-8 min-h-[1.5rem] font-[family-name:var(--font-mono)] text-sm text-[var(--or-ink-soft)]">
          {lastHeard && <span>&ldquo;{lastHeard}&rdquo;</span>}
        </div>
      </div>
    </main>
  );
}
