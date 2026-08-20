import { FALDGRUBER, matchEmne, type Faldgrube } from "@/components/pitfalls/catalog";
import type { LoestFaldgrube } from "@/components/pitfalls/types";
import { AFSNIT, hoererTil } from "@/app/api/guide/sections";
import type { Lang } from "@/lib/tree/types";
import { filtrerRelevante, kildeEtiket, soegKliniskViden, type KildeUddrag } from "./mcp";
import type { ChatSource } from "./chat";

/**
 * Grundlaget under et chatsvar.
 *
 * Chatten er produktet, og indtil nu svarede den kun på det der blev spurgt om.
 * Vi HAR indholdet — elleve faldgruber med verificeret belæg, og en
 * behandlingsguide der deler et emne op i otte kliniske afsnit — men chatten
 * rørte ikke ved det. En læge der spørger hvordan han behandler en dyb dermal
 * forbrænding på hånden skal have behandlingen OG det der plejer at gå galt
 * netop dér, uden at han skal vide at han skulle spørge om det.
 *
 * Valget her er BEVIDST: grundlaget hentes af os og lægges ind i prompten, det
 * gives ikke til agenten som værktøjer den selv kan vælge at kalde. Tre grunde:
 *
 *   1. Et værktøj kan agenten lade være med at kalde. En faldgrube der kun
 *      nogle gange kommer med, er ikke en sikkerhedsfunktion.
 *   2. Hvert værktøjskald er endnu en rundtur oveni de 35-72 sekunder svaret
 *      allerede tager. Vores egne opslag tager 40-60 ms og kører parallelt.
 *   3. Provenienzen bliver vores. Vi ved at et uddrag kom fra vidensbasen, så
 *      vi kan mærke det `knowledge-base` selv — i stedet for at håbe at
 *      modellen mærker det rigtigt.
 *
 * Faldgruberne sendes desuden ud som deres egen begivenhed med det ORDRETTE
 * uddrag. De står altså ved siden af svaret med deres eget belæg, uafhængigt af
 * hvad modellen fandt på at skrive.
 */

/** Fire advarsler er en advarsel. Ti er en side man scroller forbi. */
const MAKS_FALDGRUBER = 4;

/** Så mange uddrag pr. afsnit i behandlingsgrundlaget. */
const UDDRAG_PR_AFSNIT = 2;

/* ------------------------------------------------------------------ */
/* Faldgruber                                                          */
/* ------------------------------------------------------------------ */

/**
 * Belæg én faldgrube.
 *
 * "Vi kunne ikke spørge" er ikke det samme som "der er ikke dækning", og
 * klinikeren skal kunne se forskel — så det skal typen også kunne.
 */
export async function loesFaldgrube(f: Faldgrube): Promise<LoestFaldgrube> {
  const fælles = { id: f.id, title: f.title, consequence: f.consequence, alvor: f.alvor, fase: f.fase };
  try {
    const svar = await soegKliniskViden(f.query, { antal: 3, fuldt: false });
    const relevante = filtrerRelevante(svar.uddrag);
    if (relevante.length === 0) return { ...fælles, evidence: null, coverage: "none" };
    return { ...fælles, evidence: relevante[0], coverage: "ok" };
  } catch {
    return { ...fælles, evidence: null, coverage: "error" };
  }
}

/** Belæg en liste faldgruber parallelt. */
export function loesFaldgruber(liste: Faldgrube[]): Promise<LoestFaldgrube[]> {
  return Promise.all(liste.map(loesFaldgrube));
}

/** Hele kataloget med belæg — det faldgrubesiden bladrer igennem. */
export function loesHeleKataloget(): Promise<LoestFaldgrube[]> {
  return loesFaldgruber(FALDGRUBER);
}

/**
 * Faldgruberne der gælder det lægen spørger om.
 *
 * Matchet sker på triagens `pitfallContext` — den kliniske situation, ikke hele
 * spørgsmålet — fordi et spørgsmål er fyldt med ord der ikke siger noget om
 * hvad der kan gå galt.
 */
export async function faldgruberTilEmne(tekst: string, maks = MAKS_FALDGRUBER): Promise<LoestFaldgrube[]> {
  const valgte = matchEmne(tekst, maks);
  if (valgte.length === 0) return [];
  return loesFaldgruber(valgte);
}

/* ------------------------------------------------------------------ */
/* Behandlingsgrundlag — guidens afsnit, men kun dem der har dækning   */
/* ------------------------------------------------------------------ */

export interface GrundlagsAfsnit {
  key: string;
  label: Record<Lang, string>;
  uddrag: KildeUddrag[];
}

/**
 * Hent behandlingsgrundlaget: guidens otte afsnit, søgt med lægens emne plus
 * afsnittets egne danske ord.
 *
 * Dette er en let udgave af `/api/guide`. Guiden er et opslagsværk man LÆSER og
 * bruger derfor to søgninger pr. afsnit og en ejerskabsfordeling så intet
 * gentages. Her skal grundlaget kun være godt nok til at agenten kan skrive et
 * dækkende svar, så én søgning pr. afsnit er nok — og halverer ventetiden.
 *
 * `hoererTil` er beholdt, for det er den prøve der forhindrer at "aflastende
 * incisioner" ender under *Smertebehandling*. Uden den ville grundlaget se
 * fyldigt ud og pege forkert.
 */
