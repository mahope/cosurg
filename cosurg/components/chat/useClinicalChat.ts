"use client";

import { useCallback, useRef, useState } from "react";
import type { ChatAnswer, ChatEvent } from "@/lib/corti/chat";
import type { Lang } from "@/lib/tree/types";
import type { Triage } from "@/lib/corti/triage";
import type { BilledObservationer } from "@/lib/corti/vision";
import type { LoestFaldgrube } from "@/components/pitfalls/types";
import type { AnsweredStep } from "@/lib/tree/types";
import type { DispositionUd, UdtrukketSvar, WorkupSpoergsmaal } from "@/lib/corti/workup";
import { tr } from "@/lib/i18n";
import type { ChatImage } from "../attachments";

/**
 * Billedanalysens udfald. `ok: false` betyder at fotoet IKKE indgik i svaret —
 * og det skal siges højt i UI'et frem for at billedet stille forsvinder.
 */
export type VisionResult =
  | { ok: true; observations: BilledObservationer }
  | { ok: false; message: string };

/* ------------------------------------------------------------------ *
 * UDREDNINGEN I CHATTEN
 *
 * Beslutningstræerne er ikke længere en skærm man skifter til — de er det
 * agenten UDREDER med, inde i samtalen. Agenten stiller træets manglende
 * spørgsmål ét ad gangen som chatbeskeder og springer alt over som lægen
 * allerede har fortalt. Klienten viser dem; den kender ikke træet.
 *
 * Teksterne kan komme som ren streng eller som {da,en}. Bagenden er ved at
 * blive skrevet, og en klient der vælter på det ene format ville låse dens
 * valg fast. `tekst()` tager imod begge.
 * ------------------------------------------------------------------ */

/**
 * UDREDNINGENS TILSTAND — og hvorfor den bor hos klienten.
 *
 * Ruten er statsløs: den genafspiller hele stien fra træets rod ved hvert
 * kald og stoler aldrig på klientens ord for hvor vi er. Klienten holder
 * derfor `{treeId, path}` og sender den TILBAGE som `workup` på næste tur.
 * Det er ikke en genvej — det er det der gør at en genindlæst side, et
 * tabt svar eller en langsom forbindelse aldrig kan efterlade en udredning
 * halvvejs inde i sig selv uden vej ud.
 */
export interface WorkupState {
  treeId: string;
  path: AnsweredStep[];
  /**
   * Svar lægen HAR givet, som gennemløbet endnu ikke er nået til.
   *
   * "50-årig med brandsår på hele armen" besvarer lokalisationen med det
   * samme, men træet spørger først om skadesmekanismen. Rejste de svar ikke
   * med tilbage, ville agenten spørge om armen igen tre trin senere — og
   * lægen ville med rette tro at appen ikke lyttede.
   */
  pending?: UdtrukketSvar[];
}

/** Det spørgsmål udredningen mangler svar på lige nu. Rutens egen form. */
export interface WorkupStep {
  /**
   * Hvad turen er:
   * - "started"  — udredningen er lige begyndt
   * - "question" — næste spørgsmål
   * - "held"     — lægen spurgte om noget andet; udredningen holder sin plads
   * - "clarify"  — svaret kunne ikke afgøres, så vi spørger igen
   */
  phase: "started" | "question" | "held" | "clarify";
  treeId: string;
  treeName: string;
  path: AnsweredStep[];
  progress: { answered: number; total: number };
  question?: WorkupSpoergsmaal;
  /** Det agenten selv udfyldte fra lægens beskrivelse — vist som kvittering. */
  prefilled?: AnsweredStep[];
  /** Svar der er givet, men som gennemløbet endnu ikke er nået frem til. */
  pending?: UdtrukketSvar[];
  clarification?: string;
}

/** Et rødt flag fra træet: afbryder tråden, kan ikke overses. */
export interface RedflagEvent {
  treeId: string;
  nodeId: string;
  message: string;
  source: string;
}

/** Udredningens konklusion. Anbefalingen kommer fra træets kanter, aldrig fra en model. */
export interface DispositionEvent {
  treeId: string;
  treeName: string;
  disposition: DispositionUd;
  path: AnsweredStep[];
  redFlags: string[];
  source: string;
}

/** Notat-tilbuddet bærer alt POST /api/note skal bruge. */
export interface NoteOfferEvent {
  treeId: string;
  path: AnsweredStep[];
}

