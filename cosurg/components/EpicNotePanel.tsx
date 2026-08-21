"use client";

import { useRef, useState } from "react";
import type { Lang } from "@/lib/tree/types";
import { tr } from "@/lib/i18n";

/**
 * Rutens kontrakt for Epic-notatet (POST /api/note med `epic: true`).
 *
 * Typen bor HER og ikke som import fra lib/corti/epicNote.ts: det er rutens
 * JSON-kontrakt med klienten, ikke serverens interne form — samme princip som
 * StreamEvent i useClinicalChat.
 */
export interface EpicNote {
  note: string;
  /** Felter udredningen kunne udfylde — sporbarheden bag hver udfyldning. */
  udfyldte: string[];
  /** Betingede blokke udeladt fordi tilstanden ikke er fundet. */
  udeladteBlokke: string[];
  /** Antal ***-felter der stadig venter på lægen. */
  aabneFelter: number;
  /**
   * Åbne felter som SPØRGSMÅL — additivt felt fra ruten. Hvert element er et
   * spørgsmål lægen kan besvare i samtalen, hvorefter et nyt notatkald
   * udfylder feltet. Mangler feltet i svaret, vises intet — panelet må
   * aldrig vælte på en bagende der endnu ikke sender det.
   */
  manglende?: Array<{ felt: string; spoergsmaal: string }>;
  /** Hvor notatteksten kom fra (fx "ai" eller "deterministisk"). Vises ikke. */
  kilde?: string;
  parkland: {
    vaegtKg: number;
    tbsaPct: number;
    totalMl: number;
    foersteOtteTimerMl: number;
    tekst: string;
    kilde: string;
  } | null;
}

interface EpicNotePanelProps {
  lang: Lang;
  epic: EpicNote | null;
  error: string | null;
  /**
   * Lægen tog fat i et manglende felt: spørgsmålet gives videre, så siden kan
   * stille skarpt på skrivefeltet — svaret skrives i samtalen, ikke i panelet.
   */
  onAnswerMissing?: (spoergsmaal: string) => void;
  /** Skriv notatet igen med det samtalen ved nu. */
  onRefresh?: () => void;
  refreshBusy?: boolean;
}

/**
 * EPIC-NOTATET — AOP-skabelonen som den skal sættes ind i Sundhedsplatformen.
 *
 * Notatet er udfyldt DETERMINISTISK af kode, og visningen skal bevare den
 * garanti: teksten står i ren monospace uden nogen form for markdown- eller
 * rich-text-rendering, så Epic-koderne (@..@, {..}) når klippebordet ordret.
 * En model der omskriver en journalskabelon kan korrumpere en Epic-kode uden
 * at nogen opdager det før den står i journalen — derfor rører hverken model
 * eller renderer teksten.
 *
 * ***-felterne fremhæves diskret: at de ER synlige er en ærligheds-feature.
 * Et *** er skabelonens egen måde at sige "det ved kun du" — ikke en mangel
 * ved appen.
 */
