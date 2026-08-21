"use client";

import type { ChatAnswer, Evidence } from "@/lib/corti/chat";
import type { Lang } from "@/lib/tree/types";
import { tr } from "@/lib/i18n";
import { RichText } from "./RichText";
import { Tooltip } from "../ui/Tooltip";

/**
 * Svaret, og lige så vigtigt: hvad det hviler på.
 *
 * Farverne her er hentet i BRANDLAGET alene. Rød, gul og grøn betyder klinisk
 * alvor i CoSurg (rødt flag, henvisning, hjemsendelse) og må ikke også komme til
 * at betyde "svag kilde" — en læge der ser rødt på skærmen skal kunne stole på
 * at det handler om patienten. Belæg markeres derfor med teal, neutral linje og
 * en stiplet ramme, ikke med et trafiklys.
 */

const EVIDENCE_KEY: Record<Evidence, "evidenceSourced" | "evidencePartial" | "evidenceUnsupported" | null> = {
  sourced: "evidenceSourced",
  partial: "evidencePartial",
  // "Ræsonneret" er et nyt niveau og har sin tekst i unified/text.ts.
  extrapolated: null,
  unsupported: "evidenceUnsupported",
};

function evidenceLabel(evidence: Evidence, lang: Lang): string {
  const key = EVIDENCE_KEY[evidence];
  return key ? tr(key, lang) : tr("evidenceExtrapolated", lang);
}

/**
 * Hvad mærkatet BETYDER. «Kildebelagt» og «Ræsonneret» er vores ord, ikke
 * lægens, og forskellen mellem dem er den vigtigste på hele kortet: den ene
 * kan følges tilbage til en kilde, den anden er en slutning. Et mærkat man
 * skal gætte betydningen af, er værre end intet mærkat.
 */
const EVIDENCE_TIP: Record<Evidence, "tipEvidenceSourced" | "tipEvidencePartial" | "tipEvidenceExtrapolated" | "tipEvidenceUnsupported"> = {
  sourced: "tipEvidenceSourced",
  partial: "tipEvidencePartial",
  extrapolated: "tipEvidenceExtrapolated",
  unsupported: "tipEvidenceUnsupported",
};

