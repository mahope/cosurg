import type { Lang } from "@/lib/tree/types";
import { MODELS, kaldModelJson } from "./models";

/**
 * Anamnesen: alt det vigtige ud over det brandsårsspecifikke.
 *
 * Målbilledet er Rigshospitalets AOP-journalskabelon
 * (`content/templates/aop-brandsaar.txt`): skadestidspunkt, CAVE, medicin,
 * tidligere sygdomme, vægt — felterne notatet skal kunne udfylde, og som
 * beslutningstræet ikke spørger om.
 *
 * To slags felter:
 *
 * - `ask`: spørges aktivt, ét ad gangen, EFTER træets kliniske spørgsmål — den
 *   akutte vurdering venter aldrig på et CAVE-svar.
 * - capture-only: spørges ALDRIG, men fanges når lægen selv nævner dem
 *   (alkohol, tobak, socialt, højde, ulykkessted …). Det er Mads' beslutning:
 *   "Alkohol/tobak/socialt spørges IKKE aktivt, men fanges hvis lægen nævner det."
 *
 * Samme grundregel som i træ-udtrækket: kun det der er sagt EKSPLICIT.
 * Fravær er aldrig et "nej", og et felt uden svar hedder *** i notatet —
 * et *** er ærligt, et gæt i en journal er farligt.
 */

export interface AnamneseFelt {
  id: string;
  /** Spørges der aktivt? Capture-only felter fanges kun. */
  ask: boolean;
  question: Record<Lang, string>;
  /** Hvad udtrækket skal lede efter — vises aldrig for lægen. */
  hint: string;
}

export const ANAMNESE_FELTER: AnamneseFelt[] = [
  {
    id: "injuryTime",
    ask: true,
    question: {
      da: "Hvornår skete skaden — klokkeslæt og dato? Det afgør væsketerapiens 8-timers-vindue.",
      en: "When did the injury happen — time and date? It sets the 8-hour fluid window.",
    },
    hint: "time and date of injury, or a relative time ('2 hours ago') exactly as stated",
  },
  {
    id: "cave",
    ask: true,
    question: {
      da: "Har patienten CAVE — allergi over for medicin?",
      en: "Any CAVE — drug allergies?",
    },
    hint: "drug allergies / CAVE. 'ingen' only if the clinician SAYS none",
  },
  {
    id: "medications",
    ask: true,
    question: {
      da: "Får patienten fast medicin — særligt antikoagulantia eller diabetesmedicin?",
      en: "Any regular medication — especially anticoagulants or diabetes drugs?",
    },
    hint: "regular medications by name (Eliquis, Marevan, Metformin, insulin, ...)",
  },
  {
    id: "priorConditions",
    ask: true,
    question: {
      da: "Tidligere sygdomme af betydning?",
      en: "Any significant medical history?",
    },
    hint: "prior conditions / comorbidity (diabetes, heart disease, ...)",
  },
  {
    id: "weight",
    ask: true,
    question: {
      da: "Hvad vejer patienten cirka? Vægten indgår i væskeberegningen.",
      en: "Approximate weight? It goes into the fluid calculation.",
    },
    hint: "body weight in kg, only if a number is stated",
  },
  { id: "height", ask: false, question: { da: "Højde", en: "Height" }, hint: "height in cm, only if stated" },
  {
    id: "accidentSite",
    ask: false,
    question: { da: "Ulykkessted", en: "Accident site" },
    hint: "where the accident happened (home, workplace, ...)",
  },
  {
    id: "activity",
    ask: false,
    question: { da: "I forbindelse med", en: "Activity" },
    hint: "what the patient was doing when injured",
  },
  {
    id: "tbsaRegions",
    ask: false,
    question: { da: "Areal pr. region", en: "Area per region" },
    hint: "burn area split per region (head/neck, upper limb, trunk, lower limb, genitals) if stated per region",
  },
  {
    id: "childVaccination",
    ask: false,
    question: { da: "Børnevaccination", en: "Child vaccination" },
    hint: "whether a CHILD follows the vaccination programme, only if mentioned",
  },
  { id: "alcohol", ask: false, question: { da: "Alkohol", en: "Alcohol" }, hint: "alcohol habits, only if mentioned" },
  { id: "tobacco", ask: false, question: { da: "Tobak", en: "Tobacco" }, hint: "smoking habits, only if mentioned" },
  { id: "social", ask: false, question: { da: "Socialt", en: "Social" }, hint: "living situation, only if mentioned" },
];

