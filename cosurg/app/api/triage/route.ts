import { NextResponse } from "next/server";
import { LIMITS, cap, guard } from "@/lib/guard";
import { cortiModelsKonfigureret } from "@/lib/corti/models";
import { triagér } from "@/lib/corti/triage";

export const dynamic = "force-dynamic";

/**
 * "Hvad vil lægen?" på under to sekunder.
 *
 * Ruten findes så UI'et kan vise noget rigtigt MENS det tunge svar hentes:
 * emnets navn, om der bliver søgt i litteraturen, og hvilke søgeord der bruges.
 * Det er den samme triage `/api/chat` selv kører — den er lagt frem her, fordi
 * en skærm der siger "slår op i vidensbasen om dyb dermal forbrænding" efter
 * halvandet sekund føles helt anderledes end en skærm der bare snurrer i et
 * minut.
 *
 * Ruten skriver intet klinisk indhold og koster ét Models-kald.
 */

/** Ét kald pr. ytring. Rundhåndet — det er den billigste rute vi har. */
const TRIAGE_QUOTA_PER_MINUTE = 60;

const MAX_PATIENT_CONTEXT = 3_000;

interface Body {
  utterance?: unknown;
  lang?: unknown;
  patientContext?: unknown;
}

export async function POST(req: Request) {
  const limited = guard(req, "triage", TRIAGE_QUOTA_PER_MINUTE);
  if (limited) return limited;

  if (!cortiModelsKonfigureret()) {
    return NextResponse.json({ error: "CORTI_MODELS_KEY er ikke konfigureret" }, { status: 503 });
  }

  try {
    const body = (await req.json()) as Body;
    const utterance = cap(body.utterance, LIMITS.utterance);
    if (!utterance) return NextResponse.json({ error: "Tom ytring" }, { status: 400 });

    const triage = await triagér({
      utterance,
      lang: body.lang === "en" ? "en" : "da",
      patientContext: cap(body.patientContext, MAX_PATIENT_CONTEXT) || undefined,
      signal: req.signal,
    });

    return NextResponse.json(triage);
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "ukendt fejl" }, { status: 500 });
  }
}
