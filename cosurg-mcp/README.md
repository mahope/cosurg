# cosurg-mcp

An MCP server holding CoSurg's clinical knowledge — burns at its core, and plastic
surgery around them. It attaches to Corti's agentic framework as an **MCP
connector**, so a Corti agent can look things up in our own sources instead of
answering from general knowledge.

The sources are named and current: the Capital Region's VIP instructions from
Rigshospitalet, the Danish Burn Association's guidance, the team's own PlastSurgeon
handbook, and every peer-reviewed case in the team's own journal.

The server never invents content. Every answer is either a verbatim excerpt with
its source reference, a piece of a decision tree written by clinicians, a PubMed
record with a PMID — or a clear statement that we have no coverage. That last one
is a valid answer, and the tools say so in plain words
(`INGEN DAEKNING I VIDENSBASEN` — "no coverage in the knowledge base") rather than
guessing. That is the whole difference between CoSurg and a chatbot.

The tool names, arguments and messages are in Danish, because the sources are
Danish and the agent searches them in Danish. The reasoning below is in English;
so is the rest of this repository.

## What it contains

Burns are the core, but the base now covers plastic surgery broadly — because the
guidelines and the case journal do.

| Source | Source type | Scope | Attribution |
|---|---|---|---|
| `data/kilder/vip-rigshospitalet.md` | guideline | **VIP Guideline Rigshospitalet Copenhagen** — 71 current, versioned instructions and guidelines from the Capital Region's VIP portal, chiefly Rigshospitalet's Department of Plastic Surgery and Burns Treatment. Burns (chemical, electrical, frostbite, inhalation, escharotomy, analgesia, outpatient care, Nexobrid, Matriderm, mucormycosis, TEN) plus melanoma, sarcoma, breast reconstruction and reduction, free flaps, cleft lip and palate, vascular anomalies, pressure sores and bites. | Fixed source name + document title, version, effective date, author, department |
| `data/kilder/brandsaar-dk.md` | guideline | **Dansk Brandsårsforening** — all of brandsaar.dk, published with the burn unit at Rigshospitalet. Depth assessment, TBSA/area estimation, Parkland fluid resuscitation, inhalation injury, chemical burns, frostbite, circumferential burns, transfer criteria, outpatient care, analgesia. | URL per section |
| `data/kilder/magnus-materiale.md` | guideline | **Rigshospitalet, Section 6052** — the "Burns" clinical compendium and the step-by-step dressing guide. | Institution + named authors per document |
| `data/kilder/plastsurgeon-brandsaar.md` | guideline | **PlastSurgeon — Validated expert platform**, the Burn Surgery chapter: anatomy, pathophysiology, depth classification, area estimation, referral to a burn unit, Parkland and the 4:2:1 principle, antibiotics, follow-up, and the five procedures (cleansing, dressing, dressing change, surgical debridement, skin grafting). | URL per chapter page + author list |
| `data/kilder/plastsurgeon-haandbog.md` | guideline | **PlastSurgeon — Validated expert platform**, the rest of the handbook: microsurgery, facial flaps, wound management, breast surgery, massive weight loss, melanoma and non-melanoma skin cancer, skin transplantation, ER facial trauma, preoperative assessment and the plastic surgery dictionary. | URL per page + chapter path + author list |
| `data/kilder/plastsurgeon-cases.md` | **case** | **PlastSurgeon — Validated expert platform** — case competition entries not also published in JPBRS. | URL + case id + author list |
| `data/kilder/jpbrs-cases.md` | **case** | **Journal of Plastic, Breast & Reconstructive Surgery** — every published case from the team's own journal, each with case id, title, authors, institution, step-by-step operative description and follow-up. | URL + case id + author list |
| `cosurg/content/trees/*.json` | — | The decision trees `burns-dk` (8 nodes, 3 dispositions) and `dressing-hand-arm` (12 steps). | Tree id, version, filename and author list |

At startup the server loads **592 source sections into 5,420 searchable excerpts**
(2.8 MB of text, 1,837 illustrations), plus both trees:

