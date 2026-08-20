import { NextResponse } from "next/server";
import { cap, guard } from "@/lib/guard";
import { attachedExperts, streamChatAnswer, type ChatEvent } from "@/lib/corti/chat";
import { behandlingsGrundlag, byggGrundlag, faldgruberTilEmne } from "@/lib/corti/grounding";
import { hurtigtSvar } from "@/lib/corti/fastAnswer";
import { mcpKonfigureret } from "@/lib/corti/mcp";
import { triagér, type Triage } from "@/lib/corti/triage";
import { cortiModelsKonfigureret } from "@/lib/corti/models";
import {
  beskrivBilleder,
  billedBlok,
  validerBilleder,
  type BilledObservationer,
} from "@/lib/corti/vision";
import {
  fortolkAktuelNode,
  fremskridt,
  genafspil,
  restSvar,
  rykFrem,
  somDisposition,
  somPatientKontekst,
  somSpoergsmaal,
  traeKilde,
  udtraekSvar,
  vaelgTrae,
  validerWorkup,
  type DispositionUd,
  type UdtrukketSvar,
  type WorkupSpoergsmaal,
} from "@/lib/corti/workup";
import { getDisposition, getNode, startSession } from "@/lib/tree/engine";
import { treeSource } from "@/lib/tree/loader";
import type { AnsweredStep, DecisionTree, SessionState } from "@/lib/tree/types";
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
  /** Sårfotos: [{mediaType, data (ren base64), name?}]. Valideres i validerBilleder. */
  images?: unknown;
  /**
   * Igangværende udredning: {treeId, path:[{nodeId, value, rawAnswer?}]}.
   * Klienten bærer tilstanden; serveren GENAFSPILLER den gennem træmotoren og
   * afviser stier motoren ikke selv ville have gået. Feltet udelades helt når
   * ingen udredning er i gang.
   */
  workup?: unknown;
}

/**
 * Begivenhederne ruten sender. `ChatEvent` er agentens egne; de to nye er
 * rutens, og de er additive med vilje — en klient der ikke kender dem, kaster
 * dem væk og opfører sig præcis som før.
 */
