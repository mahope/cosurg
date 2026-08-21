import { readFileSync } from "node:fs";
import path from "node:path";
import { getNode } from "@/lib/tree/engine";
import type { AnsweredStep, DecisionTree } from "@/lib/tree/types";
import { beregnParkland, foersteTal } from "./anamnese";

/**
 * Epic-klart journalnotat: Rigshospitalets AOP-skabelon, udfyldt DETERMINISTISK.
 *
 * Dette er RESERVEVEJEN. Den primære udfyldning er nu modellens
 * (`epicUdtraek.ts`): den skriver hele notatet og passerer en deterministisk
 * token-vagt der afviser output hvor bare én Epic-kode er ændret. Fejler
 * modellen eller vagten, bygger DENNE fil notatet præcis som før — ren kode,
 * ingen model, ingen overraskelser. Reglerne her er mekaniske:
 *
 *   1. Epic-koder (@...@ og {...}) bevares ORDRET. Hvor udredningen kender
 *      værdien bag en kode, føjes den til i klammer — "[fra udredningen: …]" —
 *      så lægen ser begge dele og koden stadig auto-udfyldes.
 *   2. `***` erstattes KUN med noget udredningen faktisk har svaret. Alt andet
 *      bliver stående som `***` til lægen. Et *** er ærligt; et gæt er farligt.
 *   3. Betingede blokke (DM-ordinationerne, tourniquet-incisionerne,
 *      børnevaccinationen) er kun med når udredningen har fundet tilstanden.
 *   4. Parkland beregnes i kode (3 ml × kg × TBSA%) og citeres med kilde —
 *      modellen får aldrig lov at regne.
 *
 * Hver udfyldning sporer tilbage til et navngivet workup-svar; `udfyldte`
 * fortæller UI'et præcis hvilke felter der kom fra udredningen.
 */

export interface EpicNoteInput {
  /** Null når notatet bygges fra rå samtale alene — uden træ er stien tom. */
  tree: DecisionTree | null;
  path: AnsweredStep[];
  anamnese: Record<string, string>;
}

/** Et klinisk vigtigt hul i notatet, formuleret som et spørgsmål lægen kan besvare. */
export interface ManglendeFelt {
  felt: string;
  spoergsmaal: string;
}

export interface EpicNoteResultat {
  note: string;
  /** Hvilke felter udredningen kunne udfylde — til visning og fejlsøgning. */
  udfyldte: string[];
  /** Betingede blokke der blev udeladt fordi tilstanden ikke er fundet. */
  udeladteBlokke: string[];
  /** Antal ***-felter der stadig venter på lægen. */
  aabneFelter: number;
  parkland: ReturnType<typeof beregnParkland>;
  /** Hvem udfyldte: modellen (token-valideret) eller den deterministiske reserve. */
  kilde: "model" | "deterministisk";
  /** De 2-4 klinisk vigtigste huller, klar til at spørge lægen om. Additivt. */
  manglende?: ManglendeFelt[];
}

export function laesSkabelon(): string {
  return readFileSync(path.join(process.cwd(), "content", "templates", "aop-brandsaar.txt"), "utf8");
}

/** Dansk etiket for et besvaret trin — "scald" bliver "Skoldning". */
function label(tree: DecisionTree | null, s: AnsweredStep | undefined): string | null {
  if (!s) return null;
  if (!tree) return s.value;
  const node = getNode(tree, s.nodeId);
  return node?.options?.find((o) => o.value === s.value)?.label.da ?? s.value;
}

const GRAD: Record<string, string> = {
  epidermal: "1",
  "superficial-dermal": "2",
  "deep-dermal": "2",
  "full-thickness": "3",
};

const DM_MOENSTER = /diabetes|\bdm\b|\bdm2\b|metformin|novorapid|insulin/i;

