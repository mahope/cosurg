import { NextResponse } from "next/server";
import { guard } from "@/lib/guard";
import { getAccessToken } from "@/lib/corti/auth";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  // Ruten udleverer et Corti-token. Det er scoped til transcribe alene, men uden
  // kvote kan en fremmed stadig brænde vores hackathon-credits.
  const limited = guard(req, "token", 20);
  if (limited) return limited;

  try {
    const token = await getAccessToken("openid transcribe");
    return NextResponse.json({
      token,
      environment: process.env.CORTI_ENVIRONMENT ?? "eu",
      tenant: process.env.CORTI_TENANT ?? "base",
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "ukendt fejl" },
      { status: 500 },
    );
  }
}
