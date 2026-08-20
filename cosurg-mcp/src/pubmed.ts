/**
 * PubMed via NCBI E-utilities (frit API, ingen noegle kraevet).
 *
 * Reglen for dette vaerktoej er den samme som for resten af serveren: vi
 * returnerer aldrig en paastand uden reference. Hvert resultat baerer PMID,
 * titel, aar, tidsskrift og et link — og findes der intet, siger vi det.
 */

import { konfiguration } from "./konfiguration.js";

export interface PubmedArtikel {
  pmid: string;
  titel: string;
  aar: string | null;
  tidsskrift: string | null;
  forfattere: string[];
  publikationstyper: string[];
  doi: string | null;
  url: string;
}

export interface PubmedSoegeresultat {
  forespoergsel: string;
  /** Den forespoergsel PubMed rent faktisk koerte efter sin egen oversaettelse. */
  oversatForespoergsel: string | null;
  antalIalt: number;
  artikler: PubmedArtikel[];
}

function basisParametre(): URLSearchParams {
  const p = new URLSearchParams();
  p.set("tool", konfiguration.pubmedVaerktoej);
  p.set("email", konfiguration.pubmedEmail);
  if (konfiguration.pubmedApiNoegle !== "") p.set("api_key", konfiguration.pubmedApiNoegle);
  return p;
}

/**
 * NCBI tillader 3 kald/sekund uden API-noegle (10 med). En agent der kalder i
 * byger rammer loftet og faar 429. Vi proever igen med voksende ventetid frem
 * for at melde "ingen litteratur" paa et rent rate-limit.
 */
async function hentMedGentagelse(sti: string, parametre: URLSearchParams, accept: string): Promise<Response> {
  const url = `${konfiguration.pubmedBasis}/${sti}?${parametre.toString()}`;
  let sidsteFejl: Error | null = null;

  for (let forsoeg = 0; forsoeg < 3; forsoeg += 1) {
    if (forsoeg > 0) {
      await new Promise((r) => setTimeout(r, 400 * 2 ** (forsoeg - 1)));
    }
    try {
      const svar = await fetch(url, {
        signal: AbortSignal.timeout(konfiguration.pubmedTimeoutMs),
        headers: { Accept: accept },
      });
      if (svar.ok) return svar;
      if (svar.status === 429 || svar.status >= 500) {
        sidsteFejl = new Error(`PubMed svarede ${svar.status} ${svar.statusText} paa ${sti}`);
        continue;
      }
      throw new Error(`PubMed svarede ${svar.status} ${svar.statusText} paa ${sti}`);
    } catch (e) {
      // Timeout og netvaerksfejl er ogsaa vaerd at proeve igen; andet kastes videre.
      if (e instanceof Error && (e.name === "TimeoutError" || e.name === "AbortError")) {
        sidsteFejl = e;
        continue;
      }
      throw e;
    }
  }
  throw sidsteFejl ?? new Error(`PubMed-kaldet til ${sti} fejlede`);
}

async function hentJson(sti: string, parametre: URLSearchParams): Promise<unknown> {
  const svar = await hentMedGentagelse(sti, parametre, "application/json");
  return (await svar.json()) as unknown;
}

async function hentTekst(sti: string, parametre: URLSearchParams): Promise<string> {
  const svar = await hentMedGentagelse(sti, parametre, "text/plain");
  return await svar.text();
}

function somTekst(v: unknown): string | null {
  return typeof v === "string" && v.trim() !== "" ? v.trim() : null;
}

function udtraekAar(post: Record<string, unknown>): string | null {
  const dato = somTekst(post["pubdate"]) ?? somTekst(post["epubdate"]) ?? somTekst(post["sortpubdate"]);
  if (dato === null) return null;
  const m = /(\d{4})/.exec(dato);
  return m?.[1] ?? null;
}

