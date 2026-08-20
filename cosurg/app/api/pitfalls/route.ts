import { NextResponse } from "next/server";
import { guard } from "@/lib/guard";
import { filtrerRelevante, mcpKonfigureret, soegKliniskViden, type KildeUddrag } from "@/lib/corti/mcp";
import {
  FALDGRUBER,
  matchFaldgruber,
  type Faldgrube,
  type FaldgrubeKontekst,
} from "@/components/pitfalls/catalog";

export const dynamic = "force-dynamic";

/**
 * En faldgrube uden belæg er en påstand. Ruten henter derfor det ordrette
 * uddrag fra CoSurgs MCP-server for hver faldgrube den returnerer, og siger
 * eksplicit fra når vidensbasen ikke dækker den.
 *
 * Ruten er hurtig at kalde igen og igen — MCP-klienten cacher svarene, og
 * vidensbasen er statisk — så faldgruberne kan følge med gennem et forløb i
 * stedet for at være en side man skal huske at åbne.
 */

export type Daekning = "ok" | "none" | "error";

export interface LoestFaldgrube {
  id: string;
  title: Faldgrube["title"];
  consequence: Faldgrube["consequence"];
  alvor: Faldgrube["alvor"];
  fase: Faldgrube["fase"];
  /** Det ordrette belæg. Null når vidensbasen ikke dækker faldgruben. */
  evidence: KildeUddrag | null;
  coverage: Daekning;
}

/** Så mange faldgruber ad gangen. Fem advarsler på én skærm er ingen advarsel. */
const MAX_KONTEKST = 4;

async function loes(f: Faldgrube): Promise<LoestFaldgrube> {
  const fælles = { id: f.id, title: f.title, consequence: f.consequence, alvor: f.alvor, fase: f.fase };
  try {
    const svar = await soegKliniskViden(f.query, { antal: 3, fuldt: false });
    const relevante = filtrerRelevante(svar.uddrag);
    if (relevante.length === 0) return { ...fælles, evidence: null, coverage: "none" };
    return { ...fælles, evidence: relevante[0], coverage: "ok" };
  } catch {
    // "Vi kunne ikke spørge" er ikke det samme som "der er ikke dækning".
    // Klinikeren skal kunne se forskel — så det skal API'et også kunne.
    return { ...fælles, evidence: null, coverage: "error" };
  }
}

interface Body extends FaldgrubeKontekst {
  /** Hent bestemte faldgruber frem for at matche på kontekst. */
  ids?: string[];
  limit?: number;
}

/** Kun kendte id'er og korte strenge slipper videre — intet fritekst-input her. */
function rens(liste: unknown, max: number): string[] {
  if (!Array.isArray(liste)) return [];
  return liste
    .filter((v): v is string => typeof v === "string")
    .map((v) => v.slice(0, 64))
    .slice(0, max);
}

export async function POST(req: Request) {
  const limited = guard(req, "pitfalls", 60);
  if (limited) return limited;

  if (!mcpKonfigureret()) {
    return NextResponse.json({ error: "Vidensbasen er ikke konfigureret" }, { status: 503 });
  }

  try {
    const raw = (await req.json()) as Body;

    const valgte: Faldgrube[] = raw.ids
      ? rens(raw.ids, 12)
          .map((id) => FALDGRUBER.find((f) => f.id === id))
          .filter((f): f is Faldgrube => !!f)
      : matchFaldgruber({
          treeId: typeof raw.treeId === "string" ? raw.treeId.slice(0, 64) : null,
          nodeId: typeof raw.nodeId === "string" ? raw.nodeId.slice(0, 64) : null,
          dispositionId: typeof raw.dispositionId === "string" ? raw.dispositionId.slice(0, 64) : null,
          values: rens(raw.values, 24),
          fields: rens(raw.fields, 24),
        });

    const loft = Math.min(Math.max(Number(raw.limit) || MAX_KONTEKST, 1), 12);
    const pitfalls = await Promise.all(valgte.slice(0, loft).map(loes));

    return NextResponse.json({ pitfalls });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "ukendt fejl" }, { status: 500 });
  }
}

/** Hele kataloget med belæg — det faldgrubesiden bladrer igennem. */
export async function GET(req: Request) {
  const limited = guard(req, "pitfalls-all", 20);
  if (limited) return limited;

  if (!mcpKonfigureret()) {
    return NextResponse.json({ error: "Vidensbasen er ikke konfigureret" }, { status: 503 });
  }

  const pitfalls = await Promise.all(FALDGRUBER.map(loes));
  return NextResponse.json({ pitfalls });
}
