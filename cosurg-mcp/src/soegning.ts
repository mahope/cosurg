/**
 * Tekstsoegning over vidensbasen — BM25 med dansk normalisering.
 *
 * Ingen vektordatabase og ingen embeddings. Vidensbasen er ~166 KB tekst; en
 * BM25-indeksering i hukommelsen svarer paa under et millisekund og har den
 * egenskab der betyder noget her: den kan ikke hallucinere. Et resultat er
 * altid et ordret uddrag med sin kilde, eller ogsaa er der intet resultat.
 */

import type { Uddrag } from "./videnbase.js";

/**
 * Danske klinikere skriver "ætsning", "aetsning" og "AETSNING" om det samme.
 * Vi folder alt ned til én form saa alle tre matcher hinanden.
 */
export function normaliser(tekst: string): string {
  return tekst
    .toLowerCase()
    .normalize("NFC")
    .replace(/æ/g, "ae")
    .replace(/ø/g, "oe")
    .replace(/å/g, "aa")
    .replace(/ä/g, "ae")
    .replace(/ö/g, "oe")
    .replace(/[éèê]/g, "e")
    .replace(/[áàâ]/g, "a")
    .replace(/ü/g, "u");
}

/** Danske stopord — de bidrager stoej, ikke betydning. */
const STOPORD = new Set(
  [
    "og", "i", "at", "det", "en", "den", "til", "er", "som", "paa", "de", "med", "af",
    "for", "ikke", "der", "var", "et", "har", "men", "om", "hun", "han", "kan", "vil",
    "skal", "ved", "eller", "fra", "du", "jeg", "vi", "man", "saa", "naar", "hvis",
    "the", "a", "an", "of", "to", "in", "is", "are", "and", "or", "for", "on", "with",
    "be", "by", "that", "this", "it", "as", "at", "from", "can", "should", "will",
  ].map(normaliser),
);

/**
 * Meget let dansk/engelsk suffiksafkortning. Vi stemmer forsigtigt: maalet er at
 * "forbraendinger" og "forbraending" moedes, ikke at bygge en fuld stemmer.
 */
function stam(ord: string): string {
  if (ord.length <= 4) return ord;
  for (const suffiks of ["ernes", "erne", "ende", "erns", "ers", "ene", "ens", "er", "en", "et", "es", "s"]) {
    if (ord.length - suffiks.length >= 4 && ord.endsWith(suffiks)) {
      return ord.slice(0, ord.length - suffiks.length);
    }
  }
  return ord;
}

export function tokeniser(tekst: string): string[] {
  const ud: string[] = [];
  for (const raa of normaliser(tekst).split(/[^a-z0-9%.]+/)) {
    const ord = raa.replace(/^\.+|\.+$/g, "");
    if (ord === "" || ord.length < 2) continue;
    if (STOPORD.has(ord)) continue;
    ud.push(stam(ord));
  }
  return ud;
}

export interface Traeffer {
  uddrag: Uddrag;
  score: number;
  /** Hvilke af soegeordene der faktisk findes i uddraget. */
  matchedeOrd: string[];
}

interface Dokument {
  uddrag: Uddrag;
  /** Ordfrekvenser i broedtekst + overskrifter. */
  frekvenser: Map<string, number>;
  laengde: number;
  /** Normaliseret fuldtekst inkl. overskrifter, til fraseboost. */
  normaliseret: string;
}

const K1 = 1.4;
const B = 0.72;
/** Overskrifter vejer tungere end broedtekst — de navngiver emnet. */
const OVERSKRIFT_VAEGT = 3;

export class Soegeindeks {
  private readonly dokumenter: Dokument[] = [];
  private readonly dokFrekvens = new Map<string, number>();
  private readonly gennemsnitsLaengde: number;

  constructor(uddrag: readonly Uddrag[]) {
    let sum = 0;
    for (const u of uddrag) {
      const ord = [
        ...tokeniser(u.tekst),
        ...Array.from({ length: OVERSKRIFT_VAEGT }).flatMap(() => tokeniser(u.overskrifter.join(" "))),
      ];
      const frekvenser = new Map<string, number>();
      for (const o of ord) frekvenser.set(o, (frekvenser.get(o) ?? 0) + 1);
      for (const o of frekvenser.keys()) {
        this.dokFrekvens.set(o, (this.dokFrekvens.get(o) ?? 0) + 1);
      }
      sum += ord.length;
      this.dokumenter.push({
        uddrag: u,
        frekvenser,
        laengde: ord.length,
        normaliseret: normaliser(`${u.overskrifter.join(" ")} ${u.tekst}`),
      });
    }
    this.gennemsnitsLaengde = uddrag.length > 0 ? sum / uddrag.length : 1;
  }

