"use client";

import { useRef } from "react";
import type { Lang } from "@/lib/tree/types";
import { t, tr } from "@/lib/i18n";
import type { IntakeKind, IntakePreview } from "./unified/intent";
import { ResponseBar } from "./ResponseBar";
import type { TreeSummary } from "./TreePicker";
import { SizeLock, widestOf } from "./ui/SizeLock";

interface IntakeCardProps {
  lang: Lang;
  trees: TreeSummary[];
  /** Forløb vi ikke turde vælge imellem — vises som knapper når vi spørger igen. */
  ambiguous: string[];
  /** Sat når en ytring ikke kunne henføres til et forløb. */
  unresolved: string | null;
  listening: boolean;
  interim: string;
  /** Teksten i feltet. Den bor hos forælderen, fordi genkendelsen læser den. */
  draft: string;
  onDraftChange: (text: string) => void;
  /** Hvad appen er ved at forstå, mens der stadig skrives. Null = intet at sige endnu. */
  preview: IntakePreview | null;
  onToggleMic: () => void;
  onSubmit: (text: string) => void;
  onSelectTree: (id: string) => void;
  onGenerateNote: () => void;
  noteBusy: boolean;
}

/**
 * FORSIDEN — og dermed produktet.
 *
 * CoSurg er ikke en brandsårsapp der også kan chatte. Det er ét sted hvor en
 * kliniker siger hvad han har på hjerte, og systemet finder ud af hvad han har
 * brug for: en ført vurdering, et kildebelagt svar eller et behandlingsopslag.
 * Den påstand skal skærmen bære selv, i det sekund den åbnes — ellers findes
 * produktet kun i koden.
 *
 * Tre ting gør arbejdet, og de er valgt frem for alternativerne:
 *
 * 1. INVITATIONEN FAVNER ALLE TRE VEJE. Den gamle forside sagde "beskriv
 *    patienten" tre gange (overskrift, hjælpetekst, pladsholder), og så prøver
 *    ingen at stille et spørgsmål. Nu nævner alle tre linjer alle tre veje.
 *
 * 2. GENKENDELSEN VISES MENS DEN SKER. Under feltet står hvad appen er ved at
 *    forstå — og hvad den så vil gøre — allerede før der trykkes enter. Det er
 *    både en oplæring (nå, den kan også det) og en sikkerhed (jeg kan standse
 *    den før den gør noget forkert). Grunden står med, fordi hele appens
 *    påstand er at den kan gøre rede for sig.
 *
 * 3. EKSEMPLER FREM FOR FORKLARINGER. Tre ytringer af hver sin slags. De er
 *    bevidst IKKE en fanebjælke: et klik fylder feltet i stedet for at
 *    navigere væk, og genkendelsen tænder med det samme, så man ser evnen
 *    blive brugt frem for beskrevet. Valget forbliver appens.
 *
 * Og hele vejen igennem: intet element flytter sig. Genkendelsens plads er
 * reserveret og ikke betinget, og eksempelkortene har fast tekstblok — ellers
 * ville skærmen rykke under hænderne på den der læser, hver gang han skriver
 * et bogstav eller skifter sprog.
 */
