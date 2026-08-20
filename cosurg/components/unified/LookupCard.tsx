"use client";

import type { ChatAnswer } from "@/lib/corti/chat";
import type { Lang } from "@/lib/tree/types";
import type { Turn } from "@/components/chat/useClinicalChat";
import { AnswerCard } from "@/components/chat/AnswerCard";
import { ProgressTrail } from "@/components/chat/ProgressTrail";
import { tr } from "@/lib/i18n";
import { ut } from "./text";

/**
 * Opslaget — svaret på et spørgsmål stillet MIDT i et forløb.
 *
 * Tre ting er afgjort her, og de hænger sammen:
 *
 * 1. Kortet står UNDER det aktive spørgsmål, aldrig i stedet for det. Lægen
 *    skal kunne se på én skærm at forløbet er intakt mens han læser svaret. Vi
 *    gemmer altså ikke spørgsmålet væk og henter det frem igen — det bliver
 *    aldrig fjernet, og derfor kan der heller ikke gå noget tabt.
 *
 * 2. Kortet har FAST højde. Et opslag varer målt 35-70 sekunder, og undervejs
 *    skifter indholdet fra fremdrift til svar til kilder. Voksede kortet med
 *    indholdet, ville hele siden rykke sig under hænderne på nogen der læser.
 *    Pladsen reserveres derfor, og det er svaret der ruller — ikke skærmen.
 *
 * 3. Linjen der siger hvor forløbet står er ikke pynt. Den er hele grunden til
 *    at lægen tør spørge midt i en vurdering: han kan se at han ikke mister
 *    sin plads ved at gøre det.
 */

interface LookupCardProps {
  lang: Lang;
  turn: Turn;
  /** Hvor forløbet står imens. Null før et forløb er valgt. */
  held: { step: number; total: number } | null;
  /** Sat når forløbet er kørt til ende — så er der intet trin at vente på. */
  heldDone?: boolean;
  speaking: boolean;
  onSpeak: (answer: ChatAnswer) => void;
  onClose: () => void;
  /** Tilbud om at blive ført gennem et forløb. Vises først når svaret er der. */
  offer?: { name: string; onAccept: () => void; onDismiss: () => void } | null;
}

export function LookupCard({
  lang,
  turn,
  held,
  heldDone,
  speaking,
  onSpeak,
  onClose,
  offer,
}: LookupCardProps) {
  return (
    <div className="motion-forward flex h-[26rem] flex-col overflow-hidden rounded-2xl border bg-[var(--paper-raised)] shadow-[0_1px_2px_rgba(16,32,30,0.04)]">
      <header className="flex shrink-0 items-start gap-3 border-b border-[var(--line)] px-5 py-3.5 sm:px-6">
        <div className="min-w-0 flex-1">
          <p className="font-[family-name:var(--font-mono)] text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--ink-faint)]">
            {ut("lookupTitle", lang)}
          </p>
          <p className="mt-1 truncate text-[15px] font-medium leading-snug text-[var(--ink)]" title={turn.question}>
            {turn.question}
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label={ut("lookupClose", lang)}
          className="shrink-0 rounded-lg border px-2.5 py-1.5 text-[12.5px] font-medium text-[var(--ink-soft)] transition-colors hover:border-[var(--teal)] hover:bg-[var(--teal-tint)] hover:text-[var(--teal-deep)]"
        >
          {ut("lookupResume", lang)}
        </button>
      </header>

      <div className="flex-1 overflow-y-auto px-5 py-4 sm:px-6">
        {turn.answer ? (
          <>
            <AnswerCard
              answer={turn.answer}
              lang={lang}
              speaking={speaking}
              onSpeak={() => onSpeak(turn.answer!)}
            />
            {offer && (
              <div className="mt-4 rounded-xl border border-[var(--teal)] bg-[var(--teal-tint)] p-4">
                <p className="text-[14.5px] font-medium leading-snug text-[var(--ink)]">
                  {ut("offerTitle", lang)}
                </p>
                <p className="mt-1 text-[13px] leading-relaxed text-[var(--ink-soft)]">{offer.name}</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={offer.onAccept}
                    className="rounded-lg bg-[var(--teal-deep)] px-3.5 py-2 text-[13.5px] font-semibold text-white transition-colors hover:bg-[var(--teal)]"
                  >
                    {ut("offerAccept", lang)}
                  </button>
                  <button
                    type="button"
                    onClick={offer.onDismiss}
                    className="rounded-lg border border-[var(--line-strong)] bg-[var(--paper)] px-3.5 py-2 text-[13.5px] font-medium text-[var(--ink-soft)] transition-colors hover:border-[var(--teal)]"
                  >
                    {ut("offerDismiss", lang)}
                  </button>
                </div>
              </div>
            )}
          </>
        ) : turn.error ? (
          <p className="rounded-2xl border border-dashed border-[var(--nude-deep)] bg-[var(--nude-tint)] px-4 py-3 text-[14px] leading-relaxed text-[var(--nude-deep)]">
            {turn.error}
          </p>
        ) : (
          <ProgressTrail progress={turn.progress} lang={lang} />
        )}
      </div>

      <footer className="shrink-0 border-t border-[var(--line)] px-5 py-2.5 text-[12.5px] leading-relaxed text-[var(--ink-soft)] sm:px-6">
        {heldDone
          ? ut("lookupHeldDone", lang)
          : held
            ? `${ut("lookupHeldStep", lang)} ${held.step} / ${held.total}.`
            : tr("chatDisclaimer", lang)}
      </footer>
    </div>
  );
}

