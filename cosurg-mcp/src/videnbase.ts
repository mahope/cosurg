/**
 * Indlaesning af den kliniske vidensbase.
 *
 * Kilderne er markdown-filer hvor hvert afsnit indledes af en linje
 * `## KILDE: <url eller dokumentnavn>`. Den linje er kontrakten: alt indhold
 * under den kan spores tilbage til praecis den kilde, og hver eneste
 * soegetraeffer serveren returnerer baerer den med.
 *
 * Vi deler i to niveauer:
 *   - afsnit  = alt under én `## KILDE:`-linje (én webside / ét dokument)
 *   - uddrag  = et soegbart stykke inden i et afsnit, med sin overskriftssti
 */

import { readFileSync, readdirSync, statSync } from "node:fs";
import { basename, join } from "node:path";

import { foersteEksisterende, konfiguration } from "./konfiguration.js";

export type KildeSamling = "brandsaar" | "magnus" | "ukendt";

export interface Afsnit {
  /** Stabilt id, fx "brandsaar:04". Bruges af vaerktoejet hent_kildeafsnit. */
  id: string;
  samling: KildeSamling;
  /** Filnavnet uddraget stammer fra, fx "brandsaar-dk.md". */
  dokument: string;
  /** Menneskelaesbart navn paa samlingen, fx "brandsaar.dk (Dansk Brandsaarsforening)". */
  samlingsTitel: string;
  /** URL eller dokumentnavn fra `## KILDE:`-linjen. */
  kilde: string;
  /** Er kilden en URL vi kan linke til? */
  kildeErUrl: boolean;
  /** Afsnittets raa markdown. */
  tekst: string;
}

export interface Uddrag {
  /** Stabilt id, fx "brandsaar:04#2". */
  id: string;
  afsnitId: string;
  samling: KildeSamling;
  dokument: string;
  samlingsTitel: string;
  kilde: string;
  kildeErUrl: boolean;
  /** Overskriftsstien ned til uddraget, yderst foerst. */
  overskrifter: string[];
  tekst: string;
}

export interface Videnbase {
  afsnit: Afsnit[];
  uddrag: Uddrag[];
  /** Mappen filerne blev laest fra — vises i status-vaerktoejet. */
  mappe: string | null;
  filer: string[];
}

const SAMLINGER: Record<string, { samling: KildeSamling; titel: string }> = {
  "brandsaar-dk.md": {
    samling: "brandsaar",
    titel: "brandsaar.dk — Dansk Brandsaarsforening / Rigshospitalets brandsaarsafdeling",
  },
  "magnus-materiale.md": {
    samling: "magnus",
    titel: "CoSurg-teamets eget materiale (Burns plast surgeon + forbindingsguide, Afsnit 6052)",
  },
};

/** Hoejeste laengde paa et uddrag foer vi deler det yderligere. */
const MAKS_UDDRAG_TEGN = 1400;

function erUrl(s: string): boolean {
  return /^https?:\/\//i.test(s);
}

/** Fjerner scraper-stoej der ikke er klinisk indhold. */
function erStoejlinje(linje: string): boolean {
  const t = linje.trim();
  if (t === "" || t === "---") return false; // tomme linjer og skillelinjer haandteres andetsteds
  if (/^\[Skip to content\]/i.test(t)) return true;
  if (/^!\[\]\(https?:\/\/\S+\)$/.test(t)) return true; // billede uden alt-tekst
  return false;
}

/** Deler en markdown-fil op i afsnit paa `## KILDE:`-linjer. */
function delIAfsnit(indhold: string, dokument: string): Afsnit[] {
  const meta = SAMLINGER[dokument] ?? { samling: "ukendt" as const, titel: dokument };
  const linjer = indhold.split(/\r?\n/);
  const afsnit: Afsnit[] = [];

  let aktuelKilde: string | null = null;
  let buffer: string[] = [];

  const luk = () => {
    if (aktuelKilde === null) return;
    const tekst = buffer.join("\n").trim();
    if (tekst !== "") {
      const nr = String(afsnit.length).padStart(2, "0");
      afsnit.push({
        id: `${meta.samling}:${nr}`,
        samling: meta.samling,
        dokument,
        samlingsTitel: meta.titel,
        kilde: aktuelKilde,
        kildeErUrl: erUrl(aktuelKilde),
        tekst,
      });
    }
    buffer = [];
  };

  for (const linje of linjer) {
    const m = /^##\s+KILDE:\s*(.+?)\s*$/.exec(linje);
    if (m) {
      luk();
      aktuelKilde = m[1] ?? null;
      continue;
    }
    if (aktuelKilde === null) continue; // praeambel foer foerste KILDE-linje springes over
    if (erStoejlinje(linje)) continue;
    buffer.push(linje);
  }
  luk();

  return afsnit;
}