| Collection | Sections | Excerpts |
|---|---|---|
| PlastSurgeon handbook | 394 | 3,300 |
| JPBRS cases | 73 | 1,188 |
| VIP Guideline Rigshospitalet Copenhagen | 71 | 583 |
| brandsaar.dk | 36 | 128 |
| PlastSurgeon burn chapter | 14 | 96 |
| Rigshospitalet Section 6052 | 2 | 81 |
| PlastSurgeon case competition | 2 | 44 |

Everything sits in memory; there is no database and no writable state. Indexing
takes ~250 ms at startup and a search answers in 7–40 ms.

### Source names carry authority, not filenames

What a clinician sees quoted is the **institution or platform behind the
material** — never the file the text was extracted from. `Burns plast surgeon.docx`
actively undermines the answer it is supposed to support; *PlastSurgeon — Validated
expert platform* does not. Two rules govern every name: it must be **true** (we do
not promote a blog into a guideline) and it must be **verifiable** by the reader. A
name that sounds authoritative without being so is worse than a filename.

`VIP Guideline Rigshospitalet Copenhagen` is fixed and used verbatim. All 71 VIP
documents share that source name; each document's own title, version and effective
date ride along in the citation, so the instruction can be looked up in the VIP
portal.

The same names appear on CoSurg's `/guide` and `/pitfalls` pages, so this is visible
in the product, not only in the knowledge base.

### Guideline or case — the difference is stated in the answer

The guidelines say *what is recommended*. The cases say *what was done for one
patient*. Those are not the same thing, and a clinician has to be able to see which
kind of source a statement came from. Every source section therefore carries a
**source type** (`kildetype`):

- Every search hit prints it (`Kildetype: KLINISK CASE …` / `RETNINGSLINJE/HAANDBOG …`),
  and an answer containing at least one case gets an explicit warning not to read
  it as a recommendation.
- `soeg_klinisk_viden` and `list_kilder` take `kildetype: "retningslinje" | "case" | "alle"`,
  so "what does the guideline say" and "has anyone done this before" can be asked
  separately.
- Cases carry their case id, title and author list all the way out into the
  source reference.
- The server's `instructions` require the agent to say *case* out loud when it
  reproduces one.

### What is deliberately left out

A knowledge base does not get better by getting bigger. A duplicate means the same
statement takes two slots in one search result, and a case filed among guidelines
gets quoted as a recommendation. So 140 of the PlastSurgeon platform's 534 exported
pages are excluded, each for a named reason recorded in the header of
`data/kilder/plastsurgeon-haandbog.md`:

- **63 pages with no text** — video and document entries whose body is empty.
- **16 burn pages already covered verbatim** by `plastsurgeon-brandsaar.md`, plus
  the two aggregate index pages that repeat every one of them a second time.
- **9 lorem-ipsum placeholders.** Invented filler in a clinical base is the same
  error as a synthetic patient record, just smaller.
- **8 pages on the history of the field** and **7 PhD abstracts** — genuine
  material, but neither a guideline nor a patient case. Labelling a thesis abstract
  `retningslinje` would make it get quoted as a recommendation.
- **One quiz page and two navigation pages.** A question with answer options is not
  clinical guidance, and an excerpt from one could be quoted as though it were.
- **31 case-competition pages** that are the same cases already in
  `jpbrs-cases.md`. The 2 that are not are in `plastsurgeon-cases.md`, typed as
  cases.

**The `courses/burns-*` modules are empty, not paywalled.** This was previously
recorded as "requires paid membership, could not be fetched". Checked directly in
the platform's own database on 20 Aug 2026, all 11 burn modules (chemical burns,
electrical burns, inhalation injury, paediatric burns, fluid resuscitation, surgical
management, response to burn injury, early management of the burn wound, emergency
examination and others) have **zero lessons, zero content and zero description**.
Nothing was hidden behind the paywall. If they are filled in, they are the next
source in.

The courses that *do* have content — the six `massive-weight-loss` modules — are
verbatim the same pages the handbook already contains: 35 of 42 lessons match
character for character and all 42 titles match. There is therefore no separate
course document.

