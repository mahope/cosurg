import { CORTI_API_BASE, TIMEOUTS, cortiHeaders, getAccessToken } from "./auth";

/**
 * Corti Symphony — Medical Coding.
 *
 * Koderne kommer HERFRA, ikke fra en sprogmodel. Det er hele pointen: en agent der
 * "husker" ICD-10 kan hallucinere en kode der ser rigtig ud; dette endpoint slår op
 * i det faktiske kodesystem og leverer evidens-spans tilbage i teksten.
 *
 * POST https://api.$env.corti.app/v2/tools/coding/
 * Docs: /coding/overview, /coding/how-it-works, /coding/introduction
 */

/**
 * Kodesystemer vi rent faktisk har adgang til med vores hackathon-credentials.
 * Verificeret ved probe mod EU-miljøet 20-08-2026 — alt andet gav
 * 400 "The system '<x>' is not supported".
 *
 * SKS (dansk ICD-10, /coding/icd-10-dk) er dokumenteret men i tidlig alpha og kun
 * åben for udvalgte partnere. Alle danske varianter blev afvist med 400:
 * "sks", "sks-diagnosis", "icd10dk", "icd10dk-inpatient", "icd10dk-outpatient",
 * "icd10-dk". Vi bruger derfor international ICD-10 — som SKS' diagnosedel er en
 * dansk udvidelse af, så T- og J-koderne herunder er identiske med SKS' egne
 * (SKS skriver dem uden punktum og med "D"-præfiks, fx DT20.2).
 * Får vi alpha-adgang, sættes CORTI_CODING_SYSTEM og intet andet skal ændres.
 */
export const CODING_SYSTEMS = [
  "icd10int-outpatient",
  "icd10int-inpatient",
  "icd10cm-outpatient",
  "icd10cm-inpatient",
  "icd10uk-outpatient",
  "icd10gm-outpatient",
] as const;

export type CodingSystem = (typeof CODING_SYSTEMS)[number];

/**
 * Akut brandsårsvurdering er en skadestue-/akutmodtagelseskontakt, så outpatient er
 * det rigtige udgangspunkt. Kan overstyres pr. kald eller via miljøet (fx den dag
 * vi får SKS-adgang).
 */
export const DEFAULT_CODING_SYSTEM: string =
  process.env.CORTI_CODING_SYSTEM ?? "icd10int-outpatient";

export function isKnownSystem(value: unknown): value is CodingSystem {
  return typeof value === "string" && (CODING_SYSTEMS as readonly string[]).includes(value);
}

export interface CodeEvidence {
  /** Indeks i det context-array vi sendte — fortæller HVILKEN kilde koden hviler på. */
  contextIndex: number;
  /** Tekstuddraget. Se repairEvidence() nedenfor. */
  text: string;
  start: number;
  end: number;
}

export interface PredictedCode {
  system: string;
  code: string;
  display: string;
  evidences?: CodeEvidence[];
  alternatives?: Array<{ code: string; display: string }>;
}

export interface CodingResponse {
  codes: PredictedCode[];
  candidates: PredictedCode[];
  usageInfo?: { creditsConsumed?: number };
}

export interface CodingContextItem {
  /** Menneskeligt navn på kilden — bruges til at forklare evidensen i UI'et. */
  label: string;
  text: string;
}

/**
 * Hvad der faktisk skete. UI'et skal aldrig vise et tomt kodefelt uden forklaring:
 * "ingen kode kunne fastsættes" og "vi nåede ikke at spørge" er to forskellige ting,
 * og i en klinisk kontekst må de ikke se ens ud.
 */
export type CodingStatus =
  /** Corti returnerede mindst én kode. */
  | "ok"
  /** Kaldet lykkedes, men modellen fandt ingen kode i materialet. */
  | "empty"
  /** For lidt klinisk tekst til at kode meningsfuldt — vi kaldte slet ikke. */
  | "insufficient-context"
  /** Kaldet fejlede (netværk, timeout, 4xx/5xx). */
  | "error";

/**
 * Under denne mængde klinisk tekst er et kodesvar ikke troværdigt — modellen kan
 * lige så godt returnere ingenting som en tilfældig kode. Tærsklen er sat lavt
 * nok til at en kort, men reel beslutningsvej stadig kodes.
 */
const MIN_CONTEXT_CHARS = 60;

