import { NextResponse } from "next/server";
import { guard } from "@/lib/guard";
import { filtrerRelevante, mcpKonfigureret, soegKliniskViden } from "@/lib/corti/mcp";
import { treeSource } from "@/lib/tree/loader";
import type {
  DecisionTree,
  EscalationAction,
  EscalationWhen,
  Lang,
  SourceLookup,
} from "@/lib/tree/types";
import type { EskalationSvar, LoestHandling } from "@/components/escalation/types";

export const dynamic = "force-dynamic";

/**
 * ESKALATIONEN SET FRA BEGGE SIDER.
 *
 * "Ring til vagthavende brandsårslæge på 35 45 12 45" er et korrekt råd — til
 * den yngre læge. Til specialisten er det cirkulært: hun ER den vagthavende, og
 * rådet beder hende ringe til sig selv. Værre endnu er det netop i de
 * situationer hvor eskalationen udløses — inhalationsskade, cirkulær
 * forbrænding, elektrisk skade, stort areal — at hun har mest brug for de
 * konkrete trin, og dér får hun altså et telefonnummer.
 *
 * Ruten løser det ved at hente HANDLINGERNE frem ved siden af eskalationen:
 * de trin træets forfattere har skrevet for præcis den vej gennemløbet gik, og
 * for hvert trin det ordrette uddrag fra vidensbasen der belægger det.
 *
 * Tre ting holder den inden for produktets påstand:
 *
 *  1. **Trinnene kommer fra træet, ikke fra en sprogmodel.** De er skrevet i
 *     `content/trees/*.json` og udvælges ved et opslag i den sti motoren gik.
 *     Ingen model er involveret i hverken udvælgelse eller ordlyd.
 *  2. **Hvert trin bærer sin kilde**, og belægget hentes ordret fra
 *     vidensbasen. Kan den ikke belægge trinnet, siger kortet det — vi
 *     opfinder aldrig et klinisk trin.
 *  3. **Telefonnummeret bliver stående.** "Konferér ved tvivl" er selv en
 *     anbefaling fra kilderne. Det suppleres, det erstattes ikke.
 */

/** Så mange trin ad gangen. Flere end dette er en side, ikke en handling. */
const MAKS_HANDLINGER = 6;

/** Stien er allerede genafspillet et andet sted; her læses den kun som opslag. */
const MAKS_STI = 40;

interface Body {
  treeId?: string;
  dispositionId?: string;
  /** Noden det røde flag sprang på — bruges kun til at finde flagets opslag. */
  nodeId?: string;
  /** Værdien flaget sprang på. Afgør hvilket af nodens flag der er tale om. */
  value?: string;
  path?: Array<{ nodeId?: unknown; value?: unknown }>;
  lang?: Lang;
}

/** Den besvarede sti som opslagstabel: nodeId → værdi. */
function somOpslag(path: Body["path"]): Map<string, string> {
  const map = new Map<string, string>();
  for (const skridt of (path ?? []).slice(0, MAKS_STI)) {
    if (typeof skridt?.nodeId !== "string" || typeof skridt?.value !== "string") continue;
    map.set(skridt.nodeId.slice(0, 64), skridt.value.slice(0, 64));
  }
  return map;
}

/**
 * Gælder trinnet for denne patient?
 *
 * Uden `when` gælder det altid — det er de trin der skal gøres uanset hvordan
 * gennemløbet faldt ud. Med `when` kræves et match i den sti motoren FAKTISK
 * gik: et trin må aldrig komme frem på en formodning om hvad der nok er sket.
 */
function gaelder(action: EscalationAction, svar: Map<string, string>): boolean {
  if (!action.when || action.when.length === 0) return true;
  return action.when.some((w: EscalationWhen) => {
    const vaerdi = svar.get(w.nodeId);
    if (vaerdi === undefined) return false;
    if (w.atLeast !== undefined) {
      const tal = Number(vaerdi);
      return !Number.isNaN(tal) && tal >= w.atLeast;
    }
    if (w.values && w.values.length > 0) return w.values.includes(vaerdi);
    return true;
  });
}