const FELT_IDS = new Set(ANAMNESE_FELTER.map((f) => f.id));
const MAX_VAERDI = 300;

/** Antal felter der spørges aktivt — bruges til en STABIL fremdriftstæller. */
export const ANTAL_SPURGTE_FELTER = ANAMNESE_FELTER.filter((f) => f.ask).length;

/**
 * "Nej" er det mest naturlige svar i verden på "har patienten CAVE?" — og det
 * må ALDRIG koste en Models-rundtur eller, værre, blive afvist. Korte negative
 * svar genkendes derfor deterministisk, før nogen model spørges.
 */
const NEGATION =
  /^(nej|nope|niks|nix|no|none|ingen|intet|ikke noget|ikke nogen|nej ingen|nej intet|ingen kendte|nej tak|nul)[.!,]?$/i;

export function erNegativtSvar(s: string): boolean {
  return NEGATION.test(s.trim());
}

/**
 * Hvad et "nej" BETYDER afhænger af feltet: på CAVE betyder det "ingen kendte
 * allergier", på vægt betyder det bare at lægen ikke oplyste den. Værdien
 * skrives ud i journalen, så den skal være en færdig klinisk formulering.
 */
export function negativVaerdi(feltId: string, lang: Lang): string {
  const da: Record<string, string> = {
    cave: "Ingen kendte allergier",
    medications: "Ingen fast medicin",
    priorConditions: "Ingen tidligere sygdomme af betydning",
  };
  const en: Record<string, string> = {
    cave: "No known allergies",
    medications: "No regular medication",
    priorConditions: "No significant medical history",
  };
  return (lang === "da" ? da : en)[feltId] ?? (lang === "da" ? "Ikke oplyst" : "Not stated");
}

/** Klientens medbragte anamnese: kun kendte felter, kappede værdier. */
export function rensAnamnese(raw: unknown): Record<string, string> {
  const ud: Record<string, string> = {};
  if (!raw || typeof raw !== "object") return ud;
  for (const [k, v] of Object.entries(raw as Record<string, unknown>)) {
    if (FELT_IDS.has(k) && typeof v === "string" && v.trim()) ud[k] = v.trim().slice(0, MAX_VAERDI);
  }
  return ud;
}

const UDTRAEK_SYSTEM = [
  "You extract anamnesis facts from ONE clinician utterance for a burn admission note.",
  "Reply with ONLY a JSON object mapping field ids to the value AS STATED, no prose, no code fence.",
  'Example: {"injuryTime":"for 2 timer siden","weight":"90 kg"}',
  "",
  "THE RULES — the safe direction is to leave a field out:",
  "- Fill a field ONLY when the utterance states it explicitly. Absence is NEVER 'none'.",
  "- Keep the clinician's own words, in their language. Do not normalise, do not expand, do not diagnose.",
  "- Numbers only when actually stated.",
  "- If nothing matches, return {}.",
].join("\n");

/**
 * Fang anamnese-felter i en ytring. Kaster aldrig — et fejlet kald betyder
 * bare at intet blev fanget, og felterne kan stadig besvares når der spørges.
 */
