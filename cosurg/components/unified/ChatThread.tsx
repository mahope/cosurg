"use client";

import { useEffect, useRef, useState } from "react";
import type { ChatAnswer } from "@/lib/corti/chat";
import type { AnsweredStep, Lang } from "@/lib/tree/types";
import type {
  DispositionEvent,
  RedflagEvent,
  Turn,
  VisionResult,
  WorkupStep,
} from "@/components/chat/useClinicalChat";
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
  /**
   * Lægen svarede på udredningens spørgsmål med ét klik. Teksten sendes som
   * hans næste besked — hurtig-svaret er en genvej til at skrive, ikke en
   * anden slags handling.
   */
  onQuickReply: (text: string) => void;
  /** Tag imod journalnotat-tilbuddet. */
  onWriteNote: (treeId: string, path: AnsweredStep[]) => void;
  noteBusy: boolean;
}

export function ChatThread({
  lang,
  turns,
  guide,
  speakingTurn,
  onSpeak,
  onSwitch,
  offer,
  onQuickReply,
  onWriteNote,
  noteBusy,
}: ChatThreadProps) {
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
          /* Hurtig-svar og notat-tilbud hører kun til den SENESTE tur: en
             ældre udredning er allerede besvaret, og knapper der stadig
             kunne trykkes ville sende samtalen tilbage i tiden. */
          interactive={turn.id === lastTurnId}
          onQuickReply={onQuickReply}
          onWriteNote={onWriteNote}
          noteBusy={noteBusy}
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
  interactive,
  onQuickReply,
  onWriteNote,
  noteBusy,
}: {
  turn: Turn;
  lang: Lang;
  speaking: boolean;
  onSpeak: (answer: ChatAnswer) => void;
  isLatest: boolean;
  onSwitch: () => void;
  offer: { name: string; onAccept: () => void; onDismiss: () => void } | null;
  interactive: boolean;
  onQuickReply: (text: string) => void;
  onWriteNote: (treeId: string, path: AnsweredStep[]) => void;
  noteBusy: boolean;
}) {
  return (
    <section>
      <QuestionBubble text={turn.question} />

      <div className="mt-3">
        {/* Billedobservationen står FØR svaret: lægen skal vide hvad modellen
            så, før han læser hvad den konkluderede. Den lander ~1 s inde og
            er samtidig livstegnet mens svaret arbejder. */}
        {turn.vision && <VisionBlock vision={turn.vision} lang={lang} />}

        {/*
          Røde flag afbryder. De står ØVERST i turen — før svaret, før
          udredningens næste spørgsmål — fordi en eskalering ikke må stå
          under noget som helst. Farven er klinisk: rød når patienten kan
          tage skade, gul når behandlingen bliver forkert.
        */}
        {turn.redflags?.map((flag, i) => (
          <RedflagBlock key={i} flag={flag} lang={lang} />
        ))}

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
        ) : turn.workup || turn.disposition ? null : (
          /* Fremdriften vises kun mens der IKKE er noget bedre at vise.
             Er udredningens spørgsmål eller anbefalingen landet, er de
             svaret — og en arbejdslinje under dem ville påstå at der stadig
             mangler noget. */
          <ProgressTrail progress={turn.progress} lang={lang} />
        )}

        {/* Anbefalingen: udredningens konklusion, med de kilder den hviler på. */}
        {turn.disposition && <DispositionBlock disposition={turn.disposition} lang={lang} />}

        {/*
          Udredningens næste spørgsmål — agentens tur i samtalen.

          Det står SIDST i turen fordi det er det der venter på lægen: alt
          over det er noget han kan læse, dette er noget han skal svare på.
        */}
        {turn.workup && (
          <WorkupBlock
            step={turn.workup}
            lang={lang}
            interactive={interactive}
            onQuickReply={onQuickReply}
          />
        )}

        {/*
          Notatet er et TILBUD, ikke en handling appen tager. "Ikke nu" er
          derfor et ægte valg der bare lukker tilbuddet — journalen skrives
          aldrig fordi en samtale tilfældigvis nåede langt nok.
        */}
        {turn.noteOffer && interactive && (
          <NoteOfferBlock
            lang={lang}
            onWrite={() => onWriteNote(turn.noteOffer!.treeId, turn.noteOffer!.path)}
            busy={noteBusy}
          />
        )}
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ *
 * Udredningen
 * ------------------------------------------------------------------ */

/**
 * Udredningens næste spørgsmål.
 *
 * Det er agentens tur i en SAMTALE, ikke et felt i en formular — derfor er
 * det formet som det svar-kort en kollega ville give: spørgsmålet i fuld
 * størrelse, og svarmulighederne som diskrete genveje NÅR noden har et
 * lukket svarskema. Har den ikke det, står der intet, og lægen skriver eller
 * taler frit. Knapperne er hjælp til at svare, aldrig den eneste vej.
 *
 * Fremdriften står lavmælt og i ord ("4 af 8 afklaret"). En procentbjælke
 * ville gøre en klinisk udredning til en overførsel der skal blive færdig.
 */
