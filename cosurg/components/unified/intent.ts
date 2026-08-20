import type { Lang, TreeNode } from "@/lib/tree/types";

/**
 * Spørgsmål eller svar?
 *
 * Det er appens farligste enkeltbeslutning. Står lægen ved "Hvor stort er
 * arealet?" og siger "hvordan beregner jeg TBSA på et barn?", så er det et
 * SPØRGSMÅL. Tolker vi det som et svar, rykker beslutningsvejen videre på et
 * falsk grundlag — og det kan ikke ses på resultatet bagefter at der blev
 * gættet. Det er præcis den fejl hele appen er bygget for at undgå.
 *
 * VALG AF METODE — hvorfor deterministisk først, og agenten kun som net:
 *
 *  1. Latens. Klassifikationen skal ske på HVER ytring. Et agent-kald koster
 *     målt 1,4–2,8 s varm; lagt oven på svarfortolkningen ville hvert eneste
 *     svar i træet blive dobbelt så langsomt. Det deterministiske lag koster
 *     nul.
 *  2. Robusthed. Uden net kan appen stadig skelne — og "svar med knapperne i
 *     stedet" forudsætter netop at appen ved hvad en knap er svar på.
 *  3. Sporbarhed. Vi kan sige PRÆCIS hvorfor en ytring blev læst som et
 *     spørgsmål ("den begynder med «hvordan»"), og det er hele appens påstand.
 *     En sprogmodel kan ikke give det svar.
 *
 * Men det deterministiske lag afgør kun det det er SIKKERT på. Resten kaldes
 * `unknown` og går videre til svarfortolkeren, præcis som i dag — og først når
 * DEN melder tvivl, spørges agenten (`/api/route`) om det mon var et spørgsmål.
 * Den rækkefølge koster ikke ét millisekund på den vej der bruges mest.
 *
 * Asymmetrien i fejlene styrer hele kalibreringen:
 *   - Et svar læst som spørgsmål koster et opslag og en gentagelse. Irriterende.
 *   - Et spørgsmål læst som svar rykker forløbet på et falsk grundlag. Farligt.
 *   - Derfor: ved TVIVL spørger vi lægen hvad han mente. Vi gætter aldrig.
 */

export type Intent =
  /** Ytringen besvarer den aktuelle node. */
  | "answer"
  /** Ytringen er et fagligt spørgsmål — slå op, og vend tilbage til noden. */
  | "question"
  /** Den kan være begge dele. Spørg lægen; gæt aldrig. */
  | "ambiguous"
  /** Ingen sikker afgørelse her — lad svarfortolkeren om det. */
  | "unknown";

export interface IntentVerdict {
  intent: Intent;
  /** Hvad i ytringen der afgjorde det. Sporbarhed, ikke pynt. */
  reasons: string[];
  /** Den tilladte svarværdi ytringen ramte lokalt, hvis nogen. */
  matchedValue?: string;
}

/* ------------------------------------------------------------------ *
 * Normalisering
 * ------------------------------------------------------------------ */

/**
 * Fælles form for dansk og engelsk: æøå foldes til ae/oe/aa, så det er uden
 * betydning om transskriptet skriver "hvornår" eller "hvornaar". Procenttegnet
 * overlever, fordi det er en enhed og ikke tegnsætning.
 */
