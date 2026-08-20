import { CORTI_API_BASE, cortiHeaders, getAccessToken } from "./auth";

/**
 * Den kliniske chat: et frit spørgsmål ind, et KILDEBELAGT svar ud.
 *
 * Forskellen på denne agent og resten af CoSurg er hvor viden kommer fra.
 * Beslutningstræet er skrevet af klinikere og eksekveres deterministisk. Chatten
 * kan ikke bruge træet — spørgsmålet er frit — så den næstbedste garanti er at
 * agenten ikke svarer af hukommelsen: den SKAL slå op i Cortis registry-eksperter
 * (PubMed først) og aflevere sit svar sammen med de kilder svaret hviler på.
 *
 * Derfor er `sources` et påkrævet felt i schema-connectoren, og `evidence` siger
 * hvor stærkt belægget er. Kan agenten ikke belægge et svar, skal den sige det —
 * en ærlig "det kan jeg ikke belægge" er brugbar, et flydende gæt er farligt.
 *
 * Mønstret (ensureAgent + struktureret output via schema-connector med
 * transition: "complete") er det samme som i lib/corti/agent.ts. Det er skrevet
 * ud her frem for genbrugt direkte, fordi `AgentSpec` i agent.ts kun rummer
 * schema-connectorer — chatten har også registry- og MCP-connectorer.
 */

/** En agent der fanger ud til flere eksperter er langsom: målt 35-70 s pr. svar. */
const CHAT_TIMEOUT_MS = 180_000;

/** Hvor lang tids stilstand der får os til at gensende et resumé til agenten. */
export const CONTEXT_STALE_MS = 10 * 60_000;

export type Evidence = "sourced" | "partial" | "unsupported";

export interface ChatSource {
  title: string;
  /** PMID, NCT-nummer eller anden stabil identifikator, når kilden har en. */
  identifier?: string;
  url?: string;
  /** Hvad præcis i svaret denne kilde understøtter. */
  supports: string;
}

export interface ChatAnswer {
  answer: string;
  evidence: Evidence;
  limitations?: string;
  /** Kort udgave til oplæsning — hele svaret læst højt er ubrugeligt hands-free. */
  spokenSummary?: string;
  sources: ChatSource[];
}

export type ChatEvent =
  | { kind: "context"; contextId: string }
  | { kind: "progress"; expert: string | null; text: string }
  | { kind: "answer"; answer: ChatAnswer }
  | { kind: "error"; message: string };

type Connector =
  | { type: "registry"; name: string; config?: Record<string, unknown> }
  | { type: "mcp"; name: string; url: string; auth?: { type: "none" | "bearer" } }
  | {
      type: "schema";
      name: string;
      description: string;
      transition: "complete";
      schema: Record<string, unknown>;
    };

/**
 * Registry-eksperterne. Verificeret mod `GET /v2/agentic/registry/connectors` med
 * vores egne credentials 20/8 — alle fire findes i vores tenant.
 *
 * PubMed er den vigtige: den henter rigtige citationer med PMID. De øvrige er
 * med fordi et brandsårsspørgsmål ofte er et regnestykke (Parkland), et
 * guideline-opslag der er nyere end litteraturen, eller et spørgsmål om
 * igangværende studier.
 */
const REGISTRY_EXPERTS: Connector[] = [
  { type: "registry", name: "pubmed-expert" },
  { type: "registry", name: "web-search-expert" },
  { type: "registry", name: "medical-calculator-expert" },
  { type: "registry", name: "clinical-trials-expert" },
];

/** Navnet connectoren får hos Corti. Samme navn som på teamets egen agent. */
const MCP_CONNECTOR_NAME = "cosurg-viden";

/**
 * Teamets egen MCP-server: den kuraterede danske brandsårsviden (brandsaar.dk
 * og PlastSurgeon-materialet). Den er grunden til at chatten kan svare med
 * dansk praksis og et ordret citat, hvor PubMed kun kan give international
 * litteratur.
 *
 * Serveren autentificerer med et token i STIEN, ikke i en header — derfor
 * bygges URL'en af MCP_URL + MCP_AUTH_TOKEN, præcis som connectoren er
 * registreret på `cosurg-clinical-expert`. COSURG_MCP_URL er en udvej hvis
 * nogen skal pege et andet sted hen uden at røre kode.
 *
 * Findes serveren ikke, kører chatten videre på registry-eksperterne alene.
 * En vidensbase der er nede må gøre svaret fattigere, ikke slå chatten ihjel.
 */