interface IntentChoiceCardProps {
  lang: Lang;
  utterance: string;
  /** Hvad i ytringen der gjorde den tvetydig. Vi viser vores arbejde. */
  reasons: string[];
  onAnswer: () => void;
  onLookUp: () => void;
}

/**
 * Vi kunne ikke afgøre om ytringen var et svar eller et spørgsmål — så spørger
 * vi. Det er den samme regel som i træmotoren og i forløbsgenkendelsen: et gæt
 * der ligner et svar er værre end intet svar, fordi det ikke kan ses bagefter
 * at der blev gættet.
 *
 * Kortet viser HVORFOR vi er i tvivl. Det er ikke for at være grundig — det er
 * fordi lægen skal kunne se at appen ikke bare er usikker på må og få, og fordi
 * han så ved præcis hvad han skal omformulere hvis han vil undgå spørgsmålet
 * næste gang.
 */
export function IntentChoiceCard({ lang, utterance, reasons, onAnswer, onLookUp }: IntentChoiceCardProps) {
  return (
    <div
      role="status"
      aria-live="polite"
      className="motion-forward rounded-2xl border border-[var(--nude-deep)] bg-[var(--nude-tint)] p-5 sm:p-6"
    >
      <p className="font-[family-name:var(--font-display)] text-[19px] font-semibold leading-snug tracking-tight text-[var(--ink)]">
        {ut("ambiguousTitle", lang)}
      </p>
      <p className="mt-1.5 text-[14px] leading-relaxed text-[var(--ink-soft)]">{ut("ambiguousBody", lang)}</p>

      <p className="mt-3 text-[15px] leading-snug text-[var(--ink)]">&ldquo;{utterance}&rdquo;</p>

      <div className="mt-4 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={onAnswer}
          className="rounded-lg bg-[var(--teal-deep)] px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-[var(--teal)]"
        >
          {ut("ambiguousAsAnswer", lang)}
        </button>
        <button
          type="button"
          onClick={onLookUp}
          className="rounded-lg border border-[var(--line-strong)] bg-[var(--paper)] px-4 py-2 text-sm font-medium text-[var(--ink)] transition-colors hover:border-[var(--teal)] hover:bg-[var(--teal-tint)]"
        >
          {ut("ambiguousAsQuestion", lang)}
        </button>
      </div>

      {reasons.length > 0 && (
        <p className="mt-4 border-t border-[var(--nude-deep)] pt-3 font-[family-name:var(--font-mono)] text-[11px] leading-relaxed tracking-[0.02em] text-[var(--ink-faint)]">
          {ut("ambiguousBecause", lang)}: {reasons.join(" · ")}
        </p>
      )}
    </div>
  );
}
