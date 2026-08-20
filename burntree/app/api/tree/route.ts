import { NextResponse } from "next/server";
import { treeSource } from "@/lib/tree/loader";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const id = new URL(req.url).searchParams.get("id");
  if (!id) return NextResponse.json(await treeSource.list());

  const tree = await treeSource.get(id);
  if (!tree) return NextResponse.json({ error: "Ukendt træ" }, { status: 404 });
  return NextResponse.json(tree);
}