function mcpConnectors(): Connector[] {
  const explicit = process.env.COSURG_MCP_URL?.trim();
  const base = process.env.MCP_URL?.trim().replace(/\/+$/, "");
  const token = process.env.MCP_AUTH_TOKEN?.trim();

  const url = explicit || (base && token ? `${base}/${token}` : undefined);
  if (!url) return [];
  return [{ type: "mcp", name: MCP_CONNECTOR_NAME, url }];
}

const ANSWER_CONNECTOR: Connector = {
  type: "schema",
  name: "submit_clinical_answer",
  description:
    "Submit the final answer together with the sources it rests on. This is the only way to answer.",
  transition: "complete",
  schema: {
    type: "object",
    properties: {
      answer: {
        type: "string",
        description:
          "The clinical answer in the requested language. Plain text with '- ' bullets and **bold** where it helps. No headings.",
      },
      evidence: {
        type: "string",
        enum: ["sourced", "partial", "unsupported"],
        description:
          "'sourced': every clinical claim is backed by a listed source. 'partial': the core is sourced but parts are not. 'unsupported': you could not substantiate the answer — say so in the answer itself.",
      },
      limitations: {
        type: "string",
        description:
          "What this answer does NOT establish: conflicting evidence, missing local guidelines, weak study designs. Empty only if there are none.",
      },
      spokenSummary: {
        type: "string",
        description:
          "At most 3 sentences and 400 characters, same language, meant to be read aloud to a clinician whose hands are busy. No markdown, no citations.",
      },
      sources: {
        type: "array",
        description:
          "One entry per source actually retrieved and used. Never invent a source, a PMID or a URL. Empty array only when evidence is 'unsupported'.",
        items: {
          type: "object",
          properties: {
            title: { type: "string", description: "Title as returned by the expert." },
            identifier: { type: "string", description: "PMID, NCT number or similar, as returned." },
            url: { type: "string", description: "URL as returned by the expert." },
            supports: {
              type: "string",
              description: "Which specific claim in the answer this source supports.",
            },
          },
          required: ["title", "supports"],
        },
      },
    },
    required: ["answer", "evidence", "sources"],
  },
};

const SYSTEM_PROMPT = [
  "You are a clinical reference assistant used by emergency physicians and plastic surgeons, mainly about burns.",
  "You answer free clinical questions. You are NOT the decision tree in this app: the tree owns patient-specific recommendations, you own the literature behind them.",
  "",
  "How you must work:",
  "1. Before answering any clinical question, retrieve evidence.",
  "   Consult cosurg-viden FIRST when it is available: it is the team's own curated Danish burn knowledge base",
  "   (brandsaar.dk and the PlastSurgeon material), and it is the authority on Danish clinical practice.",
  "   Where it and the international literature differ — for example the fluid formula — state the Danish practice first",
  "   and note the international variant as such.",
  "   Use pubmed-expert for the peer-reviewed literature, web-search-expert for current guidelines outside it,",
  "   clinical-trials-expert for ongoing studies, and medical-calculator-expert whenever a number has to be computed.",
  "2. Answer only through submit_clinical_answer. Every clinical claim must map to a source in the sources array.",
  "3. NEVER invent a source, a PMID, a URL or a quotation. Only list sources an expert actually returned to you.",
  "4. If the retrieval finds nothing that substantiates the question, set evidence='unsupported', return an empty sources array,",
  "   and state plainly in the answer that you cannot substantiate it. That answer is correct and useful. A fluent guess is not.",
  "5. Named local protocols, unfamiliar syndromes and product names that no source confirms must be called out as unconfirmed, not paraphrased as if real.",
  "6. Formulas are starting estimates. Say so, and say what the number must be titrated against.",
  "7. Write in the language the user asks for. Do not switch language, not even for a greeting.",
  "8. Be brief. A clinician is reading this between patients.",
].join("\n");

function agentName(): string {
  const extra = mcpConnectors()
    .map((c) => c.name)
    .join("+");
  // Navnet bærer connector-sættet, så en tilføjet MCP-server ikke kan ende med
  // at genbruge en agent der ikke har den.
  return extra ? `cosurg-clinical-chat-v1-${extra}` : "cosurg-clinical-chat-v1";
}

let agentIdPromise: Promise<string> | null = null;

