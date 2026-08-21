import type { AnsweredStep, Lang } from "@/lib/tree/types";
import { MODELS, kaldModel } from "./models";
import { beregnParkland, foersteTal, negativVaerdi, type ParklandResultat } from "./anamnese";
import { laesSkabelon, type EpicNoteResultat, type ManglendeFelt } from "./epicNote";

/**
 * AI-udfyldning af Epic-notatet — modellen skriver, koden kontrollerer.
 *
 * Modellen får HELE skabelonen og HELE samtalematerialet (lægens ytringer,
 * udredningens Q&A, den fangede anamnese, diktatet, anbefalingen) og
 * returnerer det færdige notat. Det giver rigtigt journalsprog og udfyldte
 * objektive fund — men kun fordi kontrollen bagefter er deterministisk og
 * kompromisløs:
 *
 *   1. TOKEN-VAGTEN: hver Epic-kode (@..@, {..}) i skabelonen skal stå i
 *      modellens output PRÆCIS lige så mange gange, tegn for tegn — og
 *      modellen må ikke opfinde nye. Én afvigelse → ét retry med fejlbesked,
 *      derefter falder ruten tilbage til den deterministiske udfyldning.
 *      En korrumperet Epic-kode når ALDRIG klienten.
 *   2. PARKLAND-VAGTEN: væsketallet beregnes i kode (3 ml × kg × TBSA%) og
 *      gives til modellen som færdig tekst. Outputtet skal citere netop det
 *      total — og uden kendt vægt/TBSA må der slet ikke stå et regnestykke.
 *   3. Ukendt = ***: modellen instrueres hårdt i aldrig at opfinde kliniske
 *      fakta. Hvad samtalen ikke siger, bliver stående som *** til lægen.
 */

const TOKEN_RE = /@[^@\s]+@|\{[^{}]+\}/g;

/** Optælling af hver Epic-token — multiset, fordi flere tokens går igen. */
function taelTokens(tekst: string): Map<string, number> {
  const m = new Map<string, number>();
  for (const t of tekst.match(TOKEN_RE) ?? []) m.set(t, (m.get(t) ?? 0) + 1);
  return m;
}

/**
 * Sammenlign skabelonens tokens med outputtets. Returnerer fejlbeskeder —
 * tom liste betyder at hver eneste Epic-kode har overlevet ordret.
 */
export function validerTokens(skabelon: string, output: string): string[] {
  const krav = taelTokens(skabelon);
  const fundet = taelTokens(output);
  const fejl: string[] = [];
  for (const [token, antal] of krav) {
    const har = fundet.get(token) ?? 0;
    if (har !== antal) fejl.push(`Placeholder ${token} must appear exactly ${antal} time(s); found ${har}.`);
  }
  for (const token of fundet.keys()) {
    if (!krav.has(token)) fejl.push(`Placeholder ${token} does not exist in the template — remove it.`);
  }
  return fejl;
}

/** Parkland-vagten: rigtigt tal når vi kender det, intet regnestykke når vi ikke gør. */
export function validerParkland(output: string, parkland: ParklandResultat | null): string[] {
  if (parkland) {
    return output.includes(`${parkland.totalMl} ml`)
      ? []
      : [`The fluid plan must quote the provided Parkland total of ${parkland.totalMl} ml verbatim.`];
  }
  return /=\s*\d+\s*ml/.test(output)
    ? ["No weight/TBSA was provided, so the note must not contain any calculated fluid volume."]
    : [];
}

/**
 * Negations-udsagn i samtalen ER svar: "ingen allergier" er ikke fravær af
 * information, det er informationen "Ingen kendte allergier". Fanges
 * deterministisk (regex, da+en) og flettes ind i anamnesen FØR notatet
 * bygges — så udfylder både model-vejen og reserven feltet, og
 * `manglende` spørger ikke om noget samtalen allerede har afkræftet.
 * Eksplicitte anamnese-svar fra klienten vinder altid over scanningen.
 *
 * Produktionsfund 21/8: "Ingen allergier" i transskriptet lod CAVE stå
 * åbent OG udløste spørgsmålet "Har patienten CAVE?". Dette er rettelsen.
 */
