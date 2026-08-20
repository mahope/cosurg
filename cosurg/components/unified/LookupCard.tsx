"use client";

import type { ChatAnswer } from "@/lib/corti/chat";
import type { Lang } from "@/lib/tree/types";
import type { Turn } from "@/components/chat/useClinicalChat";
import { AnswerCard } from "@/components/chat/AnswerCard";
import { ProgressTrail } from "@/components/chat/ProgressTrail";
import { PitfallCard } from "@/components/pitfalls/PitfallCard";
import { VisionBlock } from "./ChatThread";
import { tr } from "@/lib/i18n";
import type { GuideSvar } from "./guide";
import { GuidePanel } from "./GuidePanel";

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

/**
 * Hvad opslaget viser. De to slags svar deler kort, fordi de er ét begreb for
 * lægen: han spurgte om noget, og appen svarede. At det ene kom fra vores egen
 * vidensbase og det andet fra litteraturen er en oplysning, ikke et valg han
 * skulle have truffet først.
 */
export type LookupPayload =
  | { kind: "chat"; turn: Turn }
  | { kind: "guide"; question: string; guide: GuideSvar | null; error: string | null };

interface LookupCardProps {
  lang: Lang;
  payload: LookupPayload;
  /** Hvor forløbet står imens. Null før et forløb er valgt. */
  held: { step: number; total: number } | null;
  /** Sat når forløbet er kørt til ende — så er der intet trin at vente på. */
  heldDone?: boolean;
  speaking: boolean;
  onSpeak: (answer: ChatAnswer) => void;
  onClose: () => void;
  /** Skift til den anden slags svar på det samme spørgsmål. */
  onSwitch: () => void;
  /** Tilbud om at blive ført gennem et forløb. Vises først når svaret er der. */
  offer?: { name: string; onAccept: () => void; onDismiss: () => void } | null;
}

