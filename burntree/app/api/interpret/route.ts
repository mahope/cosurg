import { NextResponse } from "next/server";
import { INTERPRETER_SPEC, askAgent, ensureAgent } from "@/lib/corti/agent";
import { treeSource } from "@/lib/tree/loader";
import { getNode } from "@/lib/tree/engine";
import type { Lang } from "@/lib/tree/types";

export const dynamic = "force-dynamic";

interface Body {
  treeId: string;
  nodeId: string;
  lang: Lang;
  utterance: string;
}

interface Interpretation {
  value: string;
  confidence?: number;
  needsClarification: boolean;
  clarificationQuestion?: string;
}

export async function POST(req: Request) {
  try {
    const { treeId, nodeId, lang, utterance } = (await req.json()) as Body;

    const tree = await treeSource.get(treeId);
    if (!tree) return NextResponse.json({ error: "Ukendt træ" }, { status: 404 });
    const node = getNode(tree, nodeId);
    if (!node) return NextResponse.json({ error: "Ukendt node" }, { status: 404 });

    let allowed: string;
    if (node.answerType === "number") {
      allowed = `A number${node.unit ? ` in ${node.unit}` : ""}${
        node.min !== undefined ? `, between ${node.min} and ${node.max}` : ""
      }. Return digits only.`;
    } else {
      allowed = (node.options ?? [])
        .map((o) => {
          const syn = [...(o.synonyms?.da ?? []), ...(o.synonyms?.en ?? [])];
          return `- "${o.value}" (${o.label[lang]})${syn.length ? ` — hints: ${syn.join(", ")}` : ""}`;
        })
        .join("\n");
    }

    const prompt = [
      `Question asked (${lang}): ${node.question[lang]}`,
      `Answer type: ${node.answerType}`,
      `Allowed values:\n${allowed}`,
      `Clinician's spoken answer: "${utterance}"`,
      "",
      "Map it to exactly one allowed value with submit_answer. If unclear, set needsClarification=true",
      `and give clarificationQuestion in ${lang === "da" ? "Danish" : "English"}.`,
    ].join("\n");

    const agentId = await ensureAgent(INTERPRETER_SPEC);
    const { result } = await askAgent<Interpretation>(agentId, prompt);

    return NextResponse.json(result);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "ukendt fejl" },
      { status: 500 },
    );
  }
}
