"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import type { KildeUddrag } from "@/lib/corti/mcp";
import type { Lang } from "@/lib/tree/types";
import { useTranscribe } from "@/lib/audio/useTranscribe";
import { failureMessage, micMessage, tr } from "@/lib/i18n";
import { ResponseBar } from "@/components/ResponseBar";
import { PitfallRail } from "@/components/pitfalls/PitfallRail";
import { ToolShell } from "./ToolShell";
import { SourceCard } from "./SourceCard";

/**
 * Behandlingsguiden: et opslagsværk, ikke en samtale.
 *
 * Beslutningstræet spørger; guiden svarer. Lægen skriver eller siger en
 * tilstand — "dyb dermal forbrænding på hånden" — og får behandlingen i den
 * rækkefølge man arbejder i, med hvert afsnits indhold hentet ORDRET fra
 * CoSurgs egne kilder og med kilden stående over teksten.
 *
 * Indgangen er med vilje formet som appens hovedvej: ét spørgsmål, ét felt,
 * stemme eller skrift. Lægen skal ikke lære en ny betjening for at slå noget op.
 */

interface GuideAfsnit {
  key: string;
  label: Record<Lang, string>;
  intent: Record<Lang, string>;
  excerpts: KildeUddrag[];
}

interface GuideSvar {
  topic: Record<Lang, string>;
  routedBy: "corti" | "lokal";
  terms: string[];
  sections: GuideAfsnit[];
  covered: number;
  offTopic: boolean;
}

/** Guiden slår syv-otte gange op i vidensbasen og oversætter først emnet. */
const TIMEOUT_GUIDE = 45_000;

const EKSEMPLER: Record<Lang, string[]> = {
  da: [
    "dyb dermal forbrænding på hånden",
    "cirkulær forbrænding på underarmen",
    "ætsning med stærk base",
    "skoldning hos et barn",
  ],
  en: [
    "deep dermal burn of the hand",
    "circumferential forearm burn",
    "chemical burn with a strong alkali",
    "scald in a child",
  ],
};