function EvidenceBadge({ evidence, lang }: { evidence: Evidence; lang: Lang }) {
  const style =
    evidence === "sourced"
      ? "border-[var(--teal)] bg-[var(--teal-tint)] text-[var(--teal-deep)]"
      : evidence === "partial"
        ? "border-[var(--line-strong)] bg-[var(--paper)] text-[var(--ink-soft)]"
        : "border-dashed border-[var(--nude-deep)] bg-[var(--nude-tint)] text-[var(--nude-ink)]";

  return (
    <Tooltip label={tr(EVIDENCE_TIP[evidence], lang)} placement="bottom-start">
    <span
      /* Mærkatet er ikke en knap, men det skal kunne nås med tastaturet:
         forklaringen bag det er den eneste vej til at vide hvad ordet
         dækker, og en forklaring der kun kan fås med mus er ingen
         forklaring. */
      tabIndex={0}
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 font-[family-name:var(--font-mono)] text-[11px] font-medium uppercase tracking-[0.14em] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--teal)] ${style}`}
    >
      {evidence === "sourced" && (
        <svg viewBox="0 0 16 16" width="11" height="11" fill="none" aria-hidden="true">
          <path
            d="M3 8.5 6.2 12 13 4.5"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      )}
      {evidenceLabel(evidence, lang)}
    </span>
    </Tooltip>
  );
}

function SourceRow({
  source,
  index,
  lang,
}: {
  source: ChatAnswer["sources"][number];
  index: number;
  lang: Lang;
}) {
  const body = (
    <>
      <span className="font-[family-name:var(--font-mono)] text-[11px] font-medium text-[var(--ink-faint)]">
        [{index + 1}]
      </span>
      <span className="min-w-0">
        <span className="block text-sm font-medium leading-snug text-[var(--ink)] group-hover:text-[var(--teal-deep)]">
          {source.title}
        </span>
        {source.supports && (
          <span className="mt-0.5 block text-[13px] leading-relaxed text-[var(--ink-soft)]">
            {source.supports}
          </span>
        )}
        <span className="mt-1 flex flex-wrap items-center gap-1.5">
          {/* Vores egen validerede vidensbase vejer anderledes for en dansk
              kliniker end international litteratur. Mærkatet siger hvilken. */}
          {source.origin && (
            <span
              className={`inline-block rounded border px-1.5 py-px font-[family-name:var(--font-mono)] text-[11px] ${
                source.origin === "knowledge-base"
                  ? "border-[var(--teal)] bg-[var(--teal-tint)] text-[var(--teal-deep)]"
                  : "border-[var(--line)] bg-[var(--paper)] text-[var(--ink-faint)]"
              }`}
            >
              {tr(source.origin === "knowledge-base" ? "originKnowledgeBase" : "originLiterature", lang)}
            </span>
          )}
          {source.identifier && (
            <span className="inline-block rounded border border-[var(--line)] bg-[var(--paper)] px-1.5 py-px font-[family-name:var(--font-mono)] text-[11px] text-[var(--ink-faint)]">
              {source.identifier}
            </span>
          )}
        </span>
      </span>
    </>
  );

  const shell = "group flex gap-2.5 rounded-lg px-2 py-2 -mx-2 transition-colors";

  return source.url ? (
    <li>
      {/* Tooltippen sidder på HELE linjen og ikke på oprindelsesmærkatet:
          mærkatet ligger inde i linket, og et fokuspunkt inde i et andet
          fokuspunkt kan ingen tastaturbruger nå. */}
      <Tooltip
        label={
          source.origin
            ? tr(source.origin === "knowledge-base" ? "tipOriginKnowledgeBase" : "tipOriginLiterature", lang)
            : tr("tipSourceOpen", lang)
        }
        placement="top-start"
        className="w-full"
      >
        <a
          href={source.url}
          target="_blank"
          rel="noopener noreferrer"
          className={`${shell} w-full hover:bg-[var(--teal-tint)]`}
        >
          {body}
        </a>
      </Tooltip>
    </li>
  ) : (
    <li className={shell}>{body}</li>
  );
}

interface AnswerCardProps {
  answer: ChatAnswer;
  lang: Lang;
  speaking: boolean;
  onSpeak: () => void;
}

export function AnswerCard({ answer, lang, speaking, onSpeak }: AnswerCardProps) {
  return (
    <div className="rounded-2xl border bg-[var(--paper-raised)] p-5 sm:p-6 shadow-[var(--shadow-raised)]">
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <EvidenceBadge evidence={answer.evidence} lang={lang} />
        <Tooltip label={tr(speaking ? "tipStopSpeaking" : "tipSpeakAnswer", lang)} placement="bottom-end" className="ml-auto">
        <button
          type="button"
          onClick={onSpeak}
          aria-label={tr(speaking ? "chatStopSpeaking" : "chatSpeakAnswer", lang)}
          className="inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs font-medium text-[var(--ink-soft)] transition-colors hover:border-[var(--teal)] hover:bg-[var(--teal-tint)] hover:text-[var(--teal-deep)]"
        >
          <svg viewBox="0 0 20 20" width="13" height="13" fill="none" aria-hidden="true">
            {speaking ? (
              <rect x="5" y="5" width="10" height="10" rx="1.5" fill="currentColor" />
            ) : (
              <>
                <path
                  d="M4 8v4h2.5L10 15V5L6.5 8H4Z"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinejoin="round"
                />
                <path d="M13 7.5a3.5 3.5 0 0 1 0 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              </>
            )}
          </svg>
          {tr(speaking ? "chatStopSpeaking" : "chatSpeakAnswer", lang)}
        </button>
        </Tooltip>
      </div>

      <RichText text={answer.answer} />

      {/*
        Ræsonnementet står FOR SIG SELV og med sin egen ramme.
        Det er ikke pynt: en læge skal kunne se med et blik hvor meget af
        svaret der hviler på en kilde, og hvor meget der er slutninger ud fra
        det han selv har fortalt. Blandet sammen kan de to ikke vejes hver for
        sig — og så er svaret farligere end intet svar.
      */}
      {answer.reasoning && (
        <div className="mt-4 rounded-xl border border-dashed border-[var(--line-strong)] bg-[var(--paper)] p-4">
          <p className="font-[family-name:var(--font-mono)] text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--ink-faint)]">
            {tr("reasoningTitle", lang)}
          </p>
          <div className="mt-2">
            <RichText text={answer.reasoning} />
          </div>
          <p className="mt-3 text-[13px] leading-relaxed text-[var(--ink-faint)]">
            {tr("reasoningNote", lang)}
          </p>
        </div>
      )}

      {answer.usedContext && (
        <p className="mt-3 inline-flex items-center gap-1.5 rounded-full border border-[var(--line-strong)] bg-[var(--paper)] px-2.5 py-1 font-[family-name:var(--font-mono)] text-[11px] uppercase tracking-[0.14em] text-[var(--ink-soft)]">
          {tr("usedContext", lang)}
        </p>
      )}

      {answer.evidence === "unsupported" && (
        <p className="mt-4 rounded-lg border border-dashed border-[var(--nude-deep)] bg-[var(--nude-tint)] px-3 py-2 text-[13px] leading-relaxed text-[var(--nude-ink)]">
          {tr("chatUnsupportedNote", lang)}
        </p>
      )}

      {answer.limitations && (
        <div className="mt-4 border-t border-[var(--line)] pt-3">
          <p className="font-[family-name:var(--font-mono)] text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--ink-faint)]">
            {tr("chatLimitations", lang)}
          </p>
          <p className="mt-1.5 text-sm leading-relaxed text-[var(--ink-soft)]">{answer.limitations}</p>
        </div>
      )}

      {/*
        Kilderne er sporbarhed, ikke læsestof — sammenfoldet fylder de én
        diskret linje, og lægen folder dem ud når svaret skal efterprøves.
        <details> frem for state: kortet gengives tre steder (tråd, LookupCard,
        /chat), og en browser-native fold virker ens i dem alle.
      */}
      {answer.sources.length > 0 && (
        <details className="group mt-4 border-t border-[var(--line)] pt-3">
          <summary className="flex cursor-pointer list-none items-center gap-1.5 font-[family-name:var(--font-mono)] text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--ink-faint)] transition-colors hover:text-[var(--teal-deep)] [&::-webkit-details-marker]:hidden">
            <svg
              viewBox="0 0 12 12"
              width="10"
              height="10"
              fill="none"
              aria-hidden="true"
              className="shrink-0 transition-transform group-open:rotate-90"
            >
              <path d="M4 2.5 8 6l-4 3.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            {tr("sources", lang)} · {answer.sources.length}
          </summary>
          <ul className="mt-1.5">
            {answer.sources.map((s, i) => (
              <SourceRow key={`${s.identifier ?? s.title}-${i}`} source={s} index={i} lang={lang} />
            ))}
          </ul>
        </details>
      )}
    </div>
  );
}
