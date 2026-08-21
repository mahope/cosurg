import type { Lang } from "@/lib/tree/types";
import { MODELS, kaldModelJson, type ModelBillede } from "./models";
import { normalizeAnswer, type ChatAnswer } from "./chat";
import { kildeEtiket, type KildeUddrag } from "./mcp";

/**
 * Hurtigsporet: et kildebelagt svar på sekunder i stedet for på et minut.
 *
 * Det agentiske framework bruger 35-72 sekunder fordi det fanger ud til PubMed,
 * web-søgning og vores egen vidensbase for HVERT spørgsmål — også de spørgsmål
 * vores egne danske kilder svarer fuldt ud på. "Hvordan behandler jeg en dyb
 * dermal forbrænding på hånden?" er sådan et spørgsmål.
 *
 * Så: triagen afgør om litteraturen skal i sving. Siger den nej, og har vores
 * egne kilder dækning, skriver `corti-s1-mini` svaret sammen af de uddrag vi
 * ALLEREDE har hentet. Modellen søger ikke, og den kan ikke: den ser kun de
 * uddrag der står i prompten.
 *
 * Det er dét der gør sporet forsvarligt. Modellen får ikke lov at svare af
 * hukommelsen — kildelisten bygges af OS ud fra de uddrag der blev givet, ikke
 * af modellen, så en opdigtet kilde er teknisk umulig her. Alt modellen
 * konkluderer ud over uddragene skal stå i `reasoning`, og et svar der ikke er
 * dækket af uddragene får `extrapolated`. Blandingen uden mærkat — den farlige —
 * kan altså ikke opstå, fordi mærkatet ikke er modellens at vælge frit.
 */

/**
 * To stilarter, én kontrakt.
 *
 * CASE-stilen bruges når lægen står med en patient: kort, førende, vurdering
 * før afhandling — en ældre kollega ved sengen, ikke et opslagsværk. REFERENCE-
 * stilen er det fulde kildesvar og bruges kun til eksplicitte opslag uden
 * patient. Mærknings- og kildereglerne er IDENTISKE i begge: stilen ændrer
 * hvordan der skrives, aldrig hvad der må påstås.
 */
function stilBlok(caseMode: boolean): string {
  if (!caseMode) {
    return [
      "HOW TO WRITE THE ANSWER — this is the part that makes it useful:",
      "Answer like a colleague standing next to them, not like a reference work answering the exact question asked.",
      "- Give the management in clinical order: what to do first, then next, then what to watch.",
      "- WORK THE PITFALLS IN where they belong in that order. A pitfall is not a warning box at the end;",
      "  it is the sentence that says 'and this is where people get it wrong'. Include the relevant ones even",
      "  though the clinician did not ask about them — that is the whole reason they were retrieved for you.",
      "- Say what would change the plan: a finding, a threshold, a time limit.",
      "- Be brief. A clinician is reading this between patients. Plain text, '- ' bullets, **bold** where it helps, no headings.",
    ].join("\n");
  }
  return [
    "HOW TO WRITE THE ANSWER — the clinician is standing with a PATIENT, so lead:",
    "- You are the senior colleague at the bedside. Assessment before exposition — never an essay.",
    "- UNDER 200 WORDS. Short sentences. '- ' bullets and numbered steps, **bold** for the few words that matter.",
    "- Open with one short line acknowledging the case (injury, site, what stage they are at). Never ask what they want help with.",
    "- If a can't-miss finding is relevant, add a block: '**Røde flag:**' followed by 2-5 items, ONE line each.",
    "  Only genuine can't-miss items for THIS injury. Never pad the list.",
    "- Treatment as NUMBERED steps in the order they are done. Then, when they earn their place, one line each:",
    "  '**Pearls:**', '**Pitfalls:**', '**Opfølgning:**'.",
    "- Do NOT paste excerpt text into the answer. The sources are attached separately under the answer;",
    "  write the clinical point in your own words and let usedIds carry the reference.",
    "- If a decisive clinical detail is missing, END with the single most important question — one question, not a list.",
    "- If the situation is beyond what the excerpts support, say so and recommend conferring with the on-call",
    "  senior/burn unit — never a fluent guess.",
  ].join("\n");
}