/**
 * Belæg ét trin med et ordret uddrag.
 *
 * "Vi kunne ikke spørge" og "der er ikke dækning" er to forskellige beskeder,
 * og forskellen betyder noget klinisk — så den overlever hele vejen ud i UI'et.
 */
async function loesHandling(action: EscalationAction, lang: Lang): Promise<LoestHandling> {
  const faelles = {
    id: action.id,
    title: action.title[lang],
    detail: action.detail[lang],
    source: action.source,
  };
  if (!mcpKonfigureret()) return { ...faelles, evidence: null, coverage: "error" };
  try {
    const svar = await soegKliniskViden(action.query, { antal: 3, fuldt: true });
    const relevante = filtrerRelevante(svar.uddrag);
    if (relevante.length === 0) return { ...faelles, evidence: null, coverage: "none" };
    return { ...faelles, evidence: relevante[0], coverage: "ok" };
  } catch {
    return { ...faelles, evidence: null, coverage: "error" };
  }
}

/**
 * Det forud-formulerede opslag for stedet lægen står.
 *
 * Rækkefølgen er fra det mest specifikke og ud: det røde flag der lige sprang,
 * så noden det sprang på, så anbefalingen. Lægen skal ikke opfinde et
 * spørgsmål om det systemet lige har sagt — ordlyden er skrevet sammen med det
 * kliniske indhold, i træet.
 */
function findLookup(tree: DecisionTree, body: Body): SourceLookup | null {
  const node = body.nodeId ? tree.nodes.find((n) => n.id === body.nodeId) : undefined;
  if (node) {
    const flag = (node.redFlags ?? []).find(
      (f) => f.lookup && (f.when === "*" || f.when === body.value),
    );
    if (flag?.lookup) return flag.lookup;
    if (node.lookup) return node.lookup;
  }
  const disp = body.dispositionId
    ? tree.dispositions.find((d) => d.id === body.dispositionId)
    : undefined;
  return disp?.lookup ?? null;
}

export async function POST(req: Request) {
  /*
   * Hvert opslag koster op til seks MCP-søgninger. De er cachede og
   * millisekund-hurtige, men kvoten holder en robot ude uden at genere en
   * læge der åbner og lukker det samme kort et par gange.
   */
  const limited = guard(req, "escalation", 40);
  if (limited) return limited;

  try {
    const raw = (await req.json()) as Body;
    const lang: Lang = raw.lang === "en" ? "en" : "da";
    const treeId = typeof raw.treeId === "string" ? raw.treeId.slice(0, 64) : "";
    if (!treeId) return NextResponse.json({ error: "treeId mangler" }, { status: 400 });

    const tree = await treeSource.get(treeId);
    if (!tree) return NextResponse.json({ error: "Ukendt træ" }, { status: 404 });

    const disp = raw.dispositionId
      ? tree.dispositions.find((d) => d.id === raw.dispositionId)
      : undefined;
    const eskalation = disp?.escalation ?? null;

    const svar = somOpslag(raw.path);
    const valgte = (eskalation?.actions ?? [])
      .filter((a) => gaelder(a, svar))
      .slice(0, MAKS_HANDLINGER);

    const actions = await Promise.all(valgte.map((a) => loesHandling(a, lang)));
    const lookup = findLookup(tree, raw);

    const ud: EskalationSvar = {
      treeId: tree.id,
      roles: eskalation
        ? { calling: eskalation.calling[lang], receiving: eskalation.receiving[lang] }
        : null,
      actions,
      lookup: lookup ? { label: lookup.label[lang], question: lookup.question[lang] } : null,
    };

    return NextResponse.json(ud);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "ukendt fejl" },
      { status: 500 },
    );
  }
}