export function IntakeCard({
  lang,
  trees,
  ambiguous,
  unresolved,
  listening,
  interim,
  draft,
  onDraftChange,
  preview,
  onToggleMic,
  onSubmit,
  onSelectTree,
  onGenerateNote,
  noteBusy,
}: IntakeCardProps) {
  // Ved tvivl viser vi KUN de forløb der var i spil — at vise alle igen ville
  // være at kaste spørgsmålet tilbage uden at have hjulpet med noget.
  const choices = ambiguous.length > 0 ? trees.filter((tree) => ambiguous.includes(tree.id)) : trees;

  /*
   * Et eksempel er klikket. Teksten lægges i feltet — den sendes IKKE — og
   * markøren flytter med, så det næste tastetryk fortsætter hvor eksemplet
   * slap. Forskellen på et eksempel og en menuknap er præcis den: eksemplet
   * afleverer noget man kan rette i, knappen tager en beslutning.
   */
  const inputRef = useRef<HTMLInputElement>(null);
  const pick = (text: string) => {
    onDraftChange(text);
    const el = inputRef.current;
    if (el) {
      el.focus();
      el.setSelectionRange(text.length, text.length);
    }
  };

  return (
    <div className="motion-fade">
      <div className="rounded-2xl border bg-[var(--paper-raised)] p-6 shadow-[0_1px_2px_rgba(16,32,30,0.04)] sm:p-8">
        <h2 className="font-[family-name:var(--font-display)] text-[28px] font-semibold leading-tight tracking-tight text-[var(--ink)] sm:text-[34px]">
          {tr("intakeQuestion", lang)}
        </h2>
        <p className="mt-2.5 max-w-2xl text-[15px] leading-relaxed text-[var(--ink-soft)]">
          {tr("intakeHelp", lang)}
        </p>

        <div className="mt-6">
          <ResponseBar
            lang={lang}
            placeholder={tr("intakePlaceholder", lang)}
            listening={listening}
            interim={interim}
            onToggleMic={onToggleMic}
            onSubmit={onSubmit}
            value={draft}
            onValueChange={onDraftChange}
            inputRef={inputRef}
            size="hero"
            autoFocus
          />
        </div>

        <SensePanel preview={preview} lang={lang} />

        <ExampleRow lang={lang} onPick={pick} />

        {/* Vi spørger igen — det er en besked der KRÆVER noget af lægen, så den
            skal både ses og læses op. Nude og ikke rød: at have brug for et
            ekstra ord er ikke en klinisk alvor. */}
        {unresolved && (
          <p
            role="status"
            aria-live="polite"
            className="motion-forward mt-5 rounded-lg border border-[var(--nude-deep)] bg-[var(--nude-tint)] px-4 py-3 text-sm font-medium leading-relaxed text-[var(--ink)]"
          >
            {tr(ambiguous.length > 0 ? "intakeAmbiguous" : "intakeUnknown", lang)}
            <span className="mt-1 block font-normal text-[var(--ink-soft)]">&ldquo;{unresolved}&rdquo;</span>
          </p>
        )}

        {/*
          Den manuelle vej. Den bliver stående, fordi den der allerede ved hvad
          han vil skal kunne springe genkendelsen over — men den står nede og
          småt. Gjorde den andet, ville forsiden igen bede lægen om det valg vi
          netop har taget fra ham.
        */}
        <div className="mt-7 flex flex-wrap items-center gap-x-4 gap-y-3 border-t border-[var(--line)] pt-4">
          <p className="font-[family-name:var(--font-mono)] text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--ink-faint)]">
            {tr(ambiguous.length > 0 ? "intakePick" : "intakeManual", lang)}
          </p>
          <div className="flex flex-1 flex-wrap gap-2">
            {choices.map((tree) => (
              <button
                key={tree.id}
                onClick={() => onSelectTree(tree.id)}
                className="rounded-lg border px-3 py-1.5 text-[13px] font-medium text-[var(--ink-soft)] transition-colors hover:border-[var(--teal)] hover:bg-[var(--teal-tint)] hover:text-[var(--ink)]"
              >
                {/* Forløbsnavnene er oversat indhold og har hver sin længde på
                    de to sprog. Knappen får plads til den længste, så rækken
                    ikke pakker om sig selv ved et sprogskift. */}
                <SizeLock variants={[tree.name.da, tree.name.en]}>{tree.name[lang]}</SizeLock>
              </button>
            ))}
          </div>
          <button
            onClick={onGenerateNote}
            disabled={noteBusy}
            aria-busy={noteBusy}
            className="rounded-lg border border-[var(--line-strong)] px-3 py-1.5 text-[13px] font-medium text-[var(--ink-soft)] transition-colors enabled:hover:border-[var(--teal)] enabled:hover:text-[var(--ink)] disabled:opacity-50"
          >
            <SizeLock variants={widestOf("noteWorking", "intakeGenerateNote")}>
              {noteBusy ? tr("noteWorking", lang) : tr("intakeGenerateNote", lang)}
            </SizeLock>
          </button>
        </div>
      </div>

      <ProvenanceStrip lang={lang} />
    </div>
  );
}

/* ------------------------------------------------------------------ *
 * Genkendelsen, vist mens den sker
 * ------------------------------------------------------------------ */

/** Hvad hver slags hedder, og hvad appen så gør ved den. */
const SENSE: Record<IntakeKind, { name: keyof typeof t; does: keyof typeof t }> = {
  pathway: { name: "sensePathway", does: "sensePathwayDoes" },
  question: { name: "senseQuestion", does: "senseQuestionDoes" },
  guide: { name: "senseGuide", does: "senseGuideDoes" },
  unsure: { name: "senseUnsure", does: "senseUnsureDoes" },
};

