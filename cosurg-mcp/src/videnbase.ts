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
 *
 * Kilderne er ikke af samme slags. En retningslinje siger "saadan skal det
 * goeres"; en klinisk case siger "saadan gik det for én patient". De to maa
 * aldrig laeses som det samme, saa hvert afsnit baerer en `kildetype`, og
 * case-afsnit baerer desuden deres case-id, titel og forfattere. Metadata
 * angives med store bogstaver lige under `## KILDE:`-linjen:
 *
 *   ## KILDE: https://beta.jpbrs.com/cases/case-16-...
 *   CASE-ID: Case 16 (2025)
 *   TITEL: Utilizing the reverse radial forearm flap ...
 *   FORFATTERE: David Salim, MD; Taiba Alrasheed, MD
 */

import { readFileSync, readdirSync, statSync } from "node:fs";
import { basename, join } from "node:path";

import { foersteEksisterende, konfiguration } from "./konfiguration.js";

export type KildeSamling = "brandsaar" | "magnus" | "plastsurgeon" | "jpbrs" | "vip" | "ukendt";

/**
 * Hvilken slags viden kilden er.
 *
 * `retningslinje` = retningslinje, laerebog eller haandbogskapitel — "saadan skal det goeres".
 * `case`         = ét peer-reviewed patientforloeb — "saadan gik det i dette tilfaelde".
 *
 * Forskellen er klinisk vaesentlig og skal fremgaa af hvert eneste svar.
 */
export type Kildetype = "retningslinje" | "case";

/** Metadata en kilde kan baere ud over selve teksten. */
export interface Kildemetadata {
  /** Kun paa cases: fx "Case 16 (2025)". */
  caseId?: string;
  /** Kildens egen titel, fx casens overskrift eller kapitlets navn. */
  titel?: string;
  /** Forfatterlinjen ordret fra kilden. */
  forfattere?: string;
  /** Afdeling/hospital casen kommer fra. */
  institution?: string;
}

/** Et billede der hoerer til et kildeafsnit — en illustration, ikke et svar. */
export interface Billede {
  url: string;
  /** Alt-tekst eller billedtekst fra kilden. Kan vaere tom. */
  tekst: string;
}

export interface Afsnit extends Kildemetadata {
  /** Stabilt id, fx "brandsaar:04". Bruges af vaerktoejet hent_kildeafsnit. */
  id: string;
  samling: KildeSamling;
  kildetype: Kildetype;
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
  /**
   * Illustrationerne i afsnittet, udtrukket af markdown'en.
   *
   * De indekseres bevidst IKKE: et uddrag der kun er et billede-link scorer
   * hoejest paa praecis den soegning man stiller (alt-teksten er ofte kapitlets
   * titel) og ville svare med et billede i stedet for et klinisk udsagn.
   * Billederne naas derfor kun gennem et afsnit man allerede har fundet —
   * de supplerer et svar, de erstatter det aldrig.
   */
  billeder: Billede[];
}

