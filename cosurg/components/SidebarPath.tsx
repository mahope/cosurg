"use client";

import { useEffect, useRef } from "react";
import type { AnsweredStep, DecisionTree, Lang } from "@/lib/tree/types";
import { getNode } from "@/lib/tree/engine";
import { tr } from "@/lib/i18n";
import { ZoneMark } from "./ZoneMark";
import { ui } from "./ui/uiText";

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

/**
 * Beslutningsvejen: et klinisk spor, ikke en generisk stepper.
 *
 * Sporet har FAST højde. Voksede det med hvert svar, ville transskript-panelet
 * under det vandre nedad hele forløbet igennem — og lægen ville skulle lede
 * efter det hver gang. I stedet ruller sporet indeni, og det nyeste svar
 * holdes nederst i ruden.
 */
export function SidebarPath({ tree, path, progress, stepLabel, lang }: SidebarPathProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [path.length]);

  return (
    <div className="rounded-xl border bg-[var(--paper-raised)] p-4">
      <div className="flex items-center gap-3">
        <ZoneMark variant="progress" percent={progress} label={stepLabel} size={48} />
        <p className="font-[family-name:var(--font-mono)] text-xs font-semibold uppercase tracking-[0.14em] text-[var(--ink-faint)]">
          {tr("path", lang)}
        </p>
      </div>

      {/* Kun nye trin bevæger sig: React genbruger de eksisterende knuder, så
          CSS-animationen udløses alene på det svar der lige kom til. Vejen
          vokser nedad, og bevægelsen kommer nedefra — samme retning. */}
      {/* Fast højde begge steder — kun tallet er mindre på telefon, hvor
          panelet ligger under indholdet og reserveret plads koster rulning. */}
      <div ref={scrollRef} className="mt-4 h-[7rem] overflow-y-auto pr-1 sm:h-[11rem]">
      <ol className="space-y-3 text-sm">
        {path.map((s, i) => (
          <li key={`${s.nodeId}-${i}`} className="motion-forward border-l-2 border-[var(--teal)] pl-3">
            <p className="text-[var(--ink-faint)]">{s.question}</p>
            <p className="font-medium text-[var(--ink)]">
              {answerLabel(tree, s, lang)}
              {s.redFlagged && (
                <span
                  className="ml-2 font-[family-name:var(--font-mono)] text-xs font-semibold text-[var(--red)]"
                  title={tr("redFlag", lang)}
                >
                  <span aria-hidden="true">⚠</span>
                  <span className="sr-only">{tr("redFlag", lang)}</span>
                </span>
              )}
            </p>
          </li>
        ))}
      </ol>

      {path.length === 0 && (
        /* En tankestreg fortæller ikke om vejen er tom eller i stykker. */
        <p className="text-[13px] leading-snug text-[var(--ink-soft)]">{ui("pathEmpty", lang)}</p>
      )}
      </div>
    </div>
  );
}