export function LookupCard({
  lang,
  payload,
  held,
  heldDone,
  speaking,
  onSpeak,
  onClose,
  onSwitch,
  offer,
}: LookupCardProps) {
  const question = payload.kind === "chat" ? payload.turn.question : payload.question;

  return (
    <div className="motion-forward flex h-[26rem] flex-col overflow-hidden rounded-2xl border bg-[var(--paper-raised)] shadow-[0_1px_2px_rgba(16,32,30,0.04)]">
      <header className="flex shrink-0 items-start gap-3 border-b border-[var(--line)] px-5 py-3.5 sm:px-6">
        <div className="min-w-0 flex-1">
          {/*
            Hvor svaret kommer fra, sagt HØJT.

            Appen traf et valg — vidensbasen eller litteraturen — uden at
            spørge, fordi det valg ikke er sikkerhedskritisk (se
            `looksLikeGuideTopic`). Men et valg der ikke kan ses, er ikke til at
            skelne fra et tilfælde. Mærkatet gør det synligt at der blev valgt,
            og knappen længere nede gør det muligt at vælge om.
          */}
          <p className="flex flex-wrap items-baseline gap-x-2 font-[family-name:var(--font-mono)] text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--ink-faint)]">
            <span>{tr("lookupTitle", lang)}</span>
            <span aria-hidden="true">·</span>
            <span className="text-[var(--teal)]">
              {tr(payload.kind === "guide" ? "originKnowledgeBase" : "originLiterature", lang)}
            </span>
          </p>
          <p className="mt-1 truncate text-[15px] font-medium leading-snug text-[var(--ink)]" title={question}>
            {question}
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label={tr("lookupClose", lang)}
          className="shrink-0 rounded-lg border px-2.5 py-1.5 text-[13px] font-medium text-[var(--ink-soft)] transition-colors hover:border-[var(--teal)] hover:bg-[var(--teal-tint)] hover:text-[var(--teal-deep)]"
        >
          {tr("lookupResume", lang)}
        </button>
      </header>

      <div className="flex-1 overflow-y-auto px-5 py-4 sm:px-6">
        {payload.kind === "guide" ? (
          payload.guide ? (
            <GuidePanel guide={payload.guide} lang={lang} topic={payload.question} onAskInstead={onSwitch} />
          ) : payload.error ? (
            <p className="rounded-2xl border border-dashed border-[var(--nude-deep)] bg-[var(--nude-tint)] px-4 py-3 text-sm leading-relaxed text-[var(--nude-deep)]">
              {payload.error}
            </p>
          ) : (
            <ProgressTrail progress={[{ expert: null, text: tr("guideFetching", lang) }]} lang={lang} />
          )
        ) : payload.turn.answer ? (
          <>
            {/*
              Billedobservationen står FØR svaret, fordi den kom før svaret —
              og fordi lægen skal vide hvad modellen så, før han læser hvad den
              konkluderede.
            */}
            {payload.turn.vision && <VisionBlock vision={payload.turn.vision} lang={lang} />}
            <AnswerCard
              answer={payload.turn.answer}
              lang={lang}
              speaking={speaking}
              onSpeak={() => onSpeak(payload.turn.answer!)}
            />

            {/*
              Rutens egne faldgruber for emnet, hver med sit ordrette belæg.
              De står som deres egen blok og ikke inde i svaret: de er hentet
              af os uafhængigt af hvad modellen skrev, og den forskel må ikke
              viskes ud.
            */}
            {payload.turn.pitfalls && payload.turn.pitfalls.length > 0 && (
              <section className="mt-4">
                <p className="font-[family-name:var(--font-mono)] text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--ink-faint)]">
                  {tr("answerPitfalls", lang)}
                </p>
                <div className="mt-2 space-y-2.5">
                  {payload.turn.pitfalls.map((f) => (
                    <PitfallCard key={f.id} faldgrube={f} lang={lang} kompakt />
                  ))}
                </div>
              </section>
            )}

            {/* Samme spørgsmål, anden kilde. Vi valgte litteraturen; kunne
                behandlingsguiden have svaret bedre, er der ét klik til den. */}
            <button
              type="button"
              onClick={onSwitch}
              className="mt-3 rounded-lg border border-[var(--line-strong)] bg-[var(--paper)] px-3.5 py-2 text-sm font-medium text-[var(--ink-soft)] transition-colors hover:border-[var(--teal)] hover:text-[var(--ink)]"
            >
              {tr("guideAsGuideInstead", lang)}
            </button>
            {offer && (
              <div className="mt-4 rounded-xl border border-[var(--teal)] bg-[var(--teal-tint)] p-4">
                <p className="text-[15px] font-medium leading-snug text-[var(--ink)]">
                  {tr("offerTitle", lang)}
                </p>
                <p className="mt-1 text-[13px] leading-relaxed text-[var(--ink-soft)]">{offer.name}</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={offer.onAccept}
                    className="rounded-lg bg-[var(--teal-deep)] px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-[var(--teal)]"
                  >
                    {tr("offerAccept", lang)}
                  </button>
                  <button
                    type="button"
                    onClick={offer.onDismiss}
                    className="rounded-lg border border-[var(--line-strong)] bg-[var(--paper)] px-3.5 py-2 text-sm font-medium text-[var(--ink-soft)] transition-colors hover:border-[var(--teal)]"
                  >
                    {tr("offerDismiss", lang)}
                  </button>
                </div>
              </div>
            )}
          </>
        ) : payload.turn.error ? (
          <p className="rounded-2xl border border-dashed border-[var(--nude-deep)] bg-[var(--nude-tint)] px-4 py-3 text-sm leading-relaxed text-[var(--nude-deep)]">
            {payload.turn.error}
          </p>
        ) : (
          <>
            {/* Analysen af fotoet lander ~1 s inde, længe før svaret. Den
                vises med det samme — det er den slags livstegn der gør at
                ingen tror at appen hænger. */}
            {payload.turn.vision && <VisionBlock vision={payload.turn.vision} lang={lang} />}
            <ProgressTrail progress={payload.turn.progress} lang={lang} />
          </>
        )}
      </div>

      <footer className="shrink-0 border-t border-[var(--line)] px-5 py-2.5 text-[13px] leading-relaxed text-[var(--ink-soft)] sm:px-6">
        {heldDone
          ? tr("lookupHeldDone", lang)
          : held
            ? `${tr("lookupHeldStep", lang)} ${held.step} / ${held.total}.`
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
      <p className="font-[family-name:var(--font-display)] text-xl font-semibold leading-snug tracking-tight text-[var(--ink)]">
        {tr("ambiguousTitle", lang)}
      </p>
      <p className="mt-1.5 text-sm leading-relaxed text-[var(--ink-soft)]">{tr("ambiguousBody", lang)}</p>

      <p className="mt-3 text-[15px] leading-snug text-[var(--ink)]">&ldquo;{utterance}&rdquo;</p>

      <div className="mt-4 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={onAnswer}
          className="rounded-lg bg-[var(--teal-deep)] px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-[var(--teal)]"
        >
          {tr("ambiguousAsAnswer", lang)}
        </button>
        <button
          type="button"
          onClick={onLookUp}
          className="rounded-lg border border-[var(--line-strong)] bg-[var(--paper)] px-4 py-2 text-sm font-medium text-[var(--ink)] transition-colors hover:border-[var(--teal)] hover:bg-[var(--teal-tint)]"
        >
          {tr("ambiguousAsQuestion", lang)}
        </button>
      </div>

      {reasons.length > 0 && (
        <p className="mt-4 border-t border-[var(--nude-deep)] pt-3 font-[family-name:var(--font-mono)] text-[11px] leading-relaxed text-[var(--ink-faint)]">
          {tr("ambiguousBecause", lang)}: {reasons.join(" · ")}
        </p>
      )}
    </div>
  );
}