export interface Uddrag extends Kildemetadata {
  /** Stabilt id, fx "brandsaar:04#2". */
  id: string;
  afsnitId: string;
  samling: KildeSamling;
  kildetype: Kildetype;
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

/**
 * Kildenavne.
 *
 * Navnet her er det en laege ser citeret i et klinisk svar — i
 * `soeg_klinisk_viden`, i `hent_kildeafsnit`, i `list_kilder` og i CoSurg-appens
 * `/guide` og `/pitfalls`. Derfor navngiver vi den institution eller platform
 * der staar bag, ikke den fil teksten tilfaeldigvis blev udtrukket af: et
 * filnavn som "Burns plast surgeon.docx" underminerer det svar det skulle
 * baere.
 *
 * To regler gaelder for hvert navn: det skal vaere SANDT (vi opgraderer ikke
 * en blog til en retningslinje), og det skal kunne EFTERPROEVES af den der
 * laeser det. Et navn der lyder autoritativt uden at vaere det er vaerre end
 * et filnavn.
 *
 * `list_kilder` viser kun stykket foer det foerste " — ", saa den bedste del
 * af navnet skal staa foerst.
 */
const SAMLINGER: Record<string, { samling: KildeSamling; titel: string; kildetype: Kildetype }> = {
  "brandsaar-dk.md": {
    samling: "brandsaar",
    titel:
      "Dansk Brandsaarsforening — klinisk vejledning om brandsaar (brandsaar.dk, " +
      "Rigshospitalets brandsaarsafdeling)",
    kildetype: "retningslinje",
  },
  "magnus-materiale.md": {
    samling: "magnus",
    titel:
      "Rigshospitalet, Klinik for Plastikkirurgi og Brandsaarsbehandling — klinisk kompendium " +
      "og forbindingsvejledning (Afsnit 6052)",
    kildetype: "retningslinje",
  },
  "plastsurgeon-brandsaar.md": {
    samling: "plastsurgeon",
    titel: "PlastSurgeon — Validated expert platform (beta.plastsurgeon.com)",
    kildetype: "retningslinje",
  },
  "plastsurgeon-haandbog.md": {
    samling: "plastsurgeon",
    titel: "PlastSurgeon — Validated expert platform (beta.plastsurgeon.com)",
    kildetype: "retningslinje",
  },
  // Kursusmodulerne har ingen egen fil, og det er et resultat, ikke en mangel:
  // de 11 `/courses/burns-*`-moduler er tomme i platformens database (nul
  // lektioner, nul HTML, nul beskrivelse) — der laa intet bag betalingsmuren.
  // De kurser der HAR indhold (massive-weight-loss x6) er ordret de samme sider
  // som haandbogen allerede indeholder: 35 af 42 lektioner matcher tegn for tegn
  // og alle 42 titler matcher. Et separat kursusdokument ville lade hvert af de
  // udsagn fylde to pladser i et soegeresultat.
  // Case competition-bidragene er patientforloeb, ikke retningslinjer. De ligger
  // i deres egen fil netop derfor — laa de i haandbogsfilen, ville de blive
  // maerket som retningslinje, og en laege kunne ikke se forskel paa svaret.
  "plastsurgeon-cases.md": {
    samling: "plastsurgeon",
    titel: "PlastSurgeon — Validated expert platform (beta.plastsurgeon.com)",
    kildetype: "case",
  },
  "jpbrs-cases.md": {
    samling: "jpbrs",
    titel:
      "Journal of Plastic, Breast & Reconstructive Surgery (JPBRS) — peer-reviewed, open access " +
      "kliniske cases",
    kildetype: "case",
  },
  // Kildenavnet er fastlagt og skal staa ordret: alle VIP-dokumenter baerer det
  // samme navn, og det enkelte dokuments egen titel hoerer hjemme i TITEL-feltet.
  "vip-rigshospitalet.md": {
    samling: "vip",
    titel: "VIP Guideline Rigshospitalet Copenhagen",
    kildetype: "retningslinje",
  },
};

/** Metadata-linjer der maa staa lige under en `## KILDE:`-linje. */
const METADATAFELTER: Record<string, keyof Kildemetadata> = {
  "CASE-ID": "caseId",
  TITEL: "titel",
  FORFATTERE: "forfattere",
  INSTITUTION: "institution",
};

/** Hoejeste laengde paa et uddrag foer vi deler det yderligere. */
const MAKS_UDDRAG_TEGN = 1400;

function erUrl(s: string): boolean {
  return /^https?:\/\//i.test(s);
}

/** Plukker `![alt](url)` ud af markdown. Kun http(s) — lokale stier kan ikke vises. */
function udtraekBilleder(markdown: string): Billede[] {
  const ud: Billede[] = [];
  const set = new Set<string>();
  const m = /!\[([^\]]*)\]\((https?:\/\/[^)\s]+)\)/g;
  let t: RegExpExecArray | null;
  while ((t = m.exec(markdown)) !== null) {
    const url = t[2] ?? "";
    if (url === "" || set.has(url)) continue;
    set.add(url);
    ud.push({ url, tekst: (t[1] ?? "").trim() });
  }
  return ud;
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
  const meta = SAMLINGER[dokument] ?? {
    samling: "ukendt" as const,
    titel: dokument,
    kildetype: "retningslinje" as const,
  };
  const linjer = indhold.split(/\r?\n/);
  const afsnit: Afsnit[] = [];

  let aktuelKilde: string | null = null;
  let buffer: string[] = [];
  let kildemeta: Kildemetadata = {};

  const luk = () => {
    if (aktuelKilde === null) return;
    const tekst = buffer.join("\n").trim();
    if (tekst !== "") {
      const nr = String(afsnit.length).padStart(2, "0");
      afsnit.push({
        id: `${meta.samling}:${nr}`,
        samling: meta.samling,
        kildetype: meta.kildetype,
        dokument,
        samlingsTitel: meta.titel,
        kilde: aktuelKilde,
        kildeErUrl: erUrl(aktuelKilde),
        ...kildemeta,
        tekst,
        billeder: udtraekBilleder(tekst),
      });
    }
    buffer = [];
    kildemeta = {};
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

    // Metadata-linjer opsamles som felter — men bliver staaende i teksten, saa
    // en soegning paa fx et forfatternavn eller en casetitel ogsaa rammer.
    const md = /^([A-Z][A-Z-]+):\s*(.+?)\s*$/.exec(linje);
    const felt = md ? METADATAFELTER[md[1] ?? ""] : undefined;
    if (md && felt !== undefined) kildemeta[felt] = md[2] ?? "";

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
      // Et uddrag der kun er et billede-link er ubrugeligt som svar — og farligt,
      // fordi alt-teksten ofte er casens eller kapitlets titel og derfor scorer
      // hoejt paa praecis den soegning man stiller. Billederne bliver staaende i
      // de uddrag der ogsaa har broedtekst.
      const proza = rent.replace(/!\[[^\]]*\]\([^)]*\)/g, " ").replace(/\s+/g, " ").trim();
      if (proza.length < 40) continue;
      uddrag.push({
        id: `${a.id}#${uddrag.length}`,
        afsnitId: a.id,
        samling: a.samling,
        kildetype: a.kildetype,
        dokument: a.dokument,
        samlingsTitel: a.samlingsTitel,
        kilde: a.kilde,
        kildeErUrl: a.kildeErUrl,
        ...(a.caseId !== undefined ? { caseId: a.caseId } : {}),
        ...(a.titel !== undefined ? { titel: a.titel } : {}),
        ...(a.forfattere !== undefined ? { forfattere: a.forfattere } : {}),
        ...(a.institution !== undefined ? { institution: a.institution } : {}),
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
  const caseDel = x.caseId !== undefined ? ` — ${x.caseId}` : "";
  const titelDel = x.titel !== undefined ? `: "${x.titel}"` : "";
  return `${x.samlingsTitel}${caseDel}${titelDel} — ${x.kilde}${sti}`;
}

/**
 * Én linje der fortaeller laeseren hvad slags viden traefferen er.
 * En case er evidens fra ét forloeb — den maa aldrig laeses som en anbefaling.
 */
export function kildetypeEtiket(k: Kildetype): string {
  return k === "case"
    ? "KLINISK CASE — ét peer-reviewed patientforloeb. Beskriver hvad der blev gjort for én patient, ikke hvad der generelt anbefales."
    : "RETNINGSLINJE/HAANDBOG — generel klinisk anvisning.";
}

/** Talt oversigt over vidensbasen pr. samling og kildetype. */
export function optaelling(v: Videnbase): {
  samlinger: { samling: KildeSamling; kildetype: Kildetype; afsnit: number; uddrag: number }[];
  cases: number;
} {
  const kort = new Map<string, { samling: KildeSamling; kildetype: Kildetype; afsnit: number; uddrag: number }>();
  for (const a of v.afsnit) {
    const noegle = `${a.samling}|${a.kildetype}`;
    const post = kort.get(noegle) ?? { samling: a.samling, kildetype: a.kildetype, afsnit: 0, uddrag: 0 };
    post.afsnit += 1;
    kort.set(noegle, post);
  }
  for (const u of v.uddrag) {
    const post = kort.get(`${u.samling}|${u.kildetype}`);
    if (post) post.uddrag += 1;
  }
  return {
    samlinger: [...kort.values()],
    cases: v.afsnit.filter((a) => a.kildetype === "case").length,
  };
}
