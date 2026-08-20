import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const SYV_ENDPOINT = process.env.SYV_TTS_ENDPOINT ?? "https://platform.syv.ai/v1/audio/speech";
const SYV_MODEL = process.env.SYV_TTS_MODEL ?? "syvai/plapre-nano";

/**
 * Netværks-TTS via Syv.ai (Plapre) — dansk, EU-hostet, OpenAI-kompatibelt endpoint.
 * Corti leverer ikke selv text-to-speech, og hackathon-reglerne tillader eksplicit
 * eksterne TTS-modeller.
 *
 * Klienten falder automatisk tilbage til browserens indbyggede stemme hvis denne
 * rute svarer 501 (ingen nøgle), 502/503 (provider nede) eller timer ud — kliniske
 * instruktioner må aldrig udeblive fordi nettet svigter.
 *
 * Plapre kan på sigt køre lokalt på CPU (open source, CC-BY/MIT) og dermed fjerne
 * netværksafhængigheden helt.
 */
export async function POST(req: Request) {
  const { text, lang } = (await req.json()) as { text: string; lang: "da" | "en" };

  const apiKey = process.env.SYV_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "Ingen TTS-nøgle konfigureret" }, { status: 501 });
  }

  // Plapre er en dansk model — engelsk oplæsning overlades til browser-stemmen.
  if (lang !== "da") {
    return NextResponse.json({ error: "Netværks-TTS understøtter kun dansk" }, { status: 501 });
  }

  try {
    const res = await fetch(SYV_ENDPOINT, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json; charset=utf-8",
      },
      body: JSON.stringify({ model: SYV_MODEL, input: text }),
      cache: "no-store",
      // Målt latens ~0,9-1,5 s. 6 s giver hovedrum uden at hænge demoen.
      signal: AbortSignal.timeout(6000),
    });

    if (!res.ok) {
      return NextResponse.json(
        { error: `Syv.ai fejlede: ${res.status}` },
        { status: res.status === 401 || res.status === 402 ? 501 : 502 },
      );
    }

    return new NextResponse(await res.arrayBuffer(), {
      headers: { "Content-Type": "audio/wav", "Cache-Control": "no-store" },
    });
  } catch {
    // Timeout eller netværksfejl — klienten falder tilbage til browser-TTS.
    return NextResponse.json({ error: "TTS utilgængelig" }, { status: 503 });
  }
}
