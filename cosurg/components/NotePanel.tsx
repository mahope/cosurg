import type { Lang } from "@/lib/tree/types";
import { tr } from "@/lib/i18n";

/** Én kode som ruten leverer den — koden selv er Cortis, begrundelsen er agentens. */
export interface NoteCode {
  code: string;
  system?: string;
  description: string;
  rationale?: string;
  /** Hvad i materialet der bærer koden. Kilden er kontekstens navn, ikke en model. */
  evidences?: Array<{ source: string; text: string }>;
  alternatives?: Array<{ code: string; display: string }>;
}

export interface NoteResult {
  note: string;
  /** Koder Corti mener skal med. */
  codes: NoteCode[];
  /** Klinisk relevante, men valgfrie — de er FORSLAG og må ikke se ud som fakta. */
  candidates?: NoteCode[];
  coding?: {
    source?: string;
    system?: string;
    status?: "ok" | "empty" | "insufficient-context" | "error";
    /** Færdig klinisk sætning på brugerens sprog når der ingen koder er. */
    message?: string | null;
    detail?: string | null;
    attempts?: number;
    credits?: number | null;
  };
}

interface NotePanelProps {
  note: NoteResult;
  lang: Lang;
  orMode?: boolean;
}

interface Tone {
  ink: string;
  faint: string;
  accent: string;
  line: string;
  quiet: string;
}

/**
 * Én kode med sit belæg. Belægget er hele pointen: koden er ikke gættet af en
 * sprogmodel, den peger tilbage på en konkret sætning i beslutningsvejen, i
 * konsultationen eller i lægens diktat. Derfor står kilden ved hvert citat.
 */
function CodeItem({ c, tone, lang }: { c: NoteCode; tone: Tone; lang: Lang }) {
  return (
    <li className={`border-t pt-2.5 first:border-t-0 first:pt-0 ${tone.line}`}>
      <p className={`font-[family-name:var(--font-mono)] text-sm ${tone.ink}`}>
        <span className={`font-semibold ${tone.accent}`}>{c.code}</span> — {c.description}
      </p>

      {c.rationale && <p className={`mt-1 text-[13px] leading-snug ${tone.quiet}`}>{c.rationale}</p>}

      {c.evidences && c.evidences.length > 0 && (
        <ul className="mt-1.5 space-y-1">
          {c.evidences.map((e, i) => (
            <li key={i} className={`text-xs leading-snug ${tone.quiet}`}>
              <span className="font-[family-name:var(--font-mono)] font-semibold uppercase tracking-[0.14em]">
                {e.source}
              </span>
              : &ldquo;{e.text}&rdquo;
            </li>
          ))}
        </ul>
      )}

      {c.alternatives && c.alternatives.length > 0 && (
        <p className={`mt-1.5 font-[family-name:var(--font-mono)] text-xs leading-snug ${tone.faint}`}>
          {tr("alternatives", lang)}: {c.alternatives.map((a) => `${a.code} ${a.display}`).join(" · ")}
        </p>
      )}
    </li>
  );
}

/** Journalnotat + koder — sat i mono, samme konvention som et journaludtræk. */
export function NotePanel({ note, lang, orMode }: NotePanelProps) {
  const surface = orMode ? "border-[var(--or-line)] bg-[var(--or-surface)]" : "bg-[var(--paper-raised)]";
  const tone: Tone = orMode
    ? {
        ink: "text-[var(--or-ink)]",
        faint: "text-[var(--or-ink-soft)]",
        accent: "text-[var(--or-accent)]",
        line: "border-[var(--or-line)]",
        quiet: "text-[var(--or-ink-soft)]",
      }
    : {
        ink: "text-[var(--ink)]",
        faint: "text-[var(--ink-faint)]",
        accent: "text-[var(--teal-deep)]",
        line: "border-[var(--line)]",
        quiet: "text-[var(--ink-soft)]",
      };

  const codes = note.codes ?? [];
  const candidates = note.candidates ?? [];
  const heading = `font-[family-name:var(--font-mono)] text-[11px] font-semibold uppercase tracking-[0.14em] ${tone.faint}`;

  return (
    /*
      Notatet afløser skelettet på samme plads, og bevægelsen siger "erstattet",
      ikke "nyt": en ren indtoning. Et ryk her ville få lægen til at tro at
      noget kom oveni det han allerede læste.
    */
    <section
      aria-label={tr("note", lang)}
      className={`motion-fade mt-6 rounded-2xl border p-6 sm:p-7 ${surface}`}
    >
      <h3 className={`font-[family-name:var(--font-display)] text-lg font-semibold ${tone.ink}`}>
        {tr("note", lang)}
      </h3>
      <pre
        className={`mt-3 whitespace-pre-wrap font-[family-name:var(--font-mono)] text-[13px] leading-relaxed ${tone.ink}`}
      >
        {note.note}
      </pre>

      <div className="mt-6 flex flex-wrap items-baseline gap-x-2 gap-y-1">
        <h4 className={heading}>{tr("codes", lang)}</h4>
        {/* Hvorfra og efter hvilket kodesystem — påstanden skal kunne efterprøves. */}
        <p className={`font-[family-name:var(--font-mono)] text-[11px] ${tone.faint}`}>
          {tr("codesSource", lang)}
          {note.coding?.system ? ` · ${note.coding.system}` : ""}
        </p>
      </div>

      {codes.length > 0 ? (
        <ul className="mt-2 space-y-2.5">
          {codes.map((c) => (
            <CodeItem key={c.code} c={c} tone={tone} lang={lang} />
          ))}
        </ul>
      ) : candidates.length === 0 ? (
        /*
         * Et tomt kodefelt uden forklaring er værre end ingen kode: lægen kan
         * ikke se om systemet svarede "ingen kode" eller slet ikke svarede.
         * Ruten leverer en færdig klinisk sætning — vi viser den ordret.
         */
        <p
          className={`mt-2 rounded-lg border px-3 py-2.5 text-sm leading-relaxed ${tone.ink} ${
            orMode
              ? "border-[var(--or-amber)] bg-[var(--or-amber-soft)]"
              : "border-[var(--nude-deep)] bg-[var(--nude-tint)]"
          }`}
        >
          {note.coding?.message ?? tr("noCodes", lang)}
        </p>
      ) : null}

      {candidates.length > 0 && (
        /*
         * Forslag, ikke koder. Den stiplede ramme og overskriften er hele
         * forskellen mellem "Corti har kodet dette" og "en kliniker bør se på
         * det" — de to må aldrig kunne læses som det samme.
         */
        <div className={`mt-5 rounded-xl border border-dashed p-4 ${tone.line}`}>
          <h4 className={heading}>{tr("candidates", lang)}</h4>
          <p className={`mt-1 text-xs leading-snug ${tone.quiet}`}>{tr("candidatesNote", lang)}</p>
          <ul className="mt-2.5 space-y-2.5">
            {candidates.map((c) => (
              <CodeItem key={c.code} c={c} tone={tone} lang={lang} />
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}