const NEGATIONS_MOENSTRE: Array<{ felt: string; re: RegExp }> = [
  {
    felt: "cave",
    re: /\b(?:ingen|ikke)\s+(?:kendte\s+)?allergi(?:er)?\b|\bikke\s+allergisk\b|\bingen\s+cave\b|\bno\s+(?:known\s+)?allerg(?:y|ies)\b|\bnot\s+allergic\b/i,
  },
  {
    felt: "medications",
    re: /\bingen\s+(?:fast\s+)?medicin\b|\bf(?:aa|å)r\s+ikke\s+(?:nogen\s+|noget\s+)?medicin\b|\bno\s+(?:regular\s+)?medications?\b/i,
  },
  {
    felt: "priorConditions",
    re: /\bingen\s+tidligere\s+sygdomme?\b|\bellers\s+(?:sund\s+og\s+)?rask\b|\btidligere\s+rask\b|\bno\s+(?:significant\s+)?(?:medical\s+)?history\b|\botherwise\s+healthy\b/i,
  },
];

export function fangNegationer(tekst: string, lang: Lang): Record<string, string> {
  const ud: Record<string, string> = {};
  if (!tekst.trim()) return ud;
  for (const { felt, re } of NEGATIONS_MOENSTRE) {
    if (re.test(tekst)) ud[felt] = negativVaerdi(felt, lang);
  }
  return ud;
}

/**
 * De klinisk vigtigste huller i et FÆRDIGT notat — som spørgsmål lægen kan
 * besvare, hvorefter et nyt notat-kald udfylder mere. Bevidst højst 4 og i
 * klinisk prioritetsorden (vægt og TBSA driver Parkland, tid driver
 * 8-timers-vinduet) — ni spørgsmål på én gang er støj, fire er en plan.
 *
 * Kilderne er deterministiske: Parkland-input beregnes af kode, og de øvrige
 * aflæses på om notatets egne ***-ankre stadig står åbne — dét er sandheden om
 * hvad modellen faktisk kunne udfylde.
 */
export function findManglende(
  resultat: EpicNoteResultat,
  path: AnsweredStep[],
  anamnese: Record<string, string>,
  lang: Lang,
): ManglendeFelt[] {
  const vaegt = foersteTal(anamnese.weight);
  const tbsa =
    foersteTal(path.find((s) => s.nodeId === "tbsa")?.value) ?? foersteTal(anamnese.tbsaRegions);
  const da = lang === "da";
  const note = resultat.note;
  const kandidater: Array<{ mangler: boolean } & ManglendeFelt> = [
    {
      felt: "weight",
      mangler: !vaegt,
      spoergsmaal: da
        ? "Hvad vejer patienten cirka (kg)? Vægten indgår i væskeberegningen."
        : "Approximate weight (kg)? It goes into the fluid calculation.",
    },
    {
      felt: "tbsa",
      mangler: !tbsa,
      spoergsmaal: da
        ? "Hvor stort er det forbrændte areal i % af kropsoverfladen (TBSA)?"
        : "How large is the burned area in % of body surface (TBSA)?",
    },
    {
      felt: "injuryTime",
      mangler: note.includes("Ulykkestid tid og dato ***"),
      spoergsmaal: da
        ? "Hvornår skete skaden — klokkeslæt og dato? Det afgør 8-timers-vinduet."
        : "When did the injury happen — time and date? It sets the 8-hour fluid window.",
    },
    {
      felt: "cave",
      mangler: !anamnese.cave && /@CAVE@\s*\n\s*\n/.test(note),
      spoergsmaal: da ? "Har patienten CAVE — allergi over for medicin?" : "Any CAVE — drug allergies?",
    },
    {
      felt: "medications",
      mangler: !anamnese.medications && /@FMKAKTUELMEDICINHENV@\s*\n\s*\n/.test(note),
      spoergsmaal: da
        ? "Får patienten fast medicin — særligt antikoagulantia eller diabetesmedicin?"
        : "Any regular medication — especially anticoagulants or diabetes drugs?",
    },
    {
      felt: "forbraendingsgrad",
      mangler: note.includes("Forbrændingsgrad ***"),
      spoergsmaal: da
        ? "Hvilken forbrændingsgrad vurderes skaden til?"
        : "What burn depth/degree is the injury assessed at?",
    },
  ];
  return kandidater
    .filter((k) => k.mangler)
    .slice(0, 4)
    .map(({ felt, spoergsmaal }) => ({ felt, spoergsmaal }));
}

