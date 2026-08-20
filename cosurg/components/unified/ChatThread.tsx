"use client";

import { useEffect, useRef } from "react";
import type { ChatAnswer } from "@/lib/corti/chat";
import type { Lang } from "@/lib/tree/types";
import type { Turn, VisionResult } from "@/components/chat/useClinicalChat";
import { AnswerCard } from "@/components/chat/AnswerCard";
import { ProgressTrail } from "@/components/chat/ProgressTrail";
import { PitfallCard } from "@/components/pitfalls/PitfallCard";
import { tr } from "@/lib/i18n";
import type { GuideSvar } from "./guide";
import { GuidePanel } from "./GuidePanel";

/**
 * SAMTALEN — forsiden efter det første spørgsmål.
 *
 * Når lægen har sendt noget, viger indgangsskærmen for én samlet tråd:
 * spørgsmål, billedobservationer, svar, faldgruber og behandlingsopslag står
 * under hinanden i den rækkefølge de skete, og næste spørgsmål skrives i
 * komposeren nederst. Det er et arbejdsrum, ikke en søgeboks med ét resultat.
 *
 * Tråden har INGEN fast højde og ingen indre rullebjælke. Det er siden der
 * vokser og siden der ruller — svaret skal stå i fuldt format, ikke kigge op
 * af en boks. (Opslag MIDT i et forløb beholder den faste boks i LookupCard:
 * dér er pointen den omvendte — svaret må ikke skubbe spørgsmålet væk.)
 */

export interface GuideEntry {
  question: string;
  guide: GuideSvar | null;
  error: string | null;
}

interface ChatThreadProps {
  lang: Lang;
  turns: Turn[];
  /** Behandlingsopslaget. Højst ét ad gangen, og altid det seneste ærinde. */
  guide: GuideEntry | null;
  speakingTurn: string | null;
  onSpeak: (answer: ChatAnswer, turnId: string) => void;
  /** Skift kilde for det seneste opslag (litteratur ↔ vidensbase). */
  onSwitch: () => void;
  /** Tilbud om at blive ført gennem et forløb. Vises ved det seneste svar. */
  offer: { name: string; onAccept: () => void; onDismiss: () => void } | null;
}

export function ChatThread({ lang, turns, guide, speakingTurn, onSpeak, onSwitch, offer }: ChatThreadProps) {
  /*
   * Nyt indhold skal kunne ses uden at lægen selv skal rulle efter det.
   * Sentinel-elementet i bunden følges når der kommer en ny tur eller et
   * guide-opslag — men kun da: at rulle ved hver fremdriftslinje ville
   * rykke skærmen mens man læser det forrige svar.
   */
  const endRef = useRef<HTMLDivElement>(null);
  const seenRef = useRef(0);
  const entryCount = turns.length + (guide ? 1 : 0);
  useEffect(() => {
    if (entryCount > seenRef.current) {
      endRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }
    seenRef.current = entryCount;
  }, [entryCount]);

  const lastTurnId = turns.length > 0 ? turns[turns.length - 1].id : null;

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      {turns.map((turn) => (
        <TurnEntry
          key={turn.id}
          turn={turn}
          lang={lang}
          speaking={speakingTurn === turn.id}
          onSpeak={(answer) => onSpeak(answer, turn.id)}
          /* Kildeskiftet og forløbstilbuddet hører kun til det SENESTE svar —
             et ældre svar er læst og afgjort, og en knap der skiftede kilden
             på det ville i virkeligheden stille spørgsmålet forfra. */
          isLatest={!guide && turn.id === lastTurnId}
          onSwitch={onSwitch}
          offer={!guide && turn.id === lastTurnId ? offer : null}
        />
      ))}

      {guide && (
        <section>
          <QuestionBubble text={guide.question} />
          <p className="mt-3 font-[family-name:var(--font-mono)] text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--ink-faint)]">
            {tr("lookupTitle", lang)} · <span className="text-[var(--teal)]">{tr("originKnowledgeBase", lang)}</span>
          </p>
          <div className="mt-2">
            {guide.guide ? (
              <div className="rounded-2xl border bg-[var(--paper-raised)] p-5 shadow-[0_1px_2px_rgba(16,32,30,0.04)] sm:p-6">
                <GuidePanel guide={guide.guide} lang={lang} topic={guide.question} onAskInstead={onSwitch} />
              </div>
            ) : guide.error ? (
              <p className="rounded-2xl border border-dashed border-[var(--nude-deep)] bg-[var(--nude-tint)] px-4 py-3 text-sm leading-relaxed text-[var(--nude-deep)]">
                {guide.error}
              </p>
            ) : (
              <ProgressTrail progress={[{ expert: null, text: tr("guideFetching", lang) }]} lang={lang} />
            )}
          </div>
        </section>
      )}

      <div ref={endRef} aria-hidden="true" />
    </div>
  );
}

