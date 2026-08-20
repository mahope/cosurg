> 🇩🇰 **[Læs denne side på dansk](README.da.md)**

# CoSurg

**One field. The clinician says what they are looking at, and the system works out
what they need — a led assessment, a sourced answer, a treatment lookup or a
warning. Every answer names the clinical source it came from.**
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

Completeness is only half of it. The other half arrives the moment a doubt does.
How is area estimated on a child? How much fluid does an 80 kg man with 30 % need?
What is actually done for a circumferential forearm burn? Each of those sends the
clinician somewhere else — another system, another search, another way of asking —
and the assessment they were halfway through becomes something they have to
remember to return to. Our tools are separated because we built them separately.
The clinical moment is not separated at all.

## The solution

CoSurg is one field. The clinician says what they are looking at, and the system
works out what kind of help that was. Choosing the tool is the part there is no
time for, so CoSurg does not ask anyone to choose.

Four things can come back, and which one it is is not the clinician's problem:

- **A led assessment.** The utterance describes a patient, so the matching pathway
  opens and the first question is asked aloud. The clinician's own words become the
  first line of the transcript, so the description is clinical information from the
  outset rather than something typed twice.
- **A sourced answer.** The utterance is a question, so it is looked up — in our own
  knowledge base or, when that does not reach, in the literature — and comes back
  with the excerpt verbatim and the source named.
- **A treatment lookup.** The utterance asks how a condition is handled, so the
  whole course is assembled from our own sources in clinical order, section by
  section, each carrying its origin.
- **A question back.** The utterance can be read two ways, so CoSurg says so and
  asks which was meant.

**The convergence is the product, and the moment it earns its place is in the
middle of something.** Standing at *how large is the area?*, the clinician asks
"how do I treat a superficial dermal burn?" — a question, not an answer, and CoSurg
reads it as one because nobody answers a question by opening with "how". The lookup
appears beneath the question that is still standing, quoting our sources with their
names on them, and the foot of the card reads *the pathway is held at step 4 / 8*.
Nothing closed, nothing has to be found again, and the question never enters the
record as a statement about the patient.

Along the way red flags interrupt — not as a warning you can scroll past, but as a
spoken message carrying the phone number of the on-call burn physician. And in
handsfree mode the relationship inverts: the surgeon is scrubbed and never touches
the screen. The microphone stays open, the commands are few and distinct, and the
display shows large procedure photos of what to do in this exact step.

### What makes it different

It is easy to build a chatbot that answers questions about burns. The difference
between that and clinical decision support is not how well it puts things. It is
where the answer comes from — and whether anyone can find out afterwards. We made
that choice deliberately in five places.

**It asks again rather than guessing, and the asking is calibrated.**
Question or answer is the app's most dangerous single decision. The two errors are
not the same size: an answer read as a question costs a lookup and a repetition,
while a question read as an answer moves a clinical decision on a false basis and
leaves nothing in the result to show that it did. The layers are therefore ordered
by that asymmetry. A deterministic classifier
([`components/unified/intent.ts`](cosurg/components/unified/intent.ts)) decides only
what it is certain of, at no latency cost and with no network; everything else falls
through to Corti's answer interpreter; and only when *that* reports doubt is Corti's
intent router asked whether the utterance was a question after all
([`app/api/route/agent.ts`](cosurg/app/api/route/agent.ts)). When the reading is
genuinely two-way — "is it deep?" asked at the depth node — CoSurg stops and asks
which was meant. It never picks the likelier one.

The same rule decides which pathway an utterance opens. That is matched in the
browser ([`components/treeRouting.ts`](cosurg/components/treeRouting.ts)), so we can
say precisely why: a winner needs both an absolute minimum and a clear lead over the
runner-up. "I need to dress a hand with a burn" hits both pathways — and that is
exactly where the app asks rather than picks.

**When the answer is a recommendation, it comes from the tree, never from a language
model.** The decision tree is JSON written by plastic surgeons. The engine that runs
it ([`lib/tree/engine.ts`](cosurg/lib/tree/engine.ts)) is 123 lines of pure functions
without a single word about burns in it. It looks the answer value up among the
node's edges and advances. A language model cannot change where it lands, because it
takes no part in that lookup. The led assessment is one of the shapes an answer can
take — and it is the shape where determinism matters most, because it is the one
that ends in a disposition.

**The codes come from Corti's coding API, not from a model inventing them.**
A language model can produce an ICD-10 code that looks entirely right and does not
exist. The decision path, the transcript and the dictation are therefore sent as
three separate contexts to Corti Symphony, and the writer agent receives the codes
as a fixed list it may not touch. It may write *which step in the decision path
supports each code* — that is all.