const SYSTEM = [
  "You fill in a Danish hospital admission note template (AOP) for a burn patient.",
  "You are given the template and the complete clinical material from the encounter.",
  "Output ONLY the finished note text — no preamble, no code fence, no commentary.",
  "",
  "ABSOLUTE RULES:",
  "- The template contains EHR placeholders like @NAME@ and {name:12345}. Reproduce every one",
  "  EXACTLY, character for character. Never translate, alter, remove or invent placeholders.",
  "  Never delete a line that contains a placeholder. You may add extracted values AFTER a",
  "  placeholder in square brackets, e.g. '{x:1} [fra samtalen: ...]'.",
  "- '***' marks a field for the clinician. Replace a *** ONLY when the material explicitly",
  "  states that value. If the material does not state it, KEEP the *** unchanged.",
  "- Explicit negatives ARE values: 'ingen allergier' fills CAVE as 'Ingen kendte allergier';",
  "  'ingen tidligere sygdomme' / 'ellers rask' fills prior history as 'Ingen tidligere sygdomme",
  "  af betydning'; 'ingen fast medicin' fills medication as 'Ingen fast medicin'. Only SILENCE",
  "  — nothing said either way — keeps a ***.",
  "- NEVER invent clinical facts. NEVER calculate anything — no fluid volumes, no derived",
  "  numbers. Numbers only as literally stated in the material.",
  "- If a precomputed fluid plan (Parkland) is provided, insert its text verbatim under the",
  "  fluid therapy placeholder. If none is provided, leave that section's *** untouched.",
  "- Blocks that only apply to specific patients (diabetes medication; relief incisions for",
  "  circumferential burns) may be removed ONLY when the material shows the condition is",
  "  absent — but never remove placeholder lines. When unknown, keep the block with its ***.",
  "- Keep the template's headings, order and structure. Write filled values in Danish",
  "  clinical journal style: concise, telegraphic, professional.",
].join("\n");

export interface EpicAiInput {
  path: AnsweredStep[];
  anamnese: Record<string, string>;
  /** Lægens ytringer, én pr. linje. */
  transcript: string;
  dictation: string;
  /** Udredningens Q&A som klinisk læsbar tekst. */
  pathText: string;
  disposition: { title: string; guidance: string } | null;
  lang: Lang;
}

function bygMateriale(input: EpicAiInput, parkland: ParklandResultat | null): string {
  const anamneseLinjer = Object.entries(input.anamnese)
    .map(([k, v]) => `- ${k}: ${v}`)
    .join("\n");
  return [
    `The clinician speaks ${input.lang === "da" ? "Danish" : "English"}.`,
    input.transcript ? `\nClinician's utterances during the encounter:\n${input.transcript}` : "",
    input.pathText ? `\nStructured workup (question/answer):\n${input.pathText}` : "",
    anamneseLinjer ? `\nCaptured anamnesis fields:\n${anamneseLinjer}` : "",
    input.dictation ? `\nClinician's dictated addendum:\n${input.dictation}` : "",
    input.disposition
      ? `\nRecommendation reached by the decision support:\n${input.disposition.title}. ${input.disposition.guidance}`
      : "",
    parkland
      ? `\nPrecomputed fluid plan — insert this text VERBATIM under the fluid therapy placeholder:\n${parkland.tekst}\n[Kilde: ${parkland.kilde}]`
      : "\nNo weight/TBSA is known, so no fluid volume may appear in the note.",
  ]
    .filter(Boolean)
    .join("\n");
}