/** esearch + esummary. Returnerer altid en liste (evt. tom), aldrig et gaet. */
export async function soegPubmed(
  forespoergsel: string,
  valg: { antal?: number; aarFra?: number; kunReviews?: boolean } = {},
): Promise<PubmedSoegeresultat> {
  const antal = Math.min(Math.max(valg.antal ?? 5, 1), 20);

  let term = forespoergsel.trim();
  if (valg.kunReviews) term += " AND (review[Publication Type] OR systematic[sb])";
  if (valg.aarFra !== undefined) term += ` AND ("${valg.aarFra}"[Date - Publication] : "3000"[Date - Publication])`;

  const soegParametre = basisParametre();
  soegParametre.set("db", "pubmed");
  soegParametre.set("retmode", "json");
  soegParametre.set("retmax", String(antal));
  soegParametre.set("sort", "relevance");
  soegParametre.set("term", term);

  const soegSvar = (await hentJson("esearch.fcgi", soegParametre)) as {
    esearchresult?: { idlist?: string[]; count?: string; querytranslation?: string };
  };
  const idListe = soegSvar.esearchresult?.idlist ?? [];
  const antalIalt = Number(soegSvar.esearchresult?.count ?? "0");
  const oversat = somTekst(soegSvar.esearchresult?.querytranslation);

  if (idListe.length === 0) {
    return { forespoergsel: term, oversatForespoergsel: oversat, antalIalt, artikler: [] };
  }

  const opsummerParametre = basisParametre();
  opsummerParametre.set("db", "pubmed");
  opsummerParametre.set("retmode", "json");
  opsummerParametre.set("id", idListe.join(","));

  const opsummerSvar = (await hentJson("esummary.fcgi", opsummerParametre)) as {
    result?: Record<string, unknown>;
  };
  const resultat = opsummerSvar.result ?? {};

  const artikler: PubmedArtikel[] = [];
  for (const pmid of idListe) {
    const post = resultat[pmid] as Record<string, unknown> | undefined;
    if (!post) continue;
    const forfattere = Array.isArray(post["authors"])
      ? (post["authors"] as { name?: string }[]).map((a) => a.name ?? "").filter((s) => s !== "")
      : [];
    const idListeFraPost = Array.isArray(post["articleids"])
      ? (post["articleids"] as { idtype?: string; value?: string }[])
      : [];
    const doi = idListeFraPost.find((i) => i.idtype === "doi")?.value ?? null;

    artikler.push({
      pmid,
      titel: somTekst(post["title"]) ?? "(uden titel)",
      aar: udtraekAar(post),
      // Bogkapitler (fx StatPearls) har ingen tidsskriftsfelter — brug bogtitlen.
      tidsskrift:
        somTekst(post["fulljournalname"]) ??
        somTekst(post["source"]) ??
        somTekst(post["booktitle"]) ??
        somTekst(post["publishername"]),
      forfattere,
      publikationstyper: Array.isArray(post["pubtype"]) ? (post["pubtype"] as string[]) : [],
      doi,
      url: `https://pubmed.ncbi.nlm.nih.gov/${pmid}/`,
    });
  }

  return { forespoergsel: term, oversatForespoergsel: oversat, antalIalt, artikler };
}

export interface PubmedAbstrakt {
  pmid: string;
  url: string;
  /** MEDLINE-formateret post fra efetch. Ordret fra NCBI, ikke omskrevet. */
  tekst: string;
}

/** efetch i MEDLINE-format. Én artikel pr. PMID; ukendte PMID'er udelades af NCBI. */
export async function hentPubmedAbstrakter(pmids: readonly string[]): Promise<PubmedAbstrakt[]> {
  const rene = pmids.map((p) => p.trim()).filter((p) => /^\d+$/.test(p)).slice(0, 10);
  if (rene.length === 0) return [];

  const parametre = basisParametre();
  parametre.set("db", "pubmed");
  parametre.set("rettype", "abstract");
  parametre.set("retmode", "text");
  parametre.set("id", rene.join(","));

  const raa = await hentTekst("efetch.fcgi", parametre);
  // efetch adskiller poster med en tom linje efterfulgt af "PMID: ..."-blokke.
  const dele = raa.split(/\n(?=\s*\d+\.\s)/).map((d) => d.trim()).filter((d) => d !== "");

  const ud: PubmedAbstrakt[] = [];
  for (const del of dele) {
    const m = /PMID:\s*(\d+)/.exec(del);
    const pmid = m?.[1];
    if (!pmid) continue;
    ud.push({ pmid, url: `https://pubmed.ncbi.nlm.nih.gov/${pmid}/`, tekst: del });
  }

  // Faldt opdelingen fra hinanden (ét samlet svar), returnér den raa tekst mod foerste PMID.
  if (ud.length === 0 && raa.trim() !== "") {
    const pmid = rene[0] as string;
    ud.push({ pmid, url: `https://pubmed.ncbi.nlm.nih.gov/${pmid}/`, tekst: raa.trim() });
  }
  return ud;
}