## Tools

| Tool | Purpose |
|---|---|
| `soeg_klinisk_viden` | Full-text search across the clinical sources. Returns verbatim excerpts with URL/document name, source type, authors, heading path, excerpt id and relevance score. Can be limited to one collection (`vip`, `brandsaar`, `magnus`, `plastsurgeon`, `jpbrs`) and to one source type (`retningslinje`, `case`). |
| `hent_kildeafsnit` | The whole page behind a search hit — by section id or URL. For when three lines are not enough context. Shows source type, case id, authors and how many illustrations the section has. |
| `hent_billeder` | The illustrations belonging to one source section — operative steps from a JPBRS case, figures from the handbook, dressing photos from Section 6052 — with captions and the full citation, so an answer can point at the right picture. Reachable only through a section you already found; see below. |
| `list_kilder` | Every source section with id, source type (`[CASE]` / `[retningslinje]`), title and URL. For deciding whether a topic is covered at all. Filterable by collection and source type. |
| `list_beslutningstraeer` | The trees with id, name, version, authors, root node and node count. |
| `hent_beslutningstrae` | A whole tree, as a readable overview or as verbatim JSON. |
| `hent_trae_node` | One node (question, permitted answer values with synonyms, red flags, outgoing edges, which nodes lead into it) or one disposition. |
| `soeg_pubmed` | Literature search through the NCBI E-utilities when our own knowledge does not reach. Title, year, journal, authors, publication type, PMID, DOI and link — never a result without a reference. Rate limits and timeouts are retried with growing backoff, so a 429 does not turn into "there is no literature". |
| `hent_pubmed_abstrakt` | Full abstracts (MEDLINE, verbatim from NCBI) for up to 10 PMIDs. A title is not a result. |
| `videnbase_status` | What the server has actually loaded. For telling "no coverage" apart from "misconfiguration". |

The server also sends `instructions` with `initialize`, so the agent gets the rule
from the start: look it up before you answer, quote the source, recommendations
come from the tree, say out loud when an excerpt is a clinical case rather than a
guideline, and report honestly when there is no coverage.

### Illustrations are attached to answers, never returned as answers

The base holds 1,837 image URLs — before/after photographs, operative steps, figures
and dressing sequences. They are extracted per source section at load time and
served by `hent_billeder`.

They are deliberately **not searchable**. An excerpt consisting only of an image
scores highest on precisely the question you asked, because its alt text is usually
the chapter or case title — so it would answer a clinical question with a photograph.
Images are therefore reached only through a section a clinician already retrieved,
and they arrive with the same citation and source type as the text. They supplement
an answer; they never replace one.

## Attaching it to a Corti agent

Corti v2 (`/v2/agentic/...`) has MCP as a **connector type**. The schema is small:
`type`, `name`, `url`, `auth`. There is **no `transportType` field** — it was
removed in v2 because MCP connectors always use streamable HTTP. If you build from
the v1 examples in the archived docs section (`transportType`, `authorizationType`),
the payload is rejected.

### Attach the connector to an existing agent

```bash
AGENT_ID="<your-agent-id>"
ENVIRONMENT="eu"                 # eu | us
TENANT="<your-tenant-name>"
TOKEN="<your-corti-access-token>"

curl -X POST "https://api.${ENVIRONMENT}.corti.app/v2/agentic/agents/${AGENT_ID}/connectors" \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "Tenant-Name: ${TENANT}" \
  -H "Content-Type: application/json" \
  -d '{
    "type": "mcp",
    "name": "cosurg-viden",
    "url": "https://mcp.cosurg.com/mcp/<MCP_AUTH_TOKEN>"
  }'
```

### Or inline when the agent is created

