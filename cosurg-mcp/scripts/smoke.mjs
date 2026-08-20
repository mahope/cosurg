/**
 * Roegtest: starter serveren, kobler en rigtig MCP-klient paa over streamable
 * HTTP og kalder hvert eneste vaerktoej. Fejler ét kald, fejler hele scriptet.
 *
 *   node scripts/smoke.mjs            # alt, inkl. PubMed mod det virkelige API
 *   node scripts/smoke.mjs --offline  # spring PubMed-kaldene over
 */

import { spawn } from "node:child_process";
import { setTimeout as vent } from "node:timers/promises";

import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";

const OFFLINE = process.argv.includes("--offline");
const TOKEN = "roegtest-token-mindst-fireogtyve-tegn";
const PORT = 8799;
const BASIS = `http://127.0.0.1:${PORT}`;

let fejl = 0;

function overskrift(t) {
  console.log(`\n${"=".repeat(78)}\n${t}\n${"=".repeat(78)}`);
}

function vis(navn, resultat, maks = 1200) {
  const tekst = (resultat.content ?? []).map((c) => c.text ?? `[${c.type}]`).join("\n");
  console.log(`\n--- ${navn} ---`);
  console.log(tekst.length > maks ? `${tekst.slice(0, maks)}\n… [afkortet, ${tekst.length} tegn i alt]` : tekst);
  if (resultat.isError) {
    console.log(`!! ${navn} returnerede isError=true`);
    fejl += 1;
  }
  return tekst;
}

function paastaa(betingelse, besked) {
  if (betingelse) {
    console.log(`  OK   ${besked}`);
  } else {
    console.log(`  FEJL ${besked}`);
    fejl += 1;
  }
}

const barn = spawn(process.execPath, ["dist/index.js"], {
  env: { ...process.env, PORT: String(PORT), HOST: "127.0.0.1", MCP_AUTH_TOKEN: TOKEN },
  stdio: ["ignore", "inherit", "inherit"],
});

process.on("exit", () => barn.kill());

// Vent paa at serveren svarer paa /health.
let klar = false;
for (let i = 0; i < 50; i += 1) {
  try {
    const r = await fetch(`${BASIS}/health`);
    if (r.ok) {
      console.log("health:", JSON.stringify(await r.json()));
      klar = true;
      break;
    }
  } catch {
    /* endnu ikke oppe */
  }
  await vent(100);
}
if (!klar) {
  console.error("Serveren kom aldrig op.");
  process.exit(1);
}