export function byggEpicNote({ tree, path: sti, anamnese }: EpicNoteInput): EpicNoteResultat {
  let note = laesSkabelon();
  const udfyldte: string[] = [];
  const udeladteBlokke: string[] = [];

  const svar = new Map(sti.map((s) => [s.nodeId, s]));
  const mekanisme = label(tree, svar.get("mechanism"));
  const inhalation = svar.get("inhalation")?.value; // "yes"/"no"
  const tbsa = svar.get("tbsa")?.value ?? foersteTal(anamnese.tbsaRegions)?.toString() ?? null;
  const dybdeSvar = svar.get("depth");
  const dybde = label(tree, dybdeSvar);
  const grad = dybdeSvar ? GRAD[dybdeSvar.value] ?? null : null;
  const cirkulaer = svar.get("circumferential")?.value;
  const skyllet = svar.get("cooled")?.value;
  const lokalisation = label(tree, svar.get("location"));

  /** Erstat første forekomst af et anker — og bogfør hvad der blev udfyldt. */
  const erstat = (felt: string, anker: string, nyt: string | null) => {
    if (!nyt || !note.includes(anker)) return;
    note = note.replace(anker, nyt);
    udfyldte.push(felt);
  };

  /* --- Indledning --- */
  erstat(
    "tidligere sygdomme",
    "tidligere ***,",
    anamnese.priorConditions ? `tidligere ${anamnese.priorConditions},` : null,
  );
  erstat("TBSA (indledning)", "indlægges med *** % Brandsår", tbsa ? `indlægges med ${tbsa} % Brandsår` : null);
  erstat(
    "mekanisme",
    "{RHPBBbrandmekanisme:92534},",
    mekanisme ? `{RHPBBbrandmekanisme:92534} [fra udredningen: ${mekanisme}],` : null,
  );
  erstat(
    "ulykkessted",
    "{RHPBBUlykkessted:33508}",
    anamnese.accidentSite ? `{RHPBBUlykkessted:33508} [fra udredningen: ${anamnese.accidentSite}]` : null,
  );
  erstat("aktivitet", "i forbindelse med ***.", anamnese.activity ? `i forbindelse med ${anamnese.activity}.` : null);
  erstat("skadestidspunkt", "Ulykkestid tid og dato ***.", anamnese.injuryTime ? `Ulykkestid tid og dato: ${anamnese.injuryTime}.` : null);

  /* --- Skadested/transport + inhalation --- */
  erstat(
    "skyllet",
    "Skyllet med det samme {absent/present:44040}",
    skyllet ? `Skyllet med det samme {absent/present:44040} [fra udredningen: ${skyllet === "yes" ? "Ja" : "Nej"}]` : null,
  );
  erstat(
    "inhalationsskade",
    "Inhalationsskade: {RHPBBinhalationsskade (Valgfri):33519}",
    inhalation
      ? `Inhalationsskade: {RHPBBinhalationsskade (Valgfri):33519} [fra udredningen: ${
          inhalation === "yes" ? "Mistanke" : "Ingen mistanke"
        }]`
      : null,
  );

  /* --- CAVE, tidligere, medicin, alkohol/tobak/socialt --- */
  erstat("CAVE", "@CAVE@", anamnese.cave ? `@CAVE@\nFra udredningen: ${anamnese.cave}` : null);
  erstat(
    "tidligere (afsnit)",
    "@ANAMNESE@",
    anamnese.priorConditions ? `@ANAMNESE@\nFra udredningen: ${anamnese.priorConditions}` : null,
  );
  erstat(
    "medicin",
    "@FMKAKTUELMEDICINHENV@",
    anamnese.medications ? `@FMKAKTUELMEDICINHENV@\nFra udredningen: ${anamnese.medications}` : null,
  );
  erstat("alkohol", "@ALKHIST@", anamnese.alcohol ? `@ALKHIST@\nFra udredningen: ${anamnese.alcohol}` : null);
  erstat("tobak", "@HISTOBAK@", anamnese.tobacco ? `@HISTOBAK@\nFra udredningen: ${anamnese.tobacco}` : null);
  erstat(
    "socialt",
    "Bor med ***,",
    anamnese.social ? `Bor med ***, Fra udredningen: ${anamnese.social}.` : null,
  );

  /* --- Børnevaccination: kun med når den faktisk er oplyst --- */
  if (anamnese.childVaccination) {
    erstat(
      "børnevaccination",
      "Følger børnevaccinationsprogrammet: {absent/present:44040}",
      `Følger børnevaccinationsprogrammet: {absent/present:44040} [fra udredningen: ${anamnese.childVaccination}]`,
    );
  } else {
    note = note.replace("Følger børnevaccinationsprogrammet: {absent/present:44040}\n", "");
    udeladteBlokke.push("børnevaccination");
  }

  /* --- Aktuelle: deterministisk resumé af det udredningen ved --- */
  const aktuelle = [
    mekanisme,
    anamnese.injuryTime ? `skadestidspunkt ${anamnese.injuryTime}` : null,
    lokalisation ? `lokalisation: ${lokalisation}` : null,
    tbsa ? `ca. ${tbsa} % TBSA` : null,
    skyllet === "yes" ? "skyllet med det samme" : skyllet === "no" ? "ikke skyllet" : null,
  ]
    .filter(Boolean)
    .join(", ");
  erstat("aktuelle", "Aktuelle\n***", aktuelle ? `Aktuelle\n${aktuelle}.` : null);

  /* --- Objektivt --- */
  const hoejde = foersteTal(anamnese.height);
  const vaegt = foersteTal(anamnese.weight);
  erstat("højde", "Højde *** cm", hoejde ? `Højde ${hoejde} cm` : null);
  erstat("vægt", "Vægt: *** kg", vaegt ? `Vægt: ${vaegt} kg` : null);

  /* --- Hud / arealberegner --- */
  erstat(
    "areal pr. region",
    "Arealberegner udfyldt:",
    anamnese.tbsaRegions ? `Arealberegner udfyldt:\nFra udredningen: ${anamnese.tbsaRegions}` : null,
  );
  erstat("TBSA (i alt)", "I alt  ***% af TSBA", tbsa ? `I alt  ${tbsa}% af TSBA` : null);
  erstat("forbrændingsgrad", "Forbrændingsgrad ***", dybde ? `Forbrændingsgrad: ${dybde}` : null);
  erstat(
    "cirkulær",
    "Cirkulære forbrændinger ***",
    cirkulaer ? `Cirkulære forbrændinger: ${cirkulaer === "yes" ? "Ja" : "Nej"}` : null,
  );

  /* --- Konklusion --- */
  erstat("kendt med", "kendt med *** indlægges", anamnese.priorConditions ? `kendt med ${anamnese.priorConditions} indlægges` : null);
  erstat(
    "konklusion: grad og areal",
    "indlægges med *** % ***.-gradsforbrænding efter ***.",
    tbsa && grad && mekanisme
      ? `indlægges med ${tbsa} % ${grad}.-gradsforbrænding efter ${mekanisme.toLowerCase()}.`
      : null,
  );
  if (inhalation === "no") {
    // Begge "Ingen *** inhalationsskade"-sætninger bekræftes kun når træet
    // faktisk har svaret nej. Ved mistanke bliver *** stående til lægen.
    note = note.split("Ingen *** inhalationsskade").join("Ingen inhalationsskade");
    udfyldte.push("inhalation bekræftet (konklusion)");
  }

  /* --- Tourniquet-blokken: kun ved cirkulær skade --- */
  const tourniquetBlok =
    "På mistanke om torniquet effekt sv.t. ***\nrp               akut aflastende incisioner\nefter konf med ***\n\n";
  if (cirkulaer === "yes") {
    note = note.replace(
      tourniquetBlok,
      `På mistanke om torniquet effekt sv.t. ${lokalisation ?? "***"}\n` +
        "rp               akut aflastende incisioner\n" +
        "efter konf med vagthavende brandsårslæge, Rigshospitalet, 35 45 12 45\n\n",
    );
    udfyldte.push("tourniquet-blok");
  } else {
    note = note.replace(tourniquetBlok, "");
    udeladteBlokke.push("tourniquet/aflastende incisioner");
  }

  /* --- Væsketerapi: TBSA + Parkland med kilde --- */
  erstat("TBSA (væsketerapi)", "Med et TSBA *** %", tbsa ? `Med et TSBA ${tbsa} %` : null);
  const parkland = beregnParkland(vaegt, tbsa ? Number(tbsa) : null);
  erstat(
    "Parkland",
    "{Væsketerapi:119487}",
    parkland ? `{Væsketerapi:119487}\n${parkland.tekst}\n[Kilde: ${parkland.kilde}]` : null,
  );

  /* --- DM-blokken: kun når udredningen har fundet diabetes --- */
  const dmBlok =
    "Pt er kendt med DM, hvorfor***\nsep             tbl Metformin\nrp               s.c. Novorapid efter skema\n\n";
  const harDm = DM_MOENSTER.test(`${anamnese.priorConditions ?? ""} ${anamnese.medications ?? ""}`);
  if (harDm) {
    udfyldte.push("DM-blok (fundet i anamnesen)");
  } else {
    note = note.replace(dmBlok, "");
    udeladteBlokke.push("DM/Metformin/Novorapid");
  }

  return {
    note,
    udfyldte,
    udeladteBlokke,
    aabneFelter: (note.match(/\*\*\*/g) ?? []).length,
    parkland,
    kilde: "deterministisk",
  };
}