function WorkupBlock({
  step,
  lang,
  interactive,
  onQuickReply,
}: {
  step: WorkupStep;
  lang: Lang;
  interactive: boolean;
  onQuickReply: (text: string) => void;
}) {
  const spørgsmål = step.question;
  if (!spørgsmål) return null;

  const muligheder = spørgsmål.options ?? [];

  return (
    <section className="mt-3 rounded-2xl border border-[var(--teal)] bg-[var(--teal-tint)] p-5 sm:p-6">
      <p className="flex flex-wrap items-baseline gap-x-2 font-[family-name:var(--font-mono)] text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--ink-faint)]">
        <span className="text-[var(--teal-deep)]">{tr("workupLabel", lang)}</span>
        <span className="normal-case tracking-normal">{step.treeName}</span>
        <span className="ml-auto normal-case tracking-normal">
          {step.progress.answered} {tr("workupOf", lang)} {step.progress.total} {tr("workupProgress", lang)}
        </span>
      </p>

      {/*
        Hvad agenten selv nåede at udfylde fra lægens beskrivelse. Kvitteringen
        er halvdelen af pointen: lægen skal kunne se AT hans ord blev brugt —
        ellers ligner en udredning der springer fem spørgsmål over, at appen
        har glemt dem.
      */}
      {step.prefilled && step.prefilled.length > 0 && (
        <p className="mt-2 text-[13px] leading-relaxed text-[var(--teal-deep)]">
          {tr("workupPrefilled", lang)}: {step.prefilled.map((s) => s.rawAnswer || s.value).join(" · ")}
        </p>
      )}

      {/* Svaret kunne ikke afgøres. Vi spørger igen med agentens egne ord om
          hvad der manglede — aldrig ved bare at gentage spørgsmålet. */}
      {step.clarification && (
        <p className="mt-2 rounded-lg border border-[var(--nude-deep)] bg-[var(--nude-tint)] px-3 py-2 text-[13px] leading-relaxed text-[var(--ink)]">
          {step.clarification}
        </p>
      )}

      <p className="mt-2 font-[family-name:var(--font-display)] text-xl font-semibold leading-snug tracking-tight text-[var(--ink)]">
        {spørgsmål.question}
        {spørgsmål.unit && <span className="ml-1.5 text-base font-normal text-[var(--ink-soft)]">({spørgsmål.unit})</span>}
      </p>

      {spørgsmål.help && (
        <p className="mt-1.5 text-[13px] leading-relaxed text-[var(--ink-soft)]">{spørgsmål.help}</p>
      )}

      {muligheder.length > 0 && interactive && (
        <>
          <div className="mt-4 flex flex-wrap gap-2">
            {muligheder.map((mulighed) => (
              <button
                key={mulighed.value}
                type="button"
                /* Lægens egne ord er det der sendes — etiketten, ikke
                   maskinværdien. Transskriptet og notatet skal læse som en
                   journal, ikke som en formular. */
                onClick={() => onQuickReply(mulighed.label)}
                className="rounded-lg border border-[var(--line-strong)] bg-[var(--paper-raised)] px-3.5 py-2 text-sm font-medium text-[var(--ink)] transition-colors hover:border-[var(--teal)] hover:bg-[var(--paper)]"
              >
                {mulighed.label}
              </button>
            ))}
          </div>
          <p className="mt-2.5 text-[13px] leading-relaxed text-[var(--ink-soft)]">
            {tr("workupAnswerHint", lang)}
          </p>
        </>
      )}
    </section>
  );
}

/**
 * Et rødt flag i tråden.
 *
 * Farven er den eneste i appen der betyder noget klinisk: rød når patienten
 * kan tage skade af at det overses, gul når behandlingen bliver forkert.
 * Derfor bærer blokken ingen anden pynt — den skal kunne aflæses på et halvt
 * sekund fra den anden side af et leje.
 */
function RedflagBlock({ flag, lang }: { flag: RedflagEvent; lang: Lang }) {
  if (!flag.message) return null;

  return (
    <section role="alert" className="motion-forward mb-3 rounded-xl border-2 border-[var(--red)] bg-[var(--red-tint)] p-4">
      <p className="font-[family-name:var(--font-mono)] text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--red)]">
        {tr("workupRedflag", lang)}
      </p>
      <p className="mt-1.5 text-[15px] font-semibold leading-relaxed text-[var(--ink)]">{flag.message}</p>
      {/* Flaget kommer fra træet, ikke fra en model — og træet har en
          afsender. Uden den ville den skarpeste besked i appen være den
          eneste uden kilde. */}
      <p className="mt-2 font-[family-name:var(--font-mono)] text-[11px] leading-relaxed text-[var(--ink-faint)]">
        {flag.source}
      </p>
    </section>
  );
}

