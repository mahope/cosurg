/**
 * MCP-serveren: vaerktoejerne CoSurgs viden udstilles igennem.
 *
 * Gennemgaaende princip: serveren opfinder aldrig indhold. Hvert svar er enten
 * et ordret uddrag med kildehenvisning, et stykke af et beslutningstrae som
 * klinikerne har skrevet, en PubMed-post med PMID — eller en klar melding om at
 * vi ikke har daekning. Det sidste er et gyldigt svar og skal siges rent ud.
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";

import { hentPubmedAbstrakter, soegPubmed } from "./pubmed.js";
import { Soegeindeks, uddragVindue } from "./soegning.js";
import {
  type Node,
  type Sprog,
  type Trae,
  findDisposition,
  findNode,
  findTrae,
  forgaengere,
  indlaesTraeer,
  tekst,
} from "./traeer.js";
import { indlaesVidenbase, kildehenvisning, kildetypeEtiket, optaelling } from "./videnbase.js";

/** Alt indlaeses én gang ved opstart. Ingen skrivbar tilstand, ingen cache-invalidering. */
const videnbase = indlaesVidenbase();
const indeks = new Soegeindeks(videnbase.uddrag);
const traesamling = indlaesTraeer();
const optalt = optaelling(videnbase);

export const opstartsstatus = {
  uddrag: videnbase.uddrag.length,
  afsnit: videnbase.afsnit.length,
  cases: optalt.cases,
  kildemappe: videnbase.mappe,
  kildefiler: videnbase.filer,
  traeer: traesamling.traeer.map((t) => t.id),
  traemappe: traesamling.mappe,
  traefejl: traesamling.fejl,
};

const INGEN_DAEKNING =
  "INGEN DAEKNING I VIDENSBASEN. CoSurgs kilder indeholder ikke et svar paa dette. " +
  "Sig det til brugeren i stedet for at svare ud fra almen viden. " +
  "Skal der hentes ny litteratur, brug vaerktoejet soeg_pubmed — og gengiv kun det der staar i referencerne.";

function tekstsvar(s: string) {
  return { content: [{ type: "text" as const, text: s }] };
}

function fejlsvar(s: string) {
  return { content: [{ type: "text" as const, text: s }], isError: true };
}

// ---------------------------------------------------------------------------
// Formatering af trae-indhold
// ---------------------------------------------------------------------------

