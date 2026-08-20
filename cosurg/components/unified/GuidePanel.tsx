"use client";

import Link from "next/link";
import type { Lang } from "@/lib/tree/types";
import { tr } from "@/lib/i18n";
import { SourceCard } from "@/components/guide/SourceCard";
import { PitfallRail } from "@/components/pitfalls/PitfallRail";
import type { GuideSvar } from "./guide";
import { ut } from "./text";

/**
 * Behandlingen af én tilstand, i klinisk rækkefølge — inde i forløbet.
 *
 * Det er den samme guide som `/guide`, men den kommer TIL lægen i stedet for at
 * han går hen til den. Han skrev "hvordan behandler jeg en dyb dermal
 * forbrænding på hånden?" midt i en vurdering; så skal svaret lægge sig under
 * spørgsmålet, ikke bag en fane.
 *
 * To ting er skåret væk i forhold til den fulde side, fordi pladsen her er
 * lånt: kun afsnit MED dækning vises (et tomt afsnit er støj når man skimmer),
 * og der er højst ét uddrag pr. afsnit. Vil lægen have det hele, står linket
 * til den fulde guide nederst — og den er allerede slået op, så den koster
 * ingen ventetid.
 *
 * Faldgruberne for emnet hænger nedenunder. De koster 40-60 ms fra vores egen
 * server, og en advarsel der dukker op mens man læser behandlingen er værd ti
 * gange en man selv skal huske at slå op.
 */

interface GuidePanelProps {
  guide: GuideSvar;
  lang: Lang;
  /** Det lægen faktisk skrev — grundlaget for de kontekstuelle faldgruber. */
  topic: string;
  /** Skift til litteratursvaret i stedet. Samme spørgsmål, anden kilde. */
  onAskInstead: () => void;
}

export function GuidePanel({ guide, lang, topic, onAskInstead }: GuidePanelProps) {
  const daekkede = guide.sections.filter((s) => s.excerpts.length > 0);

  if (guide.offTopic || daekkede.length === 0) {
    return (
      <div className="space-y-3">
        <p className="rounded-2xl border border-dashed border-[var(--nude-deep)] bg-[var(--nude-tint)] px-4 py-3 text-[14px] leading-relaxed text-[var(--nude-deep)]">
          {ut("guideEmpty", lang)}
        </p>
        <button
          type="button"
          onClick={onAskInstead}
          className="rounded-lg border border-[var(--line-strong)] bg-[var(--paper)] px-3.5 py-2 text-[13.5px] font-medium text-[var(--ink)] transition-colors hover:border-[var(--teal)] hover:bg-[var(--teal-tint)]"
        >
          {ut("guideAskInstead", lang)}
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
        <span className="rounded-full border border-[var(--teal)] bg-[var(--teal-tint)] px-2.5 py-1 font-[family-name:var(--font-mono)] text-[11px] font-medium uppercase tracking-[0.1em] text-[var(--teal-deep)]">
          {ut("guideTitle", lang)}
        </span>
        <span className="text-[14.5px] font-medium text-[var(--ink)]">{guide.topic[lang]}</span>
      </div>

      {daekkede.map((afsnit) => (
        <section key={afsnit.key} className="space-y-2">
          <p className="font-[family-name:var(--font-mono)] text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--ink-faint)]">
            {afsnit.label[lang]}
          </p>
          <SourceCard uddrag={afsnit.excerpts[0]} lang={lang} tæt />
        </section>
      ))}

      {/* Faldgruberne for netop dette emne. Skinnen viser ingenting hvis
          vidensbasen ikke kan belægge nogen — den må aldrig fylde uden grund. */}
      <PitfallRail lang={lang} kontekst={{ topic }} limit={2} overskrift={tr("pitfallsHere", lang)} />

      <div className="flex flex-wrap items-center gap-2 border-t border-[var(--line)] pt-3">
        <Link
          href={`/guide?topic=${encodeURIComponent(topic)}`}
          className="rounded-lg bg-[var(--teal-deep)] px-3.5 py-2 text-[13.5px] font-semibold text-white transition-colors hover:bg-[var(--teal)]"
        >
          {ut("guideFull", lang)}
        </Link>
        <button
          type="button"
          onClick={onAskInstead}
          className="rounded-lg border border-[var(--line-strong)] bg-[var(--paper)] px-3.5 py-2 text-[13.5px] font-medium text-[var(--ink-soft)] transition-colors hover:border-[var(--teal)] hover:text-[var(--ink)]"
        >
          {ut("guideAskInstead", lang)}
        </button>
        <p className="w-full text-[12px] leading-relaxed text-[var(--ink-faint)]">
          {ut("guideSourcesNote", lang)}
        </p>
      </div>
    </div>
  );
}
