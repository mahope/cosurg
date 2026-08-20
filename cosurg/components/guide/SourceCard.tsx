import type { KildeUddrag } from "@/lib/corti/mcp";
import type { Lang } from "@/lib/tree/types";
import { tr } from "@/lib/i18n";
import { SourceText } from "./SourceText";

/**
 * Ét ordret uddrag med sin kilde.
 *
 * Kilden står ØVERST og ikke som en fodnote. Det er ikke pynt: hele appens
 * påstand er at indholdet kommer fra navngivne kliniske kilder og ikke fra en
 * sprogmodels hukommelse, og den påstand skal kunne aflæses før man læser
 * teksten — ikke bekræftes bagefter.
 */

interface SourceCardProps {
  uddrag: KildeUddrag;
  lang: Lang;
  /** Kompakt udgave til faldgrube-kort, hvor pladsen er trang. */
  tæt?: boolean;
}

function vaert(url: string): string {
  try {
    return new URL(url).host.replace(/^www\./, "");
  } catch {
    return url;
  }
}

export function SourceCard({ uddrag, lang, tæt = false }: SourceCardProps) {
  const navn = uddrag.erUrl ? vaert(uddrag.kilde) : uddrag.kilde;
  const sti = uddrag.overskrifter.filter(Boolean);

  return (
    <article
      className={`rounded-xl border border-[var(--line)] bg-[var(--paper-raised)] ${tæt ? "p-3.5" : "p-4 sm:p-5"}`}
    >
      <div className="mb-2.5 flex flex-wrap items-baseline gap-x-2 gap-y-1 border-b border-[var(--line)] pb-2.5">
        {uddrag.erUrl ? (
          <a
            href={uddrag.kilde}
            target="_blank"
            rel="noreferrer noopener"
            title={tr("sourceOpen", lang)}
            className="font-[family-name:var(--font-mono)] text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--teal)] underline decoration-[var(--line-strong)] underline-offset-4 hover:decoration-[var(--teal)]"
          >
            {navn}
          </a>
        ) : (
          <span className="font-[family-name:var(--font-mono)] text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--teal)]">
            {tr("sourceDocument", lang)}: {navn}
          </span>
        )}
        {sti.length > 0 && (
          <span className="text-[11px] text-[var(--ink-faint)]">
            {sti.map((s) => `› ${s}`).join(" ")}
          </span>
        )}
        <span className="ml-auto font-[family-name:var(--font-mono)] text-[10px] uppercase tracking-[0.14em] text-[var(--ink-faint)]">
          {tr("sourceVerbatim", lang)}
        </span>
      </div>

      <SourceText text={uddrag.tekst} />
    </article>
  );
}
