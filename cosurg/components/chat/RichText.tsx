import type { ReactNode } from "react";

/**
 * Minimal formatering af agentens svar.
 *
 * Agenten skriver punktopstillinger og **fed** — mere end det beder vi den ikke
 * om. Vi bygger React-noder frem for at sætte HTML ind i DOM'en: teksten kommer
 * fra en sprogmodel over nettet, og den skal aldrig kunne blive til markup.
 */

function inline(text: string, keyBase: string): ReactNode[] {
  const nodes: ReactNode[] = [];
  const pattern = /\*\*(.+?)\*\*/g;
  let last = 0;
  let match: RegExpExecArray | null;
  let i = 0;

  while ((match = pattern.exec(text)) !== null) {
    if (match.index > last) nodes.push(text.slice(last, match.index));
    nodes.push(
      <strong key={`${keyBase}-b${i++}`} className="font-semibold">
        {match[1]}
      </strong>,
    );
    last = match.index + match[0].length;
  }
  if (last < text.length) nodes.push(text.slice(last));
  return nodes;
}

export function RichText({ text }: { text: string }) {
  const lines = text.split("\n");
  const blocks: ReactNode[] = [];
  let bullets: string[] = [];
  let nummereret: Array<{ nr: string; tekst: string }> = [];
  /*
   * Fortløbende prosalinjer flyder som ÉT afsnit; kun en tom linje deler.
   * Standard markdown-ombrydning — et enkelt linjeskift i modellens output er
   * et layoutvalg, ikke et afsnit, og hver linje som sit eget <p> gav svar
   * fulde af huller.
   */
  let prosa: string[] = [];
  let key = 0;

  const flushProsa = () => {
    if (prosa.length === 0) return;
    blocks.push(
      <p key={`p-${key++}`} className="my-2 first:mt-0 last:mb-0">
        {inline(prosa.join(" "), `p-${key}`)}
      </p>,
    );
    prosa = [];
  };

  const flushBullets = () => {
    if (bullets.length === 0) return;
    blocks.push(
      <ul key={`ul-${key++}`} className="my-2 space-y-1.5 pl-1">
        {bullets.map((b, i) => (
          <li key={i} className="flex gap-2.5">
            <span aria-hidden="true" className="mt-[9px] h-1 w-1 shrink-0 rounded-full bg-[var(--turquoise-soft)]" />
            <span>{inline(b, `li-${key}-${i}`)}</span>
          </li>
        ))}
      </ul>,
    );
    bullets = [];
  };

  // Nummererede trin er rækkefølge — de må aldrig smelte sammen til prosa.
  const flushNummereret = () => {
    if (nummereret.length === 0) return;
    blocks.push(
      <ol key={`ol-${key++}`} className="my-2 space-y-1.5 pl-1">
        {nummereret.map((punkt, i) => (
          <li key={i} className="flex gap-2.5">
            <span className="min-w-[1.4em] shrink-0 text-right font-[family-name:var(--font-mono)] text-[13px] font-semibold leading-relaxed text-[var(--teal-deep)]">
              {punkt.nr}.
            </span>
            <span>{inline(punkt.tekst, `oli-${key}-${i}`)}</span>
          </li>
        ))}
      </ol>,
    );
    nummereret = [];
  };

  const flushAlt = () => {
    flushProsa();
    flushBullets();
    flushNummereret();
  };

  for (const raw of lines) {
    const line = raw.trimEnd();

    if (!line.trim()) {
      flushAlt();
      continue;
    }

    const bullet = /^\s*[-*•]\s+(.*)$/.exec(line);
    if (bullet) {
      flushProsa();
      flushNummereret();
      bullets.push(bullet[1]);
      continue;
    }

    const punkt = /^\s*(\d+)[.)]\s+(.*)$/.exec(line);
    if (punkt) {
      flushProsa();
      flushBullets();
      nummereret.push({ nr: punkt[1], tekst: punkt[2] });
      continue;
    }

    flushBullets();
    flushNummereret();

    const overskrift = /^#{1,6}\s+(.*)$/.exec(line);
    if (overskrift) {
      flushAlt();
      blocks.push(
        <p key={`h-${key++}`} className="mt-3 mb-1 font-semibold first:mt-0">
          {inline(overskrift[1], `h-${key}`)}
        </p>,
      );
      continue;
    }

    prosa.push(line.trim());
  }
  flushAlt();

  return <div className="text-[15px] leading-relaxed text-[var(--ink)]">{blocks}</div>;
}
