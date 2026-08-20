"use client";

import { useCallback, useMemo, useState } from "react";
import Link from "next/link";
import type { Lang } from "@/lib/tree/types";
import { useTranscribe } from "@/lib/audio/useTranscribe";
import { speak, stopSpeaking } from "@/lib/audio/speak";
import { micMessage, tr } from "@/lib/i18n";
import { ResponseBar } from "@/components/ResponseBar";
import { PitfallRail } from "@/components/pitfalls/PitfallRail";
import { ToolShell } from "@/components/guide/ToolShell";
import { FELTER, GRUPPE_LABEL, findFelt, type Anamnese, type Gruppe } from "./schema";
import { udtraek } from "./extract";
import { FieldRow } from "./FieldRow";

/**
 * Struktureret anamnese.
 *
 * Lægen fortæller frit — "34-årig mand, kogende vand over højre hånd for 40
 * minutter siden, ingen allergier, tager Eliquis" — og skemaet fylder sig selv
 * ud. Det interessante er ikke det den fangede; det er DET DER MANGLER. Den
 * liste står altid på skærmen, og appen kan spørge det næste højt.
 *
 * Genkendelsen er deterministisk og lokal (se `extract.ts`), så feltet altid
 * kan vise HVAD den hørte og hvor den lagde det. Kan en ytring ikke henføres,
 * siger appen det og lader lægen svare på feltet i stedet — den gætter aldrig.
 *
 * Stemmelaget er nøjagtig det samme som beslutningstræets: Cortis ambiente
 * transskription gennem `useTranscribe`.
 */

