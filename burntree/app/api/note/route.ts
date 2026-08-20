import { NextResponse } from "next/server";
import { LIMITS, cap, guard } from "@/lib/guard";
import { SCRIBE_SPEC, askAgent, ensureAgent } from "@/lib/corti/agent";
import { treeSource } from "@/lib/tree/loader";
import { getDisposition } from "@/lib/tree/engine";
import type { AnsweredStep, Lang } from "@/lib/tree/types";

export const dynamic = "force-dynamic";

interface Body {
  treeId: string;
  lang: Lang;
  path: AnsweredStep[];
  dispositionId: string | null;
  transcript?: string;
  dictation?: string;
}

interface NoteResult {
  note: string;
  codes: Array<{ code: string; system?: string; description: string; rationale?: string }>;
}

export async function POST(req: Request) {
  const limited = guard(req, "note", 20);
  if (limited) return limited;

  try {
    const raw = (await req.json()) as Body;
    const { treeId, dispositionId } = raw;
    const lang: Lang = raw.lang === "en" ? "en" : "da";
    const transcript = cap(raw.transcript, LIMITS.transcript);
    const dictation = cap(raw.dictation, LIMITS.dictation);
    // Stien kommer fra vores eget træ — begræns længden så en forfalsket klient
    // ikke kan sende en uendelig prompt afsted på vores regning.
    const path = Array.isArray(raw.path) ? raw.path.slice(0, 40) : [];

    const tree = await treeSource.get(treeId);
    if (!tree) return NextResponse.json({ error: "Ukendt træ" }, { status: 404 });

    const disposition = dispositionId ? getDisposition(tree, dispositionId) : undefined;

    const pathText = path
      .map(
        (s, i) =>
          `${i + 1}. ${s.question} → ${s.value} (spoken: "${s.rawAnswer}")${
            s.redFlagged ? ` [RED FLAG: ${s.redFlagged}]` : ""
          }`,
      )
      .join("\n");

    const prompt = [
      `Language: ${lang === "da" ? "Danish" : "English"}`,
      `Decision tree: ${tree.name[lang]} (${tree.version})`,
      "",
      `Completed decision path:\n${pathText}`,
      "",
      disposition
        ? `Tree recommendation (restate verbatim in the plan):\n${disposition.title[lang]}\n${disposition.guidance[lang]}`
        : "No disposition reached.",
      transcript ? `\nEncounter transcript:\n${transcript}` : "",
      dictation ? `\nClinician's dictated addendum (include as its own section):\n${dictation}` : "",
      "",
      "Write the note with submit_note. Sections: Anamnese/History, Objektivt/Findings, Vurdering/Assessment, Plan.",
      "Assign ICD-10 codes with a rationale pointing at the supporting path step.",
    ]
      .filter(Boolean)
      .join("\n");

    const agentId = await ensureAgent(SCRIBE_SPEC);
    const { result } = await askAgent<NoteResult>(agentId, prompt);

    return NextResponse.json(result);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "ukendt fejl" },
      { status: 500 },
    );
  }
}
