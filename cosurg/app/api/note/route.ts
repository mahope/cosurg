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
import { rensAnamnese } from "@/lib/corti/anamnese";
import {
  byggEpicNote,
  medDiagnosekoder,
  traeKode,
  type EpicNoteResultat,
} from "@/lib/corti/epicNote";
import { fangNegationer, findManglende, udfyldEpicNoteMedAi } from "@/lib/corti/epicUdtraek";
import { treeSource } from "@/lib/tree/loader";
import { getDisposition, getNode } from "@/lib/tree/engine";
import type { DecisionTree } from "@/lib/tree/types";
import type { AnsweredStep, Lang } from "@/lib/tree/types";

export const dynamic = "force-dynamic";

interface Body {
  /** Valgfrit: uden træ bygges Epic-notatet fra rå samtalehistorik alene. */
  treeId?: string;
  lang: Lang;
  path: AnsweredStep[];
  dispositionId: string | null;
  transcript?: string;
  dictation?: string;
  system?: string;
  /**
   * Epic-klart notat: udfyld Rigshospitalets AOP-skabelon deterministisk af
   * udredningens svar. Kræver `anamnese` fra workup-flowet for de felter
   * træet ikke kender (CAVE, medicin, vægt, skadestidspunkt …).
   */
  epic?: boolean;
  anamnese?: Record<string, unknown>;
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
    /*
     * Uden treeId bygges notatet fra RÅ samtale alene — AI-udtrækket henter
     * hvad den kan af transskript, anamnese og diktat, og skabelonens ***
     * siger ærligt hvad der mangler. Et OPGIVET men ukendt treeId er derimod
     * stadig en fejl: klienten troede den havde træ-state, og et notat uden
     * dens svar ville lyve om hvad der blev bedt om.
     */
    const tree = treeId ? ((await treeSource.get(treeId)) ?? null) : null;
    if (treeId && !tree) return NextResponse.json({ error: "Ukendt træ" }, { status: 404 });

    // Stien kommer fra vores eget træ — uden træ er den meningsløs, og med træ
    // begrænses længden så en forfalsket klient ikke kan sende en uendelig
    // prompt afsted på vores regning.
    const path = tree && Array.isArray(raw.path) ? raw.path.slice(0, 40) : [];

    const disposition = tree && dispositionId ? getDisposition(tree, dispositionId) : undefined;

    /*
     * Negations-udsagn i samtalen ("ingen allergier", "ellers rask") ER svar
     * og flettes ind FØR notatet bygges — så udfylder både model-vejen og
     * reserven felterne, og `manglende` spørger ikke om noget samtalen
     * allerede har afkræftet. Klientens eksplicitte anamnese vinder altid.
     */
    const anamnese = {
      ...fangNegationer(`${transcript}\n${dictation}`, lang),
      ...rensAnamnese(raw.anamnese),
    };
    const pathText = tree
      ? path.map((s, i) => `${i + 1}. ${stepLine(tree, s, lang, true)}`).join("\n")
      : "";
    const clinicalPathText = tree ? path.map((s) => stepLine(tree, s, lang, false)).join(" ") : "";

    /*
     * Epic-notatet: modellen udfylder hele skabelonen af HELE samtalen —
     * ytringer, udredningens Q&A, anamnese, diktat, anbefaling. Outputtet
     * passerer en deterministisk token-vagt (hver Epic-kode ordret, præcis
     * så mange gange som i skabelonen) og en Parkland-vagt (tallet er kodens,
     * aldrig modellens). Afvises begge forsøg, falder vi tilbage til den rene
     * deterministiske udfyldning. Kaldet starter NU og løber parallelt med
     * kodning og skribent, så det ikke koster svartid.
     */
    /*
     * "Skriv notatet" BETYDER det rigtige AOP-notat: for brandsårs-forløbet og
     * for træ-løse kald bygges det altid — `epic: false` er den eneste vej
     * udenom. Kun andre træer (uden AOP-skabelon) kræver eksplicit `epic: true`.
     */
    const vilEpic =
      raw.epic !== false && (raw.epic === true || !tree || tree.id === "burns-dk");
    const epicAiPromise =
      vilEpic
        ? udfyldEpicNoteMedAi({
            path,
            anamnese,
            transcript,
            dictation,
            pathText: clinicalPathText,
            disposition: disposition
              ? { title: disposition.title[lang], guidance: disposition.guidance[lang] }
              : null,
            lang,
          })
        : null;

    // Kodemodellen får kilderne hver for sig, så evidensen kan spores tilbage til
    // den rigtige kilde: beslutningsvejen (når der er en), konsultationen eller
    // lægens diktat.
    const codingContexts: CodingContextItem[] = [
      ...(tree
        ? [
            {
              label: lang === "da" ? "Beslutningsvej" : "Decision path",
              text: [
                `${tree.name[lang]}.`,
                clinicalPathText,
                // Færdig diagnose-sætning fra træets region+grad — giver
                // kodemodellen den formulering ICD-rubrikken faktisk bruger.
                traeKode(path) ? `Klinisk diagnose: ${traeKode(path)!.display}.` : "",
                disposition ? `${disposition.title[lang]}. ${disposition.guidance[lang]}` : "",
              ]
                .filter(Boolean)
                .join(" "),
            },
          ]
        : []),
      { label: lang === "da" ? "Konsultation" : "Encounter", text: transcript },
      { label: lang === "da" ? "Diktat" : "Dictation", text: dictation },
    ];