/**
 * Alt ruten kan sende. `ChatEvent` er agentens egne begivenheder; resten er
 * rutens og er additive — kender vi ikke en `kind`, kastes den væk, og
 * tråden opfører sig præcis som før. Typen bor HER og ikke i lib/corti,
 * fordi det er rutens kontrakt med klienten, ikke agentens.
 */
type StreamEvent =
  | ChatEvent
  | { kind: "triage"; triage: Triage; mode: "fast" | "deep" | "workup" }
  | { kind: "pitfalls"; pitfalls: LoestFaldgrube[] }
  | ({ kind: "vision" } & VisionResult)
  | ({ kind: "workup" } & WorkupStep)
  | ({ kind: "redflag" } & RedflagEvent)
  | ({ kind: "disposition" } & DispositionEvent)
  | ({ kind: "noteOffer" } & NoteOfferEvent);

/**
 * Samtalens tilstand på klienten.
 *
 * Hukommelsen ligger to steder med vilje. Corti husker tråden via `contextId`,
 * så "og hvis han er et barn?" giver mening uden at vi gentager hele samtalen.
 * Men agentens kontekst kan udløbe når tråden ligger stille, og API'et siger det
 * ikke — den svarer bare uden at kende historikken. Derfor holder vi ALTID vores
 * egen kopi af samtalen, og har der været stille længe nok, sender vi et kort
 * resumé med og siger det tydeligt i UI'et.
 */

/** Efter så lang tids stilstand regnes agentens egen kontekst som muligvis tabt. */
const STALE_MS = 10 * 60_000;

/** Hvor mange tidligere ture der kommer med i resuméet. */
const RECAP_TURNS = 3;
const RECAP_ANSWER_CHARS = 500;

export interface Turn {
  id: string;
  question: string;
  answer?: ChatAnswer;
  error?: string;
  /** Sat når vi gensendte et resumé fordi tråden havde ligget stille. */
  restored?: boolean;
  /** Statuslinjer fra agenten mens den arbejder. */
  progress: Array<{ expert: string | null; text: string }>;
  /** Billedanalysen, når der var fotos med. Kommer FØR svaret. */
  vision?: VisionResult;
  /** Faldgruberne for emnet, hver med sit ordrette belæg. Rutens egne, ikke modellens. */
  pitfalls?: LoestFaldgrube[];
  /** Udredningens næste spørgsmål — agentens tur i samtalen. */
  workup?: WorkupStep;
  /**
   * Røde flag. En LISTE, fordi én tur kan udløse flere: beskriver lægen både
   * cirkulær forbrænding og inhalation i én sætning, er begge sande, og at
   * lade det ene overskrive det andet ville skjule en eskalering.
   */
  redflags?: RedflagEvent[];
  /** Udredningens konklusion, med kilder. */
  disposition?: DispositionEvent;
  /** Agenten mener der er nok til et journalnotat. Et TILBUD, aldrig en handling. */
  noteOffer?: NoteOfferEvent;
  done: boolean;
}

