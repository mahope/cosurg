/**
 * Corti Models — Cortis egne LLM'er på et OpenAI-kompatibelt endpoint.
 *
 * Dette er IKKE det agentiske framework. Forskellen er hele pointen:
 *
 * - Agenten (`lib/corti/chat.ts`) fanger ud til PubMed, web-søgning og vores
 *   egen vidensbase. Den er derfor grundig og målt 35-72 sekunder pr. svar.
 * - Corti Models svarer på ét kald uden opslag. `corti-s1-instant` er målt til
 *   0,7-2,0 sekunder.
 *
 * Derfor bruges Models kun til det HURTIGE og AFGRÆNSEDE: hvad ville lægen,
 * hvad hedder emnet på dansk, skal der overhovedet søges i litteraturen. Den
 * skriver aldrig et klinisk svar der ikke er bygget på uddrag vi selv har
 * hentet — den slags står i `lib/corti/fastAnswer.ts`, hvor kilderne er
 * vedhæftet før modellen ser dem.
 *
 * Nøglen er en almindelig bearer-token (CORTI_MODELS_KEY), ikke det
 * client-credentials-flow resten af Corti-API'et bruger. Derfor sin egen fil.
 */

const BASE_URL = (process.env.CORTI_MODELS_URL ?? "https://ai.eu.corti.app/v1").replace(/\/+$/, "");

/**
 * Modellerne, navngivet efter det de skal bruges til frem for efter deres
 * størrelse. Bytter Corti navnene ud, er der ét sted at rette.
 */
export const MODELS = {
  /** Routing og klassifikation. Målt 0,7-2,0 s. */
  triage: process.env.CORTI_MODELS_TRIAGE ?? "corti-s1-instant",
  /** Sammenskrivning af uddrag vi selv har hentet. Lidt større, stadig hurtig. */
  synthesis: process.env.CORTI_MODELS_SYNTHESIS ?? "corti-s1-mini",
} as const;

export function cortiModelsKonfigureret(): boolean {
  return !!process.env.CORTI_MODELS_KEY?.trim();
}

interface Besked {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface ModelKald {
  model: string;
  system: string;
  user: string;
  maxTokens?: number;
  temperature?: number;
  /** Hårdt loft. Et Models-kald der tager længere tid har mistet sin grund til at findes. */
  timeoutMs?: number;
  signal?: AbortSignal;
}

/**
 * Ét kald, ren tekst retur.
 *
 * Kaster ved alt andet end 200 — kalderen skal kunne skelne "modellen sagde
 * noget" fra "vi fik ikke fat i modellen", for de to har hver sin reserveplan.
 */
export async function kaldModel({
  model,
  system,
  user,
  maxTokens = 400,
  temperature = 0,
  timeoutMs = 8_000,
  signal,
}: ModelKald): Promise<string> {
  const key = process.env.CORTI_MODELS_KEY?.trim();
  if (!key) throw new Error("CORTI_MODELS_KEY mangler i miljøet");

  const messages: Besked[] = [
    { role: "system", content: system },
    { role: "user", content: user },
  ];

  const timeout = AbortSignal.timeout(timeoutMs);
  const res = await fetch(`${BASE_URL}/chat/completions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ model, messages, temperature, max_tokens: maxTokens }),
    cache: "no-store",
    signal: signal ? AbortSignal.any([signal, timeout]) : timeout,
  });

  if (!res.ok) {
    throw new Error(`Corti Models svarede ${res.status}: ${(await res.text()).slice(0, 300)}`);
  }

  const data = (await res.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  const tekst = data.choices?.[0]?.message?.content;
  if (typeof tekst !== "string" || !tekst.trim()) {
    throw new Error("Corti Models leverede et tomt svar");
  }
  return tekst.trim();
}

/**
 * Trækker det første JSON-objekt ud af et modelsvar.
 *
 * Modellen bliver bedt om kun at svare med JSON, men en sproglig model kan
 * finde på at lægge en ```json-hegn eller en høflig indledning omkring det. Vi
 * afviser ikke svaret på det — vi finder objektet. Kan der ikke findes ét,
 * kaster vi, og kalderen falder tilbage på sin lokale reserve.
 */
export function udtrækJson<T>(tekst: string): T {
  const uhegnet = tekst.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "");
  const start = uhegnet.indexOf("{");
  const slut = uhegnet.lastIndexOf("}");
  if (start === -1 || slut <= start) {
    throw new Error("Modelsvaret indeholdt ikke et JSON-objekt");
  }
  return JSON.parse(uhegnet.slice(start, slut + 1)) as T;
}

/** Kald + JSON-udtræk i ét. Kaster hvis noget som helst går galt. */
export async function kaldModelJson<T>(opts: ModelKald): Promise<T> {
  return udtrækJson<T>(await kaldModel(opts));
}
