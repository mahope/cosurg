import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/**
 * Netværks-TTS. Corti leverer ikke selv text-to-speech (kun STT, text generation,
 * agentic og coding) — og hackathon-reglerne tillader eksplicit eksterne TTS-modeller.
 * Providers konfigureres via env; er ingen sat, svarer ruten 501 og klienten falder
 * automatisk tilbage til browserens indbyggede stemme, som virker offline.
 */
export async function POST(req: Request) {
  const { text, lang } = (await req.json()) as { text: string; lang: "da" | "en" };

  const endpoint = process.env.TTS_ENDPOINT;
  const apiKey = process.env.TTS_API_KEY;

  if (!endpoint || !apiKey) {
    return NextResponse.json({ error: "Ingen TTS-provider konfigureret" }, { status: 501 });
  }

  try {
    const res = await fetch(endpoint, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: process.env.TTS_MODEL ?? "tts-1",
        voice: process.env.TTS_VOICE ?? "alloy",
        input: text,
        language: lang,
      }),
      cache: "no-store",
      signal: AbortSignal.timeout(4000),
    });

    if (!res.ok) {
      return NextResponse.json({ error: `TTS-provider fejlede: ${res.status}` }, { status: 502 });
    }

    return new NextResponse(await res.arrayBuffer(), {
      headers: { "Content-Type": "audio/mpeg", "Cache-Control": "no-store" },
    });
  } catch {
    // Timeout eller netværksfejl — klienten falder tilbage til browser-TTS.
    return NextResponse.json({ error: "TTS utilgængelig" }, { status: 503 });
  }
}