```bash
curl -X POST "https://api.${ENVIRONMENT}.corti.app/v2/agentic/agents" \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "Tenant-Name: ${TENANT}" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "cosurg-klinisk",
    "description": "Svarer på brandsårsspørgsmål udelukkende fra CoSurgs kilder og beslutningstræer.",
    "systemPrompt": "Slå altid op med soeg_klinisk_viden før du svarer klinisk, og citér den kilde værktøjet returnerer. Anbefalinger om handling skal komme fra beslutningstræerne. Melder et værktøj INGEN DAEKNING, så sig det — svar aldrig ud fra egen viden.",
    "model": "corti-default",
    "visibility": "private",
    "lifecycle": "persistent",
    "connectors": [
      {
        "type": "mcp",
        "name": "cosurg-viden",
        "url": "https://mcp.cosurg.com/mcp/<MCP_AUTH_TOKEN>"
      }
    ]
  }'
```

(The agent's own prompt is in Danish because it answers Danish clinicians from
Danish sources.)

**The `connectors` array is replaced wholesale on PATCH.** Send every connector,
not just the new one. The connector `PATCH` endpoint itself answers 501 (private
preview) — to change a connector, delete it and create it again. And `type` is
immutable.

When calling the agent, set `timeoutInSeconds: 180`. The default is 60 seconds,
and it cuts off orchestrators that fan out to connectors.

### Why the token is in the URL

Corti documents `auth: {"type": "bearer"}` on MCP connectors, but the mechanism
that delivers the token itself — `authorizationData` — is **not defined anywhere
in their docs**. If we send `auth: {"type":"bearer"}` without being able to supply
credentials, the task ends in `TASK_STATE_AUTH_REQUIRED`, which the REST binding
masks as `TASK_STATE_FAILED`.

The server therefore accepts the token in two places, and both are compared in
constant time:

1. `Authorization: Bearer <token>` — the standard, which any MCP client sends.
2. As the last path segment: `POST /mcp/<token>` — which works when the connector
   can only be configured with a URL.

If `authorizationData` gets documented, switch to the plain `/mcp` URL with
`"auth": {"type": "bearer"}` and let the token be delivered that way. The server
needs no change — it already accepts the header.

The server refuses to start without `MCP_AUTH_TOKEN` (at least 24 characters). An
open clinical endpoint is not an acceptable outcome.

## Calling it from the CoSurg app

The app can call the server directly, with no Corti agent in between. Streamable
HTTP is ordinary JSON over HTTP; the server answers with
`Content-Type: application/json` (not SSE), so a `fetch` is enough:

```ts
// Kald ét MCP-værktøj. Serveren er stateless — ingen session at holde styr på.
async function kaldMcp(navn: string, argumenter: Record<string, unknown>) {
  const svar = await fetch(`${process.env.COSURG_MCP_URL}/mcp`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json, text/event-stream",
      Authorization: `Bearer ${process.env.COSURG_MCP_TOKEN}`,
    },
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: 1,
      method: "tools/call",
      params: { name: navn, arguments: argumenter },
    }),
  });
  const krop = await svar.json();
  if (krop.error) throw new Error(krop.error.message);
  return (krop.result.content ?? []).map((c: { text?: string }) => c.text ?? "").join("\n");
}

const uddrag = await kaldMcp("soeg_klinisk_viden", {
  forespoergsel: "Parkland formel væskebehandling",
  antal: 3,
});
```

Some clients have to call `initialize` first; this server does not require it in
stateless mode — `tools/list` and `tools/call` work straight away.

## Running it locally

```bash
npm install
npm run build
MCP_AUTH_TOKEN=$(openssl rand -hex 32) npm start
```

The server finds the sources in `data/kilder` and the trees in
`../cosurg/content/trees` by itself when run from the repository — the same paths
as in the container. See `data/README.md` for what is allowed in the knowledge
base.

The smoke test starts the server, attaches a real MCP client and calls every tool
— including PubMed against the live API:

```bash
npm run smoke                # everything
npm run smoke -- --offline   # without PubMed
```

## Deployment

The build context is the **repository root**, not `cosurg-mcp/` — the sources and
the trees live in sibling directories and are baked into the image:

```bash
docker build -f cosurg-mcp/Dockerfile -t cosurg-mcp:1.0.0 .

docker run -d --name cosurg-mcp -p 8787:8787 \
  -e MCP_AUTH_TOKEN="$(openssl rand -hex 32)" \
  --read-only --memory 256m \
  cosurg-mcp:1.0.0
```

