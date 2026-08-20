"use client";

import type { DecisionTree, Lang, TreeNode } from "@/lib/tree/types";
import { StepImages } from "@/components/StepImages";
import { tr } from "@/lib/i18n";

/**
 * PROCEDUREN I TRÅDEN.
 *
 * Rigshospitalets forbindingsguide er tolv trin med 71 kliniske fotos. I
 * håndfri tilstand vises den ét trin ad gangen på en mørk skærm, fordi
 * kirurgen er steril og styrer med stemmen (se OrView). Her — på en tablet
 * ved siden af sengen, med hænderne fri — er det modsatte rigtigt: ALLE trin
 * står under hinanden, så man kan bladre frem og tilbage, springe til trin
 * ni, og se hvad der kommer.
 *
 * En procedure er en linje, ikke en beslutning. Der er ingen kanter at vælge
 * imellem, så der er heller ikke noget at føre nogen igennem — det ville
 * være at gøre en opskrift til en formular. Vi følger derfor kæden fra roden
 * og skriver den ud.
 */

interface ProcedureStepsProps {
  tree: DecisionTree;
  lang: Lang;
}

/**
 * Trinnene i den rækkefølge træet selv har dem.
 *
 * Vi følger kanterne frem for at læse `nodes` i array-orden: rækkefølgen er
 * en klinisk påstand, og den bor i kanterne. Vagten mod gentagelse er ikke
 * paranoia — en cyklus i et træ ville ellers hænge browseren.
 */
function stepsInOrder(tree: DecisionTree): TreeNode[] {
  const byId = new Map(tree.nodes.map((n) => [n.id, n]));
  const seen = new Set<string>();
  const steps: TreeNode[] = [];

  let current = byId.get(tree.rootNodeId);
  while (current && !seen.has(current.id)) {
    seen.add(current.id);
    steps.push(current);
    const next = current.edges.find((e) => e.when === "*") ?? current.edges[0];
    current = next ? byId.get(next.goto) : undefined;
  }

  // Nåede kæden ikke alle noder, er træet ikke en ren linje. Så viser vi
  // resten bagefter frem for at tie om dem.
  for (const node of tree.nodes) if (!seen.has(node.id)) steps.push(node);
  return steps;
}

export function ProcedureSteps({ tree, lang }: ProcedureStepsProps) {
  const steps = stepsInOrder(tree);

  return (
    <section className="rounded-2xl border-2 border-[var(--teal)] bg-[var(--paper-raised)] p-5 sm:p-6">
      <p className="font-[family-name:var(--font-mono)] text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--teal-deep)]">
        {tr("procedureLabel", lang)}
      </p>
      <h3 className="mt-1.5 font-[family-name:var(--font-display)] text-xl font-semibold leading-snug tracking-tight text-[var(--ink)]">
        {tree.name[lang]}
      </h3>
      {tree.description?.[lang] && (
        <p className="mt-1.5 text-sm leading-relaxed text-[var(--ink-soft)]">{tree.description[lang]}</p>
      )}

      <ol className="mt-5 space-y-6">
        {steps.map((step, i) => (
          <li key={step.id} className="border-t border-[var(--line)] pt-5 first:border-t-0 first:pt-0">
            <div className="flex gap-3">
              {/* Nummeret er trinnets identitet — det er sådan man siger til
                  en kollega hvor man er nået til. */}
              <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[var(--teal-deep)] font-[family-name:var(--font-mono)] text-[13px] font-bold text-white">
                {i + 1}
              </span>
              <p className="flex-1 text-[15px] font-medium leading-relaxed text-[var(--ink)]">
                {/* `orQuestion` er instruktionen uden "Trin 3 af 12"-forstavelsen.
                    Nummeret står allerede i cirklen ved siden af, og at sige det
                    to gange ville støje i en liste hvor alle trin er nummereret. */}
                {step.orQuestion?.[lang] ?? step.question[lang]}
              </p>
            </div>

            {step.images && step.images.length > 0 && (
              <StepImages images={step.images} lang={lang} />
            )}
          </li>
        ))}
      </ol>

      {tree.authors && tree.authors.length > 0 && (
        <p className="mt-5 border-t border-[var(--line)] pt-3 font-[family-name:var(--font-mono)] text-[11px] leading-relaxed text-[var(--ink-faint)]">
          {tree.authors.join(", ")}
        </p>
      )}
    </section>
  );
}
