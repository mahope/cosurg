import type { ReactNode } from "react";

/**
 * Viser et ORDRET uddrag fra en klinisk kilde.
 *
 * Kilderne er markdown skrabet fra brandsaar.dk og teamets dokumenter, og de
 * indeholder tabeller (overflytningskriterier, Parkland-perioder,
 * tromboserisiko), punktopstillinger, fed skrift og billed-referencer. En
 * render der kun kan afsnit ville vise en overflytningstabel som en muur af
 * rørtegn — netop den tabel man slog op for.
 *
 * Vi bygger React-noder frem for at sætte HTML ind i DOM'en. Teksten kommer
 * over nettet, og selv om den kommer fra vores egen server, må den aldrig kunne
 * blive til markup.
 *
 * Billeder droppes: de ligger som absolutte URL'er på brandsaar.dk, og et
 * klinisk foto vi ikke selv hoster hører ikke hjemme midt i et citat. Kilden er
 * ét klik væk.
 */

function inline(text: string, keyBase: string): ReactNode[] {
  // Billed-markdown fjernes helt; link-markdown reduceres til sin tekst.
  const rent = text
    .replace(/!\[[^\]]*\]\([^)]*\)/g, "")
    .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
    // Skrabningen efterlod markdown-undvigelser: "1\." og "20 %\." Backslashen
    // hører til formatet, ikke til kilden, og må ikke stå i et klinisk citat.
    .replace(/\\([.*_[\]()#+\-!|])/g, "$1");
  const nodes: ReactNode[] = [];
  const pattern = /\*\*(.+?)\*\*|_([^_]+)_/g;
  let last = 0;
  let match: RegExpExecArray | null;
  let i = 0;

  while ((match = pattern.exec(rent)) !== null) {
    if (match.index > last) nodes.push(rent.slice(last, match.index));
    nodes.push(
      match[1] !== undefined ? (
        <strong key={`${keyBase}-b${i++}`} className="font-semibold">
          {match[1]}
        </strong>
      ) : (
        // brandsaar.dk skriver ofte _**sådan**_ — fed inde i kursiv. Stjernerne
        // ville ellers stå som tegn midt i et klinisk citat.
        <em key={`${keyBase}-i${i++}`} className="font-medium">
          {match[2].replace(/\*\*/g, "")}
        </em>
      ),
    );
    last = match.index + match[0].length;
  }
  if (last < rent.length) nodes.push(rent.slice(last));
  return nodes;
}

function erTabelLinje(line: string): boolean {
  return /^\s*\|.*\|\s*$/.test(line);
}

function celler(line: string): string[] {
  return line
    .trim()
    .replace(/^\||\|$/g, "")
    .split("|")
    .map((c) => c.trim().replace(/<br\s*\/?>/gi, " "));
}

function erSkillelinje(line: string): boolean {
  return erTabelLinje(line) && celler(line).every((c) => /^:?-{2,}:?$/.test(c));
}

export function SourceText({ text }: { text: string }) {
  const lines = text.split("\n");
  const blocks: ReactNode[] = [];
  let bullets: string[] = [];
  let tabel: string[][] = [];
  let key = 0;

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

  const flushTabel = () => {
    if (tabel.length === 0) return;
    const [hoved, ...krop] = tabel;
    // Kilderne har af og til en tom første række; så er der ingen hovedrække.
    const harHoved = hoved.some((c) => c.length > 0) && krop.length > 0;
    blocks.push(
      <div key={`t-${key++}`} className="my-3 overflow-x-auto">
        <table className="w-full min-w-[420px] border-collapse text-[13px]">
          {harHoved && (
            <thead>
              <tr>
                {hoved.map((c, i) => (
                  <th
                    key={i}
                    className="border border-[var(--line)] bg-[var(--nude-tint)] px-2.5 py-1.5 text-left font-semibold"
                  >
                    {inline(c, `th-${key}-${i}`)}
                  </th>
                ))}
              </tr>
            </thead>
          )}
          <tbody>
            {(harHoved ? krop : tabel).map((raekke, r) => (
              <tr key={r}>
                {raekke.map((c, i) => (
                  <td key={i} className="border border-[var(--line)] px-2.5 py-1.5 align-top">
                    {inline(c, `td-${key}-${r}-${i}`)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>,
    );
    tabel = [];
  };

  const flushAlt = () => {
    flushBullets();
    flushTabel();
  };

  for (const raw of lines) {
    const line = raw.trimEnd();

    if (erTabelLinje(line)) {
      flushBullets();
      if (!erSkillelinje(line)) tabel.push(celler(line));
      continue;
    }
    flushTabel();

    const bullet = /^\s*[-*•]\s+(.*)$/.exec(line);
    if (bullet) {
      bullets.push(bullet[1]);
      continue;
    }
    flushBullets();

    // Kodehegn fra skrabningen bærer intet indhold.
    if (/^\s*```/.test(line)) continue;

    const overskrift = /^#{1,6}\s+(.*)$/.exec(line);
    if (overskrift) {
      blocks.push(
        <p key={`h-${key++}`} className="mt-3 mb-1 font-semibold first:mt-0">
          {inline(overskrift[1], `h-${key}`)}
        </p>,
      );
      continue;
    }

    const citat = /^>\s?(.*)$/.exec(line);
    const brød = (citat ? citat[1] : line).replace(/!\[[^\]]*\]\([^)]*\)/g, "").trim();
    if (!brød) continue;

    blocks.push(
      citat ? (
        <p
          key={`q-${key++}`}
          className="my-2 border-l-2 border-[var(--line-strong)] pl-3 text-[var(--ink-soft)]"
        >
          {inline(brød, `q-${key}`)}
        </p>
      ) : (
        <p key={`p-${key++}`} className="my-2 first:mt-0 last:mb-0">
          {inline(brød, `p-${key}`)}
        </p>
      ),
    );
  }
  flushAlt();

  return <div className="text-[15px] leading-relaxed text-[var(--ink)]">{blocks}</div>;
}
