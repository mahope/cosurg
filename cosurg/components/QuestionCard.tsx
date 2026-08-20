"use client";

import type { Lang, TreeNode } from "@/lib/tree/types";
import { tr } from "@/lib/i18n";
import { StepImages } from "./StepImages";
import { ResponseBar } from "./ResponseBar";
import { useStepMotion } from "./ui/useStepMotion";
import { SizeLock, widestOf } from "./ui/SizeLock";

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
 *
 * Kortet bærer også skiftet mellem spørgsmål: `useStepMotion` aflæser om vi
 * rykkede frem, gik tilbage eller fik samme trin med nyt indhold, og lader
 * bevægelsen sige hvad der skete. Selve knuden genbruges — fokus og skrevet
 * tekst i svarfeltet overlever derfor et skift.
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
  const cardRef = useStepMotion<HTMLDivElement>(stepNumber, node.id);

  return (
    <div
      ref={cardRef}
      className="rounded-2xl border bg-[var(--paper-raised)] p-6 sm:p-7 shadow-[0_1px_2px_rgba(16,32,30,0.04)]"
    >
      <p className="font-[family-name:var(--font-mono)] text-xs font-medium uppercase tracking-[0.14em] text-[var(--ink-faint)]">
        {tr("step", lang)} {stepNumber} / {totalNodes}
      </p>
      {/*
        SPØRGSMÅLSFELTET HAR FAST HØJDE.

        Noderne er ikke lige lange: målt på brandsårstræet fylder de korte
        spørgsmål to linjer og de lange tre, og kun halvdelen har hjælpetekst.
        Uden en reserveret højde flyttede svarfeltet nedenunder sig op til 39
        pixel mellem hvert trin — og svarfeltet er præcis dét lægen sigter
        efter med øjet og musen. Feltet rummer derfor altid det tætteste
        tilfælde (tre linjers spørgsmål plus to linjers hjælpetekst).

        Overskudspladsen på de tynde noder er ikke et hul: linjen nedenfor
        deler kortet i "hvad der spørges om" og "hvordan du svarer", og gør
        luften til en bevidst adskillelse frem for noget der mangler.

        `aria-live` gør skiftet hørbart for en skærmlæser uden at rive fokus ud
        af svarfeltet — lægen kan svare videre mens der læses op.
      */}
      <div className="mt-3 min-h-[11rem]">
        <h2
          aria-live="polite"
          className="font-[family-name:var(--font-display)] text-2xl sm:text-[28px] font-semibold leading-snug tracking-tight text-[var(--ink)]"
        >
          {questionText}
        </h2>
        {node.help && (
          <p className="mt-3 text-sm leading-relaxed text-[var(--ink-soft)]">{node.help[lang]}</p>
        )}
      </div>

      <div className="border-t border-[var(--line)] pt-5">
      {/* Svarrækken har mindst én knaphøjde, også på trin-noder uden svar. */}
      <div className="flex min-h-[2.375rem] flex-wrap items-start gap-2">
        {node.answerType === "number" ? (
          <input
            type="number"
            min={node.min}
            max={node.max}
            placeholder={node.unit}
            /* Et talfelt uden etiket læses op som "redigeringsfelt". Vi giver
               det spørgsmålet selv — det er præcis hvad feltet vil vide. */
            aria-label={node.unit ? `${questionText} (${node.unit})` : questionText}
            /* Samme højde som svarknapperne (38 px): et talfelt der er tre
               pixel højere ville rykke svarfeltet nedenunder på hver tal-node. */
            className="h-[2.375rem] w-40 rounded-lg border bg-[var(--paper)] px-3 text-[15px] leading-none text-[var(--ink)] transition-colors focus:border-[var(--teal)] focus:outline-none"
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
              className="rounded-lg border px-4 py-2 text-sm font-medium text-[var(--ink)] transition-[color,background-color,border-color] duration-150 hover:border-[var(--teal)] hover:bg-[var(--teal-tint)]"
            >
              {/* Svarmulighederne er oversat indhold — "Kemisk ætsning" mod
                  "Chemical". Hver knap får plads til den længste af de to, så
                  rækken står stille når lægen skifter sprog midt i en sag. */}
              <SizeLock variants={[o.label.da, o.label.en]}>{o.label[lang]}</SizeLock>
            </button>
          ))
        ) : canAdvance ? (
          // Trin-noden har intet svar — den kvitteres. Samme vej gennem motoren
          // som stemmekommandoen "næste", blot udløst med et klik.
          <button
            onClick={onNext}
            className="rounded-lg bg-[var(--teal-deep)] px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-[var(--teal)]"
          >
            <SizeLock variants={widestOf("nextStep").map((s) => `${s} →`)}>
              {tr("nextStep", lang)} →
            </SizeLock>
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
      </div>

      <StepImages images={node.images ?? []} lang={lang} />
    </div>
  );
}