function formaterNode(trae: Trae, node: Node, sprog: Sprog): string {
  const linjer: string[] = [];
  linjer.push(`### Node \`${node.id}\` i traeet \`${trae.id}\``);
  const sp = tekst(node.question, sprog);
  if (sp) linjer.push(`**Spoergsmaal:** ${sp}`);
  const kort = tekst(node.orQuestion, sprog);
  if (kort && kort !== sp) linjer.push(`**Kort form (OR-tilstand):** ${kort}`);
  if (node.answerType) linjer.push(`**Svartype:** ${node.answerType}`);
  const hjaelp = tekst(node.help, sprog);
  if (hjaelp) linjer.push(`**Hjaelpetekst:** ${hjaelp}`);
  if (node.unit) linjer.push(`**Enhed:** ${node.unit}`);
  if (node.min !== undefined || node.max !== undefined) {
    linjer.push(`**Tilladt interval:** ${node.min ?? "-"} – ${node.max ?? "-"}`);
  }

  if (node.options && node.options.length > 0) {
    linjer.push("\n**Tilladte svarvaerdier** (kun disse — gaet aldrig en vaerdi udenfor listen):");
    for (const o of node.options) {
      const etiket = tekst(o.label, sprog) ?? o.value;
      const syn = o.synonyms?.[sprog] ?? o.synonyms?.da ?? [];
      const synTekst = syn.length > 0 ? ` — synonymer: ${syn.join(", ")}` : "";
      linjer.push(`- \`${o.value}\` = ${etiket}${synTekst}`);
    }
  }

  if (node.images && node.images.length > 0) {
    linjer.push(`\n**Trinbilleder:** ${node.images.map((b) => b.src).join(", ")}`);
  }

  if (node.redFlags && node.redFlags.length > 0) {
    linjer.push("\n**Roede flag paa denne node:**");
    linjer.push("```json");
    linjer.push(JSON.stringify(node.redFlags, null, 2));
    linjer.push("```");
  }

  if (node.edges && node.edges.length > 0) {
    linjer.push("\n**Kanter ud (deterministiske — det er traeet der bestemmer, ikke modellen):**");
    for (const k of node.edges) {
      const maal = k.goto
        ? `node \`${k.goto}\``
        : k.disposition
          ? `disposition \`${k.disposition}\``
          : "(intet maal angivet)";
      linjer.push(`- naar svar matcher \`${k.when}\` → ${maal}`);
    }
  }

  const ind = forgaengere(trae, node.id);
  if (ind.length > 0) {
    linjer.push(`\n**Naaes fra:** ${ind.map((i) => `\`${i.fra}\` (naar \`${i.when}\`)`).join(", ")}`);
  }

  linjer.push(`\n*Kilde: beslutningstraeet ${trae.id} v${trae.version ?? "?"} — fil ${trae._fil}.*`);
  if (trae.authors && trae.authors.length > 0) {
    linjer.push(`*Forfattere: ${trae.authors.join("; ")}*`);
  }
  return linjer.join("\n");
}

function formaterDisposition(trae: Trae, id: string, sprog: Sprog): string | null {
  const d = findDisposition(trae, id);
  if (!d) return null;
  const linjer: string[] = [];
  linjer.push(`### Disposition \`${d.id}\` i traeet \`${trae.id}\``);
  if (d.severity) linjer.push(`**Alvorlighed:** ${d.severity}`);
  const t = tekst(d.title, sprog);
  if (t) linjer.push(`**Titel:** ${t}`);
  const g = tekst(d.guidance, sprog);
  if (g) linjer.push(`\n${g}`);
  if (d.sources && d.sources.length > 0) {
    linjer.push(`\n**Kliniske kilder for denne disposition:** ${d.sources.join("; ")}`);
  }
  linjer.push(`\n*Kilde: beslutningstraeet ${trae.id} v${trae.version ?? "?"} — fil ${trae._fil}.*`);
  return linjer.join("\n");
}

// ---------------------------------------------------------------------------
// Serverfabrik
// ---------------------------------------------------------------------------

const sprogSkema = z
  .enum(["da", "en"])
  .default("da")
  .describe("Sprog for node- og dispositionstekster. da = dansk (standard), en = engelsk.");

const samlingSkema = z
  .enum(["alle", "brandsaar", "magnus", "plastsurgeon", "jpbrs"])
  .default("alle")
  .describe(
    "Begraens til én kilde. 'brandsaar' = brandsaar.dk, 'magnus' = teamets eget materiale fra " +
      "Afsnit 6052, 'plastsurgeon' = PlastSurgeon-haandbogens Burn Surgery-kapitel, " +
      "'jpbrs' = peer-reviewede kliniske cases fra JPBRS, 'alle' = alle fire (standard).",
  );

const kildetypeSkema = z
  .enum(["alle", "retningslinje", "case"])
  .default("alle")
  .describe(
    "Begraens til én slags viden. 'retningslinje' = retningslinjer og haandbogskapitler " +
      "(hvad der generelt anbefales), 'case' = enkeltstaaende peer-reviewede patientforloeb " +
      "(hvad der blev gjort i ét konkret tilfaelde). Brug 'retningslinje' naar spoergsmaalet er " +
      "hvad man BOER goere, og 'case' naar det er om nogen har gjort noget lignende foer.",
  );

/**
 * Bygger en ny McpServer med alle vaerktoejer registreret.
 *
 * Der laves en frisk instans pr. HTTP-anmodning (stateless streamable HTTP),
 * mens vidensbasen og indekset deles — de er skrivebeskyttede.
 */
