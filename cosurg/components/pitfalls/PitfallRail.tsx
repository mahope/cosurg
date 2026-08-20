"use client";

import { useEffect, useRef, useState } from "react";
import type { Lang } from "@/lib/tree/types";
import { tr } from "@/lib/i18n";
import { PitfallCard } from "./PitfallCard";
import type { FaldgrubeKontekst } from "./catalog";
import type { LoestFaldgrube } from "./types";

/**
 * Faldgruber knyttet til det sted man står lige nu.
 *
 * En faldgrube der dukker op på rette tidspunkt er værd ti gange en man skal
 * huske at slå op. Skinnen tager derfor konteksten — hvilket forløb, hvilken
 * node, hvilke svar der er givet, hvilke anamnesefelter der er udfyldt — og
 * henter kun det der faktisk gælder her.
 *
 * Den er bygget til at blive kaldt OFTE: MCP-klienten cacher svarene
 * serverside, og vidensbasen er statisk, så et gentaget opslag koster intet.
 * Fejler kaldet, viser skinnen ingenting frem for en fejlbesked — den er en
 * hjælp ved siden af arbejdet, ikke arbejdet selv, og den må aldrig stjæle
 * opmærksomhed fra det kliniske indhold.
 */

interface PitfallRailProps {
  lang: Lang;
  /**
   * Hvor vi er. Enten et sted i et forløb (træ/node/svar/anamnesefelt) eller —
   * i behandlingsguiden, hvor der ikke er noget forløb — det emne der blev slået op.
   */
  kontekst: FaldgrubeKontekst & { topic?: string };
  /** Højst så mange ad gangen. Fem advarsler på én skærm er ingen advarsel. */
  limit?: number;
  /** Overskrift over skinnen. Udelades i sammenhænge der selv har en. */
  overskrift?: string;
}

export function PitfallRail({ lang, kontekst, limit = 3, overskrift }: PitfallRailProps) {
  const [faldgruber, setFaldgruber] = useState<LoestFaldgrube[]>([]);
  const [henter, setHenter] = useState(false);

  // Konteksten er et objekt og skifter identitet ved hver render. Vi ser på
  // INDHOLDET, ellers ville skinnen hente på ubestemt tid.
  const noegle = JSON.stringify({ ...kontekst, limit });
  const sidste = useRef<string>("");

  useEffect(() => {
    if (sidste.current === noegle) return;
    sidste.current = noegle;

    const ctrl = new AbortController();
    setHenter(true);
    fetch("/api/pitfalls", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: noegle,
      signal: ctrl.signal,
    })
      .then((r) => (r.ok ? r.json() : { pitfalls: [] }))
      .then((d: { pitfalls?: LoestFaldgrube[] }) => setFaldgruber(d.pitfalls ?? []))
      .catch(() => setFaldgruber([]))
      .finally(() => setHenter(false));

    return () => ctrl.abort();
  }, [noegle]);

  if (faldgruber.length === 0) {
    if (!henter || !overskrift) return null;
    return <p className="text-sm text-[var(--ink-faint)]">{tr("pitfallsLoading", lang)}</p>;
  }

  return (
    <div className="space-y-3">
      {overskrift && (
        <p className="font-[family-name:var(--font-mono)] text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--ink-faint)]">
          {overskrift}
        </p>
      )}
      {faldgruber.map((f) => (
        <PitfallCard key={f.id} faldgrube={f} lang={lang} kompakt />
      ))}
    </div>
  );
}
