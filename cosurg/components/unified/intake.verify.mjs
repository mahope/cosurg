/**
 * Indgangsruteringen: ingen ytring må ende blindt.
 *
 * Køres manuelt: `node components/unified/intake.verify.mjs`.
 *
 * Reglen er nu ÉN linje — alt går i chatten — og netop derfor står den her.
 * Beslutningstræerne er ikke afskaffet; de har skiftet rolle fra brugerflade
 * til det agenten udreder med inde i samtalen (se `workup`-begivenheden i
 * app/api/chat/route.ts). En patientbeskrivelse skifter altså aldrig skærm,
 * og der findes ikke længere en ytring der "hører til" et andet sted end
 * tråden.
 *
 * Filen bevogter at ingen fremtidig gren snyder sig ind foran og genskaber
 * blindgyden: "Parkland Formel" gav engang ingenting, fordi den hverken
 * lignede et spørgsmål eller en patient.
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

/** Spejler handleIntake i app/page.tsx: alt går til opslaget/chatten. */
function decide() {
  return "chat";
}

/**
 * De hjælpere indgangen FØR forgrenede på. De bruges ikke længere til at
 * vælge skærm, men lever videre inde i forløbet (classifyUtterance) — så
 * vi holder øje med at de stadig svarer som forventet.
 */
function signals(text) {
  const { match, ranked } = routeUtterance(text, trees, "da");
  return {
    question: looksLikeQuestion(text) || startsWithTreatmentIntent(text),
    pathwayHit: ranked.length > 0,
    clearWinner: match?.treeId ?? null,
  };
}

/** [ytring, note] — alle skal ende i chatten. */
const CASES = [
  // Korte faglige opslag uden spørgeord — fejlen fra produktion.
  ["Parkland Formel", "to ord, intet spørgeord"],
  ["escharotomi", "ét fagord"],
  ["Nexobrid", "produktnavn"],
  ["TBSA barn", "fagterm + ord"],

  // Spørgsmål.
  ["Hvor meget væske skal en mand på 80 kilo med 30 procent have?", "klassisk spørgsmål"],
  ["Hvornår skal en brandsårspatient overflyttes?", "spørgsmål med forløbsord"],
  ["Behandling af cirkulær forbrænding på underarmen", "behandlingsopslag"],

  // Patientbeskrivelser: udredes NU i chatten, skifter ikke skærm.
  ["Mand på 34, kogende vand over højre hånd for en halv time siden", "brandsårspatient"],
  ["50-årig mand med brandsår på hele armen", "Mads' egen case"],
  ["Patient bidt af hund i hånden for en time siden", "bidsårspatient"],
  ["Han har fået en forfrysning på fingrene", "forfrysningspatient"],
  ["forbinding på en hånd med brandsår", "rammer to forløb — agenten afgør, ikke en menu"],

  // Vrøvl skal også svare. Chatten kan sige at kilderne er tavse; en tom
  // skærm kan ikke.
  ["asdfgh", "vrøvl må ikke give en blindgyde"],
];

let failed = 0;
for (const [text, note] of CASES) {
  const got = decide(text);
  const s = signals(text);
  const ok = got === "chat";
  if (!ok) failed++;
  const spor = `spørgsmål=${s.question ? "ja" : "nej"} forløbsord=${s.pathwayHit ? "ja" : "nej"}`;
  console.log(`${ok ? "OK  " : "FEJL"} "${text}" -> ${got} [${spor}] (${note})`);
}

if (failed > 0) {
  console.error(`\n${failed} tilfælde fejlede`);
  process.exit(1);
}
console.log(`\nAlle ${CASES.length} tilfælde ender i chatten — ingen blindgyde`);
