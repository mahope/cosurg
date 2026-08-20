import { NextResponse } from "next/server";
import { LIMITS, cap, guard } from "@/lib/guard";
import {
  CODING_SYSTEMS,
  DEFAULT_CODING_SYSTEM,
  isKnownSystem,
  predictCodes,
  type CodingContextItem,
} from "@/lib/corti/coding";

export const dynamic = "force-dynamic";

interface Body {
  /** Én tekst, eller flere navngivne kilder hvis evidensen skal kunne spores. */
  text?: string;
  contexts?: Array<{ label?: string; text?: string }>;
  system?: string;
}

/**
 * Fritstående kodning: giv klinisk tekst, få rigtige koder tilbage fra Cortis
 * Medical Coding-API. Bruges når notatet allerede findes og lægen tilføjer noget —
 * fx et diktat — og koderne skal opdateres uden at skrive notatet forfra.
 */
export async function POST(req: Request) {
  const limited = guard(req, "coding", 20);
  if (limited) return limited;

  try {
    const raw = (await req.json()) as Body;
    const system = isKnownSystem(raw.system) ? raw.system : DEFAULT_CODING_SYSTEM;

    // Højst 4 kilder, hver længdebegrænset — Corti tager selv kun få kontekster,
    // og en betalt rute skal aldrig kunne fodres med vilkårligt meget tekst.
    const contexts: CodingContextItem[] = (
      Array.isArray(raw.contexts) && raw.contexts.length > 0
        ? raw.contexts.slice(0, 4).map((c) => ({
            label: cap(c?.label, 60) || "kontekst",
            text: cap(c?.text, LIMITS.transcript),
          }))
        : [{ label: "kontekst", text: cap(raw.text, LIMITS.transcript) }]
    ).filter((c) => c.text.length > 0);

    if (contexts.length === 0) {
      return NextResponse.json({ error: "Ingen tekst at kode" }, { status: 400 });
    }

    const result = await predictCodes(contexts, system);

    return NextResponse.json({
      system: result.system,
      status: result.status,
      detail: result.detail ?? null,
      attempts: result.attempts,
      codes: result.codes,
      candidates: result.candidates,
      credits: result.usageInfo?.creditsConsumed ?? null,
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "ukendt fejl" },
      { status: 500 },
    );
  }
}

/** Hvilke kodesystemer denne installation faktisk må bruge. */
export async function GET() {
  return NextResponse.json({ systems: CODING_SYSTEMS, default: DEFAULT_CODING_SYSTEM });
}
