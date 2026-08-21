"use client";

import { useEffect, useRef, useState } from "react";
import type { ChatAnswer } from "@/lib/corti/chat";
import type { AnsweredStep, DecisionTree, Lang } from "@/lib/tree/types";
import type {
  DispositionEvent,
  RedflagEvent,
  Turn,
  VisionResult,
  WorkupStep,
} from "@/components/chat/useClinicalChat";
import { AnswerCard } from "@/components/chat/AnswerCard";
import { ProgressTrail } from "@/components/chat/ProgressTrail";
import { EscalationPanel } from "@/components/escalation/EscalationPanel";
import { PitfallCard } from "@/components/pitfalls/PitfallCard";
import { followUpTreeId } from "@/components/treeRouting";
import { tr } from "@/lib/i18n";
import type { GuideSvar } from "./guide";
import { GuidePanel } from "./GuidePanel";
import { ProcedureSteps } from "./ProcedureSteps";

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
  /** Proceduren vist i fuld længde — alle trin med fotos. */
  procedure: { question: string; tree: DecisionTree } | null;
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
  /** Tag imod tilbuddet om at få forbindingsproceduren vist. */
  onShowProcedure: () => void;
}

export function ChatThread({
  lang,
  turns,
  guide,
  procedure,
  speakingTurn,
  onSpeak,
  onSwitch,
  offer,
  onQuickReply,
  onWriteNote,
  noteBusy,
  onShowProcedure,
}: ChatThreadProps) {
  /*
   * Nyt indhold skal kunne ses uden at lægen selv skal rulle efter det.
   * Sentinel-elementet i bunden følges når der kommer en ny tur eller et
   * guide-opslag — men kun da: at rulle ved hver fremdriftslinje ville
   * rykke skærmen mens man læser det forrige svar.
   */
  const endRef = useRef<HTMLDivElement>(null);
  const seenRef = useRef(0);
  const entryCount = turns.length + (guide ? 1 : 0) + (procedure ? 1 : 0);
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
          onShowProcedure={onShowProcedure}
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
              <div className="rounded-2xl border bg-[var(--paper-raised)] p-5 shadow-[var(--shadow-raised)] sm:p-6">
                <GuidePanel guide={guide.guide} lang={lang} topic={guide.question} onAskInstead={onSwitch} />
              </div>
            ) : guide.error ? (
              <p className="rounded-2xl border border-dashed border-[var(--nude-deep)] bg-[var(--nude-tint)] px-4 py-3 text-sm leading-relaxed text-[var(--nude-ink)]">
                {guide.error}
              </p>
            ) : (
              <ProgressTrail progress={[{ expert: null, text: tr("guideFetching", lang) }]} lang={lang} />
            )}
          </div>
        </section>
      )}

      {/*
        Proceduren. Den står nederst fordi den altid er det seneste ærinde:
        lægen bad om at få den vist, og en anmodning afløser den forrige.
      */}
      {procedure && (
        <section>
          <QuestionBubble text={procedure.question} />
          <div className="mt-3">
            <ProcedureSteps tree={procedure.tree} lang={lang} />
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
  onShowProcedure,
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
  onShowProcedure: () => void;
}) {
  /*
   * Den sti gennemløbet FAKTISK gik. Den afgør hvilke handlingstrin der gælder
   * denne patient — og hvilken værdi et rødt flag sprang på, så flagets eget
   * opslag kan findes. Anbefalingens sti vinder: er den kommet, er den den
   * fuldstændige.
   */
  const sti = turn.disposition?.path ?? turn.workup?.path ?? [];

  /* Uddybningen sendes som lægens næste besked — samme vej ind som hvis han
     havde skrevet den selv. Kun på den seneste tur: en ældre eskalation er
     læst og afgjort. */
  const uddyb = interactive ? onQuickReply : undefined;

  return (
    <section>
      <QuestionBubble text={turn.question} />

      {/* Tråden havde ligget stille (eller er genoptaget fra historikken), og
          agenten fik et resumé med. Det skal SIGES — ellers ligner et svar
          der kender historikken, at appen gætter. Samme linje som /chat. */}
      {turn.restored && (
        <p className="mt-2 text-center font-[family-name:var(--font-mono)] text-[11px] uppercase tracking-[0.14em] text-[var(--ink-faint)]">
          {tr("chatRestored", lang)}
        </p>
      )}

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
          <RedflagBlock
            key={i}
            flag={flag}
            lang={lang}
            /* Værdien flaget sprang på — så det er FLAGETS eget opslag der
               tilbydes, ikke nodens første. */
            value={sti.find((s) => s.nodeId === flag.nodeId)?.value}
            onElaborate={uddyb}
          />
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
                    <div key={f.id}>
                      <PitfallCard faldgrube={f} lang={lang} kompakt />
                      {/*
                        Uddybningen står under den faldgrube den handler om, og
                        spørgsmålet formuleres FOR lægen ud af faldgrubens egen
                        overskrift. Han skal ikke først finde på et spørgsmål
                        om noget systemet lige har sagt til ham.
                      */}
                      {uddyb && (
                        <button
                          type="button"
                          onClick={() => uddyb(`${tr("elaboratePitfall", lang)}: ${f.title[lang]}?`)}
                          className="mt-1.5 flex min-h-11 w-full items-center justify-between gap-3 rounded-lg border border-[var(--line-strong)] bg-[var(--paper-raised)] px-3.5 py-2 text-left text-sm font-medium text-[var(--ink-soft)] transition-colors hover:border-[var(--teal)] hover:text-[var(--ink)]"
                        >
                          <span>{tr("elaborateFromSources", lang)}</span>
                          <span aria-hidden="true" className="shrink-0 text-[var(--teal-deep)]">
                            →
                          </span>
                        </button>
                      )}
                    </div>
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
          <p className="rounded-2xl border border-dashed border-[var(--nude-deep)] bg-[var(--nude-tint)] px-4 py-3 text-sm leading-relaxed text-[var(--nude-ink)]">
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
        {turn.disposition && (
          <DispositionBlock
            disposition={turn.disposition}
            lang={lang}
            /*
              Ambulant behandlet brandsår skal forbindes. Proceduren tilbydes
              derfor dér hvor anbefalingen står — som ét klik, og kun når
              træet selv siger at den følger efter. Det er et TILBUD; intet
              skifter af sig selv.
            */
            onShowProcedure={
              interactive && followUpTreeId(turn.disposition.treeId, turn.disposition.disposition.dispositionId)
                ? onShowProcedure
                : undefined
            }
            onElaborate={uddyb}
          />
        )}

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

  /*
   * Lægens EGNE ord, ikke maskinværdierne. "hele hånden" siger noget; "hand"
   * er vores interne etiket, og at vise den ville få kvitteringen til at
   * ligne en fejl ("sagde jeg hand?"). Dubletter fjernes: det samme fund kan
   * stå både som brugt og som ventende hen over to ture.
   */
  const fangedeOrd = [
    ...(step.prefilled ?? []).map((s) => s.rawAnswer || s.value),
    ...(step.pending ?? []).map((s) => s.quote || s.value),
  ]
    .map((s) => s.trim())
    .filter(Boolean)
    .filter((s, i, alle) => alle.indexOf(s) === i);

  if (!spørgsmål) return null;

  const muligheder = spørgsmål.options ?? [];

  return (
    /*
      Udredningskortet var en fyldt teal flade — og dermed den største tonede
      kasse i hele arbejdsvisningen, netop dér hvor lægen kigger mest. Det er
      papir nu, som alle andre kort: hårfin kant plus --shadow-raised. At det
      er agentens udredningstur og ikke et almindeligt svar, siges af en teal
      venstrekant — samme greb som et citat i en publikation.

      Kanten er en INDVENDIG skygge og ikke en tykkere `border-l`: en skygge
      fylder ingenting i layoutet, så kortets mål og indrykning er præcis som
      før og intet flytter sig.
    */
    <section className="mt-3 rounded-2xl border bg-[var(--paper-raised)] p-5 [box-shadow:inset_3px_0_0_0_var(--teal),var(--shadow-raised)] sm:p-6">
      <p className="flex flex-wrap items-baseline gap-x-2 font-[family-name:var(--font-mono)] text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--ink-faint)]">
        <span className="text-[var(--teal-deep)]">{tr("workupLabel", lang)}</span>
        <span className="normal-case tracking-normal">{step.treeName}</span>
        <span className="ml-auto normal-case tracking-normal">
          {step.progress.answered} {tr("workupOf", lang)} {step.progress.total} {tr("workupProgress", lang)}
        </span>
      </p>

      {/*
        Hvad agenten fangede i lægens egne ord. Kvitteringen er halvdelen af
        pointen: han skal kunne se AT der blev lyttet — ellers ligner en
        udredning der springer fem spørgsmål over, at appen har glemt dem.

        `prefilled` og `pending` vises SAMLET med vilje. Internt er de vidt
        forskellige — det ene er brugt nu, det andet venter på at gennemløbet
        når frem — men for lægen er de det samme: "det fangede jeg". Skelnede
        vi, ville vi bede ham forstå vores motor. Sagde vi kun det første,
        ville "hele hånden, ca 5 %" forsvinde i tavshed, fordi træet spørger
        om skadesmekanismen først.
      */}
      {fangedeOrd.length > 0 && (
        <p className="mt-2 text-[13px] leading-relaxed text-[var(--teal-deep)]">
          {tr("workupPrefilled", lang)}: {fangedeOrd.join(" · ")}
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
                /* Knapperne stod hvide på en tonet flade. Nu er kortet selv
                   hvidt, så de skifter til papir — ellers ville de forsvinde
                   ind i fladen under sig. `min-h-11`: de rammes med en
                   tommelfinger. */
                className="flex min-h-11 items-center rounded-lg border border-[var(--line-strong)] bg-[var(--paper)] px-3.5 py-2 text-sm font-medium text-[var(--ink)] transition-colors hover:border-[var(--teal)] hover:bg-[var(--teal-tint)]"
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
function RedflagBlock({
  flag,
  lang,
  value,
  onElaborate,
}: {
  flag: RedflagEvent;
  lang: Lang;
  value?: string;
  onElaborate?: (question: string) => void;
}) {
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
      {/*
        Grebet ud i kilderne, med træets egen ordlyd om netop dette flag.
        Kun grebet — handlingstrinnene hører til ved anbefalingen, og et flag
        der eskalerer får den i samme åndedrag lige nedenunder.
      */}
      {onElaborate && (
        <EscalationPanel
          treeId={flag.treeId}
          nodeId={flag.nodeId}
          value={value}
          lang={lang}
          onElaborate={onElaborate}
        />
      )}
    </section>
  );
}

/** Udredningens konklusion, med de kilder den hviler på. */
function DispositionBlock({
  disposition,
  lang,
  onShowProcedure,
  onElaborate,
}: {
  disposition: DispositionEvent;
  lang: Lang;
  onShowProcedure?: () => void;
  onElaborate?: (question: string) => void;
}) {
  const d = disposition.disposition;
  /*
   * Rød ramme er forbeholdt den anbefaling der ikke tåler at vente.
   * "emergency" er akut overflytning; "refer" er en henvisning der skal ske,
   * men ikke i det næste minut. De to andre — behandl her, send hjem — er
   * gode nyheder og må aldrig låne alarmens farve.
   */
  const kritisk = d.severity === "emergency";
  /*
   * Eskalerer anbefalingen — akut overflytning eller henvisning — er der
   * nogen at ringe til, og dermed også en rolle man kan HAVE. "Behandl her"
   * og "send hjem" eskalerer ikke, og et rolleopdelt panel under dem ville
   * kun være støj.
   */
  const eskalerer = d.severity === "emergency" || d.severity === "refer";

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

      {/*
        HVAD MAN GØR IMENS — OG HVIS MAN SELV ER MODTAGEREN.

        Anbefalingen ovenover kan lyde "ring til vagthavende brandsårslæge".
        Det er rigtigt for den yngre læge og cirkulært for specialisten, der
        selv er den vagthavende — og hun står med præcis de patienter der
        udløser eskalationen. Panelet holder derfor begge roller åbne og
        henter de konkrete trin frem, hver med sin instruks. Det står MED
        anbefalingen og ikke bagved en knap: et handlingstrin man skal åbne,
        er et handlingstrin man ikke får.
      */}
      {eskalerer && (
        <EscalationPanel
          treeId={disposition.treeId}
          dispositionId={d.dispositionId}
          path={disposition.path}
          lang={lang}
          onElaborate={onElaborate}
        />
      )}

      {onShowProcedure && (
        <div className="mt-4 rounded-xl border border-[var(--teal)] bg-[var(--teal-tint)] p-4">
          <p className="text-[15px] font-medium leading-snug text-[var(--ink)]">{tr("procedureFollowUp", lang)}</p>
          <button
            type="button"
            onClick={onShowProcedure}
            className="mt-3 rounded-lg bg-[var(--teal-deep)] px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-[var(--teal)]"
          >
            {tr("procedureShow", lang)}
          </button>
        </div>
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
