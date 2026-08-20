import { CORTI_API_BASE, cortiHeaders, getAccessToken } from "./auth";

interface SchemaConnector {
  type: "schema";
  name: string;
  description: string;
  transition: "complete";
  schema: Record<string, unknown>;
}

interface AgentSpec {
  name: string;
  description: string;
  systemPrompt: string;
  connectors: SchemaConnector[];
}

/** Agent-id'er caches i processen, så agenten kun oprettes én gang pr. kold start. */
const agentIds = new Map<string, string>();

async function createAgent(spec: AgentSpec): Promise<string> {
  const token = await getAccessToken();
  const res = await fetch(`${CORTI_API_BASE}/v2/agentic/agents`, {
    method: "POST",
    headers: cortiHeaders(token),
    body: JSON.stringify({ ...spec, lifecycle: "persistent" }),
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`Kunne ikke oprette agent: ${res.status} ${await res.text()}`);
  const data = (await res.json()) as { id: string };
  return data.id;
}

export async function ensureAgent(spec: AgentSpec): Promise<string> {
  const cached = agentIds.get(spec.name);
  if (cached) return cached;
  const id = await createAgent(spec);
  agentIds.set(spec.name, id);
  return id;
}

/**
 * Sender én besked til agenten og returnerer det strukturerede output fra
 * schema-connectoren. Agenten SKAL kalde connectoren, så outputtet er altid typet.
 */
export async function askAgent<T>(
  agentId: string,
  text: string,
  contextId?: string,
): Promise<{ result: T; contextId: string }> {
  const token = await getAccessToken();
  const res = await fetch(`${CORTI_API_BASE}/v2/agentic/agents/${agentId}/a2a/message:send`, {
    method: "POST",
    headers: cortiHeaders(token),
    body: JSON.stringify({
      message: {
        role: "user",
        parts: [{ kind: "text", text }],
        messageId: `m-${Date.now()}`,
        ...(contextId ? { contextId } : {}),
      },
    }),
    cache: "no-store",
  });

  if (!res.ok) throw new Error(`Agent-kald fejlede: ${res.status} ${await res.text()}`);

  const body = (await res.json()) as {
    task?: {
      contextId: string;
      artifacts?: Array<{ parts?: Array<{ data?: unknown }> }>;
    };
  };

  const data = body.task?.artifacts?.[0]?.parts?.find((p) => p.data)?.data;
  if (!data) throw new Error("Agenten returnerede intet struktureret output");

  return { result: data as T, contextId: body.task!.contextId };
}

export const INTERPRETER_SPEC: AgentSpec = {
  name: "burntree-answer-interpreter",
  description: "Maps a spoken clinical answer onto a decision-tree node's allowed values.",
  systemPrompt: [
    "You map a clinician's spoken answer onto exactly one allowed value of a clinical decision-tree node.",
    "The speech may be Danish or English and may be a partial or noisy transcript.",
    "NEVER guess. If the utterance does not clearly indicate one allowed value, set needsClarification=true.",
    "For numeric nodes, return the number as a plain string (e.g. '18'). Convert spoken numbers ('atten procent' -> '18').",
    "Patient safety depends on this: an uncertain interpretation must be flagged, not resolved.",
  ].join(" "),
  connectors: [
    {
      type: "schema",
      name: "submit_answer",
      description: "Submit the interpreted answer for the current node.",
      transition: "complete",
      schema: {
        type: "object",
        properties: {
          value: { type: "string", description: "The matched allowed value, or a number as string." },
          confidence: { type: "number", minimum: 0, maximum: 1 },
          needsClarification: { type: "boolean" },
          clarificationQuestion: {
            type: "string",
            description: "If needsClarification, a short question to ask aloud, in the same language.",
          },
        },
        required: ["value", "needsClarification"],
      },
    },
  ],
};

export const SCRIBE_SPEC: AgentSpec = {
  name: "burntree-scribe",
  description: "Writes a clinical note and assigns codes from a completed decision path.",
  systemPrompt: [
    "You write a concise clinical note from a completed decision-tree path and encounter transcript.",
    "Use ONLY facts present in the path and transcript. Never invent findings, never add clinical advice.",
    "The recommendation comes from the decision tree, not from you — restate it verbatim in the plan.",
    "Write the note in the requested language. Assign ICD-10 codes for burns (T20-T32 range) plus mechanism codes where the path supports them.",
  ].join(" "),
  connectors: [
    {
      type: "schema",
      name: "submit_note",
      description: "Submit the finished note and codes.",
      transition: "complete",
      schema: {
        type: "object",
        properties: {
          note: { type: "string", description: "The clinical note in markdown." },
          codes: {
            type: "array",
            items: {
              type: "object",
              properties: {
                code: { type: "string" },
                system: { type: "string" },
                description: { type: "string" },
                rationale: { type: "string", description: "Which path step supports this code." },
              },
              required: ["code", "description"],
            },
          },
        },
        required: ["note", "codes"],
      },
    },
  ],
};

export const COMMAND_SPEC: AgentSpec = {
  name: "burntree-or-command",
  description: "Detects hands-free voice commands in OR mode.",
  systemPrompt: [
    "In a sterile operating-room setting a surgeon speaks while a decision tree is running.",
    "Classify the utterance as one of: next, repeat, back, show_image, answer, none.",
    "'answer' means the utterance answers the current question rather than issuing a command.",
    "'none' means it is unrelated chatter — background talk must NOT trigger a command.",
    "Be conservative: when in doubt, choose none.",
  ].join(" "),
  connectors: [
    {
      type: "schema",
      name: "submit_command",
      description: "Submit the detected command.",
      transition: "complete",
      schema: {
        type: "object",
        properties: {
          command: { type: "string", enum: ["next", "repeat", "back", "show_image", "answer", "none"] },
          confidence: { type: "number", minimum: 0, maximum: 1 },
        },
        required: ["command"],
      },
    },
  ],
};
