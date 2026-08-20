/**
 * "Vis mig proceduren" — den ene ytring der ikke er et spørgsmål til kilderne.
 *
 * Køres manuelt: `node components/unified/procedure.verify.mjs`.
 *
 * Grænsen der bevogtes: en ANMODNING om at få trin-for-trin-guiden vist må
 * ramme, og en PATIENT må ikke. De to ligner hinanden i ordvalg — begge
 * indeholder "forbinding" — og forskellen er hensigten. Rammer en patient
 * her, åbner appen en opskrift i stedet for at udrede ham.
 */
import { readFileSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { matchProcedureRequest } from "../treeRouting.ts";

const here = fileURLToPath(new URL(".", import.meta.url));
const dir = `${here}../../content/trees`;
const trees = readdirSync(dir)
  .filter((f) => f.endsWith(".json"))
  .map((f) => {
    const t = JSON.parse(readFileSync(`${dir}/${f}`, "utf8").replace(/^﻿/, ""));
    return { id: t.id, name: t.name, version: t.version, authors: t.authors };
  });

/** [ytring, forventet treeId eller null, note] */
const CASES = [
  // Anmodninger — skal åbne proceduren.
  ["vis mig forbindingsproceduren", "dressing-hand-arm", "Mads' egen formulering"],
  ["show me the dressing procedure", "dressing-hand-arm", "engelsk"],
  ["vis proceduren", "dressing-hand-arm", "uden at sige hvilken — der findes kun én"],
  ["gennemgå bandageringen trin for trin", "dressing-hand-arm", "andet vis-ord"],
  ["vis mig hvordan man vikler en hånd", "dressing-hand-arm", "vis + forløbsord"],

  // IKKE anmodninger — må aldrig åbne proceduren.
  ["forbinding på en hånd med brandsår", null, "en patient, ikke en anmodning"],
  ["50-årig mand med brandsår på hele armen", null, "patientbeskrivelse"],
  ["hvordan lægger jeg forbindingen", null, "spørgsmål til kilderne, ikke vis-ord"],
  ["Parkland Formel", null, "fagligt opslag"],
  ["vis mig væskeberegningen", null, "vis-ord, men ikke et procedureforløb"],
];

let failed = 0;
for (const [text, expected, note] of CASES) {
  const got = matchProcedureRequest(text, trees, "da");
  const ok = got === expected;
  if (!ok) failed++;
  console.log(`${ok ? "OK  " : "FEJL"} "${text}" -> ${got ?? "null"} (ventede ${expected ?? "null"}; ${note})`);
}

if (failed > 0) {
  console.error(`\n${failed} tilfælde fejlede`);
  process.exit(1);
}
console.log(`\nAlle ${CASES.length} tilfælde i orden`);
