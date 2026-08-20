import type { Lang, TreeNode } from "@/lib/tree/types";
import { tr } from "@/lib/i18n";
import { StepImages } from "./StepImages";
import { ResponseBar } from "./ResponseBar";

interface QuestionCardProps {
  node: TreeNode;
  questionText: string;
  lang: Lang;
  stepNumber: number;
  totalNodes: number;
  onSelectOption: (value: string, label: string) => void;
  onSubmitNumber: (value: string) => void;
  onSubmitFreeText: (text: string) => void;
  /** Trin-node: instruktion uden svar — kvitteres med "næste". */
  canAdvance: boolean;
  onNext: () => void;
  listening: boolean;
  interim: string;
  onToggleMic: () => void;
}

/**
 * Den aktive node. Uanset svartype (valg eller tal) vises ALTID det samlede
 * svarfelt nedenunder — klik, tale og skrift er tre veje ind i samme
 * beslutning, ikke tre forskellige kontroller.
 */
export function QuestionCard({
  node,
  questionText,
  lang,
  stepNumber,
  totalNodes,
  onSelectOption,
  onSubmitNumber,
  onSubmitFreeText,
  canAdvance,
  onNext,
  listening,
  interim,
  onToggleMic,
}: QuestionCardProps) {
  return (
    <div className="rounded-2xl border bg-[var(--paper-raised)] p-6 sm:p-7 shadow-[0_1px_2px_rgba(16,32,30,0.04)]">
      <p className="font-[family-name:var(--font-mono)] text-xs font-medium uppercase tracking-[0.14em] text-[var(--ink-faint)]">
        {tr("step", lang)} {stepNumber} / {totalNodes}
      </p>
      <h2 className="mt-3 font-[family-name:var(--font-display)] text-2xl sm:text-[28px] font-semibold leading-snug tracking-tight text-[var(--ink)]">
        {questionText}
      </h2>

      {node.help && <p className="mt-3 text-sm leading-relaxed text-[var(--ink-soft)]">{node.help[lang]}</p>}

      <div className="mt-6 flex flex-wrap gap-2">
        {node.answerType === "number" ? (
          <input
            type="number"
            min={node.min}
            max={node.max}
            placeholder={node.unit}
            className="w-40 rounded-lg border bg-[var(--paper)] px-3 py-2 text-[15px] text-[var(--ink)] focus:border-[var(--teal)] focus:outline-none"
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                const v = (e.target as HTMLInputElement).value;
                if (v) onSubmitNumber(v);
              }
            }}
          />
        ) : node.options && node.options.length > 0 ? (
          node.options.map((o) => (
            <button
              key={o.value}
              onClick={() => onSelectOption(o.value, o.label[lang])}
              className="rounded-lg border px-4 py-2 text-sm font-medium text-[var(--ink)] hover:border-[var(--teal)] hover:bg-[var(--teal-tint)] transition-colors"
            >
              {o.label[lang]}
            </button>
          ))
        ) : canAdvance ? (
          // Trin-noden har intet svar — den kvitteres. Samme vej gennem motoren
          // som stemmekommandoen "næste", blot udløst med et klik.
          <button
            onClick={onNext}
            className="rounded-lg bg-[var(--teal-deep)] px-4 py-2 text-sm font-semibold text-white hover:bg-[var(--teal)] transition-colors"
          >
            {tr("nextStep", lang)} →
          </button>
        ) : null}
      </div>

      <div className="mt-4">
        <ResponseBar
          lang={lang}
          placeholder={tr(canAdvance ? "stepPlaceholder" : "answerPlaceholder", lang)}
          listening={listening}
          interim={interim}
          onToggleMic={onToggleMic}
          onSubmit={onSubmitFreeText}
        />
      </div>

      <StepImages images={node.images ?? []} lang={lang} />
    </div>
  );
}
