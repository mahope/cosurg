import type { ReactNode } from "react";
import { t } from "@/lib/i18n";

/**
 * Låser et elements bredde til den længste tekst det NOGENSINDE kan indeholde.
 *
 * Problemet: dansk er længere end engelsk, og en knap der skifter fra "Speech
 * off" til "Oplæsning fra" bliver bredere — hvorpå naboknapperne rykker. Det
 * samme sker når en knap skifter tilstand ("Diktér tillæg" → "Stop diktering").
 * En læge under tidspres genkender knapper på deres PLADS; flytter de sig,
 * koster det et blik.
 *
 * Løsningen er ikke en gættet minimumsbredde, men målt plads: alle mulige
 * tekster lægges oven på hinanden i samme grid-celle, hvor kun én er synlig.
 * Cellen bliver derfor lige så bred som den længste variant — på begge sprog,
 * i alle tilstande — og bredden ændrer sig aldrig. De skjulte varianter er
 * `visibility: hidden` (ikke `display: none`), for de skal netop fylde, og de
 * er `aria-hidden` så skærmlæseren kun hører den rigtige.
 */
export function SizeLock({
  variants,
  children,
  className = "",
  align = "center",
  wrap = false,
}: {
  /** Alle tekster feltet kan komme til at vise — begge sprog, alle tilstande. */
  variants: string[];
  children: ReactNode;
  className?: string;
  align?: "center" | "left" | "right";
  /**
   * Lad teksten bryde når den ikke kan være der.
   *
   * `whitespace-nowrap` er rigtigt for appens EGNE knaptekster: de er korte,
   * kendte, og en knap der ombrød ville skifte højde. Men indhold fra JSON —
   * forløbsnavne, svarmuligheder i et beslutningstræ — kan være vilkårligt
   * langt, og på 360 px ville en ubrydelig knap skubbe hele siden ud over
   * kanten. Med `wrap` bliver låsen en HØJDE-lås i stedet: begge sprog
   * ombrydes i samme celle, cellen får den højeste af dem, og rækken står
   * stadig stille ved sprogskift — den bliver bare aldrig bredere end skærmen.
   */
  wrap?: boolean;
}) {
  const justify = align === "left" ? "justify-start" : align === "right" ? "justify-end" : "justify-center";
  const flow = wrap ? "whitespace-normal text-balance" : "whitespace-nowrap";
  return (
    <span className={`grid ${wrap ? "max-w-full" : ""} ${className}`}>
      {variants.map((v, i) => (
        <span
          key={i}
          aria-hidden="true"
          className={`invisible col-start-1 row-start-1 flex ${justify} ${flow}`}
        >
          {v}
        </span>
      ))}
      <span className={`col-start-1 row-start-1 flex ${justify} ${flow}`}>{children}</span>
    </span>
  );
}

/**
 * Alle sprogversioner af en håndfuld nøgler — det SizeLock skal måle på.
 * Nøglerne slås op i begge ordbøger, så en tekst kan flytte mellem dem uden at
 * bredden går i stykker.
 */
export function widestOf(...keys: Array<keyof typeof t | keyof typeof t>): string[] {
  const out: string[] = [];
  for (const k of keys) {
    const entry =
      (t as Record<string, { da: string; en: string } | undefined>)[k as string] ??
      (t as Record<string, { da: string; en: string } | undefined>)[k as string];
    if (entry) out.push(entry.da, entry.en);
  }
  return out;
}
