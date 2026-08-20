import { NextResponse } from "next/server";
import { LIMITS, cap, guard } from "@/lib/guard";
import { SCRIBE_SPEC, askAgent, ensureAgent } from "@/lib/corti/agent";
import {
  DEFAULT_CODING_SYSTEM,
  isKnownSystem,
  predictCodes,
  type CodingContextItem,
  type CodingStatus,
  type PredictedCode,
} from "@/lib/corti/coding";
import { treeSource } from "@/lib/tree/loader";
import { getDisposition, getNode } from "@/lib/tree/engine";
import type { DecisionTree } from "@/lib/tree/types";
import type { AnsweredStep, Lang } from "@/lib/tree/types";

export const dynamic = "force-dynamic";

interface Body {
  treeId: string;
  lang: Lang;
  path: AnsweredStep[];
  dispositionId: string | null;
  transcript?: string;
  dictation?: string;
  system?: string;
}

interface ScribeResult {
  note: string;
  codeRationales?: Array<{ code: string; rationale: string }>;
}

/** Formen UI'et ser. `code`/`description` er Cortis — `rationale` er agentens. */
interface NoteCode {
  code: string;
  system: string;
  description: string;
  rationale?: string;
  evidences?: Array<{ source: string; text: string }>;
  alternatives?: Array<{ code: string; display: string }>;
}

/**
 * Agenten ekkoer af og til hele listelinjen tilbage ("T20.2 (icd10int-outpatient):
 * Burn of...") i stedet for kun kodestrengen. Vi nøjes derfor med at matche på
 * første token — koden selv er stadig Cortis, kun begrundelsen skal parres.
 */
