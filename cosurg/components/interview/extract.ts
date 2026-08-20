import type { Lang } from "@/lib/tree/types";

/**
 * Henter anamnesefelter ud af det lægen siger eller skriver.
 *
 * Genkendelsen sker HER i klienten og ikke i en model — af samme grund som
 * forløbsvalget i `components/treeRouting.ts`: den er øjeblikkelig, den virker
 * uden net, og den er forudsigelig. Vi kan pege på præcis hvilke ord der fyldte
 * hvilket felt ud, og det står på skærmen ved siden af svaret.
 *
 * Reglen er den samme som i motoren: vi gætter aldrig. Kan en ytring ikke
 * henføres, bliver feltet stående som manglende, og lægen udfylder det selv.
 * Et tomt felt er et ærligt felt; et forkert udfyldt felt er en fejl der rejser
 * videre ind i journalen.
 */

export interface Fund {
  felt: string;
  value: string;
  display: string;
  /** Det stykke tekst der udløste fundet. */
  matched: string;
}

/** Folder danske tegn, så stavemåde og tastatur ikke afgør om et ord findes. */
function fold(s: string): string {
  return s
    .toLowerCase()
    .replace(/æ/g, "ae")
    .replace(/ø/g, "oe")
    .replace(/å/g, "aa")
    .replace(/\s+/g, " ");
}

/** Talord der optræder i tale. STT skriver ofte "fyrre" og ikke "40". */
const TALORD: Record<string, number> = {
  en: 1, et: 1, to: 2, tre: 3, fire: 4, fem: 5, seks: 6, syv: 7, otte: 8, ni: 9, ti: 10,
  elleve: 11, tolv: 12, tretten: 13, fjorten: 14, femten: 15, seksten: 16, sytten: 17,
  atten: 18, nitten: 19, tyve: 20, tredive: 30, fyrre: 40, halvtreds: 50, tres: 60,
  halvfjerds: 70, firs: 80, halvfems: 90, hundrede: 100, halvanden: 1.5,
  one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10,
  fifteen: 15, twenty: 20, thirty: 30, forty: 40, fifty: 50, sixty: 60, eighty: 80,
};

const TAL = `(\\d{1,3}(?:[.,]\\d)?|${Object.keys(TALORD).join("|")})`;

function tilTal(raw: string): number | null {
  const rent = raw.trim().toLowerCase().replace(",", ".");
  if (/^\d/.test(rent)) return Number(rent);
  return TALORD[rent] ?? null;
}

/**
 * Er ordet nægtet?
 *
 * Kigger i tegnene FORAN træfferen. "ingen allergier" og "ikke i
 * blodfortyndende" er to af de hyppigste anamnesesvar overhovedet, og en
 * genkendelse der læser dem som et ja er værre end ingen genkendelse.
 *
 * Komma og punktum lukker vinduet. Uden det læste "ingen allergier, tager
 * Eliquis" som om patienten IKKE fik blodfortyndende — nægtelsen fra det ene
 * led smittede af på det næste, og netop den fejl er farlig.
 */
function negeret(tekst: string, index: number): boolean {
  const foran = tekst.slice(Math.max(0, index - 30), index);
  return /\b(ingen|ikke|uden|aldrig|negativ|benaegter|nej|no|not|without|denies|never)\b[^.;,]{0,22}$/.test(foran);
}

/**
 * Findes stammen som et ORD i teksten?
 *
 * Ren `includes()` duer ikke i dansk: "fod" står i "fodbold", "arm" i
 * "underarmen", "sod" i "sodavand". Samme afvejning som i
 * `components/treeRouting.ts`: korte stammer skal stå forrest i ordet og må
 * kun bære en kort bøjningsendelse, mens lange stammer gerne må sidde inde i
 * en sammensætning — ellers ville "flamme" ikke findes i
 * "flammeforbrænding".
 */
const BOGSTAV = "a-z0-9";
const SAMMENSAT_MIN = 6;