export async function behandlingsGrundlag(emneTermer: string): Promise<GrundlagsAfsnit[]> {
  const afsnit = await Promise.all(
    AFSNIT.map(async (a) => {
      const q = a.emneKun ? emneTermer : `${emneTermer} ${a.terms}`;
      try {
        const svar = await soegKliniskViden(q, { antal: 4, fuldt: true });
        const uddrag = filtrerRelevante(svar.uddrag)
          // Rene stubbe — en overskrift og en linje — rammer fint i en søgning
          // og siger ingenting i et svar.
          .filter((u) => u.tekst.length >= 200)
          .filter((u) => hoererTil(a, u.tekst, u.overskrifter))
          .slice(0, UDDRAG_PR_AFSNIT);
        return { key: a.key, label: a.label, uddrag };
      } catch {
        return { key: a.key, label: a.label, uddrag: [] as KildeUddrag[] };
      }
    }),
  );

  /*
   * Samme uddrag kan vinde i to afsnit. Et grundlag der gentager sig selv
   * bruger kontekstvindue på ingenting, så hvert uddrag beholdes kun første
   * gang det optræder — og rækkefølgen er den kliniske arbejdsgang, så det
   * første sted er også det rigtige sted.
   */
  const set = new Set<string>();
  return afsnit.map((a) => ({
    ...a,
    uddrag: a.uddrag.filter((u) => (set.has(u.id) ? false : (set.add(u.id), true))),
  }));
}

/* ------------------------------------------------------------------ */
/* Formatering til prompten                                            */
/* ------------------------------------------------------------------ */

/** Hvor meget af ét uddrag der kommer med. Nok til at citere, ikke nok til at fylde. */
const MAKS_UDDRAG_TEGN = 1_100;

function uddragsBlok(u: KildeUddrag): string {
  const tekst = u.tekst.length > MAKS_UDDRAG_TEGN ? `${u.tekst.slice(0, MAKS_UDDRAG_TEGN)}…` : u.tekst;
  return [`[${u.id}] ${kildeEtiket(u)}`, u.erUrl ? `URL: ${u.kilde}` : "", tekst].filter(Boolean).join("\n");
}

/** Uddrag → kilder, mærket som vidensbase fordi det er hvor de kom fra. */
export function somKilder(uddrag: KildeUddrag[]): ChatSource[] {
  return uddrag.map((u) => ({
    title: kildeEtiket(u),
    url: u.erUrl ? u.kilde : undefined,
    supports: "",
    origin: "knowledge-base" as const,
  }));
}

export interface Grundlag {
  /** Teksten der lægges ind i prompten. Tom hvis vi intet fandt. */
  blok: string;
  /** Alle uddrag der indgår — så kalderen kan mærke kilderne selv. */
  uddrag: KildeUddrag[];
  faldgruber: LoestFaldgrube[];
  /** Antal afsnit med dækning. 0 betyder at vores kilder ikke rækker. */
  daekkedeAfsnit: number;
}

/**
 * Byg grundlaget som ÉN blok tekst agenten kan læse.
 *
 * Blokken er skrevet som oplysninger, ikke som en opgave: den siger hvor hvert
 * uddrag kommer fra, og at alt der ikke står i den skal mærkes som ræsonnement.
 * Det er den regel der gør at et svar kan vejes bagefter — og et blandet svar
 * uden mærkat er farligere end intet svar.
 */
export function byggGrundlag(
  afsnit: GrundlagsAfsnit[],
  faldgruber: LoestFaldgrube[],
  lang: Lang,
): Grundlag {
  const uddrag = afsnit.flatMap((a) => a.uddrag);
  const medBelaeg = faldgruber.filter((f) => f.coverage === "ok" && f.evidence);

  const dele: string[] = [];

  if (uddrag.length > 0) {
    dele.push(
      "--- FROM OUR OWN KNOWLEDGE BASE (verbatim Danish clinical sources, already retrieved for you) ---",
      "Every excerpt below is a knowledge-base source. When you use one, list it in 'sources' with",
      "origin='knowledge-base', the title given, and the URL given. Do not re-search for what is already here.",
    );
    for (const a of afsnit) {
      if (a.uddrag.length === 0) continue;
      dele.push("", `## ${a.label[lang]}`, ...a.uddrag.map(uddragsBlok));
    }
  }

  if (medBelaeg.length > 0) {
    dele.push(
      "",
      "--- PITFALLS THAT APPLY HERE (curated by the plastic surgeons on this team, each backed by the excerpt shown) ---",
      "These are the mistakes actually made in this situation. WEAVE THE RELEVANT ONES INTO YOUR ANSWER",
      "as part of the clinical advice — not as a warning list at the end, and not only if asked.",
      "A pitfall you leave out because the clinician did not ask for it is the one that costs the patient.",
      "Each is backed by the excerpt under it: cite that excerpt as a knowledge-base source when you use it.",
    );
    for (const f of medBelaeg) {
      dele.push(
        "",
        `- ${f.title[lang]} (${f.alvor === "critical" ? "critical" : "important"}): ${f.consequence[lang]}`,
        f.evidence ? `  ${uddragsBlok(f.evidence).replace(/\n/g, "\n  ")}` : "",
      );
    }
    uddrag.push(...medBelaeg.map((f) => f.evidence).filter((u): u is KildeUddrag => !!u));
  }

  return {
    blok: dele.filter((d) => d !== undefined).join("\n"),
    uddrag,
    faldgruber,
    daekkedeAfsnit: afsnit.filter((a) => a.uddrag.length > 0).length,
  };
}