export function opretServer(): McpServer {
  const server = new McpServer(
    {
      name: "cosurg-mcp",
      version: "1.0.0",
    },
    {
      instructions:
        "CoSurgs kliniske vidensbase for brandsaar. Brug soeg_klinisk_viden foer du svarer paa et " +
        "klinisk spoergsmaal, og citér altid den kilde vaerktoejet returnerer. Anbefalinger om " +
        "handling skal komme fra beslutningstraeerne (hent_beslutningstrae / hent_trae_node), ikke " +
        "fra egen viden. Vidensbasen indeholder to slags kilder, og de maa ikke blandes: " +
        "retningslinjer og haandbogskapitler siger hvad der generelt anbefales, mens kliniske " +
        "cases dokumenterer ét enkelt patientforloeb. Gengiver du en case, saa sig at det er en " +
        "case og nævn dens case-id — en case er aldrig i sig selv en anbefaling. " +
        "Melder et vaerktoej 'INGEN DAEKNING', saa sig det — opfind aldrig et svar. " +
        "Mangler der litteratur, brug soeg_pubmed og gengiv kun det referencerne siger.",
    },
  );

  // -- 1. Soegning i den kliniske viden ------------------------------------

  server.registerTool(
    "soeg_klinisk_viden",
    {
      title: "Soeg i CoSurgs kliniske vidensbase",
      description:
        "Fritekstsoegning i CoSurgs kliniske kilder om brandsaar: brandsaar.dk (Dansk " +
        "Brandsaarsforening / Rigshospitalets brandsaarsafdeling), teamets eget materiale " +
        "(Burns plast surgeon-dokumentet + forbindingsguiden fra Afsnit 6052), " +
        "PlastSurgeon-haandbogens Burn Surgery-kapitel og peer-reviewede kliniske cases fra " +
        "JPBRS. Daekker dybdevurdering, TBSA/arealberegning, Parkland-vaeskebehandling, " +
        "inhalationsskader, aetsninger, forfrysninger, cirkulaere forbraendinger og " +
        "escharotomi, overflytningskriterier til Rigshospitalet, ambulant behandling, " +
        "smertebehandling, forbindinger, debridement og hudtransplantation. " +
        "Returnerer ordrette uddrag MED kildehenvisning (URL eller dokumentnavn) og med " +
        "kildetypen angivet: en retningslinje siger hvad der anbefales, en case siger hvad der " +
        "blev gjort for én patient — de to maa ikke citeres som det samme. " +
        "Findes der intet, siges det eksplicit — vaerktoejet gaetter aldrig. " +
        "(EN: full-text search of CoSurg's own clinical burn sources; returns verbatim excerpts with citations and source type.)",
      inputSchema: {
        forespoergsel: z
          .string()
          .min(2)
          .max(400)
          .describe(
            "Soegeord eller klinisk spoergsmaal, dansk eller engelsk. Fx 'Parkland formel', " +
              "'cirkulaer forbraending escharotomi', 'inhalationsskade tegn'.",
          ),
        antal: z.number().int().min(1).max(10).default(5).describe("Antal uddrag der oenskes. Standard 5."),
        samling: samlingSkema,
        kildetype: kildetypeSkema,
        fuldt_uddrag: z
          .boolean()
          .default(false)
          .describe("true returnerer hele uddraget i stedet for et vindue omkring traefferen."),
      },
      annotations: { readOnlyHint: true, openWorldHint: false },
    },
    async ({ forespoergsel, antal, samling, kildetype, fuldt_uddrag }) => {
      if (indeks.antalUddrag === 0) {
        return fejlsvar(
          "Vidensbasen er tom — ingen kildefiler blev fundet ved opstart. " +
            "Kontrollér COSURG_KILDE_DIR. Der svares ikke ud fra almen viden.",
        );
      }

      const traeffere = indeks.soeg(forespoergsel, {
        antal,
        filter:
          samling === "alle" && kildetype === "alle"
            ? undefined
            : (u) =>
                (samling === "alle" || u.samling === samling) &&
                (kildetype === "alle" || u.kildetype === kildetype),
      });

      if (traeffere.length === 0) {
        return tekstsvar(
          `${INGEN_DAEKNING}\n\nSoegning: "${forespoergsel}" (samling: ${samling}, kildetype: ${kildetype}). ` +
            `Der blev gennemsoegt ${indeks.antalUddrag} uddrag fra ${videnbase.afsnit.length} kildeafsnit.`,
        );
      }

      const dele = traeffere.map((t, i) => {
        const u = t.uddrag;
        const krop = fuldt_uddrag ? u.tekst : uddragVindue(u.tekst, forespoergsel);
        const link = u.kildeErUrl ? u.kilde : `dokument: ${u.kilde}`;
        return [
          `## Traeffer ${i + 1} — ${kildehenvisning(u)}`,
          `Kildetype: ${kildetypeEtiket(u.kildetype)}`,
          `Kilde: ${link}`,
          u.forfattere !== undefined ? `Forfattere: ${u.forfattere}` : "",
          `Uddrag-id: \`${u.id}\` · afsnit-id: \`${u.afsnitId}\` · relevans: ${t.score.toFixed(2)}`,
          "",
          krop,
        ]
          .filter((s) => s !== "")
          .join("\n");
      });

      const harCase = traeffere.some((t) => t.uddrag.kildetype === "case");

      return tekstsvar(
        [
          `${traeffere.length} uddrag fra CoSurgs kliniske vidensbase for "${forespoergsel}".`,
          "Citér kilden ved hvert udsagn. Staar det ikke herunder, staar det ikke i vores kilder.",
          harCase
            ? "OBS: mindst én traeffer er en KLINISK CASE. En case dokumenterer ét forloeb og er " +
              "ikke en anbefaling — sig eksplicit at det er en case naar du gengiver den, og bland " +
              "den aldrig sammen med en retningslinje."
            : "",
          "",
          dele.join("\n\n---\n\n"),
          "",
          "*Brug hent_kildeafsnit med et afsnit-id for at laese hele siden bag et uddrag.*",
        ]
          .filter((s) => s !== "")
          .join("\n"),
      );
    },
  );

  // -- 2. Hele kildeafsnittet ----------------------------------------------

  server.registerTool(
    "hent_kildeafsnit",
    {
      title: "Hent et helt kildeafsnit",
      description:
        "Henter hele teksten fra ét kildeafsnit (én webside eller ét dokumentkapitel) ud fra " +
        "afsnit-id'et som soeg_klinisk_viden returnerer, eller ud fra kildens URL. Brug det naar " +
        "et uddrag ikke giver kontekst nok — fx for at faa hele Parkland-afsnittet i stedet for " +
        "tre linjer. (EN: fetch the full source section behind a search hit.)",
      inputSchema: {
        afsnit_id: z
          .string()
          .optional()
          .describe("Afsnit-id fra en soegetraeffer, fx 'brandsaar:03'."),
        kilde: z
          .string()
          .optional()
          .describe("URL eller dokumentnavn, fx 'https://brandsaar.dk/vaeskebehandling'."),
      },
      annotations: { readOnlyHint: true, openWorldHint: false },
    },
    async ({ afsnit_id, kilde }) => {
      if (!afsnit_id && !kilde) {
        return fejlsvar("Angiv enten afsnit_id eller kilde.");
      }
      const fundet = videnbase.afsnit.filter(
        (a) =>
          (afsnit_id !== undefined && a.id === afsnit_id) ||
          (kilde !== undefined && (a.kilde === kilde || a.kilde.includes(kilde))),
      );
      if (fundet.length === 0) {
        return tekstsvar(
          `${INGEN_DAEKNING}\n\nIntet kildeafsnit matcher ${afsnit_id ? `afsnit_id "${afsnit_id}"` : `kilde "${kilde}"`}. ` +
            "Brug list_kilder for at se hvad vidensbasen faktisk indeholder.",
        );
      }
      const dele = fundet.slice(0, 3).map((a) =>
        [
          `## ${a.samlingsTitel}${a.caseId !== undefined ? ` — ${a.caseId}` : ""}`,
          `Kildetype: ${kildetypeEtiket(a.kildetype)}`,
          `Kilde: ${a.kilde}`,
          a.forfattere !== undefined ? `Forfattere: ${a.forfattere}` : "",
          `Afsnit-id: \`${a.id}\` · fil: ${a.dokument}`,
          "",
          a.tekst,
        ]
          .filter((s) => s !== "")
          .join("\n"),
      );
      return tekstsvar(dele.join("\n\n---\n\n"));
    },
  );

  // -- 3. Oversigt over kilder ---------------------------------------------

  server.registerTool(
    "list_kilder",
    {
      title: "Vis hvad vidensbasen indeholder",
      description:
        "Lister alle kildeafsnit i CoSurgs vidensbase med id, kildetype (retningslinje eller " +
        "klinisk case), kilde-URL/dokumentnavn og stoerrelse. Brug det til at afgoere om et emne " +
        "overhovedet er daekket, foer du konkluderer noget. " +
        "(EN: list every source section in the knowledge base, with its source type.)",
      inputSchema: {
        samling: samlingSkema,
        kildetype: kildetypeSkema,
      },
      annotations: { readOnlyHint: true, openWorldHint: false },
    },
    async ({ samling, kildetype }) => {
      const valgte = videnbase.afsnit.filter(
        (a) =>
          (samling === "alle" || a.samling === samling) && (kildetype === "alle" || a.kildetype === kildetype),
      );
      if (valgte.length === 0) {
        return tekstsvar("Vidensbasen indeholder ingen afsnit der matcher dette filter.");
      }
      const linjer = valgte.map((a) => {
        const maerke = a.kildetype === "case" ? "CASE" : "retningslinje";
        const navn = a.caseId !== undefined ? `${a.caseId}: ${a.titel ?? ""}` : (a.titel ?? "");
        return `- \`${a.id}\` · [${maerke}] ${navn ? `${navn} · ` : ""}${a.kilde} · ${a.tekst.length} tegn · ${a.samlingsTitel.split(" — ")[0]}`;
      });
      return tekstsvar(
        [
          `CoSurgs vidensbase: ${valgte.length} kildeafsnit, ${videnbase.uddrag.length} soegbare uddrag i alt ` +
            `(heraf ${optalt.cases} kliniske cases).`,
          `Laest fra: ${videnbase.mappe ?? "(ingen mappe fundet)"} — filer: ${videnbase.filer.join(", ") || "(ingen)"}`,
          "[CASE] = ét patientforloeb, ikke en anbefaling. [retningslinje] = generel klinisk anvisning.",
          "",
          ...linjer,
        ].join("\n"),
      );
    },
  );

  // -- 4. Beslutningstraeer -------------------------------------------------

  server.registerTool(
    "list_beslutningstraeer",
    {
      title: "Vis tilgaengelige kliniske beslutningstraeer",
      description:
        "Lister CoSurgs kliniske beslutningstraeer med id, navn, version, forfattere, rodnode og " +
        "antal noder. Traeerne er deterministisk klinisk logik skrevet af klinikere — anbefalinger " +
        "skal komme herfra, ikke fra en sprogmodel. (EN: list the clinical decision trees.)",
      inputSchema: { sprog: sprogSkema },
      annotations: { readOnlyHint: true, openWorldHint: false },
    },
    async ({ sprog }) => {
      if (traesamling.traeer.length === 0) {
        return fejlsvar(
          `Ingen beslutningstraeer fundet. Soegt i: ${traesamling.mappe ?? "(ingen mappe fundet)"}.`,
        );
      }
      const dele = traesamling.traeer.map((t) =>
        [
          `### \`${t.id}\` — ${tekst(t.name, sprog) ?? "(uden navn)"} (v${t.version ?? "?"})`,
          tekst(t.description, sprog) ?? "",
          `Rodnode: \`${t.rootNodeId ?? "(ikke angivet)"}\` · ${t.nodes.length} noder · ${t.dispositions?.length ?? 0} dispositioner`,
          t.authors && t.authors.length > 0 ? `Forfattere: ${t.authors.join("; ")}` : "",
          `Fil: ${t._fil}`,
        ]
          .filter((s) => s !== "")
          .join("\n"),
      );
      return tekstsvar([`${traesamling.traeer.length} beslutningstrae(er):`, "", dele.join("\n\n")].join("\n"));
    },
  );

  server.registerTool(
    "hent_beslutningstrae",
    {
      title: "Hent et helt beslutningstrae",
      description:
        "Henter et beslutningstrae. format='oversigt' giver alle noder med spoergsmaal, svartype " +
        "og kanter i laesbar form; format='fuld' giver den raa JSON praecis som klinikerne har " +
        "skrevet den. Brug oversigten til at forstaa forloebet, den fulde til at reproducere " +
        "logikken. (EN: fetch a decision tree as a readable outline or raw JSON.)",
      inputSchema: {
        trae_id: z.string().describe("Traeets id, fx 'burns-dk' eller 'dressing-hand-arm'."),
        sprog: sprogSkema,
        format: z.enum(["oversigt", "fuld"]).default("oversigt").describe("Standard 'oversigt'."),
      },
      annotations: { readOnlyHint: true, openWorldHint: false },
    },
    async ({ trae_id, sprog, format }) => {
      const trae = findTrae(traesamling, trae_id);
      if (!trae) {
        return tekstsvar(
          `Der findes intet beslutningstrae med id "${trae_id}". ` +
            `Tilgaengelige: ${traesamling.traeer.map((t) => t.id).join(", ") || "(ingen)"}. ` +
            "Opfind ikke et trae — brug list_beslutningstraeer.",
        );
      }

      if (format === "fuld") {
        const { _fil, ...raa } = trae;
        return tekstsvar(
          [`Beslutningstraeet \`${trae.id}\` (fil ${_fil}), ordret JSON:`, "```json", JSON.stringify(raa, null, 2), "```"].join(
            "\n",
          ),
        );
      }

      const dele = [
        `# ${tekst(trae.name, sprog) ?? trae.id} (\`${trae.id}\` v${trae.version ?? "?"})`,
        tekst(trae.description, sprog) ?? "",
        trae.authors && trae.authors.length > 0 ? `**Forfattere:** ${trae.authors.join("; ")}` : "",
        `**Rodnode:** \`${trae.rootNodeId ?? "(ikke angivet)"}\``,
        "",
        "## Noder",
        ...trae.nodes.map((n) => formaterNode(trae, n, sprog)),
      ];

      if (trae.dispositions && trae.dispositions.length > 0) {
        dele.push("", "## Dispositioner");
        for (const d of trae.dispositions) {
          const s = formaterDisposition(trae, d.id, sprog);
          if (s) dele.push(s);
        }
      }

      return tekstsvar(dele.filter((s) => s !== "").join("\n\n"));
    },
  );

  server.registerTool(
    "hent_trae_node",
    {
      title: "Hent én node eller disposition fra et beslutningstrae",
      description:
        "Henter ét praecist punkt i et beslutningstrae: enten en node (spoergsmaal, tilladte " +
        "svarvaerdier med synonymer, roede flag, kanter ud) eller en disposition (alvorlighed, " +
        "titel, klinisk vejledning, kilder). Brug det naar du skal fortolke et talt svar mod " +
        "nodens svarskema: kan svaret ikke afgoeres inden for de tilladte vaerdier, spoerg igen " +
        "i stedet for at gaette. (EN: fetch one node or disposition from a decision tree.)",
      inputSchema: {
        trae_id: z.string().describe("Traeets id, fx 'burns-dk'."),
        node_id: z
          .string()
          .describe("Node-id eller disposition-id, fx 'circumferential' eller 'disp-emergency'."),
        sprog: sprogSkema,
      },
      annotations: { readOnlyHint: true, openWorldHint: false },
    },
    async ({ trae_id, node_id, sprog }) => {
      const trae = findTrae(traesamling, trae_id);
      if (!trae) {
        return tekstsvar(
          `Der findes intet beslutningstrae med id "${trae_id}". ` +
            `Tilgaengelige: ${traesamling.traeer.map((t) => t.id).join(", ") || "(ingen)"}.`,
        );
      }
      const node = findNode(trae, node_id);
      if (node) return tekstsvar(formaterNode(trae, node, sprog));

      const disp = formaterDisposition(trae, node_id, sprog);
      if (disp) return tekstsvar(disp);

      return tekstsvar(
        `Traeet \`${trae.id}\` har hverken en node eller en disposition med id "${node_id}".\n` +
          `Noder: ${trae.nodes.map((n) => n.id).join(", ")}\n` +
          `Dispositioner: ${(trae.dispositions ?? []).map((d) => d.id).join(", ") || "(ingen)"}`,
      );
    },
  );

  // -- 5. Ekstern litteratur -----------------------------------------------

  server.registerTool(
    "soeg_pubmed",
    {
      title: "Soeg litteratur i PubMed",
      description:
        "Soeger i PubMed via NCBI E-utilities naar CoSurgs egen vidensbase ikke raekker. " +
        "Returnerer titel, aar, tidsskrift, forfattere, publikationstype, PMID, DOI og link for " +
        "hver artikel. Brug engelske soegetermer — PubMed indekserer ikke dansk. Gengiv aldrig " +
        "et fund uden PMID og link, og paastaa aldrig noget om en artikel ud over hvad titlen " +
        "eller det hentede abstract siger (se hent_pubmed_abstrakt). " +
        "(EN: search PubMed for external literature; always returns PMID + link.)",
      inputSchema: {
        forespoergsel: z
          .string()
          .min(2)
          .max(400)
          .describe("PubMed-soegestreng paa engelsk, fx 'burn wound escharotomy indications'."),
        antal: z.number().int().min(1).max(20).default(5).describe("Antal artikler. Standard 5, maks 20."),
        aar_fra: z
          .number()
          .int()
          .min(1900)
          .max(2100)
          .optional()
          .describe("Medtag kun artikler publiceret fra og med dette aar."),
        kun_reviews: z
          .boolean()
          .default(false)
          .describe("true begraenser til reviews og systematiske oversigter."),
      },
      annotations: { readOnlyHint: true, openWorldHint: true },
    },
    async ({ forespoergsel, antal, aar_fra, kun_reviews }) => {
      try {
        const r = await soegPubmed(forespoergsel, {
          antal,
          ...(aar_fra !== undefined ? { aarFra: aar_fra } : {}),
          kunReviews: kun_reviews,
        });
        // PubMeds egen oversaettelse kan fylde flere tusind tegn af MeSH-synonymer.
        // Den er nyttig som kvittering, ikke som kontekst — derfor afkortes den.
        const oversat =
          r.oversatForespoergsel && r.oversatForespoergsel.length > 240
            ? `${r.oversatForespoergsel.slice(0, 240)} … [afkortet]`
            : r.oversatForespoergsel;

        if (r.artikler.length === 0) {
          return tekstsvar(
            `PubMed returnerede ingen artikler for "${r.forespoergsel}".\n` +
              (oversat ? `PubMed oversatte forespoergslen til: ${oversat}\n` : "") +
              "Konkludér ikke at der ikke findes litteratur — proev en bredere soegestreng. Opfind ingen referencer.",
          );
        }
        const linjer = r.artikler.map((a, i) =>
          [
            `${i + 1}. **${a.titel}**`,
            `   ${a.forfattere.slice(0, 4).join(", ")}${a.forfattere.length > 4 ? " et al." : ""}`,
            `   ${a.tidsskrift ?? "(ukendt tidsskrift)"} · ${a.aar ?? "(uden aar)"}${a.publikationstyper.length > 0 ? ` · ${a.publikationstyper.join(", ")}` : ""}`,
            `   PMID: ${a.pmid}${a.doi ? ` · DOI: ${a.doi}` : ""}`,
            `   ${a.url}`,
          ].join("\n"),
        );
        return tekstsvar(
          [
            `PubMed: ${r.artikler.length} af i alt ${r.antalIalt} traeffere for "${r.forespoergsel}".`,
            oversat ? `PubMeds egen oversaettelse: ${oversat}` : "",
            "",
            ...linjer,
            "",
            "*Citér altid PMID og link. Brug hent_pubmed_abstrakt foer du udtaler dig om en artikels indhold.*",
          ]
            .filter((s) => s !== "")
            .join("\n"),
        );
      } catch (e) {
        return fejlsvar(
          `PubMed-opslaget fejlede: ${e instanceof Error ? e.message : String(e)}. ` +
            "Der returneres ingen litteratur — svar ikke ud fra hukommelsen.",
        );
      }
    },
  );

  server.registerTool(
    "hent_pubmed_abstrakt",
    {
      title: "Hent abstracts fra PubMed",
      description:
        "Henter det fulde abstract (MEDLINE-format, ordret fra NCBI) for op til 10 PMID'er. " +
        "Brug det foer du refererer indholdet af en artikel — en titel er ikke et resultat. " +
        "(EN: fetch full abstracts for given PMIDs, verbatim from NCBI.)",
      inputSchema: {
        pmids: z
          .array(z.string().regex(/^\d+$/, "Et PMID er kun cifre"))
          .min(1)
          .max(10)
          .describe("Liste af PMID'er, fx ['31600635']."),
      },
      annotations: { readOnlyHint: true, openWorldHint: true },
    },
    async ({ pmids }) => {
      try {
        const poster = await hentPubmedAbstrakter(pmids);
        if (poster.length === 0) {
          return tekstsvar(
            `PubMed returnerede intet for PMID ${pmids.join(", ")}. Tjek at id'erne er korrekte. Opfind ikke et abstract.`,
          );
        }
        const savnede = pmids.filter((p) => !poster.some((x) => x.pmid === p));
        const dele = poster.map((p) => `## PMID ${p.pmid}\n${p.url}\n\n${p.tekst}`);
        if (savnede.length > 0) {
          dele.push(`## Ikke fundet\nPubMed returnerede intet for: ${savnede.join(", ")}.`);
        }
        return tekstsvar(dele.join("\n\n---\n\n"));
      } catch (e) {
        return fejlsvar(
          `PubMed-abstract-opslaget fejlede: ${e instanceof Error ? e.message : String(e)}. Der returneres intet indhold.`,
        );
      }
    },
  );

  // -- 6. Driftsstatus ------------------------------------------------------

  server.registerTool(
    "videnbase_status",
    {
      title: "Status paa vidensbasen",
      description:
        "Viser hvad serveren faktisk har indlaest: kildemappe, filer, antal afsnit og uddrag, " +
        "hvilke beslutningstraeer der er kendt, og eventuelle indlaesningsfejl. Brug det til at " +
        "afgoere om et tomt svar skyldes manglende daekning eller en fejlkonfiguration. " +
        "(EN: report what the server actually loaded.)",
      inputSchema: {},
      annotations: { readOnlyHint: true, openWorldHint: false },
    },
    async () =>
      tekstsvar(
        [
          "## cosurg-mcp — status",
          `Kildemappe: ${videnbase.mappe ?? "(ingen fundet)"}`,
          `Kildefiler: ${videnbase.filer.join(", ") || "(ingen)"}`,
          `Kildeafsnit: ${videnbase.afsnit.length} · soegbare uddrag: ${videnbase.uddrag.length}`,
          `Fordeling: ${
            optalt.samlinger
              .map((s) => `${s.samling} [${s.kildetype}] ${s.afsnit} afsnit / ${s.uddrag} uddrag`)
              .join(" · ") || "(ingen)"
          }`,
          `Traemappe: ${traesamling.mappe ?? "(ingen fundet)"}`,
          `Beslutningstraeer: ${traesamling.traeer.map((t) => `${t.id} (${t.nodes.length} noder)`).join(", ") || "(ingen)"}`,
          traesamling.fejl.length > 0
            ? `Indlaesningsfejl: ${traesamling.fejl.map((f) => `${f.fil}: ${f.besked}`).join(" | ")}`
            : "Indlaesningsfejl: ingen",
          `PubMed-endpoint: ${process.env["PUBMED_BASE_URL"] ?? "https://eutils.ncbi.nlm.nih.gov/entrez/eutils"}`,
        ].join("\n"),
      ),
  );

  return server;
}