function harOrd(tekst: string, stamme: string): boolean {
  const s = fold(stamme).trim();
  if (!s) return false;
  const escaped = s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const moenster =
    s.length >= SAMMENSAT_MIN
      ? `(^|[^${BOGSTAV}])[${BOGSTAV}]*${escaped}[${BOGSTAV}]*([^${BOGSTAV}]|$)`
      : `(^|[^${BOGSTAV}])${escaped}[a-z]{0,3}([^${BOGSTAV}]|$)`;
  return new RegExp(moenster).test(tekst);
}

interface Moenster {
  felt: string;
  ord: string[];
  value: string;
  /** Tekst der vises i feltet. */
  display: Record<Lang, string>;
}

/** Skadesmekanismer. Første match vinder, og listerne er skrevet så de ikke overlapper. */
const MEKANISMER: Moenster[] = [
  {
    felt: "mechanism", value: "chemical",
    ord: ["aetsning", "aetset", "kemikalie", "kemisk", "syre", "lud", "natriumhydroxid", "flussyre", "cement", "kalk", "chemical", "acid", "alkali"],
    display: { da: "Ætsning (kemisk)", en: "Chemical" },
  },
  {
    felt: "mechanism", value: "electrical",
    ord: ["elektrisk", "stroem", "stroemstoed", "hoejspaending", "stikkontakt", "lynned", "electrical", "electric shock", "high voltage"],
    display: { da: "Elektrisk", en: "Electrical" },
  },
  {
    felt: "mechanism", value: "scald",
    ord: ["skoldning", "skoldet", "kogende", "kogte", "varmt vand", "damp", "kaffe", "tevand", "suppe", "friture", "scald", "boiling", "steam", "hot water"],
    display: { da: "Skoldning (væske/damp)", en: "Scald (liquid/steam)" },
  },
  {
    felt: "mechanism", value: "flame",
    ord: ["flamme", "ildebrand", "braendte", "baal", "benzin", "grill", "husbrand", "bilbrand", "fyrvaerkeri", "flame", "fire", "bonfire", "petrol"],
    display: { da: "Flamme/ild", en: "Flame/fire" },
  },
  {
    felt: "mechanism", value: "contact",
    ord: ["strygejern", "komfur", "kogeplade", "ovnen", "stegepande", "udstoedning", "motorblok", "hot plate", "iron", "oven", "exhaust"],
    display: { da: "Kontakt med varm genstand", en: "Contact with a hot object" },
  },
];

const KROPSDELE: Array<{ ord: string[]; display: Record<Lang, string> }> = [
  { ord: ["ansigt", "kind", "pande", "face"], display: { da: "ansigt", en: "face" } },
  { ord: ["hals", "neck"], display: { da: "hals", en: "neck" } },
  { ord: ["bryst", "thorax", "chest"], display: { da: "bryst", en: "chest" } },
  { ord: ["ryg", "back"], display: { da: "ryg", en: "back" } },
  { ord: ["mave", "abdomen"], display: { da: "mave", en: "abdomen" } },
  { ord: ["overarm", "upper arm"], display: { da: "overarm", en: "upper arm" } },
  { ord: ["underarm", "forearm"], display: { da: "underarm", en: "forearm" } },
  { ord: ["haand", "haenderne", "hand", "hands"], display: { da: "hånd", en: "hand" } },
  { ord: ["finger", "fingre", "tommel", "fingers", "thumb"], display: { da: "fingre", en: "fingers" } },
  { ord: ["laar", "thigh"], display: { da: "lår", en: "thigh" } },
  { ord: ["underben", "skinneben", "lower leg", "shin"], display: { da: "underben", en: "lower leg" } },
  { ord: ["fod", "foedder", "taeer", "foot", "feet", "toes"], display: { da: "fod", en: "foot" } },
  { ord: ["genital", "skridt", "perineum", "groin"], display: { da: "genitalier", en: "genitals" } },
  { ord: ["skulder", "shoulder"], display: { da: "skulder", en: "shoulder" } },
  { ord: ["arm"], display: { da: "arm", en: "arm" } },
  { ord: ["ben", "leg"], display: { da: "ben", en: "leg" } },
];