/** Deler en for lang tekstblok ved afsnitsgraenser, saa ingen saetning knaekkes. */
function delLangTekst(tekst: string): string[] {
  if (tekst.length <= MAKS_UDDRAG_TEGN) return [tekst];
  const stykker = tekst.split(/\n{2,}/).filter((s) => s.trim() !== "");
  const ud: string[] = [];
  let nu = "";
  for (const stykke of stykker) {
    if (nu !== "" && (nu + "\n\n" + stykke).length > MAKS_UDDRAG_TEGN) {
      ud.push(nu);
      nu = stykke;
    } else {
      nu = nu === "" ? stykke : `${nu}\n\n${stykke}`;
    }
    // Et enkelt stykke kan i sig selv vaere for langt (lange tabeller). Del haardt.
    while (nu.length > MAKS_UDDRAG_TEGN * 1.6) {
      ud.push(nu.slice(0, MAKS_UDDRAG_TEGN));
      nu = nu.slice(MAKS_UDDRAG_TEGN);
    }
  }
  if (nu.trim() !== "") ud.push(nu);
  return ud;
}

/** Deler et afsnit i soegbare uddrag, ét pr. overskrift (og videre ved laengde). */
function delIUddrag(a: Afsnit): Uddrag[] {
  const linjer = a.tekst.split(/\r?\n/);
  const stak: string[] = [];
  const blokke: { overskrifter: string[]; linjer: string[] }[] = [];
  let nuvaerende: { overskrifter: string[]; linjer: string[] } = {
    overskrifter: [],
    linjer: [],
  };

  for (const linje of linjer) {
    const m = /^(#{1,6})\s+(.+?)\s*$/.exec(linje);
    if (m) {
      if (nuvaerende.linjer.some((l) => l.trim() !== "")) blokke.push(nuvaerende);
      const niveau = (m[1] ?? "#").length;
      const titel = (m[2] ?? "").replace(/\*\*/g, "").trim();
      stak.length = Math.max(0, niveau - 1);
      stak[niveau - 1] = titel;
      const overskrifter = stak.filter((s): s is string => typeof s === "string" && s !== "");
      nuvaerende = { overskrifter: [...overskrifter], linjer: [] };
      continue;
    }
    if (linje.trim() === "---") continue;
    nuvaerende.linjer.push(linje);
  }
  if (nuvaerende.linjer.some((l) => l.trim() !== "")) blokke.push(nuvaerende);

  const uddrag: Uddrag[] = [];
  for (const blok of blokke) {
    const raa = blok.linjer.join("\n").trim();
    if (raa === "") continue;
    for (const stykke of delLangTekst(raa)) {
      const rent = stykke.trim();
      if (rent.length < 40) continue; // for kort til at vaere et selvstaendigt svar
      uddrag.push({
        id: `${a.id}#${uddrag.length}`,
        afsnitId: a.id,
        samling: a.samling,
        dokument: a.dokument,
        samlingsTitel: a.samlingsTitel,
        kilde: a.kilde,
        kildeErUrl: a.kildeErUrl,
        overskrifter: blok.overskrifter,
        tekst: rent,
      });
    }
  }
  return uddrag;
}

/** Laeser alle .md-filer i den foerste kildemappe der findes. */
export function indlaesVidenbase(): Videnbase {
  const mappe = foersteEksisterende(konfiguration.kildeMapper);
  if (mappe === null) {
    return { afsnit: [], uddrag: [], mappe: null, filer: [] };
  }

  const filer = readdirSync(mappe)
    .filter((f) => f.toLowerCase().endsWith(".md"))
    .filter((f) => statSync(join(mappe, f)).isFile())
    .sort();

  const afsnit: Afsnit[] = [];
  for (const fil of filer) {
    const indhold = readFileSync(join(mappe, fil), "utf8");
    afsnit.push(...delIAfsnit(indhold, basename(fil)));
  }

  const uddrag: Uddrag[] = [];
  for (const a of afsnit) uddrag.push(...delIUddrag(a));

  return { afsnit, uddrag, mappe, filer };
}

/** Kort, citerbar kildehenvisning til et uddrag eller afsnit. */
export function kildehenvisning(x: Uddrag | Afsnit): string {
  const sti = "overskrifter" in x && x.overskrifter.length > 0 ? ` › ${x.overskrifter.join(" › ")}` : "";
  return `${x.samlingsTitel} — ${x.kilde}${sti}`;
}