    // 1) Koder fra Corti Symphony. predictCodes kaster ikke — den rapporterer en
    //    status. Fejler kodningen, skriver vi stadig notatet: et notat uden koder
    //    er brugbart, et notat med opfundne koder er ikke.
    const coding = await predictCodes(codingContexts, system);

    /*
     * 2) ÉT notat. AI-udfyldningen har haft hele kodnings-tiden til at blive
     * færdig i; nu hentes den hjem. Fejler den eller afvises den af vagterne,
     * bygges notatet deterministisk; fejler selv reserven, siges det ærligt i
     * sit eget felt. Lykkes Epic-notatet, ER det notatet — den gamle
     * skribent-agent (14-16 s) springes helt over, og `note` spejler blot
     * Epic-notatet for bagudkompatibilitet.
     */
    let epicNote: EpicNoteResultat | null = null;
    let epicNoteError: string | null = null;
    if (vilEpic) {
      try {
        epicNote =
          (epicAiPromise ? await epicAiPromise : null) ?? byggEpicNote({ tree, path, anamnese });
        epicNote.manglende = findManglende(epicNote, path, anamnese, lang);
        /*
         * Magnus' krav: notatet slutter med ICD-10-koden for skaden, fx
         * "T23.2 — Andengradsforbrænding af håndled og hånd". Koderne er
         * Cortis (coding-kaldet ovenfor), indsat af kode EFTER token-vagten —
         * modellen ser dem aldrig. Er der ingen sikre koder, bruges
         * kandidaterne; er der heller ingen af dem, tilføjes intet.
         */
        const symphony = coding.codes.length > 0 ? coding.codes : coding.candidates;
        /*
         * Symphony er målt ustabil på region (samme case gav T30.2, tomt og
         * X12 på tre kald). Har træet selv svaret på region + grad, er
         * T-koden et fast tabel-opslag — den sættes forrest når Symphony
         * ikke leverer en regionsspecifik T2x-kode selv.
         */
        const fraTrae = traeKode(path);
        const harSpecifikT = symphony.some((c) => /^T2\d/i.test(c.code.trim()));
        const diagnoser = [...(fraTrae && !harSpecifikT ? [fraTrae] : []), ...symphony];
        const foer = epicNote.note;
        epicNote.note = medDiagnosekoder(epicNote.note, diagnoser);
        if (epicNote.note !== foer) {
          epicNote.udfyldte.push(
            fraTrae && !harSpecifikT
              ? "diagnosekoder (træets region+grad, suppleret af Corti coding)"
              : "diagnosekoder (fra Corti coding)",
          );
        }
      } catch (err) {
        epicNoteError = err instanceof Error ? err.message : "Skabelonen kunne ikke udfyldes";
      }
    }

    let noteText = epicNote?.note ?? "";
    const rationales = new Map<string, string>();
    if (!epicNote) {
      // Reserve-sporet (andre træer, eller Epic-notatet fejlede helt): den
      // hidtidige skribent-agent — og en begrundelse pr. kode. Agenten må
      // forklare, ikke kode.
      const allCodes = [...coding.codes, ...coding.candidates];
      const codeList = allCodes.map((c) => `- ${c.code} = ${c.display}`).join("\n");
      const prompt = [
        `Language: ${lang === "da" ? "Danish" : "English"}`,
        tree ? `Decision tree: ${tree.name[lang]} (${tree.version})` : "No decision tree was used.",
        "",
        pathText ? `Completed decision path:\n${pathText}` : "",
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
      noteText = result.note;
      for (const r of result.codeRationales ?? []) {
        if (r && typeof r.code === "string" && typeof r.rationale === "string") {
          rationales.set(codeKey(r.code), r.rationale);
        }
      }
    }

    const ctx = coding.contexts;

    return NextResponse.json({
      /** Bagudkompatibelt spejl: når Epic-notatet findes, ER det notatet. */
      note: noteText,
      /**
       * DET ene journalnotat: Epic-klar AOP, udfyldt af modellen bag en
       * deterministisk token-vagt (se lib/corti/epicUdtraek.ts), ellers
       * deterministisk reserve — Epic-koder ordret bevaret, ukendt = ***.
       */
      epicNote: epicNote
        ? {
            note: epicNote.note,
            udfyldte: epicNote.udfyldte,
            udeladteBlokke: epicNote.udeladteBlokke,
            aabneFelter: epicNote.aabneFelter,
            parkland: epicNote.parkland,
            /** Additivt: "model" (token-valideret AI) eller "deterministisk". */
            kilde: epicNote.kilde,
            /** Additivt: 2-4 klinisk vigtigste huller som spørgsmål til lægen. */
            manglende: epicNote.manglende ?? [],
          }
        : null,
      epicNoteError,
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