function normalize(text: string): string {
  return text
    .toLowerCase()
    .replace(/æ/g, "ae")
    .replace(/ø/g, "oe")
    .replace(/å/g, "aa")
    .replace(/ä/g, "ae")
    .replace(/ö/g, "oe")
    .replace(/ü/g, "ue")
    .replace(/é|è|ê/g, "e")
    .replace(/[^a-z0-9%\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Kortest mulige vending der må bøjes.
 *
 * Træet bruger korte kliniske stammer ("dyb", "rød", "sod"), og lægen siger dem
 * bøjet ("dybt", "rødt"). Grænsen skal derfor være lav — men ikke lavere: ved to
 * bogstaver ville "no" komme til at ramme "nok", og et benægtet svar kunne
 * opstå af et ord der betyder det stik modsatte.
 */
const INFLECT_MIN = 3;

/**
 * Findes vendingen som hele ord i teksten?
 *
 * Ren `includes()` duer ikke: "brand" ville ramme inde i "brandsaar", og så
 * ville et spørgsmål om brandsår komme til at ligne svaret "flamme". Vi kræver
 * ordgrænser i begge ender og tillader kun en kort bøjningsendelse på vendinger
 * der er lange nok til at bære den.
 */
function hasPhrase(text: string, phrase: string): boolean {
  const p = normalize(phrase);
  if (!p) return false;
  const escaped = p.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const tail = p.length >= INFLECT_MIN ? "[a-z]{0,2}" : "";
  return new RegExp(`(^|[^a-z0-9])${escaped}${tail}([^a-z0-9]|$)`).test(text);
}

/* ------------------------------------------------------------------ *
 * Spørgsmålssignaler
 * ------------------------------------------------------------------ */

/**
 * Fyldord der ofte står foran et spørgsmål uden at ændre det. De skrælles af,
 * så "øh, hvordan beregner jeg…" stadig tæller som et spørgsmål der BEGYNDER
 * med et spørgeord.
 */
const OPENING_FILLERS = new Set([
  "oeh",
  "aeh",
  "hmm",
  "ok",
  "okay",
  "okey",
  "saa",
  "og",
  "men",
  "hey",
  "hoer",
  "altsaa",
  "lige",
  "her",
  "uh",
  "um",
  "so",
  "and",
  "but",
  "well",
  "hey",
]);

/**
 * Spørgeord. Står ét af dem FORREST, er ytringen et spørgsmål — der findes
 * ingen klinisk svarværdi i noget af vores indhold der begynder sådan.
 *
 * De flerords-vendinger står med vilje foran de enkelte ord i opslaget: "hvor
 * meget" skal genkendes som ét spørgeord og ikke som det løse "hvor".
 */
const INTERROGATIVES = [
  "hvor meget",
  "hvor mange",
  "hvor stor",
  "hvor stort",
  "hvor lang",
  "hvor laenge",
  "hvor tit",
  "hvor ofte",
  "hvad",
  "hvorfor",
  "hvordan",
  "hvornaar",
  "hvilken",
  "hvilket",
  "hvilke",
  "hvem",
  "hvorhen",
  "hvor",
  "how much",
  "how many",
  "how long",
  "how often",
  "how",
  "what",
  "why",
  "when",
  "which",
  "who",
  "whom",
  "whose",
  "where",
];

/**
 * Vendinger der utvetydigt beder om et OPSLAG, også uden spørgeord.
 * "Slå Parkland op" er en ordre, ikke et spørgsmål — men den skal samme vej.
 */
const LOOKUP_PHRASES = [
  "slaa op",
  "slaa det op",
  "slaar du op",
  "kan du slaa",
  "find en kilde",
  "find kilde",
  "hvad siger litteraturen",
  "hvad siger kilderne",
  "hvad siger guideline",
  "hvad siger retningslinjen",
  "forklar",
  "forklar mig",
  "fortael mig om",
  "fortael om",
  "giv mig kilder",
  "giv mig en kilde",
  "evidens for",
  "evidensen for",
  "kilde paa",
  "kilder paa",
  "look it up",
  "look up",
  "search for",
  "find a source",
  "find sources",
  "what does the literature",
  "what do the guidelines",
  "explain",
  "tell me about",
  "evidence for",
  "give me a source",
];

/**
 * Opslagsvendinger med løs partikel. Dansk skiller verbet fra sin partikel —
 * "slå Parkland-formlen OP" — og engelsk gør det samme ("look it up"), så en
 * fast ordfølge kan ikke fange dem.
 */
const LOOKUP_PATTERNS = [/^slaa\b.*\bop$/, /^look\b.*\bup$/, /^soeg\b/, /^search\b/];

/**
 * Verber der kan indlede et spørgsmål på dansk og engelsk ("Er det dybt?",
 * "Should I intubate?"). Det er et SVAGT signal alene: et svar kan også
 * begynde sådan ("skal opereres"), så det tæller kun sammen med et andet.
 */
const VERB_FIRST = new Set([
  "er",
  "har",
  "skal",
  "kan",
  "maa",
  "vil",
  "boer",
  "goer",
  "findes",
  "betyder",
  "bliver",
  "ligger",
  "hedder",
  "burde",
  "kunne",
  "skulle",
  "is",
  "are",
  "was",
  "were",
  "am",
  "do",
  "does",
  "did",
  "can",
  "could",
  "should",
  "would",
  "will",
  "has",
  "have",
  "must",
]);

interface QuestionSignals {
  /** Alene nok til at kalde det et spørgsmål. */
  strong: boolean;
  /** Antal svage signaler. To svage vejer som ét stærkt. */
  weak: number;
  reasons: string[];
}

function questionSignals(raw: string, normalized: string, words: string[]): QuestionSignals {
  const reasons: string[] = [];
  let strong = false;
  let weak = 0;

  // Fyldordene af, så spørgeordet kan stå "forrest" selv efter en tøven.
  let head = 0;
  while (head < words.length && OPENING_FILLERS.has(words[head])) head += 1;
  const opening = words.slice(head).join(" ");

  const lead = INTERROGATIVES.find(
    (w) => opening === w || opening.startsWith(`${w} `),
  );
  if (lead) {
    strong = true;
    reasons.push(`spørgeord forrest: «${lead}»`);
  }

  const lookup = LOOKUP_PHRASES.find((p) => hasPhrase(normalized, p));
  if (lookup) {
    strong = true;
    reasons.push(`opslagsvending: «${lookup}»`);
  } else if (LOOKUP_PATTERNS.some((p) => p.test(normalized))) {
    strong = true;
    reasons.push("opslagsvending med løs partikel");
  }

  if (raw.includes("?")) {
    weak += 1;
    reasons.push("spørgsmålstegn");
  }

  if (!lead && words.length > head && VERB_FIRST.has(words[head])) {
    weak += 1;
    reasons.push(`udsagnsord forrest: «${words[head]}»`);
  }

  if (!lead) {
    const mid = INTERROGATIVES.find((w) => hasPhrase(normalized, w));
    if (mid) {
      weak += 1;
      reasons.push(`spørgeord inde i sætningen: «${mid}»`);
    }
  }

  return { strong, weak, reasons };
}

/* ------------------------------------------------------------------ *
 * Lokal svargenkendelse
 * ------------------------------------------------------------------ */

/**
 * Talord vi kan læse uden agenten. Nok til at se at en ytring ER et tal.
 *
 * "en" og "et" står bevidst IKKE på listen: på dansk er de først og fremmest
 * ubestemte artikler. "…TBSA på et barn" ville ellers blive læst som arealet
 * 1 %, og et spørgsmål ville se ud som et svar — netop den fejl der er farlig.
 * Et areal på præcis én procent siges i praksis med ciffer.
 */
const NUMBER_WORDS: Record<string, number> = {
  nul: 0,
  to: 2,
  tre: 3,
  fire: 4,
  fem: 5,
  seks: 6,
  syv: 7,
  otte: 8,
  ni: 9,
  ti: 10,
  elleve: 11,
  tolv: 12,
  tretten: 13,
  fjorten: 14,
  femten: 15,
  seksten: 16,
  sytten: 17,
  atten: 18,
  nitten: 19,
  tyve: 20,
  tredive: 30,
  fyrre: 40,
  halvtreds: 50,
  tres: 60,
  halvfjerds: 70,
  firs: 80,
  halvfems: 90,
  hundrede: 100,
  zero: 0,
  two: 2,
  three: 3,
  four: 4,
  five: 5,
  six: 6,
  seven: 7,
  eight: 8,
  nine: 9,
  ten: 10,
  eleven: 11,
  twelve: 12,
  thirteen: 13,
  fourteen: 14,
  fifteen: 15,
  sixteen: 16,
  seventeen: 17,
  eighteen: 18,
  nineteen: 19,
  twenty: 20,
  thirty: 30,
  forty: 40,
  fifty: 50,
  sixty: 60,
  seventy: 70,
  eighty: 80,
  ninety: 90,
  hundred: 100,
};

/** Længste ytring hvor et løsrevet tal alene er nok til at ligne et svar. */
const BARE_NUMBER_MAX_WORDS = 5;

/**
 * Er ytringen et TAL — altså et svar på en talnode?
 *
 * Et ciffer i sig selv er ikke nok. "Hvor mange procent er 9-reglen?" rummer et
 * tal og er alligevel et spørgsmål. Vi kræver derfor enten at ytringen er kort
 * nok til at BESTÅ af tallet, eller at tallet står klods op ad sin enhed
 * ("18 procent") — den måde et areal faktisk siges på.
 */
function matchNumber(words: string[], node: TreeNode): { value: string; via: string } | undefined {
  const units = new Set(
    ["procent", "percent", "%", "tbsa", ...normalize(node.unit ?? "").split(" ")].filter(Boolean),
  );

  for (let i = 0; i < words.length; i += 1) {
    const digits = words[i].match(/^(\d+(?:[.,]\d+)?)%?$/);
    const value = digits ? digits[1].replace(",", ".") : words[i] in NUMBER_WORDS ? String(NUMBER_WORDS[words[i]]) : null;
    if (value === null) continue;

    const nextTo = units.has(words[i - 1] ?? "") || units.has(words[i + 1] ?? "") || words[i].endsWith("%");
    if (nextTo || words.length <= BARE_NUMBER_MAX_WORDS) {
      return { value, via: `tal: «${words[i]}»` };
    }
  }
  return undefined;
}

/** Korte bekræftelser og benægtelser der ikke står i træets etiketter. */
const AFFIRM = ["ja", "jo", "jep", "jamen ja", "yes", "yeah", "yep", "correct", "affirmative"];
const DENY = ["nej", "naeh", "nope", "no", "negative"];

/**
 * Rammer ytringen én af nodens tilladte svarværdier — sikkert nok til at vi tør
 * bruge det som SIGNAL?
 *
 * Bemærk hvad funktionen IKKE gør: den besvarer ikke noden. Fortolkningen
 * ligger stadig hos Cortis agent, som er den der må afgøre hvad et talt svar
 * betyder. Her bruges matchet kun til at afgøre om ytringen overhovedet KUNNE
 * være et svar — og dermed om et samtidigt spørgsmålssignal gør den tvetydig.
 */
function matchAllowedValue(
  normalized: string,
  words: string[],
  node: TreeNode,
): { value: string; via: string } | undefined {
  if (node.answerType === "number") return matchNumber(words, node);

  for (const option of node.options ?? []) {
    const candidates = [
      option.value,
      option.label.da,
      option.label.en,
      ...(option.synonyms?.da ?? []),
      ...(option.synonyms?.en ?? []),
    ];
    const hit = candidates.find((c) => hasPhrase(normalized, c));
    if (hit) return { value: option.value, via: `svarmulighed: «${hit}»` };
  }

  // Ja/nej-noder: "ja" og "nej" står sjældent som synonymer i træet, men de er
  // det hyppigste talte svar der findes.
  if (node.answerType === "boolean") {
    const values = (node.options ?? []).map((o) => o.value);
    if (values.includes("yes") && AFFIRM.some((a) => hasPhrase(normalized, a))) {
      return { value: "yes", via: "bekræftelse" };
    }
    if (values.includes("no") && DENY.some((d) => hasPhrase(normalized, d))) {
      return { value: "no", via: "benægtelse" };
    }
  }

  return undefined;
}

/* ------------------------------------------------------------------ *
 * Ekko af nodens eget spørgsmål
 * ------------------------------------------------------------------ */

/** Ord der ikke siger noget om hvad en sætning handler om. */
const STOPWORDS = new Set([
  "og","i","der","det","den","en","et","til","er","som","paa","med","for","de",
  "af","om","du","han","hun","vi","at","har","fra","ved","skal","kan","eller",
  "the","a","an","of","to","is","are","in","on","for","and","or","it","this","that",
]);

/**
 * Gentager lægen bare nodens eget spørgsmål højt?
 *
 * Det sker: man læser spørgsmålet op for sig selv mens man tænker. Uden dette
 * ville "Er væskebehandling påbegyndt?" blive læst som et fagligt spørgsmål og
 * koste et opslag på op mod et minut midt i en vurdering. Det er et ekko, ikke
 * et spørgsmål — så vi lader det falde til svarfortolkeren i stedet.
 */
function echoesNodeQuestion(normalized: string, node: TreeNode, lang: Lang): boolean {
  const content = normalized.split(" ").filter((w) => w.length > 2 && !STOPWORDS.has(w));
  if (content.length < 2) return false;
  const question = normalize(node.question[lang]);
  const overlap = content.filter((w) => hasPhrase(question, w)).length;
  return overlap / content.length >= 0.7;
}

/* ------------------------------------------------------------------ *
 * Afgørelsen
 * ------------------------------------------------------------------ */

/**
 * Afgør hvad lægen mente med ytringen, givet hvor i træet han står.
 *
 * Kaldes EFTER kommandogenkendelsen (`matchCommand`): "næste" og "tilbage" er
 * styring og skal aldrig igennem her.
 */
export function classifyUtterance(text: string, node: TreeNode, lang: Lang): IntentVerdict {
  const normalized = normalize(text);
  if (!normalized) return { intent: "unknown", reasons: ["tom ytring"] };

  const words = normalized.split(" ");
  const q = questionSignals(text, normalized, words);
  const a = matchAllowedValue(normalized, words, node);

  if (echoesNodeQuestion(normalized, node, lang)) {
    return {
      intent: a ? "answer" : "unknown",
      reasons: ["ytringen gentager nodens eget spørgsmål", ...(a ? [a.via] : [])],
      matchedValue: a?.value,
    };
  }

  /*
   * Et stærkt signal afgør sagen alene, også selvom ytringen tilfældigvis rummer
   * en svarværdi. "Hvad er forskellen på overfladisk og dyb dermal?" nævner en
   * svarmulighed, men ingen besvarer et spørgsmål ved at indlede med "hvad" —
   * og at spørge lægen hvad han mente ville her være at spilde hans tid frem
   * for at spare den.
   */
  if (q.strong) return { intent: "question", reasons: q.reasons };

  /*
   * De svage signaler kan derimod ikke bære en afgørelse alene. Er der både et
   * spørgsmålspræg og en gyldig svarværdi — "er det dybt?" på dybde-noden — så
   * er ytringen ægte tvetydig, og så spørger vi.
   *
   * Et spørgsmål er desuden en sætning: ét eller to ord er et svar eller en
   * tøven, uanset hvordan de er sat sammen.
   */
  const questionish = q.weak >= 2 || (words.length >= 3 && q.weak >= 1);

  if (questionish && a) {
    return {
      intent: "ambiguous",
      reasons: [...q.reasons, a.via],
      matchedValue: a.value,
    };
  }
  if (questionish) return { intent: "question", reasons: q.reasons };
  if (a) return { intent: "answer", reasons: [a.via], matchedValue: a.value };

  return { intent: "unknown", reasons: ["hverken spørgsmålssignal eller kendt svarværdi"] };
}

/**
 * Er en fritstående ytring (uden for et forløb) et fagligt spørgsmål?
 *
 * Indgangsskærmen har ingen node at måle imod, så her tæller kun
 * spørgsmålssignalerne. Det er vigtigere end det lyder: "Hvornår skal en
 * brandsårspatient overflyttes?" rammer brandsårsforløbets ordliste og ville
 * ellers starte en patientvurdering, som om nogen havde beskrevet en patient.
 */
export function looksLikeQuestion(text: string): boolean {
  return freeStandingQuestion(text).hit;
}

/** Samme afgørelse som `looksLikeQuestion`, men med grundene i behold. */
function freeStandingQuestion(text: string): { hit: boolean; reasons: string[] } {
  const normalized = normalize(text);
  if (!normalized) return { hit: false, reasons: [] };
  const words = normalized.split(" ");
  const q = questionSignals(text, normalized, words);
  const hit = q.strong || q.weak >= 2 || (words.length >= 3 && q.weak >= 1);
  return { hit, reasons: q.reasons };
}

/* ------------------------------------------------------------------ *
 * Hvilken slags opslag?
 * ------------------------------------------------------------------ */

/** Ytringen beder om BEHANDLINGEN af en tilstand — et opslagsværk, ikke et svar. */
const TREATMENT_INTENT = [
  "behandl",
  "behandling",
  "behandlingen af",
  "haandter",
  "haandtering",
  "hvad goer jeg ved",
  "hvad skal jeg goere ved",
  "hvad goer man ved",
  "pleje af",
  "forbinding af",
  "tage mig af",
  "treat",
  "treatment",
  "manage",
  "management",
  "care for",
  "what do i do with",
  "how do i handle",
];

/**
 * Snævre spørgsmål. De begynder med et ord der beder om ÉT tal, ÉT tidspunkt
 * eller ÉN definition — og så er litteratursvaret bedre end et helt opslagsværk,
 * også selvom ordet "behandling" står i sætningen.
 */
const NARROW_OPENERS = [
  "hvor meget",
  "hvor mange",
  "hvor stor",
  "hvor stort",
  "hvor laenge",
  "hvornaar",
  "hvorfor",
  "hvad er",
  "hvilke kriterier",
  "how much",
  "how many",
  "how long",
  "when should",
  "when do",
  "why",
  "what is",
  "which criteria",
];

/**
 * Er spørgsmålet et BEHANDLINGSOPSLAG frem for et litteraturspørgsmål?
 *
 * De to svarer på hver sin slags spørgsmål, og de kommer fra hver sin kilde.
 * Behandlingsguiden slår op i VORES egen vidensbase og giver hele forløbet for
 * en tilstand i klinisk rækkefølge, ordret og med kilde — på sekunder. Chatten
 * går ud i litteraturen og svarer på ét præcist spørgsmål — på op mod et minut.
 *
 * Bemærk at valget her IKKE er sikkerhedskritisk, og at det derfor afgøres frem
 * for at blive lagt ud til lægen. Begge veje svarer med navngivne kilder; det
 * værste der sker ved et forkert valg er at svaret er bredere eller smallere end
 * han ville have. Derfor gætter vi her — og lader ham skifte med ét klik — mens
 * vi ved spørgsmål-mod-svar altid spørger. Reglen er den samme begge steder:
 * vi spørger når fejlen er farlig, og vælger når den blot er ubelejlig.
 */
export function looksLikeGuideTopic(text: string): boolean {
  const normalized = normalize(text);
  if (!normalized) return false;
  if (!TREATMENT_INTENT.some((p) => hasPhrase(normalized, p))) return false;
  return !NARROW_OPENERS.some((p) => normalized === p || normalized.startsWith(`${p} `));
}

/**
 * Begynder ytringen med en behandlingshensigt? "Behandling af ætsninger."
 *
 * Kun til INDGANGSSKÆRMEN, og strengere end `looksLikeGuideTopic` med vilje.
 * Dér findes der ingen node at måle imod, og alternativet er ikke et andet
 * opslag — det er at STARTE et patientforløb. Uden prøven her ville "behandling
 * af ætsninger" ramme brandsårsordlisten og sende lægen ind i en vurdering af en
 * patient han ikke har.
 *
 * Kravet om at hensigten står FORREST er det der holder rigtige
 * patientbeskrivelser ude: "patienten skal have behandling for kogende vand over
 * hånden" nævner behandling, men handler om en patient — og den skal stadig
 * starte forløbet.
 */
export function startsWithTreatmentIntent(text: string): boolean {
  const normalized = normalize(text);
  if (!normalized) return false;
  return TREATMENT_INTENT.some((raw) => {
    const p = normalize(raw);
    return normalized === p || normalized.startsWith(`${p} `);
  });
}

/* ------------------------------------------------------------------ *
 * Genkendelsen mens den sker
 * ------------------------------------------------------------------ */

/** De fire ting en fritstående ytring kan vise sig at være. */
export type IntakeKind = "pathway" | "question" | "guide" | "unsure";

export interface IntakePreview {
  kind: IntakeKind;
  /** Hvad i ytringen der pegede den vej. Sporbarhed, ikke pynt. */
  reasons: string[];
}

/**
 * Kortest ytring vi overhovedet udtaler os om. Under den er der ikke noget at
 * genkende endnu, og en forhåndsvurdering af to bogstaver ville flakke for
 * hvert tastetryk — netop den nervøsitet en klinisk app ikke må udstråle.
 */
const PREVIEW_MIN_CHARS = 4;

/**
 * Hvad VIL der ske, hvis ytringen sendes nu?
 *
 * Det er ikke en ny beslutning — det er den samme beslutning, vist frem før
 * den træffes. Rækkefølgen herunder er nøjagtig `handleIntake`s i `page.tsx`,
 * og den må aldrig komme ud af trit: en forhåndsvisning der lover noget andet
 * end det der sker, er værre end ingen forhåndsvisning. Er de to nogensinde
 * uenige, er det HER der skal rettes, ikke i teksten på skærmen.
 *
 * `pathwayMatched` er de kliniske stammer `routeUtterance` fandt — den hører
 * til forløbslisten og kan derfor ikke slås op herfra. Er den tom eller null,
 * fandt genkendelsen ingen sikker vinder.
 */
export function previewIntake(text: string, pathwayMatched: string[] | null): IntakePreview | null {
  const normalized = normalize(text);
  if (normalized.length < PREVIEW_MIN_CHARS) return null;

  // 1. Et spørgsmål — eller et rent behandlingsopslag — er ikke en patient.
  const q = freeStandingQuestion(text);
  const treatment = startsWithTreatmentIntent(text);
  if (q.hit || treatment) {
    const guide = looksLikeGuideTopic(text);
    const reasons = q.reasons.length > 0 ? q.reasons : [];
    if (treatment && reasons.length === 0) reasons.push("behandlingshensigt forrest");
    return { kind: guide ? "guide" : "question", reasons };
  }

  // 2. Et sikkert forløbsmatch. Grundene er de ord der pegede derhen.
  if (pathwayMatched && pathwayMatched.length > 0) {
    return { kind: "pathway", reasons: [`kliniske ord: ${pathwayMatched.map((m) => `«${m}»`).join(", ")}`] };
  }

  // 3. Hverken-eller. Vi siger det frem for at lade som om vi ved det.
  return { kind: "unsure", reasons: [] };
}

/* ------------------------------------------------------------------ *
 * Talte valg
 * ------------------------------------------------------------------ */

const AS_ANSWER = ["svar", "som svar", "det er svaret", "answer", "as an answer", "it is the answer"];
const AS_LOOKUP = [
  "opslag",
  "slaa op",
  "slaa det op",
  "spoergsmaal",
  "som spoergsmaal",
  "lookup",
  "look it up",
  "question",
];

/**
 * Da vi spurgte "mente du det som svar eller som spørgsmål?" — hvad svarede han?
 * Kun korte, entydige ytringer tæller; alt andet behandles som en ny ytring.
 */
export function matchIntentChoice(text: string): "answer" | "question" | null {
  const normalized = normalize(text);
  if (!normalized || normalized.split(" ").length > 4) return null;
  if (AS_ANSWER.some((p) => hasPhrase(normalized, p))) return "answer";
  if (AS_LOOKUP.some((p) => hasPhrase(normalized, p))) return "question";
  return null;
}

const YES_PHRASES = [
  "ja",
  "ja tak",
  "jo",
  "gerne",
  "start",
  "start forloebet",
  "foer mig igennem",
  "ja foer mig igennem",
  "yes",
  "yes please",
  "sure",
  "go ahead",
  "take me through",
];

/**
 * Tog lægen imod tilbuddet om at blive ført gennem forløbet? Bevidst snæver:
 * et forløb må aldrig starte af sig selv fordi nogen sagde "ja" til noget andet
 * i rummet.
 */
export function matchAffirmative(text: string): boolean {
  const normalized = normalize(text);
  if (!normalized || normalized.split(" ").length > 4) return false;
  return YES_PHRASES.some((p) => normalized === normalize(p));
}
