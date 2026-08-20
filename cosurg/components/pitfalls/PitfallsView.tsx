"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { Lang } from "@/lib/tree/types";
import { tr } from "@/lib/i18n";
import { ToolShell } from "@/components/guide/ToolShell";
import { PitfallCard } from "./PitfallCard";
import { FASE_LABEL, FASE_ORDEN, type Fase } from "./catalog";
import type { LoestFaldgrube } from "./types";

/**
 * Hele faldgrubekataloget, ordnet efter hvor i forløbet man møder dem.
 *
 * Siden er reserven, ikke hovedvejen. Faldgruber gør mest gavn dér hvor de er
 * relevante — ved siden af det afsnit man læser i behandlingsguiden, ved siden
 * af det felt man udfylder i anamnesen. Her kan man læse dem igennem på forhånd
 * eller slå efter bagefter, og det er en anden slags brug.
 */

export function PitfallsView() {
  const [lang, setLang] = useState<Lang>("da");
  const [faldgruber, setFaldgruber] = useState<LoestFaldgrube[]>([]);
  const [henter, setHenter] = useState(true);
  const [fejl, setFejl] = useState(false);

  useEffect(() => {
    const ctrl = new AbortController();
    fetch("/api/pitfalls", { signal: ctrl.signal })
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error("pitfalls"))))
      .then((d: { pitfalls?: LoestFaldgrube[] }) => setFaldgruber(d.pitfalls ?? []))
      .catch((err) => {
        if ((err as Error).name !== "AbortError") setFejl(true);
      })
      .finally(() => setHenter(false));
    return () => ctrl.abort();
  }, []);

  const iFase = (f: Fase) => faldgruber.filter((p) => p.fase === f);

  return (
    <ToolShell
      active="pitfalls"
      lang={lang}
      onToggleLang={() => setLang((l) => (l === "da" ? "en" : "da"))}
      title={tr("pitfallsTitle", lang)}
      tagline={tr("pitfallsTagline", lang)}
    >
      <p className="mb-6 max-w-2xl text-sm leading-relaxed text-[var(--ink-soft)]">
        {tr("pitfallsOurWording", lang)} {tr("sourceFrom", lang)}
      </p>

      {henter && (
        <p className="font-[family-name:var(--font-mono)] text-sm text-[var(--ink-soft)]">
          {tr("pitfallsLoading", lang)}
        </p>
      )}

      {fejl && (
        <p
          role="status"
          className="rounded-lg border border-[var(--nude-deep)] bg-[var(--nude-tint)] px-4 py-3 text-sm font-medium text-[var(--ink)]"
        >
          {tr("sourceLookupFailed", lang)}
        </p>
      )}

      <div className="space-y-10">
        {FASE_ORDEN.map((fase) => {
          const gruppe = iFase(fase);
          if (gruppe.length === 0) return null;
          return (
            <section key={fase}>
              <h2 className="mb-3 border-b border-[var(--line-strong)] pb-2 font-[family-name:var(--font-display)] text-lg font-semibold tracking-tight text-[var(--teal-deep)]">
                {FASE_LABEL[fase][lang]}
              </h2>
              <div className="grid gap-3 lg:grid-cols-2">
                {gruppe.map((p) => (
                  <PitfallCard key={p.id} faldgrube={p} lang={lang} kompakt />
                ))}
              </div>
            </section>
          );
        })}
      </div>

      {!henter && faldgruber.length > 0 && (
        <div className="mt-10 flex flex-wrap gap-2 border-t border-[var(--line)] pt-5">
          <Link
            href="/guide"
            className="rounded-lg border px-3.5 py-2 text-sm font-medium text-[var(--ink)] transition-colors hover:border-[var(--teal)] hover:bg-[var(--teal-tint)]"
          >
            {tr("toolGuide", lang)} →
          </Link>
          <Link
            href="/interview"
            className="rounded-lg border px-3.5 py-2 text-sm font-medium text-[var(--ink)] transition-colors hover:border-[var(--teal)] hover:bg-[var(--teal-tint)]"
          >
            {tr("toolInterview", lang)} →
          </Link>
        </div>
      )}
    </ToolShell>
  );
}
