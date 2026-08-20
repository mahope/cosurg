/**
 * Testtilfælde for spørgsmål/svar-skelnen — appens farligste enkeltbeslutning.
 *
 * Kør: `npm run test:intent` fra cosurg/.
 *
 * Der er intet testframework i projektet, og et hackathon er ikke stedet at
 * indføre et. Node 22+ kan selv køre TypeScript, så prisen for at have disse
 * tilfælde skrevet ned er nul afhængigheder. De køres mod det RIGTIGE
 * brandsårstræ, ikke mod et opdigtet, så svarmulighederne er dem lægen møder.
 */
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import {
  classifyUtterance,
  looksLikeQuestion,
  looksLikeGuideTopic,
  startsWithTreatmentIntent,
  matchIntentChoice,
  matchAffirmative,
} from "./intent.ts";

const here = fileURLToPath(new URL(".", import.meta.url));
const tree = JSON.parse(readFileSync(`${here}../../content/trees/burns.json`, "utf8"));
const node = (id) => tree.nodes.find((n) => n.id === id);

/** [node, ytring, forventet intent, note] */
const CASES = [
  // --- Rene svar: må ALDRIG blive til opslag ---
  ["mechanism", "flamme", "answer", "et ord, ren svarværdi"],
  ["mechanism", "det var kogende vand over hånden", "answer", "synonym i sætning"],
  ["mechanism", "han blev skoldet af damp", "answer", "synonym, bøjet"],
  ["inhalation", "ja", "answer", "kort bekræftelse"],
  ["inhalation", "nej det er der ikke", "answer", "benægtelse i sætning"],
  ["tbsa", "18", "answer", "bart tal"],
  ["tbsa", "cirka atten procent", "answer", "talord"],
  ["depth", "dyb dermal", "answer", "etiket"],
  ["location", "det sidder i ansigtet", "answer", "etiket i sætning"],
  ["cooled", "ja det er skyllet", "answer", "bekræftelse"],

  // --- Rene spørgsmål midt i forløbet: skal besvares, ikke tolkes som svar ---
  ["tbsa", "hvordan beregner jeg TBSA på et barn?", "question", "opgavens hovedeksempel"],
  ["tbsa", "hvordan beregner jeg TBSA på et barn", "question", "uden spørgsmålstegn"],
  ["fluid", "hvor meget væske skal han have efter Parkland?", "question", "spørgeord forrest"],
  ["depth", "hvad er forskellen på overfladisk og dyb dermal?", "question", "spørgeord forrest"],
  ["circumferential", "hvornår skal jeg lave escharotomi?", "question", "spørgeord forrest"],
  ["mechanism", "slå Parkland-formlen op", "question", "opslagsvending uden spørgeord"],
  ["inhalation", "forklar hvad carbon monoxid gør", "question", "opslagsvending"],
  ["location", "hvorfor er hænder særligt kritiske?", "question", "spørgeord forrest"],
  ["cooled", "hvor længe skal man køle?", "question", "flerords-spørgeord"],

  // --- Fælder: et svar der LIGNER et spørgsmål → spørg, gæt ikke ---
  ["depth", "er det dybt?", "ambiguous", "opgavens navngivne fælde"],
  ["depth", "er det dybt", "ambiguous", "samme uden tegn"],
  ["inhalation", "ja men hvordan ser jeg det?", "ambiguous", "svar OG spørgsmål i én ytring"],
  ["tbsa", "er det over tyve procent?", "ambiguous", "talord plus spørgsmålsform"],
  ["mechanism", "var det en flamme?", "ambiguous", "svarværdi i spørgsmålsform"],

  // --- Ekko af nodens eget spørgsmål: ikke et opslag værd ---
  ["fluid", "er væskebehandling påbegyndt", "unknown", "lægen læser spørgsmålet op"],
  ["circumferential", "er skaden cirkulær omkring en ekstremitet", "unknown", "ekko"],

  // --- Hverken/eller: lad svarfortolkeren om det (som i dag) ---
  ["mechanism", "øh", "unknown", "tøven"],
  ["depth", "det ved jeg ikke helt", "unknown", "ingen af delene"],
  ["mechanism", "skal opereres", "unknown", "to ord, ét svagt signal — ikke nok"],

  // --- Falske venner: fagord der ligner en svarværdi ---
  ["mechanism", "hvad gør jeg ved brandsår hos børn?", "question", "«brand» må ikke ramme inde i «brandsår»"],
  ["inhalation", "hvad er normal saturation?", "question", "«no» må ikke ramme i «normal»"],
  ["cooled", "nok ikke", "unknown", "«nok» må ALDRIG blive til benægtelsen «no»"],
  ["mechanism", "brandsår efter kogende vand", "answer", "«brand» inde i «brandsår» må ikke vælge flamme"],

  // --- Bøjede kliniske stammer skal stadig ramme ---
  ["depth", "det er dybt", "answer", "«dyb» bøjet"],
  ["depth", "hvid og læderagtig", "answer", "to synonymer for fuldhud"],
  ["inhalation", "der er sod omkring næseborene", "answer", "synonym i sætning"],
  ["location", "over knæet", "answer", "«knæ» bøjet"],
  ["cooled", "nej det nåede vi ikke", "answer", "benægtelse i sætning"],
  ["mechanism", "syre", "answer", "kort synonym"],

  // --- Tal: ciffer alene er ikke nok til at være et svar ---
  ["tbsa", "hvor mange procent er ni-reglen?", "question", "tal i et spørgsmål"],
  ["tbsa", "det er vist omkring 18 procent af kroppen", "answer", "tal klods op ad enheden"],
  ["tbsa", "jeg vil tro det er 9 procent men er du sikker?", "ambiguous", "svar med et spørgsmål bagpå"],
  ["tbsa", "9 %", "answer", "ciffer med procenttegn"],

  // --- Engelsk ---
  ["mechanism", "hot water over the hand", "answer", "engelsk synonym"],
  ["tbsa", "how do I estimate TBSA in a child?", "question", "engelsk spørgeord forrest"],
  ["mechanism", "how do I estimate TBSA in a child?", "question", "spørgsmål om en ANDEN node end den aktive"],
  ["inhalation", "yes", "answer", "engelsk bekræftelse"],
  ["circumferential", "when should I do an escharotomy?", "question", "engelsk, verificeret i browseren"],
  ["location", "the palm and two fingers", "answer", "engelsk synonym i sætning"],
];

