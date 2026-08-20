# cosurg-mcp

An MCP server holding CoSurg's clinical knowledge about burns. It attaches to
Corti's agentic framework as an **MCP connector**, so a Corti agent can look
things up in our own sources instead of answering from general knowledge.

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

| Source | Source type | Scope | Attribution |
|---|---|---|---|
| `data/kilder/brandsaar-dk.md` | guideline | All of brandsaar.dk — the Danish Burn Association / the burn unit at Rigshospitalet. Depth assessment, TBSA/area estimation, Parkland fluid resuscitation, inhalation injury, chemical burns, frostbite, circumferential burns, transfer criteria, outpatient care, analgesia. | URL per section |
| `data/kilder/magnus-materiale.md` | guideline | The team's own material: the "Burns plast surgeon" document and the dressing guide from Section 6052 at Rigshospitalet. | Document name + chapter path |
| `data/kilder/plastsurgeon-brandsaar.md` | guideline | The Burn Surgery chapter from the team's own handbook, beta.plastsurgeon.com: anatomy, pathophysiology, depth classification, area estimation, referral to a burn unit, Parkland and the 4:2:1 principle, antibiotics, follow-up, and the five procedures (cleansing, dressing, dressing change, surgical debridement, skin grafting). | URL per chapter page + author list |
| `data/kilder/jpbrs-cases.md` | **case** | Peer-reviewed burn cases from the team's own journal, beta.jpbrs.com — each with case id, title, authors, institution, step-by-step operative description and follow-up. | URL + case id + author list |
| `cosurg/content/trees/*.json` | — | The decision trees `burns-dk` (8 nodes, 3 dispositions) and `dressing-hand-arm` (12 steps). | Tree id, version, filename and author list |

At startup the server loads **54 source sections into 323 searchable excerpts**,
plus both trees: brandsaar.dk 36 sections / 128 excerpts, the team's own material
2 / 80, the PlastSurgeon handbook 14 / 96 and the JPBRS cases 2 / 19. Everything
sits in memory; there is no database and no writable state.

### Guideline or case — the difference is stated in the answer

The first sources say *what is recommended*. The JPBRS cases say *what was done
for one patient*. Those are not the same thing, and a clinician has to be able to
see which kind of source a statement came from. Every source section therefore
carries a **source type** (`kildetype`):

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

- **The course modules** `beta.plastsurgeon.com/courses/burns-*` (chemical and
  electrical burns, inhalation injury, paediatric burns, fluid resuscitation,
  surgical management and others) require paid membership. Without access they
  were not fetched — we do not guess at content. If the team gets a login, they
  are the next source in.
- **Non-burn cases on JPBRS.** All 73 cases on the site were fetched and
  searched; only two concern burns, and only those two are included. Three others
  matched solely on the department name "Department of Burns and Plastic Surgery"
  and are excluded. The reasoning is at the top of `data/kilder/jpbrs-cases.md`.
- **Quizzes and MCQ pages** from the handbook. A question with answer options is
  not clinical guidance, and an excerpt from one could be quoted as though it
  were.
- **The Skin Transplantation chapter**, which sits outside the burns chapter.
  Skin grafting for burns itself is covered by
  `burns-treatment/procedures/procedure-skin-grafting`, which is included.

## Tools

| Tool | Purpose |
|---|---|
| `soeg_klinisk_viden` | Full-text search across the clinical sources. Returns verbatim excerpts with URL/document name, source type, authors, heading path, excerpt id and relevance score. Can be limited to one collection (`brandsaar`, `magnus`, `plastsurgeon`, `jpbrs`) and to one source type (`retningslinje`, `case`). |
| `hent_kildeafsnit` | The whole page behind a search hit — by section id or URL. For when three lines are not enough context. Shows source type, case id and authors. |
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
 "transport":"streamable_http","uddrag":323,"afsnit":54,"cases":2,
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

In-memory BM25 over 323 excerpts. No embeddings, no vector database — 221 KB of
text answers in under a millisecond, and BM25 has the property that matters here:
it cannot hallucinate. A result is always a verbatim excerpt with its source, or
else there is no result.

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
  also have body text.

Excerpts are bounded by markdown headings, so a hit always carries its chapter
path. Anything over 1400 characters is split at paragraph boundaries, never
mid-sentence. Results below a relevance threshold are discarded — that is where
"we do not know" becomes an honest answer instead of a poor one.