  get antalUddrag(): number {
    return this.dokumenter.length;
  }

  /**
   * BM25-soegning. `filter` bruges til at begraense til én samling.
   * Resultater under `mindsteScore` frasorteres — det er dér "vi ved det ikke"
   * bliver et aerligt svar i stedet for et daarligt.
   *
   * Ud over scoren kraeves en mindste *daekning*: et uddrag skal ramme mindst
   * halvdelen af soegningens forskellige ord. Uden den regel kan ét tilfaeldigt
   * ordsammenfald slaa igennem — en soegning paa "kolorektal anastomoselaekage
   * stapler" ramte overskriften "Staples" i hudtransplantationsafsnittet og fik
   * en hoej score, fordi overskrifter vejer tungt og uddraget var kort. Svaret
   * var ikke opdigtet, men det var irrelevant, og det er lige saa skadeligt naar
   * det leveres i stedet for "vi har ingen daekning".
   */
  soeg(
    forespoergsel: string,
    valg: { antal?: number; filter?: (u: Uddrag) => boolean; mindsteScore?: number } = {},
  ): Traeffer[] {
    const antal = valg.antal ?? 5;
    const mindsteScore = valg.mindsteScore ?? 1.0;
    const soegeord = tokeniser(forespoergsel);
    if (soegeord.length === 0) return [];
    const forskellige = new Set(soegeord).size;
    const mindsteDaekning = Math.max(1, Math.ceil(forskellige / 2));

    const frase = normaliser(forespoergsel).trim();
    const brugFrase = frase.length >= 6 && frase.includes(" ");
    const N = this.dokumenter.length;
    const resultater: Traeffer[] = [];

    for (const dok of this.dokumenter) {
      if (valg.filter && !valg.filter(dok.uddrag)) continue;

      let score = 0;
      const matchede: string[] = [];
      for (const ord of new Set(soegeord)) {
        const tf = dok.frekvenser.get(ord);
        if (!tf) {
          // Delvist praefiks-match fanger sammensatte danske ord
          // ("inhalationsskade" naar der soeges paa "inhalation").
          let delvis = 0;
          for (const [kandidat, n] of dok.frekvenser) {
            if (kandidat.length > ord.length && kandidat.startsWith(ord)) delvis += n;
          }
          if (delvis === 0) continue;
          const df = this.dokFrekvens.get(ord) ?? 1;
          const idf = Math.log(1 + (N - df + 0.5) / (df + 0.5));
          score += 0.6 * idf * (delvis / (delvis + K1));
          matchede.push(ord);
          continue;
        }
        const df = this.dokFrekvens.get(ord) ?? 1;
        const idf = Math.log(1 + (N - df + 0.5) / (df + 0.5));
        const maetning =
          (tf * (K1 + 1)) / (tf + K1 * (1 - B + (B * dok.laengde) / this.gennemsnitsLaengde));
        score += idf * maetning;
        matchede.push(ord);
      }

      if (score <= 0) continue;
      if (matchede.length < mindsteDaekning) continue;
      // Daekningsbonus: et uddrag der rammer alle soegeordene slaar ét der rammer ét.
      score *= 0.5 + 0.5 * (matchede.length / forskellige);
      // Fraseboost: staar hele soegestrengen ordret, er det naesten altid det rigtige svar.
      if (brugFrase && dok.normaliseret.includes(frase)) score *= 1.6;

      resultater.push({ uddrag: dok.uddrag, score, matchedeOrd: matchede });
    }

    return resultater
      .filter((r) => r.score >= mindsteScore)
      .sort((a, b) => b.score - a.score)
      .slice(0, antal);
  }
}

/**
 * Klipper et vindue ud omkring det bedste ordmatch, saa lange uddrag ikke
 * fylder agentens kontekst med irrelevant tekst. Klipper aldrig midt i et ord.
 */
export function uddragVindue(tekst: string, forespoergsel: string, maksTegn = 900): string {
  if (tekst.length <= maksTegn) return tekst;
  const norm = normaliser(tekst);
  const ord = tokeniser(forespoergsel);
  let bedste = -1;
  for (const o of ord) {
    const i = norm.indexOf(o);
    if (i !== -1 && (bedste === -1 || i < bedste)) bedste = i;
  }
  if (bedste === -1) return `${tekst.slice(0, maksTegn).trimEnd()} …`;

  let start = Math.max(0, bedste - Math.floor(maksTegn / 3));
  const mellemrum = tekst.indexOf(" ", start);
  if (start > 0 && mellemrum !== -1 && mellemrum - start < 40) start = mellemrum + 1;
  const slut = Math.min(tekst.length, start + maksTegn);
  return `${start > 0 ? "… " : ""}${tekst.slice(start, slut).trim()}${slut < tekst.length ? " …" : ""}`;
}