**Lookups quote our own sources, and say so when there are none.**
Answers come from our own MCP server, which returns excerpts carrying their source
URL. If a topic is not covered, the server answers `INGEN DAEKNING I VIDENSBASEN`
("no coverage in the knowledge base"), and that is what the user sees. It does not
fall back on general knowledge, and if the server goes down the pages say there is
no coverage rather than improvising. The server is reached two ways: the treatment
lookup calls it directly ([`lib/corti/mcp.ts`](cosurg/lib/corti/mcp.ts)), while the
question lookup hands Corti its URL as an MCP connector and lets Corti's agentic
framework perform the search. The knowledge base holds 4,849 excerpts drawn from 592
named source sections.

**Every answer states how well it is backed.** A lookup is labelled *Source-backed*,
*Partly backed*, *Reasoned* or *Not substantiated*, and each citation says whether it
came from the *Knowledge base* or the *Literature*, with its identifier and a link.
Where the agent has reasoned beyond the sources, the reasoning is shown in its own
box under the heading *Clinical reasoning — not from a source*. The clinician does
not have to work out how much weight an answer will bear; the answer says.

The same principle runs through all of it: **every statement must trace back to
something a clinician wrote, and the app has to be able to say which.**

## How Corti is used

All five product areas are in use. The table describes what the code actually calls.

| Product area | Where | How |
|---|---|---|
| **Ambient STT** | [`lib/audio/useTranscribe.ts`](cosurg/lib/audio/useTranscribe.ts) | `/transcribe` websocket via `@corti/sdk` with `automaticPunctuation` and interim results. Listens from the first utterance in the field and on through the assessment. |
| **Dictation STT** | [`lib/audio/useDictation.ts`](cosurg/lib/audio/useDictation.ts) | Same socket, configured for dictation: `spokenPunctuation`, so the clinician can say "full stop" and "new paragraph". Wired up in `app/page.tsx`; the dictation is appended to the note. |
| **Text generation** | [`app/api/note/route.ts`](cosurg/app/api/note/route.ts) | A Corti agent writes the clinical note from the decision path, the transcript and the dictation. |
| **Agentic framework** | [`lib/corti/agent.ts`](cosurg/lib/corti/agent.ts) | Four agents with schema connectors and structured output: answer interpreter and note writer here, plus an intent router ([`app/api/route/agent.ts`](cosurg/app/api/route/agent.ts)) and a topic router for the treatment lookup ([`app/api/guide/route.ts`](cosurg/app/api/guide/route.ts)). Our MCP server is attached as a connector. |
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
Paid routes sit behind `guard()` — an origin lock plus a per-IP quota — and all free
text passes a length cap (`cap()`) before it reaches a paid API. The recognition that
decides what an utterance was runs in the browser, before any of that: it costs
nothing, works without a network, and can name its own reason.

**The tree engine** ([`cosurg/lib/tree/`](cosurg/lib/tree/)) is stateless and
domain-agnostic. It knows nothing about burns — it knows about nodes, edges, red
flags and dispositions. That is why the same engine runs both our trees:

| Tree | What | Contents |
|---|---|---|
| [`burns.json`](cosurg/content/trees/burns.json) | Acute assessment | 8 nodes: mechanism, inhalation, TBSA, fluids, depth, circumferential, location, cooling. 5 red flags. 3 dispositions, each carrying its source references. |
| [`dressing-hand-arm.json`](cosurg/content/trees/dressing-hand-arm.json) | Dressing procedure guide | 12 steps, showing 34 procedure photos drawn from the 71-slide source set. |

A procedure guide and a diagnostic decision tree are the same data structure.
**Trees are data, not code** — a new tree for bite wounds or frostbite requires no
change to the engine. Which of them opens is decided from what the clinician said,
so the tree selector in the header is a correction, not a first step.

**The MCP server** ([`cosurg-mcp/`](cosurg-mcp/)) holds the clinical knowledge base
and answers only with verbatim excerpts carrying their source. Ten tools: full-text
search across the sources, retrieval of whole source sections and their
illustrations, lookups into the decision trees, PubMed search and abstracts, and a
status view. No database, no writable state — everything is loaded at startup, so an
answer can always be traced to a file. Current figures are on
[`/health`](https://mcp.cosurg.com/health).

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

The app runs without the MCP server — lookups then report that there is no
connection to the knowledge base rather than answering from general knowledge. To
run both:

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
| `MCP_URL` / `MCP_AUTH_TOKEN` | — | Without them the lookups are disabled |
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
| [`DEMO.md`](DEMO.md) | Demo script. English throughout; the emergency procedure is repeated in Danish, because that is the part you read under pressure. |
| [`THIRD-PARTY.md`](THIRD-PARTY.md) | Everything we use that is not Corti. |
| [`README.da.md`](README.da.md) | This page in Danish. |

All clinical material was produced by the team's own members or by named colleagues,
and is cleared for use in the demo and the submission.