export function EpicNotePanel({
  lang,
  epic,
  error,
  onAnswerMissing,
  onRefresh,
  refreshBusy,
}: EpicNotePanelProps) {
  const [copied, setCopied] = useState(false);
  const copyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  if (!epic && !error) return null;

  if (!epic) {
    return (
      <section className="mt-6 rounded-2xl border border-dashed border-[var(--nude-deep)] bg-[var(--nude-tint)] px-4 py-3">
        <p className="text-sm leading-relaxed text-[var(--nude-ink)]">
          {tr("epicNoteFailed", lang)}
          {error ? ` — ${error}` : ""}
        </p>
      </section>
    );
  }

  const copy = () => {
    // Klippebordet får den RÅ tekst — ikke DOM'ens udgave af den.
    navigator.clipboard
      .writeText(epic.note)
      .then(() => {
        setCopied(true);
        if (copyTimerRef.current) clearTimeout(copyTimerRef.current);
        copyTimerRef.current = setTimeout(() => setCopied(false), 2500);
      })
      .catch(() => {
        // Klippebordet kan være spærret (usikker kontekst). Teksten står
        // lige nedenunder og kan markeres med musen — ingen fejl at råbe op.
      });
  };

  /*
   * ***-felterne fremhæves ved at splitte teksten om dem. Segmenterne er ren
   * tekst hele vejen — ingen dangerouslySetInnerHTML, ingen markdown — så
   * intet i notatet kan blive fortolket som andet end det det er.
   */
  const segments = epic.note.split("***");

  return (
    <section className="mt-6 rounded-2xl border bg-[var(--paper-raised)] p-5 shadow-[var(--shadow-raised)] sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="font-[family-name:var(--font-mono)] text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--teal-deep)]">
            {tr("epicNoteTitle", lang)}
          </p>
          <p className="mt-1 max-w-xl text-[13px] leading-relaxed text-[var(--ink-soft)]">
            {tr("epicNoteTemplate", lang)}
          </p>
        </div>
        <button
          type="button"
          onClick={copy}
          className={`rounded-lg px-4 py-2 text-sm font-semibold transition-colors ${
            copied
              ? "border border-[var(--teal)] bg-[var(--teal-tint)] text-[var(--teal-deep)]"
              : "bg-[var(--teal-deep)] text-white hover:bg-[var(--teal)]"
          }`}
        >
          {copied ? tr("epicNoteCopied", lang) : tr("epicNoteCopy", lang)}
        </button>
      </div>

      {/* Åbne felter: sagt i ord, før man læser notatet. */}
      <p className="mt-3 text-[13px] leading-relaxed text-[var(--ink-soft)]">
        {epic.aabneFelter > 0 ? (
          <>
            <span className="font-semibold text-[var(--ink)]">{epic.aabneFelter}</span>{" "}
            {tr(epic.aabneFelter === 1 ? "epicNoteOpenOne" : "epicNoteOpenMany", lang)}
          </>
        ) : (
          tr("epicNoteAllFilled", lang)
        )}
      </p>

      {/* Notatet selv: monospace, ordret, vandret rul frem for ombrydning af
          skabelonens egne linjer der er længere end kortet. */}
      <pre className="mt-3 overflow-x-auto whitespace-pre-wrap rounded-xl border border-[var(--line)] bg-[var(--paper)] p-4 font-[family-name:var(--font-mono)] text-[13px] leading-relaxed text-[var(--ink)]">
        {segments.map((seg, i) => (
          <span key={i}>
            {seg}
            {i < segments.length - 1 && (
              <span className="rounded bg-[var(--nude-tint)] px-1 font-semibold text-[var(--nude-ink)]">
                ***
              </span>
            )}
          </span>
        ))}
      </pre>

      {/* Parkland: den konkrete væskeberegning, med sin kilde — regnet i kode. */}
      {epic.parkland && (
        <div className="mt-4 rounded-xl border border-[var(--teal)] bg-[var(--teal-tint)] p-4">
          <p className="font-[family-name:var(--font-mono)] text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--teal-deep)]">
            {tr("epicNoteParkland", lang)}
          </p>
          <p className="mt-1.5 text-[15px] leading-relaxed text-[var(--ink)]">{epic.parkland.tekst}</p>
          <p className="mt-1.5 font-[family-name:var(--font-mono)] text-[11px] text-[var(--ink-faint)]">
            {epic.parkland.kilde}
          </p>
        </div>
      )}

      {/*
        Manglende felter som SPØRGSMÅL. Chips frem for en fejlliste: hvert
        klik stiller skarpt på skrivefeltet, lægen svarer i samtalen, og
        "Skriv notatet igen" udfylder felterne af det samtalen nu ved.
        Nude-tonen er bevidst: det er en driftsbesked om notatet, aldrig
        noget klinisk.
      */}
      {epic.manglende && epic.manglende.length > 0 && (
        <div className="mt-4 rounded-xl border border-[var(--line-strong)] bg-[var(--nude-tint)] p-4">
          <p className="font-[family-name:var(--font-mono)] text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--nude-ink)]">
            {tr("epicNoteMissingTitle", lang)}
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            {epic.manglende.map((m) => (
              <button
                key={m.felt}
                type="button"
                onClick={onAnswerMissing ? () => onAnswerMissing(m.spoergsmaal) : undefined}
                className="flex min-h-11 items-center rounded-lg border border-[var(--line-strong)] bg-[var(--paper)] px-3.5 py-2 text-left text-sm font-medium text-[var(--ink)] transition-colors hover:border-[var(--teal)] hover:bg-[var(--teal-tint)]"
              >
                {m.spoergsmaal}
              </button>
            ))}
          </div>
          <p className="mt-2.5 text-[13px] leading-relaxed text-[var(--ink-soft)]">
            {tr("epicNoteMissingHint", lang)}
          </p>
          {onRefresh && (
            <button
              type="button"
              onClick={onRefresh}
              disabled={refreshBusy}
              aria-busy={refreshBusy}
              className="mt-3 rounded-lg bg-[var(--teal-deep)] px-4 py-2 text-sm font-semibold text-white transition-colors enabled:hover:bg-[var(--teal)] disabled:opacity-50"
            >
              {refreshBusy ? tr("noteWorking", lang) : tr("epicNoteUpdate", lang)}
            </button>
          )}
        </div>
      )}

      {/* Udeladte blokke: at de IKKE er med, er en beslutning med en grund —
          og den skal kunne ses, ikke gættes. */}
      {epic.udeladteBlokke.length > 0 && (
        <p className="mt-3 font-[family-name:var(--font-mono)] text-[11px] leading-relaxed text-[var(--ink-faint)]">
          {tr("epicNoteOmitted", lang)}: {epic.udeladteBlokke.join(" · ")}
        </p>
      )}
    </section>
  );
}