async function createChatAgent(): Promise<string> {
  const token = await getAccessToken();
  const res = await fetch(`${CORTI_API_BASE}/v2/agentic/agents`, {
    method: "POST",
    headers: cortiHeaders(token),
    body: JSON.stringify({
      name: agentName(),
      description: "Answers free clinical questions about burn care, grounded in retrieved sources.",
      systemPrompt: SYSTEM_PROMPT,
      lifecycle: "persistent",
      connectors: [ANSWER_CONNECTOR, ...REGISTRY_EXPERTS, ...mcpConnectors()],
    }),
    cache: "no-store",
    signal: AbortSignal.timeout(30_000),
  });
  if (!res.ok) {
    throw new Error(`Kunne ikke oprette chat-agenten: ${res.status} ${await res.text()}`);
  }
  const data = (await res.json()) as { id: string };
  return data.id;
}

/**
 * Agenten oprettes én gang pr. proces. Løftet caches — ikke id'et — så to
 * samtidige spørgsmål på en kold server ikke opretter hver sin agent.
 */
export function ensureChatAgent(): Promise<string> {
  if (!agentIdPromise) {
    agentIdPromise = createChatAgent().catch((err) => {
      agentIdPromise = null;
      throw err;
    });
  }
  return agentIdPromise;
}

/** Hvilke connectorer der faktisk er koblet på — bruges af /api/chat til at være ærlig i UI'et. */
export function attachedExperts(): string[] {
  return [...REGISTRY_EXPERTS, ...mcpConnectors()].map((c) => c.name);
}

export interface ChatRequest {
  question: string;
  lang: "da" | "en";
  contextId?: string;
  /**
   * Kort resumé af samtalen indtil nu. Sendes KUN når tråden har ligget stille
   * længe nok til at agentens egen kontekst kan være tabt.
   */
  recap?: string;
  signal?: AbortSignal;
}

function buildPrompt({ question, lang, recap }: ChatRequest): string {
  const language = lang === "da" ? "Danish" : "English";
  const lines = [`Answer in ${language}. The clinician asks:`, "", question];
  if (recap) {
    lines.push(
      "",
      "--- Earlier in this conversation (resent because the thread had been idle; treat it as context, do not answer it again) ---",
      recap,
    );
  }
  lines.push(
    "",
    `Retrieve evidence first, then answer with submit_clinical_answer in ${language}.`,
    "If nothing substantiates it, set evidence='unsupported' rather than guessing.",
  );
  return lines.join("\n");
}

function asString(v: unknown): string | undefined {
  return typeof v === "string" && v.trim() ? v.trim() : undefined;
}

/**
 * Kun http(s) slipper igennem som klikbart link.
 *
 * Kilde-URL'en kommer fra agentens output, og agenten læser åbne websider
 * gennem web-search-expert. En side kan derfor forsøge at få modellen til at
 * gengive en `javascript:`-URL, som React IKKE saniterer i href. Systemprompten
 * er en instruktion til modellen, ikke en spærring — spærringen er her.
 * Afvises URL'en, vises kilden stadig, bare uden link.
 */
function asHttpUrl(v: unknown): string | undefined {
  const raw = asString(v);
  if (!raw) return undefined;
  try {
    const parsed = new URL(raw);
    return parsed.protocol === "https:" || parsed.protocol === "http:" ? parsed.href : undefined;
  } catch {
    return undefined;
  }
}

/**
 * Normaliserer agentens output og retter det ét sted hvor modellen kan tage fejl
 * til vores ugunst: siger den "sourced" uden at have vedlagt en eneste kilde,
 * er svaret pr. definition ikke belagt. Vi nedgraderer frem for at vise et
 * kilde-stempel der ikke kan klikkes på.
 */
