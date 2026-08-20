import type { AnsweredStep, DecisionTree, Lang } from "@/lib/tree/types";
import { getNode } from "@/lib/tree/engine";
import { tr } from "@/lib/i18n";
import { ZoneMark } from "./ZoneMark";

interface SidebarPathProps {
  tree: DecisionTree;
  path: AnsweredStep[];
  progress: number;
  stepLabel: string;
  lang: Lang;
}

/**
 * Beslutningsvejen skal kunne læses højt til en kollega, så den viser lægens
 * svar med klinikernes egne ord — ikke motorens maskinværdier ("electrical").
 * Værdien slås op i nodens svarmuligheder; tal og trin-kvitteringer falder
 * tilbage til værdien selv.
 */
function answerLabel(tree: DecisionTree, step: AnsweredStep, lang: Lang): string {
  if (step.value === "done") return tr("stepDone", lang);
  const option = getNode(tree, step.nodeId)?.options?.find((o) => o.value === step.value);
  return option?.label[lang] ?? step.value;
}

/** Beslutningsvejen: et klinisk spor, ikke en generisk stepper. */
export function SidebarPath({ tree, path, progress, stepLabel, lang }: SidebarPathProps) {
  return (
    <div className="rounded-xl border bg-[var(--paper-raised)] p-4">
      <div className="flex items-center gap-3">
        <ZoneMark variant="progress" percent={progress} label={stepLabel} size={48} />
        <p className="font-[family-name:var(--font-mono)] text-xs font-semibold uppercase tracking-[0.14em] text-[var(--ink-faint)]">
          {tr("path", lang)}
        </p>
      </div>

      <ol className="mt-4 space-y-3 text-sm">
        {path.map((s, i) => (
          <li key={`${s.nodeId}-${i}`} className="border-l-2 border-[var(--teal)] pl-3">
            <p className="text-[var(--ink-faint)]">{s.question}</p>
            <p className="font-medium text-[var(--ink)]">
              {answerLabel(tree, s, lang)}
              {s.redFlagged && (
                <span className="ml-2 font-[family-name:var(--font-mono)] text-xs font-semibold text-[var(--red)]">
                  ⚠
                </span>
              )}
            </p>
          </li>
        ))}
        {path.length === 0 && <li className="text-[var(--ink-faint)]">—</li>}
      </ol>
    </div>
  );
}
