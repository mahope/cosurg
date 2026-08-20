import type { Lang } from "@/lib/tree/types";
import type { TreeSummary } from "./TreePicker";

/**
 * Hvilket forløb drejer det sig om?
 *
 * Lægen skal ikke vælge et "beslutningstræ" — det er vores begreb, ikke hans.
 * Han beskriver patienten, og appen finder forløbet. Genkendelsen sker HER i
 * klienten og ikke i en model: den er øjeblikkelig, virker uden net, og — det
 * afgørende — den er forudsigelig. Vi kan sige præcis hvorfor et forløb blev
 * valgt, og det er hele appens påstand.
 *
 * Reglen ved tvivl er den samme som i motoren: vi gætter aldrig. Er der ikke en
 * klar vinder, spørger vi i stedet for at starte det forkerte forløb.
 */

/**
 * Ord der peger på et forløb. Listerne er bevidst KLINISKE og ikke bare
 * trænavnet: en læge siger "kogende vand", ikke "brandsår — akut vurdering".
 *
 * Hvert ord skrives som STAMME og matches med op til tre bogstavers bøjning, så
 * "forbind" dækker forbinding, forbinder og forbindes. Til gengæld må ingen
 * stamme i samme liste være begyndelsen på en anden inden for de tre bogstaver
 * — så ville ét ord i sætningen tælle to gange og vippe en ellers tvivlsom
 * sammenligning over på det forkerte forløb.
 */
const KEYWORDS: Record<string, string[]> = {
  "burns-dk": [
    "brandsår",
    "brandsar",
    "brandskade",
    "forbrænd",
    "brændt",
    "skold",
    "kogende",
    "kogte",
    "varmt vand",
    "damp",
    "flamme",
    "ildebrand",
    "ætsning",
    "ætset",
    "syre",
    "kemisk",
    "elektrisk",
    "strøm",
    "højspænding",
    "inhalation",
    "røg",
    "røgforgiftning",
    "sod",
    "tbsa",
    "burn",
    "scald",
    "boiling",
    "flame",
    "chemical",
    "electrical",
  ],
  "dressing-hand-arm": [
    "forbind",
    "forbindning",
    "bandage",
    "bandagering",
    "mepilex",
    "kompres",
    "indpakning",
    "vikle",
    "dress",
    "bandaging",
    "wrap",
  ],
};

/**
 * Ord der peger på KROPSDELEN et procedureforløb dækker. De giver kun point
 * hvis forløbet allerede er i spil — "hånd" alene siger intet om hvad der skal
 * ske med den — og de tæller højst én gang.
 */
const REGION_HINTS: Record<string, string[]> = {
  "dressing-hand-arm": ["finger", "fingre", "hånd", "hænder", "arm", "underarm", "hand", "forearm"],
};

const LETTER = "a-zæøåäöüéè0-9";

/**
 * Kortere stammer end dette må KUN stå forrest i et ord.
 *
 * Dansk klinisk sprog er fuldt af sammensatte ord — "flammebrandsår",
 * "omforbinding" — så en lang stamme skal også kunne findes bagest i et ord.
 * Men den frihed er farlig for korte stammer: "arm" står i "varm", "syre" i
 * "styre", "vikle" i "udvikle". Grænsen holder de korte ude af de fælder.
 */
const COMPOUND_MIN = 6;

/**
 * Rammer stammen et ord i teksten?
 *
 * Ren `includes()` duer ikke: den ville lade "forbind" og "forbinding" tælle
 * det samme ord to gange og dermed vippe en ellers tvivlsom sammenligning over.
 * Vi kræver derfor ordgrænser og tillader kun en kort bøjningsendelse — plus
 * et sammensætningsled foran, når stammen er lang nok til at bære det.
 */
function hasStem(text: string, stem: string): boolean {
  const escaped = stem.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const lead = stem.length >= COMPOUND_MIN ? `[${LETTER}]*` : "";
  return new RegExp(`(^|[^${LETTER}])${lead}${escaped}[${LETTER}]{0,3}([^${LETTER}]|$)`, "i").test(text);
}

export interface TreeMatch {
  treeId: string;
  /** Hvad i ytringen der pegede på forløbet — sporbarhed, ikke pynt. */
  matched: string[];
}

export interface RoutingResult {
  /** Sikker vinder, eller null når vi hellere vil spørge end gætte. */
  match: TreeMatch | null;
  /** Alle forløb der overhovedet blev ramt, med den bedste først. */
  ranked: TreeMatch[];
}

/**
 * Reserve for forløb uden egen ordliste: de længere ord i træets navn. Svagere
 * end de kliniske stammer, men bedre end at et nyt træ er uopnåeligt.
 */
function nameStems(tree: TreeSummary, lang: Lang): string[] {
  return tree.name[lang]
    .toLowerCase()
    .split(new RegExp(`[^${LETTER}]+`))
    .filter((w) => w.length >= 5);
}

/**
 * Rangér de tilgængelige forløb efter hvor godt de passer på ytringen.
 *
 * En vinder kræver BÅDE et absolut minimum og et klart forspring til nummer to.
 * "Jeg skal lægge forbinding på en hånd med brandsår" rammer begge forløb — og
 * netop dér skal appen spørge, ikke vælge.
 */
export function routeUtterance(utterance: string, trees: TreeSummary[], lang: Lang): RoutingResult {
  const text = utterance.toLowerCase().replace(/\s+/g, " ").trim();
  if (!text) return { match: null, ranked: [] };

  const scored = trees.map((tree) => {
    const stems = KEYWORDS[tree.id] ?? nameStems(tree, lang);
    const matched: string[] = [];
    let score = 0;

    for (const stem of stems) {
      if (hasStem(text, stem)) {
        score += 2;
        matched.push(stem);
      }
    }

    // Kropsdel tæller kun oveni et forløb der allerede er ramt — og kun én gang.
    if (score > 0) {
      const hint = (REGION_HINTS[tree.id] ?? []).find((h) => hasStem(text, h));
      if (hint) {
        score += 1;
        matched.push(hint);
      }
    }

    return { treeId: tree.id, matched, score };
  });

  const ranked = scored.filter((s) => s.score > 0).sort((a, b) => b.score - a.score);
  if (ranked.length === 0) return { match: null, ranked: [] };

  const [best, second] = ranked;
  const clearWinner = best.score >= 2 && (!second || best.score >= second.score + 2);

  return {
    match: clearWinner ? { treeId: best.treeId, matched: best.matched } : null,
    ranked: ranked.map(({ treeId, matched }) => ({ treeId, matched })),
  };
}

/**
 * Det oplagte næste forløb når et træ er kørt til ende.
 *
 * Holdt som en eksplicit tabel og ikke som en regel: hvilket forløb der følger
 * efter hvilken anbefaling er en KLINISK sammenhæng, og den skal kunne læses og
 * modsiges af en kliniker uden at læse kode. Ambulant behandlet brandsår skal
 * forbindes — derfor peger netop den anbefaling på forbindingsproceduren.
 */
const FOLLOW_UPS: Record<string, Record<string, string>> = {
  "burns-dk": {
    "disp-treat": "dressing-hand-arm",
  },
};

export function followUpTreeId(treeId: string, dispositionId: string | null): string | null {
  if (!dispositionId) return null;
  return FOLLOW_UPS[treeId]?.[dispositionId] ?? null;
}
