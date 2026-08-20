import { NextResponse } from "next/server";
import { cap, guard } from "@/lib/guard";
import { attachedExperts, streamChatAnswer, type ChatEvent } from "@/lib/corti/chat";

export const dynamic = "force-dynamic";

/**
 * Fritekst-grænser. Et klinisk spørgsmål er længere end et talt træ-svar
 * (LIMITS.utterance = 600), men et spørgsmål på over tusind tegn er ikke et
 * spørgsmål — det er nogen der bruger vores credits som gratis LLM.
 */
const MAX_QUESTION = 1_000;
const MAX_RECAP = 4_000;
/** Beslutningsvejen er højst en snes besvarede trin. Loftet afviser misbrug. */
const MAX_PATIENT_CONTEXT = 3_000;

/** Kvoten er stram: hvert kald koster credits og tager målt 35-70 sekunder. */
const CHAT_QUOTA_PER_MINUTE = 15;

interface Body {
  question?: unknown;
  lang?: unknown;
  contextId?: unknown;
  recap?: unknown;
  patientContext?: unknown;
}

/** Hvilke eksperter chatten faktisk har koblet på. Bruges til at være ærlig i UI'et. */
export async function GET(req: Request) {
  const limited = guard(req, "chat-info", 60);
  if (limited) return limited;
  return NextResponse.json({ experts: attachedExperts() });
}

export async function POST(req: Request) {
  const limited = guard(req, "chat", CHAT_QUOTA_PER_MINUTE);
  if (limited) return limited;

  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return NextResponse.json({ error: "Ugyldig forespørgsel" }, { status: 400 });
  }

  const question = cap(body.question, MAX_QUESTION);
  if (!question) return NextResponse.json({ error: "Tomt spørgsmål" }, { status: 400 });

  const lang = body.lang === "en" ? "en" : "da";
  const contextId = typeof body.contextId === "string" ? cap(body.contextId, 100) : undefined;
  const recap = cap(body.recap, MAX_RECAP) || undefined;
  const patientContext = cap(body.patientContext, MAX_PATIENT_CONTEXT) || undefined;

  const encoder = new TextEncoder();

  /*
   * Lukker klienten fanen midt i et svar, annulleres strømmen under os. Alt
   * skriveri skal derfor gå gennem `open`, som både vores egen afslutning og
   * klientens afbrud sætter — ellers kaster enqueue/close på en lukket strøm,
   * og fejlen bliver til en ubehandlet afvisning i serverloggen.
   */
  let open = true;

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const send = (event: ChatEvent) => {
        if (!open) return;
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`));
      };

      /*
       * Mellem "Calling expert" og det færdige svar går der op mod et minut uden
       * en eneste byte. En proxy foran appen kan nå at lukke en så stille
       * forbindelse, så vi sender et kommentar-hjerteslag imens. SSE-klienter
       * ignorerer linjer der starter med ':'.
       */
      const heartbeat = setInterval(() => {
        if (open) controller.enqueue(encoder.encode(": ping\n\n"));
      }, 15_000);

      try {
        for await (const event of streamChatAnswer({
          question,
          lang,
          contextId,
          recap,
          patientContext,
          signal: req.signal,
        })) {
          send(event);
        }
      } catch (err) {
        // Afbrudt af brugeren selv er ikke en fejl der skal vises.
        const aborted = req.signal.aborted;
        if (!aborted) {
          send({
            kind: "error",
            message: err instanceof Error ? err.message : "Ukendt fejl i chat-agenten",
          });
        }
      } finally {
        clearInterval(heartbeat);
        if (open) {
          open = false;
          controller.close();
        }
      }
    },

    cancel() {
      // Klienten er gået. Stop med at skrive; det udgående Corti-kald afbrydes
      // af req.signal, som streamChatAnswer lytter på.
      open = false;
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-store, no-transform",
      Connection: "keep-alive",
      // Slår buffering fra i nginx-lignende proxyer, så fremdriften faktisk er live.
      "X-Accel-Buffering": "no",
    },
  });
}