type UdgaaendeEvent =
  | ChatEvent
  /** Hvad lægen ville, hvilket spor der køres, og hvorfor. Kommer efter ~1 sekund. */
  | { kind: "triage"; triage: Triage; mode: "fast" | "deep" | "workup" }
  /** Faldgruberne med deres ORDRETTE belæg, uafhængigt af hvad modellen skriver. */
  | { kind: "pitfalls"; pitfalls: LoestFaldgrube[] }
  /**
   * Billedanalysen. `ok: false` betyder at billederne IKKE indgik i svaret —
   * det skal siges højt i UI'et frem for at fotoet stille bliver ignoreret.
   */
  | { kind: "vision"; ok: true; observations: BilledObservationer }
  | { kind: "vision"; ok: false; message: string }
  /**
   * Udredningen i samtalen. `path` er den kanoniske sti og `pending` de svar
   * lægen har givet som gennemløbet endnu ikke er nået til — klienten gemmer
   * begge og sender {treeId, path, pending} tilbage som `workup` på næste tur.
   * `progress.total` er et skøn ad førstevalgs-kanter; træet forgrener, så det
   * kan ændre sig.
   *
   * phase: "started" = en patientbeskrivelse åbnede udredningen (prefilled
   * viser hvad beskrivelsen allerede besvarede). "question" = svaret er
   * registreret, her er næste spørgsmål. "held" = ytringen var et opslag;
   * svaret på det følger som almindelige begivenheder, og udredningen står
   * ved `question`. "clarify" = svaret kunne ikke afgøres; spørg igen.
   */
  | {
      kind: "workup";
      phase: "started" | "question" | "held" | "clarify";
      treeId: string;
      treeName: string;
      path: AnsweredStep[];
      progress: { answered: number; total: number };
      question?: WorkupSpoergsmaal;
      prefilled?: AnsweredStep[];
      pending?: UdtrukketSvar[];
      clarification?: string;
    }
  /** Et rødt flag fra træet — afbryder med besked, kilde og telefonnummer hvor træet har det. */
  | { kind: "redflag"; treeId: string; nodeId: string; message: string; source: string }
  /** Træet nåede en disposition. Anbefalingen kommer fra kanterne, aldrig fra en model. */
  | {
      kind: "disposition";
      treeId: string;
      treeName: string;
      disposition: DispositionUd;
      path: AnsweredStep[];
      redFlags: string[];
      source: string;
    }
  /** Tilbud om journalnotat: klienten kalder POST /api/note med {treeId, path, lang}. */
  | { kind: "noteOffer"; treeId: string; path: AnsweredStep[] };

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

  /*
   * Billederne valideres FØR strømmen åbnes: et ugyldigt billede er en 400,
   * ikke en fejl-begivenhed. Klienten håndhæver 4 × 8 MB, men serveren stoler
   * ikke på klienter — en forfalsket klient skal ikke kunne sende 100 MB.
   */
  const billedResultat = validerBilleder(body.images);
  if ("fejl" in billedResultat) {
    return NextResponse.json({ error: billedResultat.fejl }, { status: 400 });
  }
  const billeder = billedResultat.billeder;
  if (billeder.length > 0 && !cortiModelsKonfigureret()) {
    // Uden Models er der ingen billedforståelse — og et billede der stille
    // ignoreres er værre end en ærlig afvisning.
    return NextResponse.json(
      { error: "Billedanalyse er ikke tilgængelig (CORTI_MODELS_KEY mangler)" },
      { status: 503 },
    );
  }

  /*
   * Udredningstilstanden valideres FØR strømmen åbnes — og genafspilles
   * gennem træmotoren. En sti motoren ikke selv ville have gået (forkert
   * rækkefølge, ugyldig værdi, skridt forbi en disposition) er en 400, ikke
   * en tilstand vi arbejder videre på. Det er dét der gør klient-båret
   * tilstand forsvarlig: serveren stoler på motoren, aldrig på klienten.
   */
  let workupTree: DecisionTree | null = null;
  let workupState: SessionState | null = null;
  let workupPending: UdtrukketSvar[] = [];
  if (body.workup !== undefined && body.workup !== null) {
    const kw = validerWorkup(body.workup);
    if (!kw) return NextResponse.json({ error: "Ugyldig udredningstilstand" }, { status: 400 });
    const tree = await treeSource.get(kw.treeId);
    if (!tree) return NextResponse.json({ error: "Ukendt træ" }, { status: 404 });
    const state = genafspil(tree, kw, lang);
    if (!state) {
      return NextResponse.json(
        { error: "Udredningsstien kan ikke genafspilles gennem træet" },
        { status: 400 },
      );
    }
    workupTree = tree;
    workupState = state;
    workupPending = kw.pending ?? [];
  }

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
         * Trin 0: billederne. Analysen kommer FØR triagen, fordi observationerne
         * er den bedste tekst vi har at triagere på — "hvad ser du her?" siger
         * intet om emnet, men "bullae på håndryg, vådt sårbund" gør.
         *
         * Triage-modellen kan ikke se (400 på billeder), så det er
         * synthesemodellen der beskriver, og triagen får teksten.
         */
        let syn: BilledObservationer | null = null;
        if (billeder.length > 0) {
          try {
            syn = await beskrivBilleder(billeder, question, lang, req.signal);
            send({ kind: "vision", ok: true, observations: syn });
          } catch (err) {
            // Sig det højt: svaret fortsætter, men uden billedet i grundlaget.
            send({
              kind: "vision",
              ok: false,
              message:
                lang === "da"
                  ? "Billedet kunne ikke analyseres — svaret bygger kun på teksten"
                  : "The image could not be analysed — the answer rests on the text alone",
            });
            void err;
          }
        }

        /*
         * Fremdrift i en udredning meldes ét sted: røde flag først (de afbryder,
         * som i træ-visningen), så enten dispositionen med notat-tilbud — eller
         * det næste spørgsmål. Dispositionen kommer fra motorens kanter; denne
         * funktion FORMIDLER kun.
         */
        const sendFremdrift = (
          tree: DecisionTree,
          frem: ReturnType<typeof rykFrem>,
          phase: "started" | "question",
          alleSvar: UdtrukketSvar[],
        ) => {
          for (const flag of frem.redFlags) {
            send({
              kind: "redflag",
              treeId: tree.id,
              nodeId: flag.nodeId,
              message: flag.message,
              source: traeKilde(tree),
            });
          }
          if (frem.state.dispositionId) {
            const disp = getDisposition(tree, frem.state.dispositionId);
            if (disp) {
              send({
                kind: "disposition",
                treeId: tree.id,
                treeName: tree.name[lang],
                disposition: somDisposition(disp, lang),
                path: frem.state.path,
                redFlags: frem.state.redFlags,
                source: traeKilde(tree),
              });
              send({ kind: "noteOffer", treeId: tree.id, path: frem.state.path });
            }
            return;
          }
          const node = frem.state.currentNodeId ? getNode(tree, frem.state.currentNodeId) : undefined;
          if (!node) return;
          // Svar der endnu ikke kunne bruges, huskes — de forbruges automatisk
          // når gennemløbet når frem, så lægen aldrig spørges om dem igen.
          const pending = restSvar(tree, frem.state, alleSvar);
          send({
            kind: "workup",
            phase,
            treeId: tree.id,
            treeName: tree.name[lang],
            path: frem.state.path,
            progress: fremskridt(tree, frem.state),
            question: somSpoergsmaal(node, lang),
            prefilled: frem.taget.length > 0 ? frem.taget : undefined,
            pending: pending.length > 0 ? pending : undefined,
          });
        };

        /*
         * UDREDNINGSTUR: en udredning er i gang, så ytringen er formodentlig et
         * svar på spørgsmålet der står. Modellen må kun oversætte ordene til en
         * værdi nodens skema tillader — hvor gennemløbet lander, afgør motoren.
         *
         * Er ytringen i stedet et opslag ("hvor meget væske?"), meldes "held",
         * og resten af ruten svarer som den plejer: udredningen står stille ved
         * sit spørgsmål, og opslaget får patientkonteksten fra stien med.
         */
        let forudTriage: Triage | null = null;
        let effektivKontekst = patientContext;

        if (workupTree && workupState) {
          const tree = workupTree;
          const state = workupState;
          effektivKontekst = somPatientKontekst(tree, state, lang) || patientContext;
          const node = state.currentNodeId ? getNode(tree, state.currentNodeId) : undefined;

          if (node) {
            // Den aktuelle node først; resten er med fordi ét svar tit dækker
            // flere — "dyb dermal, og den er cirkulær" er to noder i én mundfuld.
            const aabne = tree.nodes.filter(
              (n) => n.id === node.id || !state.path.some((p) => p.nodeId === n.id),
            );
            const nye = await udtraekSvar(
              question,
              [node, ...aabne.filter((n) => n.id !== node.id)],
              lang,
              req.signal,
            );

            /*
             * De huskede svar fra tidligere ture lægges under de nye: et nyere
             * udsagn om samme node vinder altid — lægen kan have rettet sig selv.
             */
            const mergedMap = new Map(workupPending.map((s) => [s.nodeId, s]));
            for (const s of nye) mergedMap.set(s.nodeId, s);
            let svar = [...mergedMap.values()];

            if (!nye.some((s) => s.nodeId === node.id) && !mergedMap.has(node.id)) {
              // Ikke et svar på det stående spørgsmål. Et opslag? Spørg triagen
              // — og gem den, så hovedflowet ikke betaler for den igen.
              forudTriage = await triagér({
                utterance: question,
                lang,
                patientContext: effektivKontekst,
                signal: req.signal,
              });
              if (
                forudTriage.routedBy === "corti-models" &&
                (forudTriage.kind === "fact" || forudTriage.kind === "treatment")
              ) {
                send({
                  kind: "workup",
                  phase: "held",
                  treeId: tree.id,
                  treeName: tree.name[lang],
                  path: state.path,
                  progress: fremskridt(tree, state),
                  question: somSpoergsmaal(node, lang),
                  pending: workupPending.length > 0 ? workupPending : undefined,
                });
                // Falder igennem til det almindelige svar-flow nedenfor.
              } else {
                // Formodentlig et svar Models ikke kunne afgøre. Agent-
                // fortolkeren er reserven — præcis som i /api/interpret.
                const f = await fortolkAktuelNode(node, question, lang);
                if (f.svar) {
                  svar = [f.svar, ...svar.filter((s) => s.nodeId !== f.svar!.nodeId)];
                } else {
                  send({
                    kind: "workup",
                    phase: "clarify",
                    treeId: tree.id,
                    treeName: tree.name[lang],
                    path: state.path,
                    progress: fremskridt(tree, state),
                    question: somSpoergsmaal(node, lang),
                    pending: workupPending.length > 0 ? workupPending : undefined,
                    clarification: f.clarification,
                  });
                  return;
                }
              }
            }

            if (svar.some((s) => s.nodeId === node.id)) {
              sendFremdrift(tree, rykFrem(tree, state, svar, question), "question", svar);
              return;
            }
          }
          // Enten er dispositionen allerede nået, eller ytringen var et opslag:
          // videre til svar-flowet med patientkonteksten fra stien.
        }

        /*
         * Trin 1: hvad ville lægen? Ét Models-kald, målt 0,7-2,0 s. Det er den
         * eneste ventetid vi lægger til, og den betaler sig selv hjem: den
         * afgør om vi kan spare de 35-72 sekunder agentturen koster.
         */
        const triage =
          forudTriage ??
          (await triagér({
            utterance: syn ? `${question}\n[Billedobservationer: ${syn.observations.slice(0, 500)}]` : question,
            lang,
            patientContext: effektivKontekst,
            signal: req.signal,
          }));

        /*
         * NY UDREDNING: en patientbeskrivelse skifter aldrig skærm — den åbner
         * udredningen her i samtalen. Alt lægen allerede har sagt, er besvaret
         * FØR første spørgsmål stilles: at spørge om lokalisationen igen, når
         * beskrivelsen lige har nævnt armen, er forskellen på en formular og en
         * kollega. Vælger Models intet træ, bliver det en almindelig samtale.
         */
        if (!workupTree && triage.kind === "patient" && triage.routedBy === "corti-models") {
          const tree = await vaelgTrae(question, lang, req.signal);
          if (tree) {
            send({ kind: "triage", triage, mode: "workup" });
            if (mcpKonfigureret()) {
              const fg = await faldgruberTilEmne(`${triage.pitfallContext} ${triage.topic} ${question}`);
              if (fg.length > 0) send({ kind: "pitfalls", pitfalls: fg });
            }
            const svar = await udtraekSvar(question, tree.nodes, lang, req.signal);
            sendFremdrift(tree, rykFrem(tree, startSession(tree, lang), svar, question), "started", svar);
            return;
          }
        }

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
         * Billedobservationerne lægges i SAMME blok som grundlaget, så begge
         * spor får dem — men markeret som det modsatte af et uddrag: modellen
         * får eksplicit at vide at billedfund er ræsonnement, aldrig kilde.
         */
        const promptBlok = syn ? [grundlag.blok, billedBlok(syn)].filter(Boolean).join("\n\n") : grundlag.blok;

        /*
         * Trin 3: vælg spor. Hurtigsporet kræver at triagen sagde at
         * litteraturen ikke er nødvendig OG at vores egne kilder faktisk har
         * noget at sige. Har de ikke det, ville et hurtigt svar være et tomt
         * svar — og så er ventetiden det værd.
         */
        /*
         * Med et analyseret billede lempes kravet om uddrag: det tunge spor kan
         * ikke se, så for et billedspørgsmål er hurtigsporet ikke bare
         * hurtigere — det er det eneste spor med adgang til det lægen faktisk
         * spørger om. Svaret bliver da ærligt mærket "extrapolated" med nul
         * kilder, hvilket er sandt.
         */
        const harGrundlag = grundlag.uddrag.length >= 2 || (billeder.length > 0 && syn !== null);
        const kanHurtigt =
          tilladHurtigt &&
          !triage.needsLiterature &&
          triage.routedBy === "corti-models" &&
          harGrundlag;

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
              grounding: promptBlok,
              uddrag: grundlag.uddrag,
              patientContext: effektivKontekst,
              recap,
              // Synthesemodellen kan selv se — den får fotoene oveni
              // observationerne, og reglen om mærkning står i dens systemprompt.
              images: billeder.length > 0 ? billeder : undefined,
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
          patientContext: effektivKontekst,
          // Det agentiske framework kan ikke modtage billeder — det får
          // observationsblokken i stedet, med sin mærkningsregel intakt.
          grounding: promptBlok || undefined,
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
