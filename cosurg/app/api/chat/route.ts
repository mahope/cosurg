import { NextResponse } from "next/server";
import { cap, guard } from "@/lib/guard";
import { attachedExperts, streamChatAnswer, type ChatEvent } from "@/lib/corti/chat";
import { behandlingsGrundlag, byggGrundlag, faldgruberTilEmne } from "@/lib/corti/grounding";
import { hurtigtSvar } from "@/lib/corti/fastAnswer";
import { mcpKonfigureret } from "@/lib/corti/mcp";
import { triagér, type Triage } from "@/lib/corti/triage";
import type { LoestFaldgrube } from "@/components/pitfalls/types";

export const dynamic = "force-dynamic";

/**
 * Chatten er produktet, og et chatsvar skal derfor være rigere end det
 * spørgsmål der blev stillet.
 *
 * Ruten gør tre ting mere end den gjorde:
 *
 * 1. TRIAGERER først med Corti Models (målt 0,7-2,0 s). Den afgør hvad emnet
 *    hedder på dansk, og om litteraturen overhovedet skal i sving.
 * 2. HENTER grundlaget selv, parallelt: behandlingsguidens afsnit og de
 *    faldgruber der gælder netop dér, hver med sit ordrette belæg. Begge dele
 *    lå der allerede — chatten brugte dem bare ikke.
 * 3. VÆLGER SPOR. Siger triagen at vores egne kilder rækker, og har de dækning,
 *    skrives svaret sammen af uddragene på sekunder. Ellers går det som før
 *    gennem det agentiske framework — nu bare med grundlaget i prompten, så
 *    agenten ikke skal bruge en rundtur på at finde det vi allerede havde.
 *
 * Kontrakten udadtil er additiv: alle hidtidige begivenheder ser ud som før.
 * Der er kommet to nye, `triage` og `pitfalls`, som en klient gerne må ignorere.
 */

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
  /** Sæt false for at tvinge det tunge spor — fx til en side der vil have litteratur. */
  fastPath?: unknown;
}

/**
 * Begivenhederne ruten sender. `ChatEvent` er agentens egne; de to nye er
 * rutens, og de er additive med vilje — en klient der ikke kender dem, kaster
 * dem væk og opfører sig præcis som før.
 */
type UdgaaendeEvent =
  | ChatEvent
  /** Hvad lægen ville, hvilket spor der køres, og hvorfor. Kommer efter ~1 sekund. */
  | { kind: "triage"; triage: Triage; mode: "fast" | "deep" }
  /** Faldgruberne med deres ORDRETTE belæg, uafhængigt af hvad modellen skriver. */
  | { kind: "pitfalls"; pitfalls: LoestFaldgrube[] };

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
  const tilladHurtigt = body.fastPath !== false;

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
      const send = (event: UdgaaendeEvent) => {
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
        /*
         * Trin 1: hvad ville lægen? Ét Models-kald, målt 0,7-2,0 s. Det er den
         * eneste ventetid vi lægger til, og den betaler sig selv hjem: den
         * afgør om vi kan spare de 35-72 sekunder agentturen koster.
         */
        const triage = await triagér({ utterance: question, lang, patientContext, signal: req.signal });

        /*
         * Trin 2: hent grundlaget selv. Faldgruberne svarer på 40-60 ms,
         * guidens afsnit på under fire sekunder, og de to kører parallelt.
         * Uden vidensbase springes det over — så er der intet at hente, og
         * agenten skal have chancen for at svare fra litteraturen.
         */
        const harViden = mcpKonfigureret();
        const [faldgruber, afsnit] = harViden
          ? await Promise.all([
              faldgruberTilEmne(`${triage.pitfallContext} ${triage.topic} ${question}`),
              // Kun behandlingsspørgsmål har gavn af otte afsnit. Et spørgsmål om
              // ét tal skal ikke vente på en hel guide.
              triage.kind === "treatment"
                ? behandlingsGrundlag(triage.terms.slice(0, 4).join(" "))
                : Promise.resolve([]),
            ])
          : [[], []];

        const grundlag = byggGrundlag(afsnit, faldgruber, lang);

        /*
         * Trin 3: vælg spor. Hurtigsporet kræver at triagen sagde at
         * litteraturen ikke er nødvendig OG at vores egne kilder faktisk har
         * noget at sige. Har de ikke det, ville et hurtigt svar være et tomt
         * svar — og så er ventetiden det værd.
         */
        const kanHurtigt =
          tilladHurtigt &&
          !triage.needsLiterature &&
          triage.routedBy === "corti-models" &&
          grundlag.uddrag.length >= 2;

        send({ kind: "triage", triage, mode: kanHurtigt ? "fast" : "deep" });
        if (faldgruber.length > 0) send({ kind: "pitfalls", pitfalls: faldgruber });

        if (kanHurtigt) {
          send({
            kind: "progress",
            expert: "cosurg-viden",
            text: `Svarer fra vidensbasen: ${triage.topic}`,
          });
          try {
            const answer = await hurtigtSvar({
              question,
              lang,
              grounding: grundlag.blok,
              uddrag: grundlag.uddrag,
              patientContext,
              recap,
              signal: req.signal,
            });
            if (answer.answer) {
              send({ kind: "answer", answer });
              return;
            }
          } catch {
            // Hurtigsporet må gøre appen hurtigere, aldrig skrøbeligere.
            // Fejler det, falder vi igennem til den vej der altid har virket.
            send({ kind: "progress", expert: null, text: "Søger videre i litteraturen" });
          }
        }

        for await (const event of streamChatAnswer({
          question,
          lang,
          contextId,
          recap,
          patientContext,
          grounding: grundlag.blok || undefined,
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
