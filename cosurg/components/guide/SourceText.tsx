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
  let nummereret: Array<{ nr: string; tekst: string }> = [];
  let tabel: string[][] = [];
  /*
   * Prosa-bufferen er hele forskellen på et citat og en mur af linjer.
   *
   * Kilderne er trukket ud af PDF'er, og PDF-udtræk sætter et hårdt linjeskift
   * for enden af hver LAYOUT-linje — midt i sætninger. Renderede vi hver linje
   * som sit eget afsnit (som før), stod et VIP-uddrag som tyve enlinjes
   * afsnit. Nu samles fortløbende prosalinjer og flyder som ét afsnit; kun en
   * TOM linje — et ægte afsnitsskifte — deler dem. Det er standard
   * markdown-ombrydning, og den ændrer ombrydningen alene: hvert ord står
   * ordret som i kilden.
   */
  let prosa: string[] = [];
  let citat: string[] = [];
  let key = 0;

  const flushProsa = () => {
    if (prosa.length === 0) return;
    const samlet = prosa.join(" ");
    /*
     * VIP-instrukserne bærer deres struktur som korte kolon-linjer —
     * "Væsketerapi:", "Voksne:", "Børn:" — ikke som markdown-overskrifter.
     * Et alenestående, kort kolon-afsnit får derfor rubrik-typografi: samme
     * ord, ordret, men med den vægt kilden mente. Grænsen på længden holder
     * almindelige sætninger der tilfældigvis ender med kolon (fx før en
     * liste) ude af reglen.
     */
    const rubrik = prosa.length === 1 && samlet.length <= 60 && /:$/.test(samlet) && !/[.!?]/.test(samlet.slice(0, -1));
    blocks.push(
      rubrik ? (
        <p key={`r-${key++}`} className="mt-3 mb-1 font-semibold first:mt-0">
          {inline(samlet, `r-${key}`)}
        </p>
      ) : (
        <p key={`p-${key++}`} className="my-2 first:mt-0 last:mb-0">
          {inline(samlet, `p-${key}`)}
        </p>
      ),
    );
    prosa = [];
  };

  const flushCitat = () => {
    if (citat.length === 0) return;
    blocks.push(
      <p key={`q-${key++}`} className="my-2 border-l-2 border-[var(--line-strong)] pl-3 text-[var(--ink-soft)]">
        {inline(citat.join(" "), `q-${key}`)}
      </p>,
    );
    citat = [];
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

  /*
   * Nummererede trin renderes som listen de er. Uden dette ville
   * prosa-sammenlægningen smelte "1. Køl området" og "2. Dæk med plast"
   * sammen til én sætning — det modsatte af klinisk rækkefølge. Kildens EGNE
   * numre vises, ikke en tællers: uddraget kan starte ved punkt 3.
   */
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
    flushProsa();
    flushCitat();
    flushBullets();
    flushNummereret();
    flushTabel();
  };

  for (const raw of lines) {
    const line = raw.trimEnd();

    // Tom linje: et ÆGTE afsnitsskifte. Alt der er samlet op, afsluttes.
    if (!line.trim()) {
      flushAlt();
      continue;
    }

    if (erTabelLinje(line)) {
      flushProsa();
      flushCitat();
      flushBullets();
      flushNummereret();
      if (!erSkillelinje(line)) tabel.push(celler(line));
      continue;
    }
    flushTabel();

    const bullet = /^\s*[-*•]\s+(.*)$/.exec(line);
    if (bullet) {
      flushProsa();
      flushCitat();
      flushNummereret();
      bullets.push(bullet[1]);
      continue;
    }

    const punkt = /^\s*(\d+)[.)]\s+(.*)$/.exec(line);
    if (punkt) {
      flushProsa();
      flushCitat();
      flushBullets();
      nummereret.push({ nr: punkt[1], tekst: punkt[2] });
      continue;
    }

    flushBullets();
    flushNummereret();

    // Kodehegn fra skrabningen bærer intet indhold — men det ER en grænse.
    if (/^\s*```/.test(line)) {
      flushAlt();
      continue;
    }

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

    const citatLinje = /^>\s?(.*)$/.exec(line);
    if (citatLinje) {
      flushProsa();
      const inde = citatLinje[1].replace(/!\[[^\]]*\]\([^)]*\)/g, "").trim();
      // ">" alene er citatets eget afsnitsskifte.
      if (!inde) flushCitat();
      else citat.push(inde);
      continue;
    }
    flushCitat();

    const brød = line.replace(/!\[[^\]]*\]\([^)]*\)/g, "").trim();
    if (!brød) continue;
    prosa.push(brød);
  }
  flushAlt();

  return <div className="text-[15px] leading-relaxed text-[var(--ink)]">{blocks}</div>;
}