const AK_MIDLER = [
  "blodfortynd", "antikoagul", "ak-behandling", "ak behandling", "marevan", "warfarin", "marcoumar",
  "eliquis", "apixaban", "xarelto", "rivaroxaban", "pradaxa", "dabigatran", "lixiana", "edoxaban",
  "clopidogrel", "plavix", "brilique", "ticagrelor", "innohep", "fragmin", "klexane", "heparin",
  "magnyl", "acetylsalicyl", "aspirin", "anticoagul", "blood thinner",
];

const KOMORBIDITET: Array<{ ord: string[]; display: Record<Lang, string> }> = [
  { ord: ["diabet", "sukkersyge"], display: { da: "diabetes", en: "diabetes" } },
  { ord: ["immunsuppr", "prednisolon", "kemoterapi", "immunosuppress", "chemotherapy"], display: { da: "immunsupprimeret", en: "immunosuppressed" } },
  { ord: ["gravid", "pregnan"], display: { da: "gravid", en: "pregnant" } },
  { ord: ["nyresvigt", "dialyse", "renal failure", "dialysis"], display: { da: "nyresvigt", en: "renal failure" } },
  { ord: ["hjerteinsuff", "hjertesvigt", "heart failure"], display: { da: "hjertesvigt", en: "heart failure" } },
  { ord: ["kronisk obstruktiv", "astma", "copd", "asthma"], display: { da: "lungesygdom", en: "lung disease" } },
  { ord: ["epilepsi", "epilep"], display: { da: "epilepsi", en: "epilepsy" } },
];

function findOrd(tekst: string, ord: string[]): { ord: string; index: number } | null {
  for (const o of ord) {
    if (!harOrd(tekst, o)) continue;
    // Positionen bruges kun til at kigge efter en nægtelse foran træfferen.
    const i = tekst.indexOf(fold(o).trim());
    if (i >= 0) return { ord: o.trim(), index: i };
  }
  return null;
}

/**
 * Læser én ytring og returnerer de felter den kan udfylde.
 *
 * Én ytring kan sagtens fylde flere felter — "34-årig mand, kogende vand over
 * højre hånd for 40 minutter siden, ingen allergier" er fire felter i én
 * sætning, og det er sådan en anamnese faktisk bliver fortalt.
 */