let failed = 0;
for (const [nodeId, text, expected, note] of CASES) {
  const n = node(nodeId);
  if (!n) throw new Error(`ukendt node: ${nodeId}`);
  const v = classifyUtterance(text, n, "da");
  const ok = v.intent === expected;
  if (!ok) failed += 1;
  console.log(
    `${ok ? "  ok  " : "FEJL  "}${nodeId.padEnd(16)} ${JSON.stringify(text).padEnd(52)} -> ${v.intent.padEnd(10)} (ventet ${expected}) ${ok ? "" : `[${note}] ${v.reasons.join("; ")}`}`,
  );
}

// --- Indgangsskærmen: spørgsmål vs. patientbeskrivelse ---
const INTAKE = [
  ["en mand har fået kogende vand over hånden", false],
  ["34-årig kvinde, flammeforbrænding på højre arm", false],
  ["hvornår skal en brandsårspatient overflyttes?", true],
  ["hvad siger retningslinjen om væskebehandling", true],
  ["slå Parkland op", true],
  ["forbinding på en hånd", false],
];
console.log("\n-- indgang --");
for (const [text, expected] of INTAKE) {
  const got = looksLikeQuestion(text);
  const ok = got === expected;
  if (!ok) failed += 1;
  console.log(`${ok ? "  ok  " : "FEJL  "}${JSON.stringify(text).padEnd(52)} -> spørgsmål=${got} (ventet ${expected})`);
}

// --- Behandlingsguide eller litteratur? ---
const GUIDE = [
  ["hvordan behandler jeg en dyb dermal forbrænding på hånden?", true],
  ["hvad gør jeg ved en cirkulær forbrænding?", true],
  ["behandling af ætsninger", true],
  ["how do I treat a deep dermal burn of the hand?", true],
  ["what is the treatment of a scald in a child", false], // "hvad er" -> snævert
  ["hvor meget væske skal han have?", false],
  ["hvornår skal jeg starte behandling?", false], // snævert trods "behandling"
  ["hvilke kriterier udløser overflytning?", false],
  ["hvorfor er hænder kritiske?", false],
];
console.log("\n-- guide eller litteratur --");
for (const [text, expected] of GUIDE) {
  const got = looksLikeGuideTopic(text);
  const ok = got === expected;
  if (!ok) failed += 1;
  console.log(`${ok ? "  ok  " : "FEJL  "}${JSON.stringify(text).padEnd(60)} -> guide=${got} (ventet ${expected})`);
}

// --- Indgangen: behandlingsopslag maa ikke starte et patientforloeb ---
const INTAKE_TREATMENT = [
  ["behandling af ætsninger", true],
  ["behandl en dyb dermal forbrænding", true],
  ["treatment of a circumferential burn", true],
  ["patienten skal have behandling for kogende vand over hånden", false],
  ["en mand har fået kogende vand over hånden", false],
  ["34-årig kvinde, flammeforbrænding på højre arm", false],
];
console.log("\n-- indgang: opslag vs. patient --");
for (const [text, expected] of INTAKE_TREATMENT) {
  const got = startsWithTreatmentIntent(text);
  const ok = got === expected;
  if (!ok) failed += 1;
  console.log(`${ok ? "  ok  " : "FEJL  "}${JSON.stringify(text).padEnd(60)} -> opslag=${got} (ventet ${expected})`);
}

// --- Talte valg ---
const CHOICES = [
  ["svar", "answer"],
  ["som svar", "answer"],
  ["slå det op", "question"],
  ["opslag", "question"],
  ["det var et spørgsmål", "question"],
  ["jeg mener at det nok var et svar på spørgsmålet", null],
];
console.log("\n-- talte valg --");
for (const [text, expected] of CHOICES) {
  const got = matchIntentChoice(text);
  const ok = got === expected;
  if (!ok) failed += 1;
  console.log(`${ok ? "  ok  " : "FEJL  "}${JSON.stringify(text).padEnd(52)} -> ${got} (ventet ${expected})`);
}

const AFFIRM = [
  ["ja", true],
  ["ja tak", true],
  ["før mig igennem", true],
  ["yes", true],
  ["nej", false],
  ["ja jeg tror det var kogende vand", false],
];
console.log("\n-- tilbud om forløb --");
for (const [text, expected] of AFFIRM) {
  const got = matchAffirmative(text);
  const ok = got === expected;
  if (!ok) failed += 1;
  console.log(`${ok ? "  ok  " : "FEJL  "}${JSON.stringify(text).padEnd(52)} -> ${got} (ventet ${expected})`);
}

console.log(`\n${failed === 0 ? "ALLE GRØNNE" : `${failed} FEJL`}`);
process.exit(failed === 0 ? 0 : 1);