export async function udtraekAnamnese(
  utterance: string,
  lang: Lang,
  signal?: AbortSignal,
  /**
   * Feltet appen LIGE har spurgt om. Uden det kan et kort svar ("Nej", "90")
   * ikke placeres — det var præcis fejlen der lod "Nej" prelle af på
   * CAVE-spørgsmålet: udtrækket anede ikke hvad der var blevet spurgt om.
   */
  spurgtFelt?: AnamneseFelt,
): Promise<Record<string, string>> {
  try {
    const raw = await kaldModelJson<Record<string, unknown>>({
      model: MODELS.triage,
      system: UDTRAEK_SYSTEM,
      user: [
        spurgtFelt
          ? `The app just asked the clinician about the field '${spurgtFelt.id}': "${spurgtFelt.question[lang]}"\n` +
            `A short or bare answer ("nej", "ingen", a lone number) answers THAT field — record it there, ` +
            `as a finished clinical phrase in the clinician's language (e.g. "ingen kendte allergier").`
          : "",
        `The clinician (${lang === "da" ? "Danish" : "English"}) said:`,
        `"${utterance}"`,
        "",
        "Fields to look for:",
        ...ANAMNESE_FELTER.map((f) => `- ${f.id}: ${f.hint}`),
        "",
        "Return the JSON object now.",
      ]
        .filter(Boolean)
        .join("\n"),
      maxTokens: 350,
      timeoutMs: 8_000,
      signal,
    });
    return rensAnamnese(raw);
  } catch {
    return {};
  }
}

/** De aktivt spurgte felter der stadig mangler, i katalog-rækkefølge. */
export function manglendeFelter(anamnese: Record<string, string>): AnamneseFelt[] {
  return ANAMNESE_FELTER.filter((f) => f.ask && !anamnese[f.id]);
}

export function findFelt(id: string): AnamneseFelt | undefined {
  return ANAMNESE_FELTER.find((f) => f.id === id);
}

/* ------------------------------------------------------------------ */
/* Parkland — beregnet i kode, aldrig af en model                      */
/* ------------------------------------------------------------------ */

export interface ParklandResultat {
  vaegtKg: number;
  tbsaPct: number;
  totalMl: number;
  foersteOtteTimerMl: number;
  /** Formlen og kilden, klar til notat og UI. */
  tekst: string;
  kilde: string;
}

/** Første tal i en frit formuleret vægt/procent-streng. */
export function foersteTal(s: string | undefined): number | null {
  if (!s) return null;
  const m = /(\d+(?:[.,]\d+)?)/.exec(s);
  if (!m) return null;
  const n = Number(m[1].replace(",", "."));
  return Number.isFinite(n) && n > 0 ? n : null;
}

/**
 * Parkland-formlen som skabelonen og brandsaar.dk bruger: 3 ml × kg × TBSA%.
 *
 * Et regnestykke hører til i kode: modellen må CITERE tallet, aldrig regne
 * det. Halvdelen gives inden for 8 timer FRA SKADESTIDSPUNKTET — derfor er
 * skadestidspunktet et af de felter udredningen insisterer på — og væske
 * givet før ankomst modregnes.
 */
export function beregnParkland(vaegtKg: number | null, tbsaPct: number | null): ParklandResultat | null {
  if (!vaegtKg || !tbsaPct || vaegtKg <= 0 || tbsaPct <= 0 || tbsaPct > 100 || vaegtKg > 400) return null;
  const total = Math.round(3 * vaegtKg * tbsaPct);
  return {
    vaegtKg,
    tbsaPct,
    totalMl: total,
    foersteOtteTimerMl: Math.round(total / 2),
    tekst:
      `Parkland (vejledende): 3 ml × ${vaegtKg} kg × ${tbsaPct} % TBSA = ${total} ml Ringer-laktat i første døgn, ` +
      `heraf ${Math.round(total / 2)} ml inden for de første 8 timer regnet fra skadestidspunktet. ` +
      `Væske givet på skadested/under transport modregnes.`,
    kilde: "brandsaar.dk/vaeskebehandling",
  };
}