export function InterviewView() {
  const [lang, setLang] = useState<Lang>("da");
  const [anamnese, setAnamnese] = useState<Anamnese>({});
  const [sidsteYtring, setSidsteYtring] = useState<string | null>(null);
  const [ingenTraef, setIngenTraef] = useState(false);
  const [kopieret, setKopieret] = useState(false);

  const udfyldte = useMemo(() => Object.keys(anamnese).filter((k) => anamnese[k]), [anamnese]);

  const paakraevede = FELTER.filter((f) => f.required);
  const manglende = paakraevede.filter((f) => !anamnese[f.id]);
  const naesteFelt = manglende[0] ?? null;

  const haandterYtring = useCallback(
    (raa: string) => {
      const tekst = raa.trim();
      if (!tekst) return;
      setSidsteYtring(tekst);

      const fund = udtraek(tekst, lang);
      setIngenTraef(fund.length === 0);
      if (fund.length === 0) return;

      setAnamnese((nu) => {
        const naeste = { ...nu };
        for (const f of fund) {
          // Et manuelt svar vejer tungere end en genkendelse: har lægen selv
          // sat feltet, må en tilfældig sætning senere ikke skrive det om.
          if (naeste[f.felt]?.kilde === "manual") continue;
          naeste[f.felt] = { value: f.value, display: f.display, matched: f.matched, kilde: "voice" };
        }
        return naeste;
      });
    },
    [lang],
  );

  const { listening, interim, error, start, stop } = useTranscribe({ lang, onFinal: haandterYtring });
  const notice = useMemo(() => micMessage(error, lang, false), [error, lang]);

  const saetFelt = useCallback((id: string, value: string, display: string) => {
    setAnamnese((nu) => ({ ...nu, [id]: { value, display, kilde: "manual" } }));
  }, []);

  const rydFelt = useCallback((id: string) => {
    setAnamnese((nu) => ({ ...nu, [id]: undefined }));
  }, []);

  const laesOp = useCallback(
    (id: string) => {
      const felt = findFelt(id);
      if (!felt) return;
      stopSpeaking();
      void speak(felt.question[lang], lang);
    },
    [lang],
  );

  /**
   * Resuméet skrives af skemaet, ikke af en sprogmodel. Hver linje er et felt
   * lægen selv har bekræftet eller sagt, og teksten kan derfor gå direkte i
   * journalen uden at nogen skal efterprøve om den er opfundet.
   */
  const resume = useMemo(() => {
    const linjer = FELTER.filter((f) => anamnese[f.id]).map((f) => `${f.label[lang]}: ${anamnese[f.id]!.display}`);
    if (manglende.length > 0) {
      linjer.push(
        `${lang === "da" ? "Ikke oplyst" : "Not obtained"}: ${manglende.map((f) => f.label[lang]).join(", ")}`,
      );
    }
    return linjer.join("\n");
  }, [anamnese, manglende, lang]);

  const kopier = async () => {
    try {
      await navigator.clipboard.writeText(resume);
      setKopieret(true);
      setTimeout(() => setKopieret(false), 2000);
    } catch {
      // Udklipsholderen kan være spærret; teksten står stadig på skærmen og
      // kan markeres i hånden. Ingen grund til at larme om det.
    }
  };

  const grupper: Gruppe[] = ["injury", "patient"];
  const andel = Math.round(((paakraevede.length - manglende.length) / paakraevede.length) * 100);

  return (
    <ToolShell
      active="interview"
      lang={lang}
      onToggleLang={() => setLang((l) => (l === "da" ? "en" : "da"))}
      title={tr("interviewTitle", lang)}
      tagline={tr("interviewTagline", lang)}
    >
      <div className="rounded-2xl border bg-[var(--paper-raised)] p-5 shadow-[var(--shadow-raised)] sm:p-6">
        <ResponseBar
          lang={lang}
          placeholder={tr("interviewPlaceholder", lang)}
          listening={listening}
          interim={interim}
          onToggleMic={() => (listening ? stop() : void start())}
          onSubmit={haandterYtring}
          autoFocus
        />

        <p className="mt-3 text-[11px] leading-relaxed text-[var(--ink-faint)]">{tr("interviewHowItWorks", lang)}</p>

        {sidsteYtring && (
          <p className="mt-3 rounded-lg border border-[var(--line)] bg-[var(--nude-tint)] px-3.5 py-2.5 text-sm leading-relaxed text-[var(--ink)]">
            “{sidsteYtring}”
            {ingenTraef && (
              <span className="mt-1 block text-[13px] font-medium text-[var(--ink-soft)]">
                {tr("interviewNothingHeard", lang)}
              </span>
            )}
          </p>
        )}

        {notice && (
          <p
            role="status"
            className="mt-3 rounded-lg border border-[var(--nude-deep)] bg-[var(--nude-tint)] px-4 py-3 text-sm font-medium leading-relaxed text-[var(--ink)]"
          >
            {notice}
          </p>
        )}
      </div>

      {/* Fremdrift: hvor meget af det der SKAL med, er med. */}
      <div className="mt-6 flex flex-wrap items-center gap-x-4 gap-y-2">
        <div className="h-1.5 min-w-[160px] flex-1 overflow-hidden rounded-full bg-[var(--line)]">
          <div
            className="h-full rounded-full bg-[var(--teal)] transition-[width] duration-300"
            style={{ width: `${andel}%` }}
          />
        </div>
        <p className="font-[family-name:var(--font-mono)] text-xs text-[var(--ink-soft)]">
          {paakraevede.length - manglende.length}/{paakraevede.length} {tr("interviewProgress", lang)}
        </p>
        {naesteFelt ? (
          <button
            onClick={() => laesOp(naesteFelt.id)}
            className="flex min-h-11 items-center rounded-lg bg-[var(--teal-deep)] px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-[var(--teal)]"
          >
            {tr("interviewAskNext", lang)}: {naesteFelt.label[lang]}
          </button>
        ) : (
          <span className="rounded-lg border border-[var(--green-line)] bg-[var(--green-tint)] px-3.5 py-2 text-sm font-semibold text-[var(--green)]">
            {tr("interviewComplete", lang)}
          </span>
        )}
        <button
          onClick={() => {
            setAnamnese({});
            setSidsteYtring(null);
            setIngenTraef(false);
          }}
          className="flex min-h-11 items-center rounded-lg border px-3 py-2 text-sm font-medium text-[var(--ink-soft)] transition-colors hover:border-[var(--teal)] hover:text-[var(--ink)]"
        >
          {tr("interviewReset", lang)}
        </button>
      </div>

      <div className="mt-6 grid gap-6 md:grid-cols-[1fr_300px]">
        <div className="space-y-6">
          {grupper.map((g) => (
            <section key={g}>
              <h2 className="mb-2.5 font-[family-name:var(--font-display)] text-lg font-semibold tracking-tight text-[var(--teal-deep)]">
                {GRUPPE_LABEL[g][lang]}
              </h2>
              <div className="space-y-2">
                {FELTER.filter((f) => f.gruppe === g).map((f) => (
                  <FieldRow
                    key={f.id}
                    felt={f}
                    svar={anamnese[f.id]}
                    lang={lang}
                    naeste={naesteFelt?.id === f.id}
                    onSvar={(v, d) => saetFelt(f.id, v, d)}
                    onRyd={() => rydFelt(f.id)}
                    onLaesOp={() => laesOp(f.id)}
                  />
                ))}
              </div>
            </section>
          ))}

          {udfyldte.length > 0 && (
            <section>
              <div className="mb-2 flex items-baseline justify-between gap-3">
                <h2 className="font-[family-name:var(--font-display)] text-lg font-semibold tracking-tight text-[var(--teal-deep)]">
                  {tr("interviewSummary", lang)}
                </h2>
                <button
                  onClick={() => void kopier()}
                  className="flex min-h-11 items-center rounded-lg border px-3 py-1.5 text-sm font-medium text-[var(--ink)] transition-colors hover:border-[var(--teal)] hover:bg-[var(--teal-tint)]"
                >
                  {tr(kopieret ? "interviewCopied" : "interviewCopy", lang)}
                </button>
              </div>
              {/* Maskinens egen udskrift. Den stod hvid på hvidt kort og
                  lignede derfor almindelig brødtekst med en ramme om. Nu er
                  fladen sænket et hak — det ældste tegn i tryksager på "her
                  citeres noget ordret", og den eneste forskel man behøver. */}
              <pre className="overflow-x-auto whitespace-pre-wrap rounded-xl border border-[var(--line)] bg-[var(--paper-sunken)] p-4 font-[family-name:var(--font-mono)] text-[13px] leading-relaxed text-[var(--ink)]">
                {resume}
              </pre>
            </section>
          )}
        </div>

        {/*
          Faldgruberne følger anamnesen: nævner lægen blodfortyndende, står
          tromboseafsnittet frem med det samme — ikke i en liste man skal huske
          at åbne bagefter.
        */}
        <aside className="space-y-3 md:sticky md:top-6 md:self-start">
          <PitfallRail
            lang={lang}
            kontekst={{ fields: udfyldte, values: udfyldte.map((k) => anamnese[k]!.value) }}
            overskrift={tr("pitfallsHere", lang)}
            limit={3}
          />
          <Link
            href="/"
            className="block rounded-lg bg-[var(--teal-deep)] px-3.5 py-2.5 text-center text-sm font-semibold text-white transition-colors hover:bg-[var(--teal)]"
          >
            {tr("guideStartTree", lang)} →
          </Link>
          <Link
            href="/guide"
            className="block rounded-lg border px-3.5 py-2.5 text-sm font-medium text-[var(--ink)] transition-colors hover:border-[var(--teal)] hover:bg-[var(--teal-tint)]"
          >
            {tr("toolGuide", lang)} →
          </Link>
        </aside>
      </div>
    </ToolShell>
  );
}
