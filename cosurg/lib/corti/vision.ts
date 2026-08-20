import type { Lang } from "@/lib/tree/types";
import { MODELS, kaldModelJson, type ModelBillede } from "./models";

/**
 * Sårfotos: fra billede til OBSERVATIONER — aldrig til en diagnose.
 *
 * Modellen (`corti-s1-mini-instant`, verificeret vision-kapabel 20/8; triage-
 * modellen `corti-s1-instant` afviser billeder med 400) beskriver hvad der KAN
 * SES: farve, afgrænsning, bullae, fugtighed — og hvad billedet IKKE kan
 * afgøre. Dybdevurdering kræver kapillærrespons og sensibilitet, og ingen af
 * delene findes i et fotografi. Det står i systemprompten, og det står i
 * outputtet, for en beskrivelse der lyder som en diagnose ER en diagnose for
 * en presset læser.
 *
 * Observationerne er MODELGENEREREDE og har ingen kilde. De behandles derfor
 * som ræsonnement hele vejen gennem svaret: blokken der bygges her siger det
 * eksplicit til svar-modellen, og `evidence` må aldrig kunne blive "sourced"
 * på baggrund af noget et billede viste.
 */

/** Klienten håndhæver 4 × 8 MB. Serveren stoler ikke på klienter. */
export const MAX_BILLEDER = 4;
export const MAX_BILLED_BYTES = 8 * 1024 * 1024;
/** Base64 fylder 4/3 — loftet i tegn, med lidt luft til padding. */
const MAX_BASE64_TEGN = Math.ceil((MAX_BILLED_BYTES * 4) / 3) + 8;

/** Formater vi sender videre. Alt andet afvises ved døren. */
const TILLADTE_TYPER = new Set(["image/jpeg", "image/png", "image/webp", "image/heic"]);

const BASE64_MOENSTER = /^[A-Za-z0-9+/]+={0,2}$/;

export interface ValideretBillede extends ModelBillede {
  name?: string;
}

/**
 * Valider klientens billedfelt. Returnerer en fejltekst i stedet for at kaste
 * — ruten skal svare 400 med en sætning, ikke 500 med en stack.
 */
export function validerBilleder(
  raw: unknown,
): { billeder: ValideretBillede[] } | { fejl: string } {
  if (raw === undefined || raw === null) return { billeder: [] };
  if (!Array.isArray(raw)) return { fejl: "images skal være en liste" };
  if (raw.length > MAX_BILLEDER) return { fejl: `Højst ${MAX_BILLEDER} billeder ad gangen` };

  const billeder: ValideretBillede[] = [];
  for (const entry of raw) {
    const o = (entry ?? {}) as Record<string, unknown>;
    const mediaType = typeof o.mediaType === "string" ? o.mediaType.toLowerCase().trim() : "";
    const data = typeof o.data === "string" ? o.data.trim() : "";

    if (!TILLADTE_TYPER.has(mediaType)) {
      return { fejl: `Uunderstøttet billedformat: ${mediaType.slice(0, 40) || "mangler"}` };
    }
    if (!data) return { fejl: "Et billede mangler data" };
    if (data.length > MAX_BASE64_TEGN) {
      return { fejl: `Et billede overskrider ${Math.round(MAX_BILLED_BYTES / 1024 / 1024)} MB` };
    }
    // Præfikset "data:…;base64," må ikke være der — så ville data-URI'en blive
    // dobbelt. Mønsteret fanger både det og alt andet der ikke er base64.
    if (!BASE64_MOENSTER.test(data)) {
      return { fejl: "Billeddata skal være ren base64 uden data-URI-præfiks" };
    }

    billeder.push({
      mediaType,
      data,
      name: typeof o.name === "string" ? o.name.slice(0, 120) : undefined,
    });
  }
  return { billeder };
}

export interface BilledObservationer {
  /** Hvad der kan ses, som forsigtig klinisk beskrivelse. */
  observations: string;
  /** Hvad billedet IKKE kan afgøre. Altid udfyldt — et foto kan aldrig alt. */
  uncertainty: string;
  /** Er billedkvaliteten et problem i sig selv (lys, fokus, afstand)? */
  qualityIssues?: string;
}

