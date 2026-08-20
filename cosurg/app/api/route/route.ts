import { NextResponse } from "next/server";
import { LIMITS, cap, guard } from "@/lib/guard";
import { askAgent, ensureAgent } from "@/lib/corti/agent";
import { treeSource } from "@/lib/tree/loader";
import { getNode } from "@/lib/tree/engine";
import type { Lang } from "@/lib/tree/types";
import { routerIntent } from "@/lib/corti/triage";
import { ROUTER_SPEC, type RoutedIntent } from "./agent";

export const dynamic = "force-dynamic";

/**
 * Hvad havde lægen gang i?
 *
 * Ruten kaldes KUN når det deterministiske lag i browseren ikke turde afgøre
 * det, og — inde i et forløb — først efter at svarfortolkeren selv har meldt
 * tvivl. Den er altså et sikkerhedsnet, ikke en hovedvej, og kvoten er sat
 * derefter.
 *
 * Klassifikationen kører nu på Corti Models (`corti-s1-instant`, målt 0,7-2,0 s)
 * frem for det agentiske framework. Opgaven er ét kald uden opslag, så
 * agent-rundturen var ren ventetid — og ventetiden faldt her, hvor lægen står
 * og kigger på en skærm der ikke har reageret endnu. Svarer Models ikke,
 * bruges agenten som før: kontrakten udadtil er uændret.
 */

/** Ét kald pr. ytring vi ikke kunne afgøre lokalt. Rundhåndet, men ikke gratis. */
const ROUTE_QUOTA_PER_MINUTE = 40;

/** Trænavne er korte; loftet er der for at afvise misbrug, ikke for at klippe. */
const MAX_PATHWAYS = 12;
const MAX_PATHWAY_NAME = 120;

interface Body {
  utterance?: unknown;
  lang?: unknown;
  /** "node": lægen står midt i et forløb. "intake": intet forløb er valgt endnu. */
  context?: unknown;
  treeId?: unknown;
  nodeId?: unknown;
  /** Navnene på de forløb der findes — kun til "intake". */
  pathways?: unknown;
}

interface Routed {
  intent?: unknown;
  reason?: unknown;
}

const ALLOWED: Record<"node" | "intake", RoutedIntent[]> = {
  node: ["answer", "question", "unclear"],
  intake: ["pathway", "question", "unclear"],
};

export async function POST(req: Request) {
  const limited = guard(req, "route", ROUTE_QUOTA_PER_MINUTE);
  if (limited) return limited;

  try {
    const body = (await req.json()) as Body;
    const lang: Lang = body.lang === "en" ? "en" : "da";
    const utterance = cap(body.utterance, LIMITS.utterance);
    const context = body.context === "intake" ? "intake" : "node";

    if (!utterance) return NextResponse.json({ error: "Tom ytring" }, { status: 400 });

    const lines = [
      `The clinician speaks ${lang === "da" ? "Danish" : "English"}.`,
      "",
    ];

    if (context === "node") {
      const treeId = cap(body.treeId, 100);
      const nodeId = cap(body.nodeId, 100);
      const tree = treeId ? await treeSource.get(treeId) : undefined;
      const node = tree ? getNode(tree, nodeId) : undefined;
      if (!node) return NextResponse.json({ error: "Ukendt node" }, { status: 404 });

      const allowed =
        node.answerType === "number"
          ? `a number${node.unit ? ` in ${node.unit}` : ""}`
          : (node.options ?? []).map((o) => `"${o.label[lang]}"`).join(", ") || "a free answer";

      lines.push(
        `The app has just asked: "${node.question[lang]}"`,
        `The allowed answers to that question are: ${allowed}.`,
        "",
        `The clinician then said: "${utterance}"`,
        "",
        "Allowed categories here: answer, question, unclear.",
        "Choose 'question' only if the clinician wants information back rather than moving the assessment on.",
      );
    } else {
      const pathways = Array.isArray(body.pathways)
        ? body.pathways
            .slice(0, MAX_PATHWAYS)
            .map((p) => cap(p, MAX_PATHWAY_NAME))
            .filter(Boolean)
        : [];

      lines.push(
        "No assessment has been started yet. The app is showing one field: \"What is this about?\"",
        pathways.length > 0 ? `The pathways the app can run: ${pathways.join(", ")}.` : "",
        "",
        `The clinician said: "${utterance}"`,
        "",
        "Allowed categories here: pathway, question, unclear.",
        "Choose 'pathway' only if this describes a patient or an injury to be assessed.",
      );
    }

    const prompt = lines.join("\n");

    // Hurtigsporet først. `routedBy: "lokal"` betyder at kaldet ikke lykkedes —
    // ikke at svaret var tvivlsomt — og kun DA er agent-rundturen pengene værd.
    const hurtig = await routerIntent(prompt, ALLOWED[context], req.signal);
    if (hurtig.routedBy === "corti-models") {
      return NextResponse.json({ intent: hurtig.intent, reason: hurtig.reason, routedBy: hurtig.routedBy });
    }

    const agentId = await ensureAgent(ROUTER_SPEC);
    const { result } = await askAgent<Routed>(agentId, `${prompt}\n\nClassify it with submit_intent.`);

    const claimed = result.intent;
    const intent: RoutedIntent =
      typeof claimed === "string" && (ALLOWED[context] as string[]).includes(claimed)
        ? (claimed as RoutedIntent)
        : "unclear";

    return NextResponse.json({
      intent,
      reason: typeof result.reason === "string" ? result.reason.slice(0, 300) : undefined,
      routedBy: "corti-agent",
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "ukendt fejl" },
      { status: 500 },
    );
  }
}