// -- Autentifikation -------------------------------------------------------
overskrift("AUTENTIFIKATION");
{
  const udenToken = await fetch(`${BASIS}/mcp`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json, text/event-stream" },
    body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "tools/list" }),
  });
  paastaa(udenToken.status === 401, `POST /mcp uden token → ${udenToken.status} (forventet 401)`);
  console.log("   krop:", (await udenToken.text()).slice(0, 200));

  const forkert = await fetch(`${BASIS}/mcp`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json, text/event-stream",
      Authorization: "Bearer forkert-token-som-er-langt-nok-til-24",
    },
    body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "tools/list" }),
  });
  paastaa(forkert.status === 401, `POST /mcp med forkert token → ${forkert.status} (forventet 401)`);

  const iSti = await fetch(`${BASIS}/mcp/${encodeURIComponent(TOKEN)}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json, text/event-stream" },
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: 1,
      method: "initialize",
      params: { protocolVersion: "2025-06-18", capabilities: {}, clientInfo: { name: "roegtest", version: "1" } },
    }),
  });
  paastaa(iSti.status === 200, `POST /mcp/<token> (token i stien) → ${iSti.status} (forventet 200)`);
}

// -- MCP-klient ------------------------------------------------------------
const transport = new StreamableHTTPClientTransport(new URL(`${BASIS}/mcp`), {
  requestInit: { headers: { Authorization: `Bearer ${TOKEN}` } },
});
const klient = new Client({ name: "cosurg-mcp-roegtest", version: "1.0.0" });
await klient.connect(transport);

overskrift("TOOLS/LIST");
const { tools } = await klient.listTools();
for (const t of tools) console.log(`- ${t.name}: ${t.title ?? ""}`);
paastaa(tools.length === 9, `${tools.length} vaerktoejer udstillet (forventet 9)`);

overskrift("videnbase_status");
vis("videnbase_status", await klient.callTool({ name: "videnbase_status", arguments: {} }));

overskrift("SOEGNING — de tre kraevede forespoergsler");
for (const q of ["Parkland", "cirkulær forbrænding", "inhalationsskade"]) {
  const r = await klient.callTool({
    name: "soeg_klinisk_viden",
    arguments: { forespoergsel: q, antal: 3 },
  });
  const tekst = vis(`soeg_klinisk_viden("${q}")`, r, 2000);
  paastaa(!tekst.includes("INGEN DAEKNING"), `"${q}" gav traeffere`);
  paastaa(/Kilde:\s*\S+/.test(tekst), `"${q}" gav kildehenvisning`);
}

overskrift("SOEGNING — det nye materiale (PlastSurgeon-haandbogen og JPBRS-cases)");
{
  // Findes kun i PlastSurgeon-haandbogens brandsaarskapitel.
  const r = await klient.callTool({
    name: "soeg_klinisk_viden",
    arguments: { forespoergsel: "4:2:1 principle children fluid", antal: 3, samling: "plastsurgeon" },
  });
  const t = vis("soeg_klinisk_viden(4:2:1, samling=plastsurgeon)", r, 1600);
  paastaa(!t.includes("INGEN DAEKNING"), "PlastSurgeon-haandbogen er indlaest og soegbar");
  paastaa(t.includes("beta.plastsurgeon.com"), "traefferen baerer sin URL paa beta.plastsurgeon.com");
  paastaa(t.includes("RETNINGSLINJE"), "haandbogskapitlet er maerket som retningslinje");
}
{
  // Findes kun i JPBRS-casen om brandsaar paa hypothenar.
  const r = await klient.callTool({
    name: "soeg_klinisk_viden",
    arguments: { forespoergsel: "reverse radial forearm flap hypothenar burn", antal: 3, kildetype: "case" },
  });
  const t = vis("soeg_klinisk_viden(hypothenar-burn, kildetype=case)", r, 1800);
  paastaa(!t.includes("INGEN DAEKNING"), "JPBRS-caserne er indlaest og soegbare");
  paastaa(t.includes("beta.jpbrs.com"), "casen baerer sin URL paa beta.jpbrs.com");
  paastaa(/Case\s*\d+/.test(t), "casen baerer sit case-id");
  paastaa(t.includes("KLINISK CASE"), "casen er tydeligt maerket som case, ikke som retningslinje");
}
{
  // Kildetype-filteret skal virke begge veje: en ren retningslinje-soegning
  // maa ikke returnere cases.
  const r = await klient.callTool({
    name: "soeg_klinisk_viden",
    arguments: { forespoergsel: "reverse radial forearm flap hypothenar burn", antal: 5, kildetype: "retningslinje" },
  });
  const t = vis("samme soegning, kildetype=retningslinje", r, 800);
  paastaa(!t.includes("KLINISK CASE"), "kildetype=retningslinje filtrerer cases fra");
}

overskrift("SOEGNING — emne uden daekning (skal sige det aerligt)");
{
  const r = await klient.callTool({
    name: "soeg_klinisk_viden",
    arguments: { forespoergsel: "kolorektal anastomoselaekage stapler", antal: 3 },
  });
  const tekst = vis("soeg_klinisk_viden(uden daekning)", r);
  paastaa(tekst.includes("INGEN DAEKNING"), "emne uden daekning melder INGEN DAEKNING");
}

overskrift("hent_kildeafsnit");
vis(
  "hent_kildeafsnit(kilde=https://brandsaar.dk/vaeskebehandling)",
  await klient.callTool({
    name: "hent_kildeafsnit",
    arguments: { kilde: "https://brandsaar.dk/vaeskebehandling" },
  }),
  1500,
);

overskrift("list_kilder");
{
  const t = vis("list_kilder", await klient.callTool({ name: "list_kilder", arguments: {} }), 3500);
  for (const kilde of ["brandsaar.dk", "beta.plastsurgeon.com", "beta.jpbrs.com"]) {
    paastaa(t.includes(kilde), `${kilde} er med i vidensbasen`);
  }
  const cases = vis(
    "list_kilder(kildetype=case)",
    await klient.callTool({ name: "list_kilder", arguments: { kildetype: "case" } }),
    1500,
  );
  paastaa(!cases.includes("brandsaar.dk"), "kildetype=case viser kun cases, ikke retningslinjer");
}

overskrift("list_beslutningstraeer");
vis("list_beslutningstraeer", await klient.callTool({ name: "list_beslutningstraeer", arguments: {} }), 2000);

overskrift("hent_trae_node");
{
  const r = await klient.callTool({
    name: "hent_trae_node",
    arguments: { trae_id: "burns-dk", node_id: "circumferential" },
  });
  const tekst = vis("hent_trae_node(burns-dk/circumferential)", r, 2000);
  paastaa(tekst.includes("Kanter ud"), "noden viser sine kanter");
}
vis(
  "hent_trae_node(burns-dk/disp-emergency)",
  await klient.callTool({ name: "hent_trae_node", arguments: { trae_id: "burns-dk", node_id: "disp-emergency" } }),
  1500,
);
{
  const r = await klient.callTool({
    name: "hent_trae_node",
    arguments: { trae_id: "burns-dk", node_id: "findes-ikke" },
  });
  const tekst = vis("hent_trae_node(ukendt node)", r, 600);
  paastaa(tekst.includes("hverken en node eller en disposition"), "ukendt node afvises i stedet for at gaettes");
}

overskrift("hent_beslutningstrae");
{
  const r = await klient.callTool({
    name: "hent_beslutningstrae",
    arguments: { trae_id: "dressing-hand-arm", format: "oversigt", sprog: "en" },
  });
  vis("hent_beslutningstrae(dressing-hand-arm, en)", r, 1200);
}

if (!OFFLINE) {
  overskrift("PUBMED — mod det virkelige API");
  {
    const r = await klient.callTool({
      name: "soeg_pubmed",
      arguments: { forespoergsel: "burn escharotomy circumferential", antal: 3, aar_fra: 2015 },
    });
    const tekst = vis("soeg_pubmed", r, 2000);
    paastaa(/PMID:\s*\d+/.test(tekst), "PubMed-soegning gav PMID'er");
    paastaa(tekst.includes("https://pubmed.ncbi.nlm.nih.gov/"), "PubMed-soegning gav links");

    const pmid = /PMID:\s*(\d+)/.exec(tekst)?.[1];
    if (pmid) {
      const a = await klient.callTool({ name: "hent_pubmed_abstrakt", arguments: { pmids: [pmid] } });
      const at = vis(`hent_pubmed_abstrakt([${pmid}])`, a, 1800);
      paastaa(at.includes(`PMID ${pmid}`), "abstract hentet for det fundne PMID");
    } else {
      paastaa(false, "kunne ikke udlede et PMID til abstract-testen");
    }
  }
} else {
  console.log("\n(PubMed sprunget over — --offline)");
}

await klient.close();
barn.kill();

overskrift(fejl === 0 ? "ROEGTEST BESTAAET" : `ROEGTEST FEJLEDE — ${fejl} problem(er)`);
process.exit(fejl === 0 ? 0 : 1);