function newId(): string {
  return `t-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

/** Netværksfejl oversat til noget klinikeren kan handle på. */
function failureText(err: unknown, lang: Lang): string {
  if (typeof navigator !== "undefined" && navigator.onLine === false) return tr("chatOffline", lang);
  if (err instanceof Error && (err.name === "TimeoutError" || err.name === "AbortError")) {
    return tr("chatTimedOut", lang);
  }
  return tr("chatFailed", lang);
}

export function useClinicalChat(lang: Lang) {
  const [turns, setTurns] = useState<Turn[]>([]);
  const [busy, setBusy] = useState(false);

  const contextIdRef = useRef<string | undefined>(undefined);
  /**
   * Udredningens kanoniske sti. Ruten er statsløs og genafspiller den fra
   * træets rod ved hvert kald, så den SKAL med tilbage — ellers begynder
   * udredningen forfra ved hvert svar.
   */
  const workupRef = useRef<WorkupState | undefined>(undefined);
  const lastActivityRef = useRef<number>(0);
  const turnsRef = useRef<Turn[]>([]);
  const abortRef = useRef<AbortController | null>(null);

  const write = useCallback((next: Turn[]) => {
    turnsRef.current = next;
    setTurns(next);
  }, []);

  const patch = useCallback(
    (id: string, change: Partial<Turn> | ((t: Turn) => Partial<Turn>)) => {
      write(
        turnsRef.current.map((t) =>
          t.id === id ? { ...t, ...(typeof change === "function" ? change(t) : change) } : t,
        ),
      );
    },
    [write],
  );

  const buildRecap = useCallback((): string | undefined => {
    const past = turnsRef.current.filter((t) => t.answer);
    if (past.length === 0) return undefined;
    return past
      .slice(-RECAP_TURNS)
      .map((t) => `Q: ${t.question}\nA: ${t.answer!.answer.slice(0, RECAP_ANSWER_CHARS)}`)
      .join("\n\n");
  }, []);

  const stop = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
    setBusy(false);
  }, []);

  const reset = useCallback(() => {
    stop();
    contextIdRef.current = undefined;
    // En ny tråd er en ny patient. En halv udredning fra den forrige ville
    // være klinisk meningsløs — og farlig, fordi den ser fuldt gyldig ud.
    workupRef.current = undefined;
    lastActivityRef.current = 0;
    write([]);
  }, [stop, write]);

  /**
   * Stiller spørgsmålet og streamer svaret ind. Returnerer turens id sammen med
   * det færdige svar, så kalderen kan læse netop den tur op — hooken kender ikke
   * til lyd, og kalderen skal ikke gætte hvilken tur der lige blev besvaret.
   */
  const ask = useCallback(
    async (
      question: string,
      /**
       * Hvad appen ved om patienten lige nu — de besvarede trin i
       * beslutningsforløbet. Sendes med så et generelt svar kan gøres konkret;
       * agenten mærker selv hvad der er ræsonnement og hvad der er kilde.
       */
      patientContext?: string,
      /**
       * Billeder lægen sendte med spørgsmålet — fx et foto af såret.
       *
       * De rejser i den SAMME POST som spørgsmålet og gemmes ingen steder:
       * ingen upload-runde, intet blob-lager, ingen URL der overlever
       * sessionen. Se components/attachments.ts for hvorfor det er et krav og
       * ikke en forenkling.
       */
      images?: ChatImage[],
    ): Promise<{ id: string; answer: ChatAnswer | null }> => {
      const text = question.trim();
      if (!text || abortRef.current) return { id: "", answer: null };

      const stale =
        lastActivityRef.current > 0 && Date.now() - lastActivityRef.current > STALE_MS;
      const recap = stale ? buildRecap() : undefined;

      const id = newId();
      write([
        ...turnsRef.current,
        { id, question: text, progress: [], done: false, restored: Boolean(recap) },
      ]);
      setBusy(true);

      const controller = new AbortController();
      abortRef.current = controller;
      let answer: ChatAnswer | null = null;

      try {
        const res = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            question: text,
            lang,
            contextId: contextIdRef.current,
            recap,
            patientContext,
            // Udelades når der ingen billeder er, så et almindeligt spørgsmål
            // ser præcis ud som det altid har gjort på serversiden.
            ...(images && images.length > 0 ? { images } : {}),
            // Er en udredning i gang, rejser dens sti med — så ruten kan
            // genafspille den og vide hvor vi står.
            ...(workupRef.current ? { workup: workupRef.current } : {}),
          }),
          signal: controller.signal,
        });

        if (!res.ok || !res.body) {
          const detail = res.status === 429 ? tr("chatTimedOut", lang) : tr("chatFailed", lang);
          patch(id, { error: detail, done: true });
          return { id, answer: null };
        }

        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";

        for (;;) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });

          let split: number;
          while ((split = buffer.indexOf("\n\n")) !== -1) {
            const block = buffer.slice(0, split);
            buffer = buffer.slice(split + 2);

            for (const line of block.split("\n")) {
              if (!line.startsWith("data:")) continue;
              const payload = line.slice(5).trim();
              if (!payload) continue;

              let event: StreamEvent;
              try {
                event = JSON.parse(payload) as StreamEvent;
              } catch {
                continue;
              }

              if (event.kind === "context") {
                contextIdRef.current = event.contextId;
              } else if (event.kind === "progress") {
                patch(id, (t) => ({
                  progress: [...t.progress, { expert: event.expert, text: event.text }],
                }));
              } else if (event.kind === "triage") {
                /*
                 * Triagen er det første livstegn (~1 s). Den bliver til en
                 * statuslinje i den fremdrift der allerede vises — men kun på
                 * det tunge spor: hurtigsporet sender sin egen linje i samme
                 * åndedrag, og to linjer om det samme ville ligne to skridt.
                 */
                if (event.mode === "deep") {
                  const text = `${tr("triageDeep", lang)}: ${event.triage.topic}`;
                  patch(id, (t) => ({ progress: [...t.progress, { expert: null, text }] }));
                }
              } else if (event.kind === "pitfalls") {
                patch(id, { pitfalls: event.pitfalls });
              } else if (event.kind === "vision") {
                patch(id, {
                  vision: event.ok
                    ? { ok: true, observations: event.observations }
                    : { ok: false, message: event.message },
                });
              } else if (event.kind === "workup") {
                const { kind, ...step } = event;
                void kind;
                // Stien er den kanoniske tilstand — den skal med tilbage næste
                // gang, ellers begynder udredningen forfra ved roden. Og
                // `pending` med, ellers spørges lægen igen om det han lige
                // har fortalt.
                workupRef.current = { treeId: event.treeId, path: event.path, pending: event.pending };
                patch(id, { workup: step });
              } else if (event.kind === "redflag") {
                const { kind, ...flag } = event;
                void kind;
                patch(id, (t) => ({ redflags: [...(t.redflags ?? []), flag] }));
              } else if (event.kind === "disposition") {
                const { kind, ...d } = event;
                void kind;
                // Forløbet er kørt til ende. Næste ytring er et nyt ærinde og
                // må ikke genoptage en afsluttet udredning.
                workupRef.current = undefined;
                patch(id, { disposition: d });
              } else if (event.kind === "noteOffer") {
                patch(id, { noteOffer: { treeId: event.treeId, path: event.path } });
              } else if (event.kind === "answer") {
                answer = event.answer;
                patch(id, { answer: event.answer, done: true });
              } else if (event.kind === "error") {
                // Serverens egen tekst ("Agent-kald fejlede: 401 …") siger en
                // læge ingenting. Skærmen får beskeden han kan handle på;
                // detaljen bliver i konsollen, hvor vi kan finde den.
                console.error("chat-agent:", event.message);
                patch(id, { error: tr("chatFailed", lang), done: true });
              }
            }
          }
        }

        /*
         * SLUTTEDE TUREN GODT?
         *
         * Her stod før `if (!answer)` — altså: "kom der ikke et svar, er det
         * en fejl". Det var sandt dengang chatten kun kunne svare. Med
         * udredningen i samtalen er det direkte forkert: en udredningstur
         * slutter med et SPØRGSMÅL, ikke et svar, og strømmen sender aldrig
         * en `answer`-begivenhed. Resultatet var at "Svaret kunne ikke
         * hentes" stod over hvert eneste udredningstrin — mens trinnet
         * fungerede upåklageligt lige nedenunder. Et produkt der ser i
         * stykker ud mens det virker, er værre end et der fejler ærligt.
         *
         * Reglen er nu: turen lykkedes hvis den efterlod NOGET klinikeren
         * kan handle på. Kun en tur der intet efterlod, er en reel fejl —
         * og den skal stadig sige det, for en tavs tom tur er den anden
         * måde at tabe nogen på.
         */
        const t = turnsRef.current.find((x) => x.id === id);
        const landede =
          !!t?.answer ||
          !!t?.workup ||
          !!t?.disposition ||
          !!t?.noteOffer ||
          (t?.redflags?.length ?? 0) > 0;

        if (!landede && !t?.error) {
          patch(id, { error: tr("chatFailed", lang), done: true });
        } else if (landede && !t?.done) {
          // Udredningsture markeres først færdige her: `workup` er turens
          // afslutning, men den ved det ikke selv, når den ankommer.
          patch(id, { done: true });
        }
      } catch (err) {
        // Brugerens eget afbryd efterlader turen som den er, uden fejlbesked.
        if (controller.signal.aborted) {
          patch(id, { done: true });
        } else {
          patch(id, { error: failureText(err, lang), done: true });
        }
      } finally {
        lastActivityRef.current = Date.now();
        abortRef.current = null;
        setBusy(false);
      }

      return { id, answer };
    },
    [buildRecap, lang, patch, write],
  );

  /**
   * Udredningens sti, som den står lige nu.
   *
   * Den findes så lægen kan bede om journalnotatet NÅR SOM HELST — ikke kun
   * når agenten selv tilbyder det. Et ref og ikke en tilstand: den skal ikke
   * gentegne noget, den skal bare kunne læses i det øjeblik der spørges.
   */
  const currentWorkup = useCallback(() => workupRef.current, []);

  return { turns, busy, ask, stop, reset, currentWorkup };
}