const SYSTEM_BASE = [
  "You are a clinical reference assistant for emergency physicians and plastic surgeons, answering about burns.",
  "You are answering from a FIXED set of excerpts given to you. You have no search tools and no memory to fall back on.",
  "",
  "Reply with ONLY a JSON object, no prose and no code fence:",
  '{"answer":"...","evidence":"sourced|partial|extrapolated","reasoning":"...","limitations":"...",',
  '"spokenSummary":"...","usedIds":["excerpt ids you actually used"]}',
  "",
  "%STIL%",
  "",
  "MARKING — this must never slip:",
  "- 'answer' holds what the excerpts support. Every clinical claim there must trace to an excerpt you list in usedIds.",
  "- 'reasoning' holds everything else: general clinical reasoning, and reasoning applied to THIS patient.",
  "  If you conclude something the excerpts do not say, it goes here. Always. Never unmarked in 'answer'.",
  "- 'evidence': 'sourced' when every clinical claim in 'answer' comes from an excerpt;",
  "  'partial' when the core is from the excerpts but parts are not; 'extrapolated' when the excerpts do not",
  "  really answer it and you are reasoning from related material.",
  "- Never invent a dose, a threshold, a drug or a source. If a number is not in an excerpt, say it is not.",
  "- Formulas are starting estimates. Say so, and say what the number must be titrated against.",
  "- 'limitations': what this answer does NOT establish. Empty only if there is nothing.",
  "- 'spokenSummary': at most 3 sentences and 400 characters, no markdown, meant to be read aloud.",
  "- 'usedIds': the ids in square brackets of the excerpts you actually used. Do not list ones you did not use.",
  "",
  "IF PHOTOGRAPHS ARE ATTACHED: what you see in them is an observation, not a source. Anything you conclude",
  "from an image goes in 'reasoning', hedged ('appears', 'consistent with'), and never becomes a depth grade",
  "or a diagnosis — burn depth takes capillary refill and sensation testing, which no photograph contains.",
].join("\n");

function byggSystem(caseMode: boolean): string {
  return SYSTEM_BASE.replace("%STIL%", stilBlok(caseMode));
}

export interface HurtigtSvarInput {
  question: string;
  lang: Lang;
  /** Grundlagsblokken fra `byggGrundlag` — uddrag og faldgruber, ordret. */
  grounding: string;
  /** De uddrag blokken er bygget af. Kildelisten bygges af DEM, ikke af modellen. */
  uddrag: KildeUddrag[];
  patientContext?: string;
  recap?: string;
  /**
   * Lægens egne fotos. Synthesemodellen KAN se (verificeret 20/8), så den får
   * billederne direkte oveni observationsblokken i `grounding` — men reglen
   * står fast: hvad den konkluderer af et billede er ræsonnement, aldrig kilde.
   */
  images?: ModelBillede[];
  /** Sand når lægen står med en patient: kort, førende svar i vurderingsrækkefølge. */
  caseMode?: boolean;
  signal?: AbortSignal;
}

interface RaatSvar {
  answer?: unknown;
  evidence?: unknown;
  reasoning?: unknown;
  limitations?: unknown;
  spokenSummary?: unknown;
  usedIds?: unknown;
}

/**
 * Skriv svaret sammen af uddragene.
 *
 * Kaster hvis modellen ikke svarer — kalderen falder så tilbage på det tunge
 * spor, som altid virker. Hurtigsporet må gøre appen hurtigere, aldrig
 * skrøbeligere.
 */
export async function hurtigtSvar({
  question,
  lang,
  grounding,
  uddrag,
  patientContext,
  recap,
  images,
  caseMode,
  signal,
}: HurtigtSvarInput): Promise<ChatAnswer> {
  const language = lang === "da" ? "Danish" : "English";

  const bruger = [
    `Answer in ${language}. The clinician asks:`,
    "",
    question,
    "",
    grounding,
    patientContext
      ? `\n--- What this app already knows about the patient in front of the clinician ---\n${patientContext}`
      : "",
    recap ? `\n--- Earlier in this conversation (context only, do not answer it again) ---\n${recap}` : "",
    "",
    `Return the JSON object now, written in ${language}.`,
  ]
    .filter(Boolean)
    .join("\n");

  const raw = await kaldModelJson<RaatSvar>({
    model: MODELS.synthesis,
    system: byggSystem(!!caseMode),
    user: bruger,
    images,
    maxTokens: 1_800,
    temperature: 0.1,
    // Målt 5 s på et fuldt grundlag. Loftet er der for at hurtigsporet skal
    // GIVE OP og lade det tunge spor overtage, ikke for at nå i mål for enhver pris.
    timeoutMs: 20_000,
    signal,
  });

  /*
   * Kildelisten bygges HER, af de uddrag vi selv hentede — ikke af modellen.
   * Modellen peger kun på hvilke den brugte. Det er forskellen på en kilde der
   * findes og en kilde der lyder rigtig: den kan ikke opdigte en URL, for den
   * skriver ingen.
   */
  const brugte = new Set(
    Array.isArray(raw.usedIds) ? raw.usedIds.filter((v): v is string => typeof v === "string") : [],
  );
  const set = new Set<string>();
  const valgte = uddrag.filter((u) => !set.has(u.id) && set.add(u.id) && (brugte.size === 0 || brugte.has(u.id)));

  return normalizeAnswer({
    answer: raw.answer,
    // Hurtigsporet har ingen litteratur bag sig. Påstår modellen "sourced" uden
    // at have peget på et eneste uddrag, nedgraderer normalizeAnswer den selv.
    evidence: raw.evidence,
    reasoning: raw.reasoning,
    usedContext: !!patientContext,
    limitations: raw.limitations,
    spokenSummary: raw.spokenSummary,
    sources: valgte.map((u) => ({
      title: kildeEtiket(u),
      url: u.erUrl ? u.kilde : undefined,
      supports: u.overskrifter.join(" › "),
      origin: "knowledge-base",
    })),
  });
}