/**
 * Corti ekkoer evidence.text tilbage som UTF-8-bytes læst som latin-1, så danske
 * tegn kommer retur som mojibake ("flammeforbrÃ¦nding"). start/end er derimod
 * korrekte tegn-offsets — verificeret mod vores egen input-streng. Vi klipper
 * derfor uddraget ud af VORES egen tekst i stedet for at bruge deres echo.
 */
function repairEvidence(ev: CodeEvidence, contexts: CodingContextItem[]): CodeEvidence {
  const source = contexts[ev.contextIndex]?.text;
  if (!source) return ev;
  const slice = source.slice(ev.start, ev.end);
  return slice ? { ...ev, text: slice } : ev;
}

function repairCode(code: PredictedCode, contexts: CodingContextItem[]): PredictedCode {
  if (!code.evidences?.length) return code;
  return { ...code, evidences: code.evidences.map((e) => repairEvidence(e, contexts)) };
}

export interface CodingResult extends CodingResponse {
  status: CodingStatus;
  contexts: CodingContextItem[];
  system: string;
  /** Sat når status ikke er "ok" — teknisk årsag, ikke brugertekst. */
  detail?: string;
  /** Hvor mange gange vi kaldte API'et (1 eller 2 — se retry nedenfor). */
  attempts: number;
}

async function callCoding(
  usable: CodingContextItem[],
  system: string,
): Promise<CodingResponse> {
  const token = await getAccessToken();
  const res = await fetch(`${CORTI_API_BASE}/v2/tools/coding/`, {
    method: "POST",
    headers: cortiHeaders(token),
    body: JSON.stringify({
      system: [system],
      context: usable.map((c) => ({ type: "text", text: c.text })),
    }),
    cache: "no-store",
    signal: AbortSignal.timeout(TIMEOUTS.coding),
  });

  if (!res.ok) {
    throw new Error(`Corti coding fejlede: ${res.status} ${await res.text()}`);
  }
  return (await res.json()) as CodingResponse;
}

/**
 * Sender én eller flere kliniske kontekster til kodemodellen.
 *
 * `codes` er dem modellen mener SKAL kodes; `candidates` er klinisk relevante men
 * valgfrie koder til menneskelig gennemgang. Vi holder dem adskilt hele vejen ud
 * til UI'et — at smelte dem sammen ville skjule at de har forskellig status.
 *
 * Modellen er ikke deterministisk. Med en fuldt udfyldt beslutningsvej rammer den
 * konsekvent hoveddiagnosen (målt: T20.2 i 4 ud af 4 kald), mens de sekundære koder
 * varierer. Tomme svar sås kun med tynd kontekst. Derfor: vi kalder én gang til hvis
 * første svar er helt tomt, og rapporterer ellers ærligt hvorfor der ingen koder er.
 */
export async function predictCodes(
  contexts: CodingContextItem[],
  system: string = DEFAULT_CODING_SYSTEM,
): Promise<CodingResult> {
  const usable = contexts.filter((c) => c.text.trim().length > 0);
  const totalChars = usable.reduce((n, c) => n + c.text.trim().length, 0);

  if (totalChars < MIN_CONTEXT_CHARS) {
    return {
      status: "insufficient-context",
      detail: `Kun ${totalChars} tegn klinisk tekst — under grænsen på ${MIN_CONTEXT_CHARS}`,
      codes: [],
      candidates: [],
      contexts: usable,
      system,
      attempts: 0,
    };
  }

  let attempts = 0;
  let data: CodingResponse;
  try {
    attempts = 1;
    data = await callCoding(usable, system);
    if ((data.codes?.length ?? 0) === 0 && (data.candidates?.length ?? 0) === 0) {
      attempts = 2;
      data = await callCoding(usable, system);
    }
  } catch (err) {
    return {
      status: "error",
      detail: err instanceof Error ? err.message : "ukendt kodefejl",
      codes: [],
      candidates: [],
      contexts: usable,
      system,
      attempts,
    };
  }

  const codes = (data.codes ?? []).map((c) => repairCode(c, usable));
  const candidates = (data.candidates ?? []).map((c) => repairCode(c, usable));

  return {
    status: codes.length + candidates.length > 0 ? "ok" : "empty",
    codes,
    candidates,
    usageInfo: data.usageInfo,
    contexts: usable,
    system,
    attempts,
  };
}