const SYSTEM = [
  "You describe clinical wound photographs for an emergency physician. You describe — you never diagnose.",
  "",
  "Reply with ONLY a JSON object, no prose and no code fence:",
  '{"observations":"...","uncertainty":"...","qualityIssues":"..."}',
  "",
  "observations — what can actually be SEEN, in cautious clinical language:",
  "- colour and its distribution (red, pale, white, brown, black, mixed)",
  "- demarcation and approximate extent relative to visible anatomy",
  "- surface: intact skin, blisters (bullae), broken blisters, moist or dry wound bed, charring",
  "- surroundings: oedema, erythema beyond the wound edge, visible contamination",
  "- anatomical location as far as the image shows it",
  "Use hedged phrasing throughout: 'appears', 'consistent with', 'cannot be excluded'.",
  "",
  "uncertainty — always filled in. State plainly what a photograph cannot establish:",
  "burn DEPTH requires capillary refill and sensation testing, neither of which an image contains;",
  "extent (TBSA) cannot be computed from one angle; time since injury is invisible.",
  "Never write a degree classification or a diagnosis as a conclusion — at most note which findings",
  "a clinician would weigh, and say the bedside examination decides.",
  "",
  "qualityIssues — only if lighting, focus, distance or framing genuinely limit the description. Else empty.",
  "",
  "If the image does not show a wound or skin at all, say exactly that in observations and leave the rest short.",
  "Never identify the person. Do not comment on faces, names or surroundings beyond clinical relevance.",
  "Write in the language you are asked to.",
].join("\n");

/**
 * Beskriv billederne. Kaster ved fejl — kalderen afgør om svaret kan fortsætte
 * uden billedanalysen, og det skal siges HØJT til brugeren i stedet for at
 * billedet stille bliver ignoreret.
 */
export async function beskrivBilleder(
  billeder: ValideretBillede[],
  question: string,
  lang: Lang,
  signal?: AbortSignal,
): Promise<BilledObservationer> {
  const language = lang === "da" ? "Danish" : "English";
  const raw = await kaldModelJson<Record<string, unknown>>({
    model: MODELS.synthesis,
    system: SYSTEM,
    user: [
      `Describe in ${language}. ${billeder.length === 1 ? "One image is" : `${billeder.length} images are`} attached.`,
      question ? `The clinician's question, for context only (do not answer it): "${question}"` : "",
      "Return the JSON object now.",
    ]
      .filter(Boolean)
      .join("\n"),
    images: billeder,
    maxTokens: 700,
    temperature: 0,
    timeoutMs: 20_000,
    signal,
  });

  const observations = typeof raw.observations === "string" ? raw.observations.trim() : "";
  if (!observations) throw new Error("Billedanalysen leverede ingen observationer");

  return {
    observations,
    uncertainty:
      typeof raw.uncertainty === "string" && raw.uncertainty.trim()
        ? raw.uncertainty.trim()
        : lang === "da"
        ? "Dybde og udbredelse kan ikke afgøres på et foto — det kræver undersøgelse ved sengen."
        : "Depth and extent cannot be settled from a photograph — that takes a bedside examination.",
    qualityIssues:
      typeof raw.qualityIssues === "string" && raw.qualityIssues.trim() ? raw.qualityIssues.trim() : undefined,
  };
}

/**
 * Observationerne som promptblok til svar-modellerne — hurtigspor og tungt spor
 * får den samme, så reglen ikke kan glide mellem sporene: billedfund er
 * ræsonnement, aldrig kilde.
 */
export function billedBlok(obs: BilledObservationer): string {
  return [
    "--- IMAGE OBSERVATIONS (model-generated from the attached photo(s) — NOT a source) ---",
    "These observations were produced by an image model. They are not a retrieved source and must be",
    "treated exactly like your own reasoning: anything you conclude from them goes in 'reasoning',",
    "never unmarked in 'answer', and they can never make an answer 'sourced' on their own.",
    "Relate them to the clinician's question, and repeat the stated uncertainty rather than smoothing it over.",
    "Never turn an observation into a depth grade or a diagnosis — the bedside examination decides.",
    "",
    `Observations: ${obs.observations}`,
    `What the image cannot establish: ${obs.uncertainty}`,
    obs.qualityIssues ? `Image quality limitations: ${obs.qualityIssues}` : "",
  ]
    .filter(Boolean)
    .join("\n");
}