/** Lægens egne ord: højrestillet boble, så tråden kan aflæses uden mærkater. */
function QuestionBubble({ text }: { text: string }) {
  return (
    <div className="flex justify-end">
      <p className="max-w-[85%] rounded-2xl rounded-br-md bg-[var(--teal-deep)] px-4 py-2.5 text-[15px] leading-relaxed text-white">
        {text}
      </p>
    </div>
  );
}

function TurnEntry({
  turn,
  lang,
  speaking,
  onSpeak,
  isLatest,
  onSwitch,
  offer,
}: {
  turn: Turn;
  lang: Lang;
  speaking: boolean;
  onSpeak: (answer: ChatAnswer) => void;
  isLatest: boolean;
  onSwitch: () => void;
  offer: { name: string; onAccept: () => void; onDismiss: () => void } | null;
}) {
  return (
    <section>
      <QuestionBubble text={turn.question} />

      <div className="mt-3">
        {/* Billedobservationen står FØR svaret: lægen skal vide hvad modellen
            så, før han læser hvad den konkluderede. Den lander ~1 s inde og
            er samtidig livstegnet mens svaret arbejder. */}
        {turn.vision && <VisionBlock vision={turn.vision} lang={lang} />}

        {turn.answer ? (
          <>
            <p className="mb-2 font-[family-name:var(--font-mono)] text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--ink-faint)]">
              {tr("lookupTitle", lang)} · <span className="text-[var(--teal)]">{tr("originLiterature", lang)}</span>
            </p>
            <AnswerCard answer={turn.answer} lang={lang} speaking={speaking} onSpeak={() => onSpeak(turn.answer!)} />

            {/* Rutens egne faldgruber, hver med ordret belæg — hentet af os,
                uafhængigt af hvad modellen skrev. Den forskel må ikke viskes ud. */}
            {turn.pitfalls && turn.pitfalls.length > 0 && (
              <div className="mt-4">
                <p className="font-[family-name:var(--font-mono)] text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--ink-faint)]">
                  {tr("answerPitfalls", lang)}
                </p>
                <div className="mt-2 space-y-2.5">
                  {turn.pitfalls.map((f) => (
                    <PitfallCard key={f.id} faldgrube={f} lang={lang} kompakt />
                  ))}
                </div>
              </div>
            )}

            {isLatest && (
              <button
                type="button"
                onClick={onSwitch}
                className="mt-3 rounded-lg border border-[var(--line-strong)] bg-[var(--paper-raised)] px-3.5 py-2 text-sm font-medium text-[var(--ink-soft)] transition-colors hover:border-[var(--teal)] hover:text-[var(--ink)]"
              >
                {tr("guideAsGuideInstead", lang)}
              </button>
            )}

            {offer && (
              <div className="mt-4 rounded-xl border border-[var(--teal)] bg-[var(--teal-tint)] p-4">
                <p className="text-[15px] font-medium leading-snug text-[var(--ink)]">{tr("offerTitle", lang)}</p>
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
        ) : turn.error ? (
          <p className="rounded-2xl border border-dashed border-[var(--nude-deep)] bg-[var(--nude-tint)] px-4 py-3 text-sm leading-relaxed text-[var(--nude-deep)]">
            {turn.error}
          </p>
        ) : (
          <ProgressTrail progress={turn.progress} lang={lang} />
        )}
      </div>
    </section>
  );
}

/**
 * Billedobservationen — modellens beskrivelse af fotoet, aldrig en kilde.
 * Samme regler som i LookupCard: eget mærkat, neutral flade, usikkerheden
 * lige så tydelig som observationen, og en fejlet analyse sagt med samme vægt.
 */
function VisionBlock({ vision, lang }: { vision: VisionResult; lang: Lang }) {
  return (
    <section className="mb-4 rounded-xl border border-[var(--line-strong)] bg-[var(--paper)] p-4">
      <p className="font-[family-name:var(--font-mono)] text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--ink-faint)]">
        {tr(vision.ok ? "visionLabel" : "visionFailedLabel", lang)}
      </p>
      {vision.ok ? (
        <>
          <p className="mt-2 text-sm leading-relaxed text-[var(--ink)]">{vision.observations.observations}</p>
          <p className="mt-2.5 text-sm leading-relaxed text-[var(--ink-soft)]">
            <span className="font-semibold">{tr("visionUncertainty", lang)}:</span>{" "}
            {vision.observations.uncertainty}
          </p>
          {vision.observations.qualityIssues && (
            <p className="mt-1.5 text-[13px] leading-relaxed text-[var(--ink-faint)]">
              {tr("visionQuality", lang)}: {vision.observations.qualityIssues}
            </p>
          )}
        </>
      ) : (
        <p className="mt-2 text-sm leading-relaxed text-[var(--ink-soft)]">{vision.message}</p>
      )}
    </section>
  );
}