/** Fjern et eventuelt kodehegn — modellen bliver bedt om at lade være, men alligevel. */
function afhegn(tekst: string): string {
  return tekst.replace(/^```[a-z]*\s*/i, "").replace(/\s*```$/, "").trim();
}

/**
 * Sporbarhed til panelet: hvilke ***-linjer fra skabelonen står nu udfyldt?
 * Matcher på linjens præfiks før første *** — billigt, men ærligt: kun linjer
 * der beviseligt har mistet deres *** tælles med.
 */
function findUdfyldte(skabelon: string, output: string): string[] {
  const udLinjer = output.split("\n");
  const udfyldte: string[] = [];
  for (const linje of skabelon.split("\n")) {
    if (!linje.includes("***")) continue;
    const praefiks = linje.slice(0, linje.indexOf("***")).trim();
    if (praefiks.length < 3) continue;
    if (udLinjer.some((l) => l.trim().startsWith(praefiks) && !l.includes("***"))) {
      udfyldte.push(praefiks.replace(/[:\s]+$/, "").slice(0, 48));
    }
  }
  return udfyldte;
}

function findUdeladteBlokke(output: string): string[] {
  const blokke: string[] = [];
  if (!output.includes("Metformin")) blokke.push("DM/Metformin/Novorapid");
  if (!output.includes("aflastende incisioner")) blokke.push("tourniquet/aflastende incisioner");
  return blokke;
}

/**
 * Lad modellen udfylde hele notatet — med token- og Parkland-vagt bagefter.
 *
 * Returnerer null når begge forsøg fejler validering eller kaldet fejler;
 * kalderen falder da tilbage til den deterministiske udfyldning. Kaster aldrig.
 */
export async function udfyldEpicNoteMedAi(input: EpicAiInput): Promise<EpicNoteResultat | null> {
  let skabelon: string;
  try {
    skabelon = laesSkabelon();
  } catch {
    return null;
  }

  // Parkland beregnes HER, i kode, af de samme kilder som den deterministiske
  // vej: vægten fra anamnesen, TBSA fra træet eller region-opdelingen.
  const vaegt = foersteTal(input.anamnese.weight);
  const tbsa =
    foersteTal(input.path.find((s) => s.nodeId === "tbsa")?.value) ??
    foersteTal(input.anamnese.tbsaRegions);
  const parkland = beregnParkland(vaegt, tbsa);

  const materiale = bygMateriale(input, parkland);
  const grundPrompt = [
    "TEMPLATE (fill this in, following the system rules):",
    "-----",
    skabelon,
    "-----",
    "",
    "CLINICAL MATERIAL (the only source of facts):",
    materiale,
    "",
    "Return the finished note now.",
  ].join("\n");

  let sidsteFejl: string[] = [];
  for (let forsoeg = 0; forsoeg < 2; forsoeg++) {
    let output: string;
    try {
      output = afhegn(
        await kaldModel({
          model: MODELS.synthesis,
          system: SYSTEM,
          user:
            forsoeg === 0
              ? grundPrompt
              : `${grundPrompt}\n\nYour previous attempt was rejected by validation:\n${sidsteFejl
                  .map((f) => `- ${f}`)
                  .join("\n")}\nFix these and return the full note again.`,
          maxTokens: 2200,
          temperature: 0,
          timeoutMs: 30_000,
        }),
      );
    } catch {
      return null;
    }

    sidsteFejl = [
      ...validerTokens(skabelon, output),
      ...validerParkland(output, parkland),
      ...(output.startsWith("AOP") ? [] : ["The note must start with the template's 'AOP' heading."]),
      ...(output.length < skabelon.length / 2 ? ["The note is implausibly short — fill the template, do not summarise it."] : []),
    ];
    if (sidsteFejl.length > 0) continue;

    const udfyldte = findUdfyldte(skabelon, output);
    if (parkland) udfyldte.push("Parkland (beregnet i kode, citeret af modellen)");
    return {
      note: output,
      udfyldte,
      udeladteBlokke: findUdeladteBlokke(output),
      aabneFelter: (output.match(/\*\*\*/g) ?? []).length,
      parkland,
      kilde: "model",
    };
  }
  return null;
}