/**
 * Hvad er appen ved at forstå — lige nu, mens der skrives?
 *
 * Formen er «Jeg læser det som X — så gør jeg Y», og grunden står under.
 * Rækkefølgen er ikke tilfældig: forståelsen først (den er det interessante),
 * handlingen dernæst (den er det forpligtende), grunden til sidst (den er
 * belægget). Lægen kan altså standse os FØR vi gør noget, ikke bagefter.
 *
 * Pladsen er RESERVERET og ikke betinget. Voksede feltet frem under skrivning,
 * ville hele siden rykke ved hvert fjerde bogstav — og det ville føle sig
 * nervøst i en app hvis hele ærinde er ro under tidspres.
 */
function SensePanel({ preview, lang }: { preview: IntakePreview | null; lang: Lang }) {
  const unsure = preview?.kind === "unsure";

  return (
    <div className="mt-3 h-[5.25rem] overflow-hidden" aria-live="polite">
      {preview ? (
        <div
          className={`motion-replace flex h-full items-start gap-3 rounded-xl border px-4 py-3 ${
            unsure
              ? "border-[var(--nude-deep)] bg-[var(--nude-tint)]"
              : "border-[var(--line-strong)] bg-[var(--teal-tint)]"
          }`}
        >
          <span className={`mt-0.5 shrink-0 ${unsure ? "text-[var(--nude-deep)]" : "text-[var(--teal)]"}`}>
            <KindGlyph kind={preview.kind} />
          </span>
          <div className="min-w-0 flex-1">
            <p className="flex flex-wrap items-baseline gap-x-2 leading-snug">
              <span className="font-[family-name:var(--font-mono)] text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--ink-faint)]">
                {tr("senseLabel", lang)}
              </span>
              <span className="text-[15px] font-semibold text-[var(--ink)]">
                {tr(SENSE[preview.kind].name, lang)}
              </span>
            </p>
            <p className="truncate text-sm leading-relaxed text-[var(--ink-soft)]">
              — {tr(SENSE[preview.kind].does, lang)}
            </p>
            {preview.reasons.length > 0 && (
              <p className="truncate font-[family-name:var(--font-mono)] text-[11px] leading-relaxed text-[var(--ink-faint)]">
                {tr("recognisedBecause", lang)}: {preview.reasons.join(" · ")}
              </p>
            )}
          </div>
        </div>
      ) : (
        <p className="flex h-full items-center px-1 text-sm leading-relaxed text-[var(--ink-faint)]">
          {tr("senseIdle", lang)}
        </p>
      )}
    </div>
  );
}

/**
 * Ét lille mærke pr. slags. De er bevidst tegnet i brandets accentfarve og
 * aldrig i rød, gul eller grøn: at appen har genkendt et spørgsmål er ikke en
 * klinisk oplysning, og de tre farver betyder noget andet i denne app.
 */
function KindGlyph({ kind }: { kind: IntakeKind }) {
  const common = {
    width: 20,
    height: 20,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.7,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    "aria-hidden": true,
  };

  if (kind === "pathway") {
    // En person: ytringen handler om en patient.
    return (
      <svg {...common}>
        <circle cx="12" cy="8" r="3.4" />
        <path d="M4.8 20a7.2 7.2 0 0 1 14.4 0" />
      </svg>
    );
  }
  if (kind === "question") {
    // Et spørgsmålstegn i en cirkel: ytringen er et spørgsmål til kilderne.
    return (
      <svg {...common}>
        <circle cx="12" cy="12" r="9" />
        <path d="M9.4 9.2a2.7 2.7 0 0 1 5.2.9c0 1.8-2.6 2.2-2.6 3.9" />
        <path d="M12 17.4h.01" />
      </svg>
    );
  }
  if (kind === "guide") {
    // En opslået bog: behandlingen ordret fra vidensbasen.
    return (
      <svg {...common}>
        <path d="M3.5 5.2A9.6 9.6 0 0 1 12 7a9.6 9.6 0 0 1 8.5-1.8v13A9.6 9.6 0 0 0 12 20a9.6 9.6 0 0 0-8.5-1.8Z" />
        <path d="M12 7v13" />
      </svg>
    );
  }
  // Tvivl: en åben ring. Ikke et advarselstegn — vi mangler blot ord.
  return (
    <svg {...common} strokeDasharray="3 3">
      <circle cx="12" cy="12" r="9" />
    </svg>
  );
}

/* ------------------------------------------------------------------ *
 * Eksemplerne
 * ------------------------------------------------------------------ */

