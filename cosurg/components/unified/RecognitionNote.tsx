import type { Lang } from "@/lib/tree/types";
import { tr } from "@/lib/i18n";

interface RecognitionNoteProps {
  lang: Lang;
  /** Forløbet der blev valgt — med lægens navn på det, ikke vores id. */
  name: string;
  /** Hvad i ytringen der pegede derhen. */
  reasons: string[];
}

/**
 * Kvitteringen: hvad appen forstod, og hvorfor den gjorde netop det.
 *
 * Forsiden viser genkendelsen MENS den sker. Den her viser den bagefter — og
 * de to er ikke det samme. Forhåndsvisningen er en advarsel man kan standse;
 * kvitteringen er en optegnelse man kan efterprøve. Uden den ville et forløb
 * bare være startet, og lægen ville ikke kunne se at der overhovedet blev
 * truffet et valg på hans vegne.
 *
 * Grundene står med. Det er ikke grundighed for grundighedens skyld: hele
 * appens påstand er at den kan gøre rede for sig, og et valg uden begrundelse
 * er ikke til at skelne fra et gæt.
 *
 * Linjen vises kun når forløbet blev GENKENDT. Valgte lægen selv i listen, er
 * der intet at kvittere for.
 */
export function RecognitionNote({ lang, name, reasons }: RecognitionNoteProps) {
  return (
    <p className="mb-4 flex flex-wrap items-baseline gap-x-2 gap-y-1 rounded-lg border border-[var(--line)] bg-[var(--teal-tint)] px-3.5 py-2">
      <span className="font-[family-name:var(--font-mono)] text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--ink-faint)]">
        {tr("recognisedAs", lang)}
      </span>
      <span className="text-sm font-semibold leading-snug text-[var(--ink)]">
        {tr("sensePathway", lang)} · {name}
      </span>
      {reasons.length > 0 && (
        <span className="font-[family-name:var(--font-mono)] text-[11px] leading-relaxed text-[var(--ink-faint)]">
          {tr("recognisedBecause", lang)}: {reasons.map((r) => `«${r}»`).join(" · ")}
        </span>
      )}
    </p>
  );
}