function codeKey(value: string): string {
  return value.trim().split(/[\s(:—-]/)[0].toUpperCase();
}

function toNoteCode(
  c: PredictedCode,
  contexts: CodingContextItem[],
  rationales: Map<string, string>,
): NoteCode {
  return {
    code: c.code,
    system: c.system,
    description: c.display,
    rationale: rationales.get(codeKey(c.code)),
    evidences: c.evidences?.map((e) => ({
      source: contexts[e.contextIndex]?.label ?? "kontekst",
      text: e.text,
    })),
    alternatives: c.alternatives?.slice(0, 5),
  };
}

/**
 * Ét trin skrevet som klinisk læsbar tekst. Maskinværdien ("partial-deep") siger
 * kodemodellen intet — den menneskelige etiket ("Partiel dyb (2. grad)") gør. Vi
 * slår derfor etiketten op i træet og beholder maskinværdien som sporbarhed.
 */
function stepLine(tree: DecisionTree, s: AnsweredStep, lang: Lang, verbose: boolean): string {
  const node = getNode(tree, s.nodeId);
  const option = node?.options?.find((o) => o.value === s.value);
  const label = option ? option.label[lang] : s.value;
  const unit = !option && node?.unit ? ` ${node.unit}` : "";
  return [
    `${s.question} ${label}${unit}.`,
    s.redFlagged ? ` ${s.redFlagged}.` : "",
    // Maskinværdi og råt talt svar er sporbarhed til journalen. Kodemodellen har
    // ikke gavn af dem — den skal læse klinisk tekst, ikke vores enum-værdier.
    verbose ? ` [${s.value}] (talt: "${s.rawAnswer}")` : "",
  ].join("");
}

/**
 * Færdig, klinisk forsvarlig sætning til kodefeltet. Et tomt kodefelt uden
 * forklaring er værre end ingen koder: lægen kan ikke se om systemet svarede
 * "ingen kode" eller slet ikke svarede.
 */
function codingMessage(status: CodingStatus, lang: Lang): string | null {
  if (status === "ok") return null;
  const da: Record<Exclude<CodingStatus, "ok">, string> = {
    empty: "Corti fandt ingen kode i materialet. Koder skal sættes manuelt.",
    "insufficient-context":
      "For lidt klinisk tekst til at kode. Gennemfør beslutningsvejen, eller tilføj et diktat.",
    error: "Kodningen kunne ikke gennemføres. Koder skal sættes manuelt.",
  };
  const en: Record<Exclude<CodingStatus, "ok">, string> = {
    empty: "Corti found no code in this material. Codes must be assigned manually.",
    "insufficient-context":
      "Too little clinical text to code. Complete the decision path, or add a dictated addendum.",
    error: "Coding could not be completed. Codes must be assigned manually.",
  };
  return (lang === "da" ? da : en)[status];
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
    const system = isKnownSystem(raw.system) ? raw.system : DEFAULT_CODING_SYSTEM;
    // Stien kommer fra vores eget træ — begræns længden så en forfalsket klient
    // ikke kan sende en uendelig prompt afsted på vores regning.
    const path = Array.isArray(raw.path) ? raw.path.slice(0, 40) : [];

    const tree = await treeSource.get(treeId);
    if (!tree) return NextResponse.json({ error: "Ukendt træ" }, { status: 404 });

    const disposition = dispositionId ? getDisposition(tree, dispositionId) : undefined;

    const pathText = path.map((s, i) => `${i + 1}. ${stepLine(tree, s, lang, true)}`).join("\n");
    const clinicalPathText = path.map((s) => stepLine(tree, s, lang, false)).join(" ");

    // Kodemodellen får kilderne hver for sig, så evidensen kan spores tilbage til
    // den rigtige kilde: beslutningsvejen, konsultationen eller lægens diktat.
    const codingContexts: CodingContextItem[] = [
      {
        label: lang === "da" ? "Beslutningsvej" : "Decision path",
        text: [
          `${tree.name[lang]}.`,
          clinicalPathText,
          disposition ? `${disposition.title[lang]}. ${disposition.guidance[lang]}` : "",
        ]
          .filter(Boolean)
          .join(" "),
      },
      { label: lang === "da" ? "Konsultation" : "Encounter", text: transcript },
      { label: lang === "da" ? "Diktat" : "Dictation", text: dictation },
    ];

    // 1) Koder fra Corti Symphony. predictCodes kaster ikke — den rapporterer en
    //    status. Fejler kodningen, skriver vi stadig notatet: et notat uden koder
    //    er brugbart, et notat med opfundne koder er ikke.
    const coding = await predictCodes(codingContexts, system);

    const allCodes = [...coding.codes, ...coding.candidates];
    const codeList = allCodes.map((c) => `- ${c.code} = ${c.display}`).join("\n");

    // 2) Notatet — og en begrundelse pr. kode. Agenten må forklare, ikke kode.
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
      codeList
        ? [
            "",
            `Medical codes assigned by the Corti coding system (${system}) for this encounter,`,
            "given as `code = description`. Return one codeRationales entry per line, where",
            "`code` is ONLY the code itself (the part before ' = '), copied character for character:",
            codeList,
          ].join("\n")
        : "No codes were returned; return an empty codeRationales array.",
    ]
      .filter(Boolean)
      .join("\n");

    const agentId = await ensureAgent(SCRIBE_SPEC);
    const { result } = await askAgent<ScribeResult>(agentId, prompt);

    const rationales = new Map(
      (result.codeRationales ?? [])
        .filter((r) => r && typeof r.code === "string" && typeof r.rationale === "string")
        .map((r) => [codeKey(r.code), r.rationale]),
    );

    const ctx = coding.contexts;

    return NextResponse.json({
      note: result.note,
      /** Koder Corti mener SKAL med. Kilde: /v2/tools/coding/ — ikke sprogmodellen. */
      codes: coding.codes.map((c) => toNoteCode(c, ctx, rationales)),
      /** Klinisk relevante, men valgfrie koder — til menneskelig gennemgang. */
      candidates: coding.candidates.map((c) => toNoteCode(c, ctx, rationales)),
      coding: {
        source: "corti-medical-coding",
        system,
        status: coding.status,
        /** Færdig sætning UI'et kan vise når der ingen koder er. */
        message: codingMessage(coding.status, lang),
        detail: coding.detail ?? null,
        attempts: coding.attempts,
        credits: coding.usageInfo?.creditsConsumed ?? null,
      },
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "ukendt fejl" },
      { status: 500 },
    );
  }
}
