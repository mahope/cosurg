import { CORTI_API_BASE, cortiHeaders, getAccessToken } from "./auth";

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

/**
 * Sender én eller flere kliniske kontekster til kodemodellen.
 *
 * `codes` er dem modellen mener SKAL kodes; `candidates` er klinisk relevante men
 * valgfrie koder til menneskelig gennemgang. Vi holder dem adskilt hele vejen ud
 * til UI'et — at smelte dem sammen ville skjule at de har forskellig status.
 */
export async function predictCodes(
  contexts: CodingContextItem[],
  system: string = DEFAULT_CODING_SYSTEM,
): Promise<CodingResponse & { contexts: CodingContextItem[]; system: string }> {
  const usable = contexts.filter((c) => c.text.trim().length > 0);
  if (usable.length === 0) {
    return { codes: [], candidates: [], contexts: [], system };
  }

  const token = await getAccessToken();
  const res = await fetch(`${CORTI_API_BASE}/v2/tools/coding/`, {
    method: "POST",
    headers: cortiHeaders(token),
    body: JSON.stringify({
      system: [system],
      context: usable.map((c) => ({ type: "text", text: c.text })),
    }),
    cache: "no-store",
  });

  if (!res.ok) {
    throw new Error(`Corti coding fejlede: ${res.status} ${await res.text()}`);
  }

  const data = (await res.json()) as CodingResponse;
  return {
    codes: (data.codes ?? []).map((c) => repairCode(c, usable)),
    candidates: (data.candidates ?? []).map((c) => repairCode(c, usable)),
    usageInfo: data.usageInfo,
    contexts: usable,
    system,
  };
}
