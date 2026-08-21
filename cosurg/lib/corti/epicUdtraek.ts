import type { AnsweredStep, Lang } from "@/lib/tree/types";
import { MODELS, kaldModel } from "./models";
import { beregnParkland, foersteTal, type ParklandResultat } from "./anamnese";
import { laesSkabelon, type EpicNoteResultat } from "./epicNote";

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
