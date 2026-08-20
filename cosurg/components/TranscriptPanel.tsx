"use client";

import { useEffect, useRef } from "react";
import type { Lang } from "@/lib/tree/types";
import { tr } from "@/lib/i18n";
import { ZoneMark } from "./ZoneMark";
import { StatusLine } from "./ui/Working";
import { ui } from "./ui/uiText";

interface TranscriptPanelProps {
  lines: string[];
  interim: string;
  listening: boolean;
  status: string | null;
  lang: Lang;
}

/**
 * Live-transskriptet — sat som en monitor-udskrift, samme mono-stemme som
 * notat/koder.
 *
 * Panelet har FASTE mål. En monitor der vokser for hver linje ville skubbe alt
 * under sig hele vejen gennem et forløb; her er ruden lige stor fra første
 * sekund, og nye linjer ruller op indefra som på en rigtig udskrift. Det gør
 * også at "tom" og "fuld" fylder det samme — tomheden er en tilstand, ikke et
 * hul i layoutet.
 *
 * Panelet bærer desuden appens statuslinje. To ting skal kunne aflæses her
 * uden tvivl: hører appen efter, og arbejder den på noget. Statuslinjen
 * skelner selv mellem "arbejder" og "gik galt" (se `StatusLine`), så en
 * fejlbesked aldrig kan stå med en snurrende indikator ved siden af.
 */
export function TranscriptPanel({ lines, interim, listening, status, lang }: TranscriptPanelProps) {
  const recent = lines.slice(-8);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Nyeste linje skal stå nederst og være synlig — ellers er en fast ramme
  // det samme som at skjule det der lige blev sagt.
  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [lines.length, interim]);

  return (
    <div className="rounded-xl border bg-[var(--paper-raised)] p-4">
      <div className="flex items-center gap-2">
        <ZoneMark variant="listening" active={listening} size={16} />
        <p className="font-[family-name:var(--font-mono)] text-xs font-semibold uppercase tracking-[0.14em] text-[var(--ink-faint)]">
          {tr("transcript", lang)}
        </p>
      </div>

      {/* Den løbende fortolkning har sin egen faste linje. Den skifter flere
          gange i sekundet, og måtte den skubbe, ville hele sidepanelet sitre. */}
      <p className="mt-2 min-h-[1.25rem] truncate font-[family-name:var(--font-mono)] text-sm italic leading-5 text-[var(--ink-faint)]">
        {interim}
      </p>

      <div ref={scrollRef} className="mt-1 h-[5rem] overflow-y-auto sm:h-[7.25rem]">
        {recent.length > 0 ? (
          /*
            Ét `aria-live`-område for alt der bliver hørt. Skærmlæseren skal
            kunne følge samtalen — men kun de færdige linjer: den løbende
            fortolkning ovenfor ville gøre oplæsningen ubrugelig.
          */
          <ul
            aria-live="polite"
            aria-relevant="additions"
            className="space-y-1 font-[family-name:var(--font-mono)] text-sm leading-5 text-[var(--ink)]"
          >
            {recent.map((line, i) => (
              <li key={`${lines.length - recent.length + i}`} className="motion-forward">
                {line}
              </li>
            ))}
          </ul>
        ) : (
          /* Tom er ikke det samme som i stykker. Linjen siger begge veje ind. */
          <p className="text-[13px] leading-snug text-[var(--ink-soft)]">{ui("transcriptEmpty", lang)}</p>
        )}
      </div>

      {/* To linjers plads, altid. Fejlbeskederne er hele sætninger med en vej
          videre — de fylder to linjer her, og pladsen står klar til dem. */}
      <StatusLine
        status={status}
        lang={lang}
        className="mt-3 min-h-[2rem] items-start text-xs font-medium leading-4"
      />
    </div>
  );
}
