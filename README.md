> 🇩🇰 **[Læs denne side på dansk](README.da.md)**

# CoSurg

**Voice-driven clinical decision support for burns.**
Built on the Corti API for Corti Hack for Health, Copenhagen, 20–21 August 2026.

| | |
|---|---|
| App | [cosurg.com](https://cosurg.com) |
| Knowledge server (MCP) | [mcp.cosurg.com](https://mcp.cosurg.com/health) |
| Third-party products and datasets | [THIRD-PARTY.md](THIRD-PARTY.md) |

---

## The problem

A burn patient arrives at the emergency department. Before the doctor on call can
phone the burn unit at Rigshospitalet — Denmark's national referral centre for
burns — five things must be settled. The Danish Burn Association states it as an
instruction:

> When speaking to the on-call physician at the burn unit it is important to
> present the injury mechanism, the time of injury, vital signs, the estimated
> burn area, and what treatment has already been started.
>
> — [brandsaar.dk/overflytning-af-brandsårspatienter](https://brandsaar.dk/overflytning-af-brandsa%CC%8Arspatienter/) (translated)

That is a checklist, and it is hard to hold in your head. The association writes
that it is "often difficult to assess the exact extent of the burn — it requires
calm and an overview". Calm is not what an emergency department offers at three in
the morning.

Five assessments determine the whole course, and each has a trap:

- **Depth** cannot be read reliably in the first days. It must be judged from
  colour, capillary refill and sensation — three observations, not one glance.
- **Extent** — total body surface area (TBSA) — decides whether the patient needs
  Parkland fluid resuscitation. At 20 % and above the entire management changes.
- **A circumferential burn** is not dangerous at the moment you see it. It turns
  dangerous hours later, as oedema builds and unyielding skin constricts everything
  distal to the injury.
- **Inhalation injury** can progress to upper airway obstruction *during transport*.
  The intubation decision has to be made before you set off.
- **Electrical injury** looks small on the skin. The visible lesion always
  underestimates the tissue damage underneath.

None of these is hard to remember. What is hard is remembering *all of them, every
time, under time pressure*. What gets lost is not knowledge but completeness.

## The solution

CoSurg walks the clinician through the assessment as a conversation. The agent asks
the next question aloud, the clinician answers by voice, the tree fills in node by
node, and out come the disposition, the clinical note and the diagnosis codes. Red
flags interrupt along the way — not as a warning you can scroll past, but as a
spoken message carrying the phone number of the on-call burn physician.

In operating-room mode the relationship inverts: the surgeon is scrubbed and never
touches the screen. The microphone stays open, the commands are few and distinct,
and the display shows large procedure photos of what to do in this exact step.

### What makes it different

It is easy to build a chatbot that answers questions about burns. The difference
between that and clinical decision support is where the answer comes from. We made
that choice deliberately in four places:

**The recommendation comes from the tree, never from a language model.**
The decision tree is JSON written by plastic surgeons. The engine that runs it
([`lib/tree/engine.ts`](cosurg/lib/tree/engine.ts)) is 123 lines of pure functions
without a single word about burns in it. It looks the answer value up among the
node's edges and advances. A language model cannot change where it lands, because
it takes no part in that lookup.

**The agent only interprets — and asks again rather than guessing.**
Corti's agentic framework has one job: turn "uh, about half the forearm I'd say"
into a value the node's answer schema permits. If the answer cannot be determined,
the correct output is to flag doubt, not to pick the most likely option. A guess
that looks like an answer is worse than no answer, because nothing in the result
reveals that a guess was made.

**The codes come from Corti's coding API, not from a model inventing them.**
A language model can produce an ICD-10 code that looks entirely right and does not
exist. The decision path, the transcript and the dictation are therefore sent as
three separate contexts to Corti Symphony, and the writer agent receives the codes
as a fixed list it may not touch. It may write *which step in the decision path
supports each code* — that is all.

**The chat quotes our own sources verbatim.**
Answers come from our own MCP server, which returns excerpts carrying their source
URL. If a topic is not covered, the server answers `INGEN DAEKNING I VIDENSBASEN`
("no coverage in the knowledge base"), and that is what the user sees. It does not
fall back on general knowledge, and if the server goes down the pages say there is
no coverage rather than improvising. The server is reached two ways: the guide and
pitfall pages call it directly ([`lib/corti/mcp.ts`](cosurg/lib/corti/mcp.ts)),
while the chat hands Corti its URL as an MCP connector and lets Corti's agentic
framework perform the lookup.

The same principle runs through all of it: **every statement must trace back to
something a clinician wrote.**

## How Corti is used

All five product areas are in use. The table describes what the code actually calls.

| Product area | Where | How |
|---|---|---|
| **Ambient STT** | [`lib/audio/useTranscribe.ts`](cosurg/lib/audio/useTranscribe.ts) | `/transcribe` websocket via `@corti/sdk` with `automaticPunctuation` and interim results. Listens while the clinician answers the tree's questions. |
| **Dictation STT** | [`lib/audio/useDictation.ts`](cosurg/lib/audio/useDictation.ts) | Same socket, configured for dictation: `spokenPunctuation`, so the clinician can say "full stop" and "new paragraph". Wired up in `app/page.tsx`; the dictation is appended to the note. |
| **Text generation** | [`app/api/note/route.ts`](cosurg/app/api/note/route.ts) | A Corti agent writes the clinical note from the decision path, the transcript and the dictation. |
| **Agentic framework** | [`lib/corti/agent.ts`](cosurg/lib/corti/agent.ts) | Five agents with schema connectors and structured output: answer interpreter, note writer and OR command recogniser here, plus an intent router ([`app/api/route/agent.ts`](cosurg/app/api/route/agent.ts)) and a guide topic router ([`app/api/guide/route.ts`](cosurg/app/api/guide/route.ts)). Our MCP server is attached as a connector. |
| **Medical coding** | [`lib/corti/coding.ts`](cosurg/lib/corti/coding.ts) | Corti Symphony, `POST /v2/tools/coding/`. The codes come from the coding API; the language model may only justify them. |

### Caveats we are not hiding

**We do not have access to SKS (Danish ICD-10).** Corti documents
`/coding/icd-10-dk`, but it is early alpha for selected partners. Every Danish
system name was rejected with a 400. We therefore run on `icd10int-outpatient` —
international ICD-10, of which the SKS diagnosis set is a Danish extension. The day
we are granted access, we set `CORTI_CODING_SYSTEM` and nothing else changes.

**Voice commands in dictation are configured but not active.** Corti replies
`CONFIG_ACCEPTED` while marking every command `"registered": false` for our tenant.
We therefore do not claim they work.

**TTS is not Corti.** Corti does not provide text-to-speech, and the rules
explicitly permit external TTS models. See [THIRD-PARTY.md](THIRD-PARTY.md).

**The coding model is not deterministic.** Five identical calls returned the same
principal diagnosis 5 out of 5 times, with varying — but clinically defensible —
secondary codes. The measurement is in [`cosurg/README.md`](cosurg/README.md).

## Architecture

Four parts, and the boundary between them is where the trustworthiness lives.

**The app** ([`cosurg/`](cosurg/)) is Next.js 16 with the App Router. Every Corti
call goes through a server-side API route, so the browser never sees credentials.
Paid routes sit behind `guard()`: origin lock, per-IP quota and a length cap on all
free text.

**The tree engine** ([`cosurg/lib/tree/`](cosurg/lib/tree/)) is stateless and
domain-agnostic. It knows nothing about burns — it knows about nodes, edges, red
flags and dispositions. That is why the same engine runs both our trees:

| Tree | What | Contents |
|---|---|---|
| [`burns.json`](cosurg/content/trees/burns.json) | Acute assessment | 8 nodes: mechanism, inhalation, TBSA, fluids, depth, circumferential, location, cooling. 4 red flags. 3 dispositions, each with source URLs. |
| [`dressing-hand-arm.json`](cosurg/content/trees/dressing-hand-arm.json) | Dressing procedure guide | 12 steps with 71 procedure photos. |

A procedure guide and a diagnostic decision tree are the same data structure.
**Trees are data, not code** — a new tree for bite wounds or frostbite requires no
change to the engine.

**The MCP server** ([`cosurg-mcp/`](cosurg-mcp/)) holds the clinical knowledge base
and answers only with verbatim excerpts carrying their source. Nine tools: full-text
search across the sources, retrieval of whole source sections, lookups into the
decision trees, PubMed search, and a status view. No database, no writable state —
everything is loaded at startup, so an answer can always be traced to a file. Current
figures are on [`/health`](https://mcp.cosurg.com/health).

The server is also where we maintain two distinctions a clinician must not be able to
miss. **Clinical knowledge versus test data:** `data/kilder/` becomes the knowledge
base and may be quoted; the organiser's synthetic patient records sit in `test-data/`,
where the server physically cannot reach them. A fictional patient quoted as a clinical
source would look entirely credible — which is why the separation is physical and not
merely a label. **Guideline versus case:** every source section carries a `kildetype`,
so a single patient's course cannot come to sound like a recommendation. The source
list and the rules are in [`cosurg-mcp/data/README.md`](cosurg-mcp/data/README.md).

**The deployment** runs on Nordic Surgery Lab's own server (Hetzner, Falkenstein)
under Openship with Traefik and Let's Encrypt. The app is a Next.js standalone image
running as non-root; the MCP server is distroless with a read-only filesystem and a
256 MB memory cap.

## Getting started

You need Node 20+ and a set of Corti credentials from the Corti Console.

```bash
git clone git@github.com:mahope/cosurg.git
cd cosurg/cosurg

cp .env.example .env.local     # fill in CORTI_CLIENT_ID and CORTI_CLIENT_SECRET
npm install
npm run dev                    # http://localhost:3000
```

The app runs without the MCP server — the clinical chat then reports that there is
no connection to the knowledge base rather than answering from general knowledge.
To run both:

```bash
cd ../cosurg-mcp
npm install && npm run build
MCP_AUTH_TOKEN=$(openssl rand -hex 32) npm start   # http://localhost:8787/mcp
```

The server finds `data/kilder/` and `../cosurg/content/trees/` on its own. Then set
`MCP_URL` and `MCP_AUTH_TOKEN` in the app's `.env.local`.

| Environment variable | Default | Note |
|---|---|---|
| `CORTI_ENVIRONMENT` | `eu` | `eu` or `us` |
| `CORTI_TENANT` | `base` | Used in the auth URL and the `Tenant-Name` header |
| `CORTI_CLIENT_ID` / `CORTI_CLIENT_SECRET` | — | From the Corti Console |
| `CORTI_CODING_SYSTEM` | `icd10int-outpatient` | Set to an SKS system name once access is granted |
| `SYV_API_KEY` | — | Without a key, spoken output falls back to the browser's built-in voice |
| `MCP_URL` / `MCP_AUTH_TOKEN` | — | Without them the clinical chat is disabled |
| `ALLOWED_ORIGINS` | — | Comma-separated, for preview deployments |

The whole stack in containers, from the repository root:

```bash
docker build -f cosurg-mcp/Dockerfile -t cosurg-mcp .
docker build -f cosurg/Dockerfile -t cosurg ./cosurg
```

## The team

**Magnus Avnstorp** — plastic surgeon. Clinical content and the professional basis
for the decision tree; sourced Rigshospitalet's step-by-step material from Section
6052 and the 71 procedure photos. Presenting.

**Rami Mossad Ibrahim** — plastic surgeon. Clinical content and guidelines. Author of
[brandsaar.dk](https://brandsaar.dk) for the Danish Burn Association — the site the
entire knowledge base rests on. Presenting.

**Mads Holst Jensen** — developer. App, tree engine, Corti integration, MCP server
and deployment.

The procedure guide is based on Rigshospitalet's step-by-step material by
**RN Pia Høy and Alice Rimmen**, in collaboration with **consultant Rikke Holmgaard**
and **junior doctor Carla Kruse**, Section for Plastic Surgery and Burn Treatment 6052.

## What is in this repository

| Path | What |
|---|---|
| [`cosurg/`](cosurg/) | The Next.js app. Clinical content lives in `content/trees/`, never in code. |
| [`cosurg-mcp/`](cosurg-mcp/) | The MCP server and the clinical knowledge base with provenance. |
| [`docs/`](docs/) | Specification, build plan and the organiser's brief. |
| [`DEMO.md`](DEMO.md) | Demo script. English throughout; the spoken lines stay in Danish, because the demo is delivered in Danish. |
| [`THIRD-PARTY.md`](THIRD-PARTY.md) | Everything we use that is not Corti. |
| [`README.da.md`](README.da.md) | This page in Danish. |

All clinical material was produced by the team's own members or by named colleagues,
and is cleared for use in the demo and the submission.