/** De tre ytringer, og hvad hver af dem sætter i gang. */
const EXAMPLES: Array<{ text: keyof typeof t; kind: IntakeKind }> = [
  { text: "intakeExamplePatient", kind: "pathway" },
  { text: "intakeExampleQuestion", kind: "question" },
  { text: "intakeExampleGuide", kind: "guide" },
];

/**
 * Tre eksempler, én af hver slags — evnerne vist på ét sekund.
 *
 * Det afgørende er hvad et klik GØR: det fylder feltet. Det navigerer ikke, det
 * vælger ikke en tilstand, og det sender ikke. Derfor er rækken ikke en
 * fanebjælke i forklædning — den afleverer ord man kan rette i, og lader
 * genkendelsen tage stilling til dem lige for øjnene af én.
 *
 * Selve ytringen står øverst og med lægens egne ord; hvad appen så gør, står
 * under og småt. Omvendt rækkefølge ville gøre kortene til tre kategorier — og
 * dermed til netop det valg vi har taget fra ham.
 */
function ExampleRow({ lang, onPick }: { lang: Lang; onPick: (text: string) => void }) {
  return (
    <div className="mt-4">
      <p className="font-[family-name:var(--font-mono)] text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--ink-faint)]">
        {tr("intakeTry", lang)}
      </p>
      <div className="mt-2.5 grid gap-2.5 sm:grid-cols-3">
        {EXAMPLES.map((example) => (
          <button
            key={example.text}
            type="button"
            onClick={() => onPick(tr(example.text, lang))}
            className="group rounded-xl border border-[var(--line)] bg-[var(--paper)] px-3.5 py-3 text-left transition-colors hover:border-[var(--teal)] hover:bg-[var(--teal-tint)]"
          >
            {/*
              Fast højde på citatet. Dansk og engelsk er ikke lige lange, og
              uden den ville rækken skifte højde ved et sprogskift — det ene
              sted vi har lovet at intet flytter sig.
            */}
            <span className="block h-[3.6rem] overflow-hidden text-sm font-medium leading-snug text-[var(--ink)]">
              &ldquo;{tr(example.text, lang)}&rdquo;
            </span>
            <span className="mt-1.5 flex items-center gap-1.5 text-xs leading-snug text-[var(--ink-faint)] transition-colors group-hover:text-[var(--teal-deep)]">
              <span className="shrink-0" aria-hidden="true">
                →
              </span>
              <span className="truncate">{tr(SENSE[example.kind].does, lang)}</span>
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ *
 * Sporbarheden
 * ------------------------------------------------------------------ */

/**
 * Den anden halvdel af påstanden.
 *
 * At appen selv finder ud af hvad lægen har brug for, gør den smart. At hvert
 * svar kan spores til et navngivent dokument, er det der gør den klinisk
 * brugbar frem for imponerende. De to skal derfor stå lige synligt på forsiden
 * — ikke som en ansvarsfraskrivelse i bunden, men som en oplysning om hvor
 * indholdet kommer fra.
 *
 * Kilderne står med navn og ikke som "valideret indhold". Et navn kan slås op
 * og modsiges; en forsikring kan ikke.
 */
function ProvenanceStrip({ lang }: { lang: Lang }) {
  const sources = ["provenanceSource1", "provenanceSource2", "provenanceSource3"] as const;

  return (
    <section className="mt-4 rounded-2xl border border-[var(--line)] bg-[var(--nude-tint)] px-6 py-5 sm:px-8">
      <div className="flex items-start gap-3">
        <span className="mt-0.5 shrink-0 text-[var(--teal)]">
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={1.7}
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M12 3 4.5 6v5.4c0 4.4 3 8.2 7.5 9.6 4.5-1.4 7.5-5.2 7.5-9.6V6Z" />
            <path d="m9 12 2.2 2.2L15.4 10" />
          </svg>
        </span>
        <div className="min-w-0">
          <p className="text-[15px] font-semibold leading-snug text-[var(--ink)]">{tr("provenanceTitle", lang)}</p>
          <p className="mt-1.5 max-w-3xl text-sm leading-relaxed text-[var(--ink-soft)]">
            {tr("provenanceBody", lang)}
          </p>
          <ul className="mt-3 flex flex-wrap gap-2">
            {sources.map((key) => (
              <li
                key={key}
                className="rounded-full border border-[var(--nude-deep)] bg-[var(--paper-raised)] px-3 py-1 font-[family-name:var(--font-mono)] text-[11px] font-medium text-[var(--ink-soft)]"
              >
                <SizeLock variants={[t[key].da, t[key].en]}>{tr(key, lang)}</SizeLock>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
