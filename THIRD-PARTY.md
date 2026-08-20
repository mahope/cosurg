# Tredjeparter — alt vi bruger som ikke er Corti

*(English below — [jump to the English version](#third-parties--everything-we-use-that-is-not-corti))*

Reglerne for Corti Hack for Health kræver at afleveringsrepoet indeholder en fil
med hvilke andre produkter og datasæt der er brugt. Det er denne fil.

Reglen der betyder noget er "kun Corti som AI-API", med tre undtagelser:
**TTS-modeller, OCR-modeller og MCP-forbindelser koblet via Cortis agentic
framework**. Vi omgår ikke et Corti-produkt noget sted. Listen nedenfor er komplet
i den forstand at hver eneste udgående netværksforbindelse i koden står her.

Al kildehenvisning er til fil og linje, så det kan efterprøves.

---

## 1. AI-tjenester der ikke er Corti

### Syv.ai — Plapre (dansk text-to-speech)

| | |
|---|---|
| **Hvad** | Dansk text-to-speech-model, hostet i EU på `platform.syv.ai` |
| **Hvor** | `cosurg/app/api/tts/route.ts:6` — `https://platform.syv.ai/v1/audio/speech`, model `syvai/plapre-nano` (linje 7) |
| **Bruges til** | Oplæsning af træets spørgsmål og af røde flag på dansk. Kun dansk: ruten svarer 501 for alt andet sprog (`route.ts:37-39`). |
| **Vilkår** | Kommerciel API, kaldes med `SYV_API_KEY`. Modellens egen licens er ikke dokumenteret i repoet — en kodekommentar (`route.ts:19`) noterer at Plapre på sigt kan køre lokalt som open source, men vi har ikke verificeret licensen og påstår den ikke. |

**Hvorfor det ikke er et Corti-produkt vi omgår:** Corti leverer ikke
text-to-speech. Der er intet Corti-endpoint at bruge i stedet, og reglerne
tillader eksplicit eksterne TTS-modeller. Vi valgte en dansk model fordi hele
demoen kører på dansk, og fordi den er EU-hostet.

### Browserens SpeechSynthesis (TTS-fallback)

| | |
|---|---|
| **Hvad** | `window.speechSynthesis` — browserens indbyggede talesyntese. Ingen tjeneste, ingen konto, intet netværk. |
| **Hvor** | `cosurg/lib/audio/speak.ts:22-41` |
| **Bruges til** | Nøjagtig samme oplæsning som Syv.ai, når netværks-TTS ikke kan bruges. |

Fallbacken aktiveres i seks tilfælde, alle læsbare i `speak.ts`: netværks-TTS
er slået fra for sessionen (`:45`), browseren er offline (`:46`), `/api/tts`
svarer 501 fordi der ikke er nogen `SYV_API_KEY` eller fordi sproget ikke er dansk
(`:62-65`), ruten svarer 502/503 fordi Syv.ai fejlede eller timede ud (`:66`),
`fetch` kaster (`:71-73`), eller afspilningen selv fejler — typisk
autoplay-blokering (`:89-96`).

**Hvorfor:** demoen køres på venue-wifi af to læger uden udvikler til stede.
Oplæsningen er den eneste vej agenten har til at føre samtalen, så den må ikke
kunne fejle på grund af netværket. Browserstemmen er dårligere, men den kan ikke
gå ned.

### Ingen tredjeparts speech-to-text

Der findes ingen brug af `SpeechRecognition` eller `webkitSpeechRecognition` i
repoet. **Al tale-til-tekst er Corti** — `lib/audio/useTranscribe.ts` og
`lib/audio/useDictation.ts`, begge via `@corti/sdk`.

### Connectors der kører hos Corti

Den kliniske chat aktiverer fire connectors fra Cortis eget registry
(`cosurg/lib/corti/chat.ts:74-79`, verificeret mod
`GET /v2/agentic/registry/connectors` 20/8 2026):
`pubmed-expert`, `web-search-expert`, `medical-calculator-expert`,
`clinical-trials-expert`.

De kører hos Corti, og vi kalder dem ikke selv. `web-search-expert` betyder at der
sker et websøgningskald hos en tredjepart, men hvilken udbyder Corti bruger fremgår
ikke af noget vi har adgang til. Vi nævner det fordi det er sandt, ikke fordi vi kan
navngive det.

---

## 2. Eksterne datakilder

### NCBI PubMed E-utilities

| | |
|---|---|
| **Hvad** | US National Library of Medicines offentlige API til den biomedicinske litteratur |
| **Hvor** | `cosurg-mcp/src/konfiguration.ts:69`, kald i `cosurg-mcp/src/pubmed.ts:44,52`. Endpoints: `esearch.fcgi`, `esummary.fcgi`, `efetch.fcgi`. |
| **Bruges til** | MCP-værktøjerne `soeg_pubmed` og `hent_pubmed_abstrakt` — litteraturopslag når et spørgsmål ikke er dækket af vores egne kilder. Det er de eneste to af serverens ni værktøjer med `openWorldHint: true` (`server.ts:504`, `:572`); resten svarer udelukkende fra lokale filer. |
| **Vilkår** | Gratis og offentligt. NCBI kræver at hvert kald identificerer sig med værktøjsnavn og kontaktmail — vi sender `tool=cosurg-mcp` og `email=mads@mahope.dk` (`pubmed.ts:30-36`). Rate limit uden API-nøgle er 3 kald/sekund; vi kalder med backoff og 12 s timeout. |

**Hvorfor det ikke omgår Corti:** PubMed er en litteraturdatabase, ikke en
AI-tjeneste. Der er ingen model involveret — vi slår referencer op og returnerer
titel, forfattere og abstract som de står. Corti har selv en `pubmed-expert`, som
vi også bruger; vores eget værktøj findes fordi MCP-serveren skal kunne svare uden
at gå gennem en agent.

### brandsaar.dk — Dansk Brandsårsforening

| | |
|---|---|
| **Hvad** | Dansk Brandsårsforenings kliniske retningslinjer: 34 sider plus lommekortene fra 2019 og 2022 |
| **Hvor** | `cosurg-mcp/data/kilder/brandsaar-dk.md`, originalerne i `cosurg-mcp/data/originaler/` |
| **Bruges til** | Vidensbasen som den kliniske chat citerer, og det faglige grundlag for beslutningstræet `burns.json` |
| **Vilkår** | **Skrevet af holdmedlem Rami Mossad Ibrahim.** Brugen er afklaret med ham direkte 20/8 2026. |

Hver af de tre dispositioner i `burns.json` bærer sine kilde-URL'er, fx
`brandsaar.dk/overflytning-af-brandsårspatienter` og `brandsaar.dk/vaeskebehandling`.
Sitet henviser selv til **EMSB** (Emergency Management of Severe Burns) og noterer
at Rigshospitalet er certificeret af **European Burn Association** — begge er
faglige referencer i teksten, ikke systemer vi integrerer med.

### Rigshospitalet, Afsnit 6052 — procedurematerialet

| | |
|---|---|
| **Hvad** | Step-by-step-guide til brandsårsforbindinger (71 slides med fotos) og dokumentet "Burns plast surgeon" |
| **Hvor** | `cosurg-mcp/data/kilder/magnus-materiale.md`; de 71 fotos som JPG i `cosurg/public/step-images/`; proveniens i `cosurg-mcp/data/originaler/PROVENIENS.md` |
| **Bruges til** | Procedureguiden `dressing-hand-arm.json` og dens 71 billeder — det man ser i operationsstue-tilstand |
| **Forfattere** | Ordret fra `dressing-hand-arm.json:12-16`: *"spl. Pia Høy og Alice Rimmen, i samarbejde med ovl. Rikke Holmgaard og reservelæge Carla Kruse"*, Afsnit for plastikkirurgi og brandsårsbehandling 6052, Rigshospitalet |
| **Vilkår** | Skaffet af holdmedlem Magnus Avnstorp fra hans eget afsnit. Brugen er afklaret 20/8 2026. |

### PlastSurgeon-håndbogen og JPBRS — holdets egne udgivelser

| | |
|---|---|
| **Hvad** | `beta.plastsurgeon.com` — holdets egen kliniske håndbog, kapitlet Burn Surgery. Og `beta.jpbrs.com` — Journal of Plastic, Breast & Reconstructive Surgery, holdets eget peer-reviewede open access-tidsskrift, brandsårscases. |
| **Hvor** | `cosurg-mcp/data/kilder/plastsurgeon-brandsaar.md` og `cosurg-mcp/data/kilder/jpbrs-cases.md` |
| **Forfattere** | Håndbogskapitlet: Rami Mossad Ibrahim MD, Elisabeth Lauritzen MD, Frederik Gulmark Hansen med.stud., Anne Mosebo med.stud., Magnus Balslev Avnstorp MD og Rikke Holmgaard, Consultant, Burns Specialist, MD, PhD. Cases: navngivne forfattere med institution pr. case. |
| **Vilkår** | Begge sites drives af holdet selv. Kun frit tilgængeligt indhold er hentet — kursusmodulerne under `/courses/burns-*` kræver betalt medlemskab og er ikke med, hvilket er noteret i selve kildefilen. |

**Cases behandles anderledes end retningslinjer.** En retningslinje siger hvad der
anbefales; en case siger hvad der blev gjort for én patient. Hvert kildeafsnit bærer
derfor en `kildetype`, søgeresultater viser den, og agenten skal sige det højt når
den gengiver en case. Ellers kan et enkeltstående forløb komme til at lyde som en
anbefaling — den fejl kan en læge ikke se på svaret.

### Arrangørens datasæt — brugt til test, aldrig som klinisk kilde

| | |
|---|---|
| **Hvad** | Corti Hack for Healths eget datasæt: seks syntetiske patientjournaler og 24 engelske lydfiler |
| **Hvor** | `cosurg-mcp/test-data/` — bevidst uden for `cosurg-mcp/data/`, hvor vidensbasen ligger |
| **Bruges til** | Ingenting i produktet. Journalerne er almen medicin og onkologi på engelsk; der er hverken plastikkirurgiske cases eller brandsår. |

**Vi holder dem fysisk adskilt fra vidensbasen, og det er et bevidst valg.** En
opdigtet patient er ikke evidens. En syntetisk journal og en klinisk retningslinje
ser ens ud i et markdown-uddrag, så hvis en opdigtet patient nogensinde blev citeret
som kilde i et klinisk svar, ville svaret se fuldstændig troværdigt ud og være
værdiløst. Derfor er adskillelsen fysisk frem for en mærkat: MCP-serveren indlæser
kun `data/kilder/` og kan ikke nå `test-data/`. `cosurg-mcp/Dockerfile:27-29`
advarer eksplicit mod at kopiere dem ind. Se `cosurg-mcp/data/README.md` og
`cosurg-mcp/test-data/README.md`.

### Værktøj brugt i dataforarbejdningen

**MarkItDown** (Microsoft, MIT) konverterede lommekort-PDF'erne til markdown —
noteret i `cosurg-mcp/data/kilder/brandsaar-dk.md:3`. Kun brugt offline under
forberedelsen; ikke en del af produktet.

---

## 3. Open source-afhængigheder

Alle versioner er læst i `package.json` og bekræftet mod det installerede
`node_modules`. Alle licenser er læst i pakkernes egen `package.json`.

### Appen (`cosurg/`)

| Pakke | Version | Licens | Rolle |
|---|---|---|---|
| `@corti/sdk` | 5.0.0 | MIT | **Corti-ejet.** Transcribe-websocket og agent-kald. |
| `next` | 16.3.1 | MIT | Framework (App Router), server-side API-ruter |
| `react` | 19.2.8 | MIT | UI |
| `react-dom` | 19.2.8 | MIT | UI |
| `tailwindcss` + `@tailwindcss/postcss` | 4.3.3 | MIT | Styling |
| `typescript` | 5.9.3 | Apache-2.0 | Sprog (kun byggetid) |
| `eslint` | 9.39.5 | MIT | Linting (kun byggetid) |
| `eslint-config-next` | 16.3.1 | MIT | Linting (kun byggetid) |
| `@types/node`, `@types/react`, `@types/react-dom` | 20.19.43 / 19.2.18 / 19.2.4 | MIT | Typedefinitioner (kun byggetid) |

### MCP-serveren (`cosurg-mcp/`)

| Pakke | Version | Licens | Rolle |
|---|---|---|---|
| `@modelcontextprotocol/sdk` | 1.30.0 | MIT | MCP-protokol og streamable HTTP-transport |
| `zod` | 3.25.76 | MIT | Skemavalidering af værktøjs-argumenter |
| `typescript` | 5.9.3 | Apache-2.0 | Sprog (kun byggetid) |
| `@types/node` | 24.10.1 | MIT | Typedefinitioner (kun byggetid) |

**Der er ingen `@corti/*`-afhængighed i MCP-serveren.** Koblingen til Corti er
udelukkende protokollen: Corti kalder serveren som MCP-connector over HTTP.

Transitive afhængigheder trukket ind af MCP-SDK'et: `express` 5.2.1, `cors` 2.8.6,
`express-rate-limit` 8.6.2, `ajv` 8.20.0, `eventsource-parser` 3.1.1,
`pkce-challenge` 5.0.1, `raw-body` 3.0.2, `content-type` 1.0.5 (alle MIT),
`zod-to-json-schema` 3.25.2 (ISC), `json-schema-typed` 8.0.2 (BSD-2-Clause).

Søgningen i vidensbasen er **egen kode uden bibliotek** — BM25 i hukommelsen
(`cosurg-mcp/src/soegning.ts`). Ingen embeddings, ingen vektordatabase, ingen
tredjeparts søgetjeneste.

### Skrifttyper

**Roboto** og **Roboto Mono** (Google, Apache-2.0), hentet gennem
`next/font/google` (`cosurg/app/layout.tsx:2`). De hentes **på byggetidspunktet**
og serveres derefter fra vores egen origin: CSP'en sætter `font-src 'self'`
(`cosurg/next.config.ts:26`), så browseren laver aldrig et opslag mod
`fonts.gstatic.com`. Der ligger 16 `.woff2`-filer i byggeoutputtet.

Alle øvrige assets er lokale. Der er ingen CDN-kald, ingen analytics og ingen
fejlrapporteringstjeneste i koden. `NEXT_TELEMETRY_DISABLED=1` er sat i begge
byggetrin af `cosurg/Dockerfile` (linje 11 og 17), så Next.js-telemetri til Vercel
er slået fra.

---

## 4. Infrastruktur

| | Hvad | Rolle |
|---|---|---|
| **Hetzner** | Cloud-hosting, Falkenstein (EU) | Nordic Surgery Labs egen server, hvor både app og MCP-server kører |
| **Openship** | Selvhostet deploy-platform | Kører containerne. `cosurg-mcp/docker-compose.yml:6` |
| **Traefik** | Reverse proxy | Router `mcp.cosurg.com` til port 8787. `docker-compose.yml:36-41` |
| **Let's Encrypt** | Certifikatudsteder | `traefik.http.routers.cosurg-mcp.tls.certresolver: letsencrypt` |
| **Docker** | Containere | Base-images: `node:22-alpine` (Node.js MIT, Alpine Linux), `alpine:3.20`, `gcr.io/distroless/nodejs22-debian12:nonroot` (Google Distroless, Apache-2.0) |
| **GitHub** | Kodehosting | `github.com/mahope/cosurg` |

Ingen af disse behandler klinisk indhold. De flytter pakker og udsteder
certifikater.

---

## 5. Varemærker nævnt i det kliniske indhold

Beslutningstræerne navngiver konkrete produkter, fordi retningslinjerne gør det:
**Mepilex Transfer** (Mölnlycke) og **Jelonet** (Smith+Nephew). Det er
forbindingsmaterialer nævnt i behandlingsvejledningen — ikke leverandører,
integrationer eller afhængigheder. Vi har intet forhold til nogen af firmaerne.

---
---

# Third parties — everything we use that is not Corti

The Corti Hack for Health rules require the submission repository to contain a file
listing what other products and datasets were used. This is that file.

The rule that matters is "Corti only as the AI API", with three exceptions:
**TTS models, OCR models and MCP connections attached via Corti's agentic
framework**. We do not route around a Corti product anywhere. The list below is
complete in the sense that every outbound network connection in the code appears
here.

Every claim cites file and line so it can be checked.

---

## 1. AI services that are not Corti

### Syv.ai — Plapre (Danish text-to-speech)

| | |
|---|---|
| **What** | Danish text-to-speech model, hosted in the EU at `platform.syv.ai` |
| **Where** | `cosurg/app/api/tts/route.ts:6` — `https://platform.syv.ai/v1/audio/speech`, model `syvai/plapre-nano` (line 7) |
| **Used for** | Speaking the tree's questions and the red flags aloud in Danish. Danish only: the route returns 501 for any other language (`route.ts:37-39`). |
| **Terms** | Commercial API, called with `SYV_API_KEY`. The model's own licence is not documented in this repository — a code comment (`route.ts:19`) notes that Plapre may eventually run locally as open source, but we have not verified the licence and do not claim it. |

**Why this is not routing around a Corti product:** Corti does not provide
text-to-speech. There is no Corti endpoint to use instead, and the rules explicitly
permit external TTS models. We chose a Danish model because the whole demo runs in
Danish, and because it is EU-hosted.

### The browser's SpeechSynthesis (TTS fallback)

| | |
|---|---|
| **What** | `window.speechSynthesis` — the browser's built-in speech synthesis. No service, no account, no network. |
| **Where** | `cosurg/lib/audio/speak.ts:22-41` |
| **Used for** | Exactly the same speech output as Syv.ai, whenever network TTS cannot be used. |

The fallback triggers in six cases, all readable in `speak.ts`: network TTS is
disabled for the session (`:45`), the browser is offline (`:46`), `/api/tts` returns
501 because there is no `SYV_API_KEY` or the language is not Danish (`:62-65`), the
route returns 502/503 because Syv.ai failed or timed out (`:66`), `fetch` throws
(`:71-73`), or playback itself fails — typically autoplay blocking (`:89-96`).

**Why:** the demo is run on venue wifi by two clinicians with no developer present.
Speech is the agent's only way to lead the conversation, so it must not be able to
fail because of the network. The browser voice is worse, but it cannot go down.

### No third-party speech-to-text

There is no use of `SpeechRecognition` or `webkitSpeechRecognition` anywhere in the
repository. **All speech-to-text is Corti** — `lib/audio/useTranscribe.ts` and
`lib/audio/useDictation.ts`, both through `@corti/sdk`.

### Connectors that run inside Corti

The clinical chat enables four connectors from Corti's own registry
(`cosurg/lib/corti/chat.ts:74-79`, verified against
`GET /v2/agentic/registry/connectors` on 20 Aug 2026): `pubmed-expert`,
`web-search-expert`, `medical-calculator-expert`, `clinical-trials-expert`.

They run inside Corti and we do not call them ourselves. `web-search-expert` means a
third-party web search call takes place, but which provider Corti uses is not visible
to us. We mention it because it is true, not because we can name it.

---

## 2. External data sources

### NCBI PubMed E-utilities

| | |
|---|---|
| **What** | The US National Library of Medicine's public API for the biomedical literature |
| **Where** | `cosurg-mcp/src/konfiguration.ts:69`, calls in `cosurg-mcp/src/pubmed.ts:44,52`. Endpoints: `esearch.fcgi`, `esummary.fcgi`, `efetch.fcgi`. |
| **Used for** | The MCP tools `soeg_pubmed` and `hent_pubmed_abstrakt` — literature lookups when a question is not covered by our own sources. They are the only two of the server's nine tools with `openWorldHint: true` (`server.ts:504`, `:572`); the rest answer purely from local files. |
| **Terms** | Free and public. NCBI requires every call to identify itself with a tool name and a contact email — we send `tool=cosurg-mcp` and `email=mads@mahope.dk` (`pubmed.ts:30-36`). The rate limit without an API key is 3 calls/second; we call with backoff and a 12 s timeout. |

**Why this does not route around Corti:** PubMed is a literature database, not an AI
service. No model is involved — we look up references and return title, authors and
abstract as they stand. Corti has its own `pubmed-expert`, which we also use; our own
tool exists so the MCP server can answer without going through an agent.

### brandsaar.dk — the Danish Burn Association

| | |
|---|---|
| **What** | The Danish Burn Association's clinical guidelines: 34 pages plus the 2019 and 2022 pocket cards |
| **Where** | `cosurg-mcp/data/kilder/brandsaar-dk.md`, originals in `cosurg-mcp/data/originaler/` |
| **Used for** | The knowledge base the clinical chat quotes, and the professional basis for the `burns.json` decision tree |
| **Terms** | **Written by team member Rami Mossad Ibrahim.** Use cleared with him directly on 20 Aug 2026. |

Each of the three dispositions in `burns.json` carries its source URLs, e.g.
`brandsaar.dk/overflytning-af-brandsårspatienter` and `brandsaar.dk/vaeskebehandling`.
The site itself refers to **EMSB** (Emergency Management of Severe Burns) and notes
that Rigshospitalet is certified by the **European Burn Association** — both are
professional references within the text, not systems we integrate with.

### Rigshospitalet, Section 6052 — the procedure material

| | |
|---|---|
| **What** | Step-by-step guide to burn dressings (71 slides with photos) and the "Burns plast surgeon" document |
| **Where** | `cosurg-mcp/data/kilder/magnus-materiale.md`; the 71 photos as JPG in `cosurg/public/step-images/`; provenance in `cosurg-mcp/data/originaler/PROVENIENS.md` |
| **Used for** | The `dressing-hand-arm.json` procedure guide and its 71 images — what you see in operating-room mode |
| **Authors** | Verbatim from `dressing-hand-arm.json:12-16`: *"spl. Pia Høy og Alice Rimmen, i samarbejde med ovl. Rikke Holmgaard og reservelæge Carla Kruse"* (RN Pia Høy and Alice Rimmen, in collaboration with consultant Rikke Holmgaard and junior doctor Carla Kruse), Section for Plastic Surgery and Burn Treatment 6052, Rigshospitalet |
| **Terms** | Obtained by team member Magnus Avnstorp from his own department. Use cleared on 20 Aug 2026. |

### The PlastSurgeon handbook and JPBRS — the team's own publications

| | |
|---|---|
| **What** | `beta.plastsurgeon.com` — the team's own clinical handbook, the Burn Surgery chapter. And `beta.jpbrs.com` — the Journal of Plastic, Breast & Reconstructive Surgery, the team's own peer-reviewed open access journal, burn cases. |
| **Where** | `cosurg-mcp/data/kilder/plastsurgeon-brandsaar.md` and `cosurg-mcp/data/kilder/jpbrs-cases.md` |
| **Authors** | Handbook chapter: Rami Mossad Ibrahim MD, Elisabeth Lauritzen MD, Frederik Gulmark Hansen med.stud., Anne Mosebo med.stud., Magnus Balslev Avnstorp MD and Rikke Holmgaard, Consultant, Burns Specialist, MD, PhD. Cases: named authors with institution per case. |
| **Terms** | Both sites are run by the team itself. Only freely accessible content was fetched — the course modules under `/courses/burns-*` require paid membership and are not included, which is noted in the source file itself. |

**Cases are treated differently from guidelines.** A guideline says what is
recommended; a case says what was done for one patient. Every source section therefore
carries a `kildetype`, search results display it, and the agent must say so out loud
when it quotes a case. Otherwise a single course of treatment can come to sound like a
recommendation — an error a clinician cannot spot from the answer.

### The organiser's dataset — used for testing, never as a clinical source

| | |
|---|---|
| **What** | Corti Hack for Health's own dataset: six synthetic patient records and 24 English audio files |
| **Where** | `cosurg-mcp/test-data/` — deliberately outside `cosurg-mcp/data/`, where the knowledge base lives |
| **Used for** | Nothing in the product. The records are primary care and oncology in English; there are no plastic surgery cases and no burns. |

**We keep them physically separate from the knowledge base, and that is a deliberate
choice.** A fictional patient is not evidence. A synthetic record and a clinical
guideline look identical in a markdown excerpt, so if a fictional patient were ever
quoted as a source in a clinical answer, the answer would look entirely credible and
be worthless. Hence the separation is physical rather than a label: the MCP server
loads only `data/kilder/` and cannot reach `test-data/`. `cosurg-mcp/Dockerfile:27-29`
warns explicitly against copying them in. See `cosurg-mcp/data/README.md` and
`cosurg-mcp/test-data/README.md`.

### Tooling used in data preparation

**MarkItDown** (Microsoft, MIT) converted the pocket-card PDFs to markdown — noted in
`cosurg-mcp/data/kilder/brandsaar-dk.md:3`. Used offline during preparation only; not
part of the product.

---

## 3. Open source dependencies

All versions were read from `package.json` and confirmed against the installed
`node_modules`. All licences were read from the packages' own `package.json`.

### The app (`cosurg/`)

| Package | Version | Licence | Role |
|---|---|---|---|
| `@corti/sdk` | 5.0.0 | MIT | **Corti-owned.** Transcribe websocket and agent calls. |
| `next` | 16.3.1 | MIT | Framework (App Router), server-side API routes |
| `react` | 19.2.8 | MIT | UI |
| `react-dom` | 19.2.8 | MIT | UI |
| `tailwindcss` + `@tailwindcss/postcss` | 4.3.3 | MIT | Styling |
| `typescript` | 5.9.3 | Apache-2.0 | Language (build time only) |
| `eslint` | 9.39.5 | MIT | Linting (build time only) |
| `eslint-config-next` | 16.3.1 | MIT | Linting (build time only) |
| `@types/node`, `@types/react`, `@types/react-dom` | 20.19.43 / 19.2.18 / 19.2.4 | MIT | Type definitions (build time only) |

### The MCP server (`cosurg-mcp/`)

| Package | Version | Licence | Role |
|---|---|---|---|
| `@modelcontextprotocol/sdk` | 1.30.0 | MIT | MCP protocol and streamable HTTP transport |
| `zod` | 3.25.76 | MIT | Schema validation of tool arguments |
| `typescript` | 5.9.3 | Apache-2.0 | Language (build time only) |
| `@types/node` | 24.10.1 | MIT | Type definitions (build time only) |

**There is no `@corti/*` dependency in the MCP server.** The link to Corti is purely
the protocol: Corti calls the server as an MCP connector over HTTP.

Transitive dependencies pulled in by the MCP SDK: `express` 5.2.1, `cors` 2.8.6,
`express-rate-limit` 8.6.2, `ajv` 8.20.0, `eventsource-parser` 3.1.1,
`pkce-challenge` 5.0.1, `raw-body` 3.0.2, `content-type` 1.0.5 (all MIT),
`zod-to-json-schema` 3.25.2 (ISC), `json-schema-typed` 8.0.2 (BSD-2-Clause).

Search across the knowledge base is **our own code with no library** — in-memory BM25
(`cosurg-mcp/src/soegning.ts`). No embeddings, no vector database, no third-party
search service.

### Fonts

**Roboto** and **Roboto Mono** (Google, Apache-2.0), pulled through
`next/font/google` (`cosurg/app/layout.tsx:2`). They are fetched **at build time** and
then served from our own origin: the CSP sets `font-src 'self'`
(`cosurg/next.config.ts:26`), so the browser never makes a request to
`fonts.gstatic.com`. There are 16 `.woff2` files in the build output.

All other assets are local. There are no CDN calls, no analytics and no error
reporting service in the code. `NEXT_TELEMETRY_DISABLED=1` is set in both build stages
of `cosurg/Dockerfile` (lines 11 and 17), so Next.js telemetry to Vercel is off.

---

## 4. Infrastructure

| | What | Role |
|---|---|---|
| **Hetzner** | Cloud hosting, Falkenstein (EU) | Nordic Surgery Lab's own server, running both the app and the MCP server |
| **Openship** | Self-hosted deployment platform | Runs the containers. `cosurg-mcp/docker-compose.yml:6` |
| **Traefik** | Reverse proxy | Routes `mcp.cosurg.com` to port 8787. `docker-compose.yml:36-41` |
| **Let's Encrypt** | Certificate authority | `traefik.http.routers.cosurg-mcp.tls.certresolver: letsencrypt` |
| **Docker** | Containers | Base images: `node:22-alpine` (Node.js MIT, Alpine Linux), `alpine:3.20`, `gcr.io/distroless/nodejs22-debian12:nonroot` (Google Distroless, Apache-2.0) |
| **GitHub** | Code hosting | `github.com/mahope/cosurg` |

None of these touch clinical content. They move packets and issue certificates.

---

## 5. Trademarks named in the clinical content

The decision trees name specific products because the guidelines do: **Mepilex
Transfer** (Mölnlycke) and **Jelonet** (Smith+Nephew). These are dressing materials
mentioned in the treatment guidance — not suppliers, integrations or dependencies.
We have no relationship with either company.