/** Udredningens konklusion, med de kilder den hviler på. */
function DispositionBlock({ disposition, lang }: { disposition: DispositionEvent; lang: Lang }) {
  const d = disposition.disposition;
  /*
   * Rød ramme er forbeholdt den anbefaling der ikke tåler at vente.
   * "emergency" er akut overflytning; "refer" er en henvisning der skal ske,
   * men ikke i det næste minut. De to andre — behandl her, send hjem — er
   * gode nyheder og må aldrig låne alarmens farve.
   */
  const kritisk = d.severity === "emergency";

  return (
    <section
      className={`mt-3 rounded-2xl border-2 bg-[var(--paper-raised)] p-5 sm:p-6 ${
        kritisk ? "border-[var(--red)]" : "border-[var(--teal)]"
      }`}
    >
      <p className="flex flex-wrap items-baseline gap-x-2 font-[family-name:var(--font-mono)] text-[11px] font-semibold uppercase tracking-[0.14em]">
        <span className={kritisk ? "text-[var(--red)]" : "text-[var(--teal-deep)]"}>
          {tr("workupDisposition", lang)}
        </span>
        <span className="normal-case tracking-normal text-[var(--ink-faint)]">{disposition.treeName}</span>
      </p>

      <h3 className="mt-1.5 font-[family-name:var(--font-display)] text-xl font-semibold leading-snug tracking-tight text-[var(--ink)]">
        {d.title}
      </h3>
      <p className="mt-2 text-[15px] leading-relaxed text-[var(--ink)]">{d.guidance}</p>

      {/* De røde flag der sprang undervejs. De står MED anbefalingen, fordi
          det er dem der forklarer hvorfor den lyder som den gør. */}
      {disposition.redFlags.length > 0 && (
        <ul className="mt-3 space-y-1.5 rounded-lg border border-[var(--red-line)] bg-[var(--red-tint)] p-3">
          {disposition.redFlags.map((f, i) => (
            <li key={i} className="text-[13px] font-medium leading-relaxed text-[var(--ink)]">
              {f}
            </li>
          ))}
        </ul>
      )}

      {/* Kilderne står MED anbefalingen og ikke som en fodnote: hele appens
          påstand er at rådet kan spores, og en anbefaling uden afsender er
          præcis det den ikke må være. */}
      <div className="mt-4 border-t border-[var(--line)] pt-3">
        <p className="font-[family-name:var(--font-mono)] text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--ink-faint)]">
          {tr("workupDispositionSources", lang)}
        </p>
        <p className="mt-1.5 text-[13px] leading-relaxed text-[var(--ink-soft)]">{disposition.source}</p>
        {d.sources.length > 0 && (
          <ul className="mt-1.5 space-y-1">
            {d.sources.map((s, i) => (
              <li key={i} className="text-[13px] leading-relaxed text-[var(--ink-soft)]">
                {s}
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}

/** Journalnotatet tilbydes — det skrives aldrig af sig selv. */
function NoteOfferBlock({ lang, onWrite, busy }: { lang: Lang; onWrite: () => void; busy: boolean }) {
  const [afvist, setAfvist] = useState(false);
  if (afvist) return null;

  return (
    <section className="mt-3 rounded-xl border border-[var(--line-strong)] bg-[var(--paper-raised)] p-4">
      <p className="text-[15px] leading-relaxed text-[var(--ink)]">{tr("workupNoteOffer", lang)}</p>
      <div className="mt-3 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={onWrite}
          disabled={busy}
          aria-busy={busy}
          className="rounded-lg bg-[var(--teal-deep)] px-4 py-2 text-sm font-semibold text-white transition-colors enabled:hover:bg-[var(--teal)] disabled:opacity-50"
        >
          {busy ? tr("noteWorking", lang) : tr("workupNoteWrite", lang)}
        </button>
        <button
          type="button"
          onClick={() => setAfvist(true)}
          className="rounded-lg border border-[var(--line-strong)] bg-[var(--paper)] px-3.5 py-2 text-sm font-medium text-[var(--ink-soft)] transition-colors hover:border-[var(--teal)] hover:text-[var(--ink)]"
        >
          {tr("workupNoteLater", lang)}
        </button>
      </div>
    </section>
  );
}

/**
 * Billedobservationen — modellens beskrivelse af fotoet, aldrig en kilde.
 *
 * Eget mærkat, neutral flade, usikkerheden lige så tydelig som observationen,
 * og en fejlet analyse sagt med samme vægt. Eksporteret fordi alle tre flader
 * der viser chatsvar (tråden her, LookupCard i forløbet, /chat-siden) skal
 * vise NØJAGTIG samme blok — et svar må ikke være fattigere ét sted.
 */
export function VisionBlock({ vision, lang }: { vision: VisionResult; lang: Lang }) {
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