export function normalizeAnswer(raw: unknown): ChatAnswer {
  const r = (raw ?? {}) as Record<string, unknown>;

  /*
   * Samme kilde kan komme retur flere gange — vidensbasen svarer fx to gange
   * fra samme side om væskebehandling. To identiske linjer i kildelisten ser
   * ud som sjusk, så de slås sammen og deres begrundelser lægges i forlængelse
   * af hinanden. Ingen kilde forsvinder; kun dubletten gør.
   */
  const sources: ChatSource[] = [];
  const seen = new Map<string, ChatSource>();
  if (Array.isArray(r.sources)) {
    for (const entry of r.sources) {
      const o = (entry ?? {}) as Record<string, unknown>;
      const title = asString(o.title);
      if (!title) continue;

      const source: ChatSource = {
        title,
        identifier: asString(o.identifier),
        url: asHttpUrl(o.url),
        supports: asString(o.supports) ?? "",
      };

      const key = (source.url ?? source.identifier ?? title).toLowerCase();
      const existing = seen.get(key);
      if (!existing) {
        seen.set(key, source);
        sources.push(source);
      } else if (source.supports && !existing.supports.includes(source.supports)) {
        existing.supports = existing.supports ? `${existing.supports} ${source.supports}` : source.supports;
      }
    }
  }

  const claimed = r.evidence;
  let evidence: Evidence =
    claimed === "sourced" || claimed === "partial" || claimed === "unsupported" ? claimed : "partial";
  if (sources.length === 0) evidence = "unsupported";

  return {
    answer: asString(r.answer) ?? "",
    evidence,
    limitations: asString(r.limitations),
    spokenSummary: asString(r.spokenSummary),
    sources,
  };
}

/** "Calling expert: pubmed-expert" → "pubmed-expert". */
function expertFrom(text: string): string | null {
  const m = /calling expert:\s*([\w@/-]+)/i.exec(text);
  return m ? m[1] : null;
}

interface StreamEnvelope {
  task?: { contextId?: string };
  statusUpdate?: {
    contextId?: string;
    status?: {
      state?: string;
      message?: { parts?: Array<{ text?: string }> };
    };
  };
  artifactUpdate?: {
    contextId?: string;
    artifact?: { parts?: Array<{ data?: unknown }> };
  };
}

/**
 * Sender spørgsmålet og udsender begivenheder undervejs. Corti svarer med
 * Server-Sent Events: først en task, så "Calling expert: …" mens den henter
 * litteratur, og til sidst artefaktet med det strukturerede svar.
 *
 * Vi videresender fremdriften frem for at vente i tavshed. Et svar tager målt
 * 35-70 sekunder, og en skærm uden livstegn så længe føles brudt.
 */
export async function* streamChatAnswer(req: ChatRequest): AsyncGenerator<ChatEvent> {
  const agentId = await ensureChatAgent();
  const token = await getAccessToken();

  const timeout = AbortSignal.timeout(CHAT_TIMEOUT_MS);
  const signal = req.signal ? AbortSignal.any([req.signal, timeout]) : timeout;

  const res = await fetch(`${CORTI_API_BASE}/v2/agentic/agents/${agentId}/a2a/message:stream`, {
    method: "POST",
    headers: { ...cortiHeaders(token), "A2A-Version": "1.0" },
    body: JSON.stringify({
      message: {
        role: "user",
        parts: [{ kind: "text", text: buildPrompt(req) }],
        messageId: `m-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        ...(req.contextId ? { contextId: req.contextId } : {}),
      },
    }),
    cache: "no-store",
    signal,
  });

  if (!res.ok || !res.body) {
    throw new Error(`Chat-kald fejlede: ${res.status} ${await res.text()}`);
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let gotAnswer = false;
  let sentContext = false;

  while (true) {
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

        let ev: StreamEnvelope;
        try {
          ev = JSON.parse(payload) as StreamEnvelope;
        } catch {
          continue;
        }

        const contextId = ev.task?.contextId ?? ev.statusUpdate?.contextId ?? ev.artifactUpdate?.contextId;
        if (contextId && !sentContext) {
          sentContext = true;
          yield { kind: "context", contextId };
        }

        const progressText = ev.statusUpdate?.status?.message?.parts
          ?.map((p) => p.text ?? "")
          .join(" ")
          .trim();
        if (progressText) {
          yield { kind: "progress", expert: expertFrom(progressText), text: progressText };
        }

        const data = ev.artifactUpdate?.artifact?.parts?.find((p) => p.data !== undefined)?.data;
        if (data !== undefined) {
          gotAnswer = true;
          yield { kind: "answer", answer: normalizeAnswer(data) };
        }

        const state = ev.statusUpdate?.status?.state;
        if (state === "TASK_STATE_FAILED" || state === "TASK_STATE_CANCELED") {
          if (!gotAnswer) yield { kind: "error", message: `Agenten afsluttede med ${state}` };
          return;
        }
        if (state === "TASK_STATE_COMPLETED") return;
      }
    }
  }

  if (!gotAnswer) {
    yield { kind: "error", message: "Agenten leverede intet svar" };
  }
}