export function GuideView() {
  const [lang, setLang] = useState<Lang>("da");
  const [svar, setSvar] = useState<GuideSvar | null>(null);
  /** Det lægen faktisk skrev — grundlaget for de kontekstuelle faldgruber. */
  const [emne, setEmne] = useState("");
  const [henter, setHenter] = useState(false);
  const [besked, setBesked] = useState<string | null>(null);

  const slaaOp = useCallback(
    async (topic: string) => {
      const rent = topic.trim();
      if (!rent || henter) return;
      setHenter(true);
      setBesked(null);
      setEmne(rent);
      try {
        const res = await fetch("/api/guide", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ topic: rent, lang }),
          signal: AbortSignal.timeout(TIMEOUT_GUIDE),
        });
        const data = (await res.json()) as GuideSvar & { error?: string };
        if (data.error) {
          setBesked(data.error);
          return;
        }
        setSvar(data);
      } catch (err) {
        // Samme princip som i beslutningstræet: sig hvad der skete, og lad det
        // der allerede står på skærmen blive stående.
        setBesked(failureMessage(err, "tree", lang));
      } finally {
        setHenter(false);
      }
    },
    [lang, henter],
  );

  /*
   * Kom lægen hertil fra et opslag på forsiden, bærer adressen emnet med.
   *
   * Forsiden svarer selv med de vigtigste afsnit; klikker han videre hertil, er
   * det for at se det HELE — og så ville det være tåbeligt at bede ham skrive
   * emnet igen. Vi læser adressen direkte frem for `useSearchParams`, som ville
   * kræve en Suspense-grænse omkring en side der ellers er statisk.
   */
  const saaetRef = useRef(false);
  useEffect(() => {
    if (saaetRef.current) return;
    saaetRef.current = true;
    const topic = new URLSearchParams(window.location.search).get("topic");
    // Opslaget sættes i gang EFTER renderen, ikke i den. Ellers ville den
    // første tilstandsændring falde midt i monteringen og kaskade videre.
    if (topic) queueMicrotask(() => void slaaOp(topic));
  }, [slaaOp]);

  // Stemmelaget er præcis det samme som i beslutningstræet: Cortis ambiente
  // transskription. Et opslag skal kunne siges højt af en der har hænderne fulde.
  const { listening, interim, error, start, stop } = useTranscribe({
    lang,
    onFinal: (t) => void slaaOp(t),
  });

  const notice = useMemo(() => micMessage(error, lang, false), [error, lang]);
  const daekkede = svar?.sections.filter((s) => s.excerpts.length > 0) ?? [];

  return (
    <ToolShell
      active="guide"
      lang={lang}
      onToggleLang={() => setLang((l) => (l === "da" ? "en" : "da"))}
      title={tr("guideTitle", lang)}
      tagline={tr("guideTagline", lang)}
    >
      <div className="rounded-2xl border bg-[var(--paper-raised)] p-6 shadow-[0_1px_2px_rgba(16,32,30,0.04)] sm:p-8">
        <h2 className="font-[family-name:var(--font-display)] text-2xl font-semibold leading-snug tracking-tight text-[var(--ink)] sm:text-[28px]">
          {tr("guideQuestion", lang)}
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-[var(--ink-soft)]">{tr("guideHelp", lang)}</p>

        <div className="mt-5">
          <ResponseBar
            lang={lang}
            placeholder={tr("guidePlaceholder", lang)}
            listening={listening}
            interim={interim}
            onToggleMic={() => (listening ? stop() : void start())}
            onSubmit={(t) => void slaaOp(t)}
            autoFocus
          />
        </div>

        {notice && (
          <p
            role="status"
            className="mt-4 rounded-lg border border-[var(--nude-deep)] bg-[var(--nude-tint)] px-4 py-3 text-sm font-medium leading-relaxed text-[var(--ink)]"
          >
            {notice}
          </p>
        )}

        <div className="mt-6 border-t border-[var(--line)] pt-4">
          <p className="font-[family-name:var(--font-mono)] text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--ink-faint)]">
            {tr("guideExamples", lang)}
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            {EKSEMPLER[lang].map((e) => (
              <button
                key={e}
                onClick={() => void slaaOp(e)}
                disabled={henter}
                className="rounded-lg border px-3.5 py-2 text-sm font-medium text-[var(--ink)] transition-colors hover:border-[var(--teal)] hover:bg-[var(--teal-tint)] disabled:opacity-40"
              >
                {e}
              </button>
            ))}
          </div>
        </div>
      </div>

      {henter && (
        <p className="mt-6 font-[family-name:var(--font-mono)] text-sm text-[var(--ink-soft)]">
          {tr("guideWorking", lang)}
        </p>
      )}

      {besked && (
        <p
          role="status"
          className="mt-6 rounded-lg border border-[var(--nude-deep)] bg-[var(--nude-tint)] px-4 py-3 text-sm font-medium text-[var(--ink)]"
        >
          {besked}
        </p>
      )}

      {svar && !henter && (
        <div className="mt-8">
          <div className="flex flex-wrap items-baseline justify-between gap-3 border-b border-[var(--line-strong)] pb-3">
            <h2 className="font-[family-name:var(--font-display)] text-2xl font-semibold tracking-tight text-[var(--ink)]">
              {svar.topic[lang]}
            </h2>
            <Link
              href="/"
              className="rounded-lg bg-[var(--teal-deep)] px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-[var(--teal)]"
            >
              {tr("guideStartTree", lang)} →
            </Link>
          </div>

          {/*
            Hvordan søgeordene blev fundet står på siden og ikke i en logfil.
            Kom de fra Cortis agent, siger vi det; kom de fra brugerens egne ord
            fordi agenten ikke svarede, siger vi ogsaa det. Et opslag man ikke
            kan gennemskue, kan man ikke stole på.
          */}
          <p className="mt-2 font-[family-name:var(--font-mono)] text-[11px] text-[var(--ink-faint)]">
            {tr(svar.routedBy === "corti" ? "guideRoutedCorti" : "guideRoutedLocal", lang)}
            {svar.terms.length > 0 && <> · {svar.terms.join(" · ")}</>}
          </p>
          {lang === "en" && <p className="mt-1 text-[11px] text-[var(--ink-faint)]">{tr("sourcesDanish", lang)}</p>}

          {daekkede.length === 0 ? (
            <p className="mt-6 rounded-xl border border-[var(--nude-deep)] bg-[var(--nude-tint)] px-4 py-4 text-sm font-medium leading-relaxed text-[var(--ink)]">
              {tr(svar.offTopic ? "guideOffTopic" : "guideNothing", lang)}
            </p>
          ) : (
            <div className="mt-6 grid gap-8 md:grid-cols-[1fr_300px]">
              <div className="space-y-8">
                {svar.sections.map((s) => (
                  <section key={s.key}>
                    <h3 className="font-[family-name:var(--font-display)] text-lg font-semibold tracking-tight text-[var(--teal-deep)]">
                      {s.label[lang]}
                    </h3>
                    <p className="mt-0.5 mb-3 text-sm text-[var(--ink-soft)]">{s.intent[lang]}</p>
                    {s.excerpts.length === 0 ? (
                      <p className="rounded-lg border border-dashed border-[var(--line-strong)] px-3.5 py-3 text-sm text-[var(--ink-faint)]">
                        {tr("guideSectionEmpty", lang)}
                      </p>
                    ) : (
                      <div className="space-y-3">
                        {s.excerpts.map((u) => (
                          <SourceCard key={u.id} uddrag={u} lang={lang} />
                        ))}
                      </div>
                    )}
                  </section>
                ))}
              </div>

              {/*
                Faldgruberne står ved siden af behandlingen — ikke bagerst.
                Emnet afgør hvilke: slår man en cirkulær forbrænding op, står
                perfusionsfaldgruben ved siden af det første afsnit man læser.
              */}
              <aside className="space-y-3 md:sticky md:top-6 md:self-start">
                <PitfallRail
                  lang={lang}
                  kontekst={{ topic: `${emne} ${svar.terms.join(" ")}` }}
                  overskrift={tr("pitfallsHere", lang)}
                  limit={3}
                />
                <Link
                  href="/pitfalls"
                  className="block rounded-lg border px-3.5 py-2.5 text-sm font-medium text-[var(--ink)] transition-colors hover:border-[var(--teal)] hover:bg-[var(--teal-tint)]"
                >
                  {tr("pitfallsAll", lang)} →
                </Link>
              </aside>
            </div>
          )}
        </div>
      )}
    </ToolShell>
  );
}