export function udtraek(raa: string, lang: Lang): Fund[] {
  const t = fold(raa);
  const fund: Fund[] = [];
  const tekst = (d: Record<Lang, string>) => d[lang];

  // — Alder —
  const alder = new RegExp(`${TAL}[\\s-]*(aarig|aar gammel|year[s]?[- ]old|years old)`).exec(t);
  if (alder) {
    const n = tilTal(alder[1]);
    if (n && n > 0 && n < 120) {
      fund.push({ felt: "age", value: String(n), display: `${n} ${lang === "da" ? "år" : "years"}`, matched: alder[0] });
    }
  }

  // — Vægt —
  const vaegt = new RegExp(`${TAL}\\s*(kg|kilo|kilogram)\\b|vejer\\s+${TAL}`).exec(t);
  if (vaegt) {
    const n = tilTal(vaegt[1] ?? vaegt[3]);
    if (n && n >= 2 && n <= 300) {
      fund.push({ felt: "weight", value: String(n), display: `${n} kg`, matched: vaegt[0] });
    }
  }

  // — Udbredelse — kun når procenten står sammen med et areal-ord, ellers
  //   ville "under 8 procent af tilfældene" blive til en TBSA.
  const tbsa = new RegExp(`(?:tbsa|areal|udbred|forbraendt|braendt|burn|body surface)[^.;]{0,24}?${TAL}\\s*(?:%|procent|percent)|${TAL}\\s*(?:%|procent|percent)\\s*(?:tbsa|forbraendt|braendt|af kroppen|of the body|body surface)`).exec(t);
  if (tbsa) {
    const n = tilTal(tbsa[1] ?? tbsa[2]);
    if (n !== null && n >= 0 && n <= 100) {
      fund.push({ felt: "tbsa", value: String(n), display: `${n} % TBSA`, matched: tbsa[0] });
    }
  }

  // — Tid siden skaden — gemmes i minutter, vises som lægen ville sige det.
  const tid = new RegExp(`(?:for|siden|ago|siden der gik)?\\s*${TAL}\\s*(minut|min|time|timer|hour|hours|doegn|dag|dage|day|days)\\w*\\s*(?:siden|ago)`).exec(t);
  if (tid) {
    const n = tilTal(tid[1]);
    const enhed = tid[2];
    if (n !== null) {
      const faktor = /^(minut|min)/.test(enhed) ? 1 : /^(time|hour)/.test(enhed) ? 60 : 1440;
      const minutter = Math.round(n * faktor);
      const display =
        minutter < 90
          ? `${minutter} ${lang === "da" ? "minutter siden" : "minutes ago"}`
          : minutter < 1440
          ? `${Math.round(minutter / 6) / 10} ${lang === "da" ? "timer siden" : "hours ago"}`
          : `${Math.round(minutter / 144) / 10} ${lang === "da" ? "døgn siden" : "days ago"}`;
      fund.push({ felt: "timeSince", value: String(minutter), display, matched: tid[0] });
    }
  } else if (/\b(i gaar|yesterday)\b/.test(t)) {
    fund.push({ felt: "timeSince", value: "1440", display: lang === "da" ? "i går" : "yesterday", matched: "i går" });
  } else if (/\b(lige (nu|foer)|for lidt siden|just now|minutes ago)\b/.test(t)) {
    fund.push({ felt: "timeSince", value: "5", display: lang === "da" ? "lige før" : "just now", matched: "lige før" });
  }

  // — Skadesmekanisme —
  for (const m of MEKANISMER) {
    const traef = findOrd(t, m.ord);
    if (traef) {
      fund.push({ felt: m.felt, value: m.value, display: tekst(m.display), matched: traef.ord });
      break;
    }
  }

  // — Røg i lukket rum —
  const roeg = findOrd(t, ["lukket rum", "indelukket", "roegfyldt", "roegforgift", "sod om munden", "sod i", "roeg", "enclosed space", "smoke"]);
  if (roeg) {
    const ja = !negeret(t, roeg.index);
    fund.push({
      felt: "closedSpace",
      value: ja ? "yes" : "no",
      display: ja ? (lang === "da" ? "Ja — røg/lukket rum" : "Yes — smoke/enclosed") : lang === "da" ? "Nej" : "No",
      matched: roeg.ord,
    });
  } else if (/\b(udendoers|ude i det fri|outdoors|open air)\b/.test(t)) {
    fund.push({ felt: "closedSpace", value: "no", display: lang === "da" ? "Nej — udendørs" : "No — outdoors", matched: "udendørs" });
  }

  // — Køling —
  const koelt = findOrd(t, ["skyllet", "skylning", "koelet", "afkoelet", "under hanen", "koldt vand", "cooled", "irrigated", "rinsed", "running water"]);
  if (koelt) {
    const ja = !negeret(t, koelt.index);
    const varighed = new RegExp(`${TAL}\\s*(minut|min)`).exec(t);
    const n = varighed ? tilTal(varighed[1]) : null;
    fund.push({
      felt: "cooled",
      value: ja ? "yes" : "no",
      display: ja
        ? n
          ? `${lang === "da" ? "Ja" : "Yes"} — ${n} ${lang === "da" ? "minutter" : "minutes"}`
          : lang === "da"
          ? "Ja"
          : "Yes"
        : lang === "da"
        ? "Nej"
        : "No",
      matched: koelt.ord,
    });
  }

  // — Allergier —
  const allergi = /allergi|allergy|allergic/.exec(t);
  if (allergi) {
    if (negeret(t, allergi.index)) {
      fund.push({
        felt: "allergies",
        value: "none",
        display: lang === "da" ? "Ingen kendte" : "None known",
        // Det faktisk hørte, ikke en standardfrase — linjen skal kunne
        // efterprøves mod det der blev sagt.
        // Vinduet klippes ved en ordgrænse — et halvt ord foran citatet ser ud
        // som en fejl i genkendelsen, også når genkendelsen er rigtig.
        matched: t
          .slice(Math.max(0, allergi.index - 14), allergi.index + allergi[0].length)
          .replace(/^\S*[\s,]+/, "")
          .trim(),
      });
    } else {
      const mod = /allergi(?:sk)?\s*(?:over ?for|mod|for)\s+([a-zaeoo\s-]{3,40})|allergic to\s+([a-z\s-]{3,40})/.exec(t);
      const stof = (mod?.[1] ?? mod?.[2] ?? "").trim().split(/\s+(?:og|and|,)\s+/)[0];
      fund.push({
        felt: "allergies",
        value: stof || "yes",
        display: stof ? stof.charAt(0).toUpperCase() + stof.slice(1) : lang === "da" ? "Ja — ikke specificeret" : "Yes — unspecified",
        matched: mod?.[0] ?? "allergi",
      });
    }
  }

  // — Antikoagulantia —
  const ak = findOrd(t, AK_MIDLER);
  if (ak) {
    const ja = !negeret(t, ak.index);
    fund.push({
      felt: "anticoagulants",
      value: ja ? "yes" : "no",
      display: ja
        ? `${lang === "da" ? "Ja" : "Yes"} — ${ak.ord.charAt(0).toUpperCase()}${ak.ord.slice(1)}`
        : lang === "da"
        ? "Nej"
        : "No",
      matched: ak.ord,
    });
  }

  // — Tetanus —
  const tetanus = findOrd(t, ["tetanus", "stivkrampe"]);
  if (tetanus) {
    const nær = t.slice(tetanus.index, tetanus.index + 90);
    const aarSiden = new RegExp(`${TAL}\\s*(aar|year)`).exec(nær);
    const n = aarSiden ? tilTal(aarSiden[1]) : null;

    const ukendt = /(ved ikke|kender ikke|ukendt|usikker|unknown|not sure|husker ikke)/.test(nær) || /(ved ikke|kender ikke|ukendt|unknown)/.test(t.slice(Math.max(0, tetanus.index - 40), tetanus.index));
    const negativ = negeret(t, tetanus.index) || /(udloebet|for gammel|expired|overdue)/.test(nær);

    const value = ukendt ? "unknown" : negativ || (n !== null && n > 10) ? "outdated" : "current";
    const display =
      value === "current"
        ? lang === "da" ? "Dækket" : "Covered"
        : value === "outdated"
        ? lang === "da" ? "Ikke dækket" : "Not covered"
        : lang === "da" ? "Ved ikke" : "Unknown";
    fund.push({ felt: "tetanus", value, display, matched: tetanus.ord });
  }

  // — Lokalisation — flere kropsdele kan nævnes i samme sætning.
  const side = /\b(hoejre|venstre|begge|right|left|both)\b/.exec(t);
  const dele = KROPSDELE.filter((k) => k.ord.some((o) => harOrd(t, o))).map((k) => tekst(k.display));
  if (dele.length > 0) {
    const sideOrd = side
      ? ({ hoejre: "højre", venstre: "venstre", begge: "begge", right: "right", left: "left", both: "both" } as Record<string, string>)[side[1]]
      : null;
    const unikke = [...new Set(dele)];
    fund.push({
      felt: "location",
      value: unikke.join(","),
      display: [sideOrd, unikke.join(", ")].filter(Boolean).join(" "),
      matched: unikke.join(", "),
    });
  }

  // — Anden sygdom / medicin —
  const komorbide = KOMORBIDITET.filter((k) => {
    const t2 = findOrd(t, k.ord);
    return t2 && !negeret(t, t2.index);
  }).map((k) => tekst(k.display));
  if (komorbide.length > 0) {
    fund.push({
      felt: "comorbidity",
      value: komorbide.join(","),
      display: komorbide.join(", "),
      matched: komorbide.join(", "),
    });
  }

  return fund;
}