Or with compose (same context, Traefik labels for the Openship stack):

```bash
MCP_AUTH_TOKEN=$(openssl rand -hex 32) \
  docker compose -f cosurg-mcp/docker-compose.yml up -d --build
```

The final stage is `distroless/nodejs22` — no shell, no package manager, non-root,
and the filesystem can be read-only. There is no writable state to lose.

`GET /health` is unauthenticated, so Traefik and Openship can ping it without a
token:

```json
{"status":"ok","navn":"cosurg-mcp","version":"1.0.0","mcpSti":"/mcp",
 "transport":"streamable_http","uddrag":5420,"afsnit":592,"cases":75,
 "traeer":["burns-dk","dressing-hand-arm"]}
```

## Environment variables

| Variable | Default | Note |
|---|---|---|
| `MCP_AUTH_TOKEN` | — | **Required.** Comma-separated for several. At least 24 characters per token. |
| `PORT` / `HOST` | `8787` / `0.0.0.0` | |
| `MCP_PATH` | `/mcp` | The path streamable HTTP is exposed on. |
| `COSURG_KILDE_DIR` | `data/kilder`, otherwise `../kilder` | First existing directory wins. |
| `COSURG_TRAE_DIR` | `data/trees`, otherwise `../cosurg/content/trees` | Same. |
| `PUBMED_API_KEY` | — | Optional. Without a key 3 calls/second, with one 10. |
| `PUBMED_EMAIL` / `PUBMED_TOOL` | `mads@mahope.dk` / `cosurg-mcp` | NCBI asks for both on every call. |
| `PUBMED_TIMEOUT_MS` | `12000` | |
| `MCP_ALLOW_ANONYMOUS` | — | `1` turns authentication off. Local debugging only. |

## How the search is built

In-memory BM25 over 5,420 excerpts. No embeddings, no vector database — 2.8 MB of
text indexes in ~250 ms at startup and answers a query in 7–40 ms, and BM25 has the
property that matters here: it cannot hallucinate. A result is always a verbatim
excerpt with its source, or else there is no result.

Growing the base from 323 to 5,420 excerpts did not blunt it. IDF sharpens as the
corpus grows and diversifies, and the minimum-coverage rule below does the filtering
that size alone would otherwise undo: burn questions still return brandsaar.dk and
the VIP instructions at the top, and "kolorektal anastomoselækage stapler" still
returns nothing. What kept it honest was refusing to add bulk — duplicates,
placeholders and empty pages — rather than adding a ranking heuristic to compensate.

Three things are adapted to Danish clinical text:

- **Folding.** `æ→ae`, `ø→oe`, `å→aa`, so "ætsning", "aetsning" and "AETSNING"
  match each other.
- **Prefix matching.** Danish compounding means a search for "inhalation" has to
  hit "inhalationsskade". Partial matches score lower than full ones.
- **Heading weight.** Headings count triple — they name the topic.

Two things keep "no coverage" honest, now that the base also contains English
text:

- **Minimum coverage.** An excerpt has to hit at least half of the distinct words
  in the query. Otherwise a single coincidental word overlap gets through — a
  search for "kolorektal anastomoselækage stapler" hit the heading "Staples" in
  the skin grafting section and scored highly, because headings weigh heavily and
  the excerpt was short. The answer was not fabricated, but it was irrelevant,
  and that is just as harmful when it is delivered instead of "we have no
  coverage".
- **No image-only excerpts.** An excerpt consisting only of an image link is not
  indexed. The alt text is often the case's or the chapter's title, so such an
  excerpt scores highest on exactly the query you asked — and answers with a
  picture instead of a clinical statement. The images remain in the excerpts that
  also have body text, and all 1,837 of them stay reachable through
  `hent_billeder`.

Excerpts are bounded by markdown headings, so a hit always carries its chapter
path. Anything over 1400 characters is split at paragraph boundaries, never
mid-sentence. Results below a relevance threshold are discarded — that is where
"we do not know" becomes an honest answer instead of a poor one.
