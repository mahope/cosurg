import { NextResponse } from "next/server";
import { getAccessToken } from "@/lib/corti/auth";

export const dynamic = "force-dynamic";

export async function GET() {
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
