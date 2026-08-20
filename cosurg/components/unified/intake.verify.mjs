/**
 * Engangs-verifikation af indgangsruteringen — spejler handleIntake i
 * app/page.tsx gren for gren. Køres manuelt: `node components/unified/intake.verify.mjs`.
 * Slettes ikke: den dækker appens forside-beslutning, som ingen anden test gør.
 */
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { looksLikeQuestion, startsWithTreatmentIntent } from "./intent.ts";
import { routeUtterance } from "../treeRouting.ts";

const here = fileURLToPath(new URL(".", import.meta.url));
const load = (f) => JSON.parse(readFileSync(`${here}../../content/trees/${f}`, "utf8"));
const trees = ["burns.json", "dressing-hand-arm.json", "frostbite.json", "bites.json"].map((f) => {
  const t = load(f);
  return { id: t.id, name: t.name, version: t.version, authors: t.authors };
});

/** Nøjagtig samme beslutningsrækkefølge som handleIntake. */
function decide(text) {
  const { match, ranked } = routeUtterance(text, trees, "da");
  if (looksLikeQuestion(text) || startsWithTreatmentIntent(text)) return "lookup";
  if (match) return `tree:${match.treeId}`;
  if (ranked.length > 0) return `ask:${ranked.map((r) => r.treeId).join(",")}`;
  return "lookup";
}

/** [ytring, forventet præfiks, note] */
const CASES = [
  // Korte faglige opslag uden spørgeord — fejlen fra produktion.
  ["Parkland Formel", "lookup", "to ord, intet spørgeord"],
  ["escharotomi", "lookup", "ét fagord"],
  ["Nexobrid", "lookup", "produktnavn"],
  // "tbsa" er et klinisk forløbsord med vilje: "34-årig, TBSA 20 %" er en
  // patient. At ytringen også kunne være et opslag er prisen — og forløbet
  // kan selv svare på spørgsmål undervejs, så ingen vej er en blindgyde.
  ["TBSA barn", "tree:burns-dk", "fagterm rammer forløbets ordliste"],

  // Spørgsmål skal stadig til opslaget.
  ["Hvor meget væske skal en mand på 80 kilo med 30 procent have?", "lookup", "klassisk spørgsmål"],
  ["Hvornår skal en brandsårspatient overflyttes?", "lookup", "spørgsmål med forløbsord"],
  ["Behandling af cirkulær forbrænding på underarmen", "lookup", "behandlingsopslag"],

  // Klare patientbeskrivelser skal stadig starte forløb.
  ["Mand på 34, kogende vand over højre hånd for en halv time siden", "tree:burns-dk", "klassisk brandsårspatient"],
  ["Patient bidt af hund i hånden for en time siden", "tree:bites-dk", "bidsårspatient"],
  ["Han har fået en forfrysning på fingrene", "tree:frostbite-dk", "forfrysningspatient"],

  // Tvetydigt mellem to forløb: spørg stadig.
  ["forbinding på en hånd med brandsår", "ask", "rammer to forløb"],
];

let failed = 0;
for (const [text, expected, note] of CASES) {
  const got = decide(text);
  const ok = got === expected || got.startsWith(`${expected}:`);
  if (!ok) failed++;
  console.log(`${ok ? "OK  " : "FEJL"} "${text}" -> ${got} (ventede ${expected}; ${note})`);
}

if (failed > 0) {
  console.error(`\n${failed} tilfælde fejlede`);
  process.exit(1);
}
console.log(`\nAlle ${CASES.length} tilfælde i orden`);
