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
  let key = 0;

  const flush = () => {
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

  for (const raw of lines) {
    const line = raw.trimEnd();
    const bullet = /^\s*[-*•]\s+(.*)$/.exec(line);
    if (bullet) {
      bullets.push(bullet[1]);
      continue;
    }
    flush();
    const stripped = line.replace(/^#{1,6}\s*/, "").trim();
    if (!stripped) continue;
    blocks.push(
      <p key={`p-${key++}`} className="my-2 first:mt-0 last:mb-0">
        {inline(stripped, `p-${key}`)}
      </p>,
    );
  }
  flush();

  return <div className="text-[15px] leading-relaxed text-[var(--ink)]">{blocks}</div>;
}
