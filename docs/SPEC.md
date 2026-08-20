# CoSurg (working title) — voice-driven decision support for burns

*(Dansk udgave nedenfor — [spring til den danske udgave](#cosurg-arbejdstitel--stemmestyret-beslutningsstøtte-til-brandsår))*

> **This is the specification as it was written on Thursday morning, before the
> build.** It is kept as a record of what we committed to, with one exception:
> **Purpose** below states what the product turned out to be, because the product
> moved further than any other single thing in this document. Everything else is
> untouched, and what changed is listed under **Where the build diverged**. For what
> the finished system actually does, read the root [`README.md`](../README.md).

Hackathon project, Corti Hack for Health, 20–21 August 2026.
Team: Mads (code, leaves Friday 11:00) · Magnus Avnstorp (clinical content +
presentation) · Rami Mossad Ibrahim (clinical content + presentation).

## Purpose

Emergency physicians have to make precise, complete decisions about burns under time
pressure: depth, extent (TBSA), location, circumferential constriction, inhalation
injury — and they skip nodes when it is busy. SurgAI showed that a reference work is
not enough: the answer has to arrive as a **led conversation**, not as a search. But a
led conversation is not enough either, because the doubt that arrives mid-assessment —
how is area estimated on a child, what is actually done for a circumferential burn —
sends the clinician into a different system and leaves the assessment behind.

CoSurg is therefore **one field**. The clinician says what he is looking at, and the
app works out what kind of help that was: a led assessment through a clinically
validated decision tree, a sourced answer to a clinical question, a treatment lookup
from our own knowledge base — or, when the utterance can be read two ways, a question
back. The convergence is the product. The decision tree is one of the shapes an answer
can take, and it is the shape that ends in a disposition, a clinical note and codes.

What makes it more precise than a chatbot is not fluency but provenance. The
recommendation comes from a tree clinicians wrote, never from a freely generating
model. The codes come from Corti's coding API rather than being invented. Lookups are
verbatim excerpts carrying their source, and when the sources are silent the app says
so. And where the reading is genuinely ambiguous, the app asks rather than guesses —
because an answer read as a question costs a repetition, while a question read as an
answer costs a decision, and leaves no trace that it did.

## The 5 product areas (requirement: at least 4)

| Corti area | Role in CoSurg |
|---|---|
| Ambient STT | Listens to the whole encounter (clinician + patient) — answers to the tree's questions are captured from here |
| Dictation STT | The clinician's closing additions and corrections to the note, dictated |
| Text generation | Generates the clinical note from the completed tree path plus the transcript |
| Agentic framework | Interprets the spoken answer against the active node's answer schema; red-flag watch |
| Medical coding | Diagnosis and procedure codes from the encounter plus the disposition |

## Scope — version 1 (Friday's demo)

1. **Session start:** choose language (Danish/English) and voice mode (full dialogue /
   key moments only). Both MUST work — that is a requirement, not a nice-to-have.
1b. **OR override (sterile mode):** one button — or the voice command "OR mode" —
   turns on operating-room mode. It changes four things at once: (a) answers become
   SHORT and direct (imperative, one step at a time — the agent prompt changes
   register), (b) the microphone is always open and everything is voice-controlled
   ("next", "repeat", "back", "show image") — the surgeon NEVER touches the screen and
   does not have to scrub out, (c) everything is read aloud via TTS, not just key
   moments, (d) the screen shows large step images of what concretely has to be done
   (from Magnus's step-by-step material, `kilder/magnus-materiale/pptx-billeder/` — 71
   images extracted) with type readable from two metres. The tree schema gains an
   optional `images: []` field per node/step.
2. **Live STT:** microphone → Corti transcribe → transcript visible on screen in real
   time (the mandatory live-STT moment in the presentation).
3. **Generic tree engine:** the engine is state-agnostic — it runs ANY tree that
   follows the JSON schema (nodes: question, answer type [yes/no, choice, number],
   edges, red flags, dispositions, `{da,en}` text pairs). Burns is the FIRST tree, not
   the only possible one: the UI has a tree selector (holding just one tree for the
   demo), so extending to bites/frostbite/chemical burns is visibly trivial. Magnus and
   Rami write the burns content today — content is not code, so it may build on their
   existing knowledge and the sources in `kilder/`.
4. **Led dialogue:** the agent asks the active node's question via TTS, interprets the
   spoken answer through Corti's agentic framework (the answer is validated against the
   node's answer schema — if it cannot be determined, the agent asks again instead of
   guessing), and advances through the tree. The screen shows the tree filling in live.
5. **Red flags:** nodes marked critical (circumferential burn, suspected inhalation,
   high voltage) interrupt with voice plus a red banner regardless of voice mode.
6. **Closing:** disposition (home / emergency department treatment / specialist unit or
   burn centre) with justification from the tree path → generated clinical note → codes
   → the clinician dictates additions (dictation).
7. **Deployment** on a public URL Thursday evening plus a demo
   script (EN + DA) that Magnus and Rami can run alone.

## Out of scope

- Injury types other than burns (the tree schema is generic, but ONLY the burns tree is
  filled).
- **Our own MCP server** for guidelines and cases (like SurgAI's) — that is the
  LONG-TERM architecture: trees and sources move to an MCP server attached to Corti's
  agentic framework, so content can be managed centrally and shared across apps. For the
  hackathon the tree lives in the repository (faster, fewer moving parts), but the
  engine's tree loader is written as an interface so an MCP source can be plugged in
  later without touching the engine. Mentioned in the pitch as roadmap.
- Login/users, history, EHR integration, PDF export.
- Body chart / TBSA drawing (the number is spoken, not drawn).
- Patient-facing output (a "take home" sheet) — mentioned in the pitch as roadmap only.
- Persistence beyond the session (in-memory is enough for a demo).

## Clinical sources (for tree content and pitch)

- `kilder/brandsaar-dk.md` — ALL of brandsaar.dk (the Danish Burn Association, Rami's
  site): 34 pages plus both pocket-card PDFs as text. Depth assessment, TBSA/area
  estimation, Parkland fluid resuscitation, inhalation injury, chemical burns, transfer
  criteria and more.
- `kilder/magnus-materiale.md` — Magnus's Drive material: the "Burns plast surgeon"
  document plus the text content of the step-by-step dressing deck. Images (anatomy,
  pathophysiology, zones of burn) are in `kilder/magnus-materiale/`.
- Note: "Brandsårsforbinding tips og tricks -Final.docx" is 0 bytes on Drive — Magnus
  is re-uploading.
- Both .md files are also placed in the team's Google Drive folder.

## Architecture and stack

- **Next.js (App Router) + TypeScript** — Mads's home ground, one deployment. API
  routes as a server-side proxy for Corti tokens (the client never sees credentials —
  Corti's SDK proxy pattern).
- **Corti JS SDK** for the transcribe websocket and agent calls. Known traps (from
  experience, not from the code): flat `TranscribeConfig`, audio as a base64 string in
  JSON, the `Bearer ` prefix URL-encoded on the ws token.
- **The decision tree is deterministic client/server logic** — the agent ONLY interprets
  answers and ONLY generates text. That is the precision argument and it has to be said
  in the pitch.
- **TTS:** the browser's SpeechSynthesis as the baseline (it has both da-DK and en-US
  voices, no latency dependency) — upgrade only if time allows and the rules permit
  external TTS without a Corti equivalent (to clarify: "TTS models are permitted").
- **Bilingual content:** every node has a `{da, en}` text pair; the language choice
  drives STT language, TTS voice and node texts.

## Completion criteria

*The boxes below are unticked because this is the document as written on Thursday
morning. Every criterion was met — the finished system is described in the root
[`README.md`](../README.md).*

- [ ] Live microphone → transcript on screen (both languages).
- [ ] The agent asks questions aloud and understands spoken answers well enough to
      traverse the whole burns tree without a keyboard.
- [ ] At least one red flag demonstrable (circumferential → escalation).
- [ ] Clinical note plus at least one diagnosis or procedure code generated at the close.
- [ ] Dictated additions inserted into the note.
- [ ] OR mode demonstrable: the whole flow from "OR mode" to a completed step done by
      voice alone (no touch), with at least one step image shown and the instruction
      read aloud.
- [ ] The deployed URL works on venue wifi; demo script tested
      by Magnus and Rami Friday 09:00–10:00.
- [ ] The repository contains a file listing the products and datasets used (rule
      requirement).

## Risks and open questions

1. **Danish STT quality** — ASK THE CORTI ENGINEERS NOW. If Danish is weak: Danish stays
   in the UI and TTS, but the live part of the demo script runs in English.
2. **Precision of answer interpretation** — mitigated by giving every node a closed
   answer schema plus "ask again when in doubt" (never guess). It is the hardest
   component of the day; build and test it first.
3. **TTS latency/robustness** — browser TTS is the fallback for everything; it cannot
   fail on venue wifi.
4. **Corti console setup of agents/experts cannot be done headless** (known from
   before) — Mads configures it manually in the morning; document it in the README so it
   can be reproduced.
5. **Credits/rate limits on hackathon keys** — establish the ceiling, build context
   reuse.
6. **Time box:** all code frozen Thursday ~22:00 (Friday 10:30 at the latest). Friday is
   ONLY dress rehearsal and fallback.
7. **The open microphone in OR mode** — background noise and other people's speech can
   trigger commands. Mitigation: the commands are few and distinct ("næste"/"next"), and
   the agent always acknowledges aloud before it moves. The demo takes place in a quiet
   room, so the risk is mainly theoretical — but mention it in the pitch as a known
   limitation (a wake word is roadmap).
8. ~~Image rights~~ **RESOLVED 20 Aug:** all content (images, brandsaar.dk, documents) was
   produced by Rami, Magnus or others on the team — everything may be used in the demo
   and the submission repository.

## Timetable for today (Thursday)

| Phase | What | Verified by |
|---|---|---|
| 1 (now) | Skeleton + Corti auth proxy + live transcribe round trip + hello-world deployment | Transcript on screen at the deployed URL |
| 2 | Tree engine + tree visualisation; Magnus and Rami write the burns tree in parallel (JSON schema from Mads) | The tree can be clicked through without voice |
| 3 | TTS questions + agent answer interpretation = the full voice loop | One hands-free traversal |
| 4 | Red flags + note generation + coding + dictated additions | Completion criteria 3–5 |
| 5 (evening) | Language switching finished, voice modes, UI polish, demo script | Dress rehearsal |

---

## Where the build diverged

Five things turned out differently from this specification, all in the same direction —
more was built, not less:

- **The product converged.** The scope below describes a session that begins by
  choosing a language, a voice mode and a tree. What was built begins with one field
  and no choice at all: the app decides from the utterance whether to open a pathway,
  look something up, fetch a treatment or ask what was meant. Everything the scope
  lists is still there — it is simply no longer something the clinician has to pick.
- **The MCP server was built.** Listed above as out of scope and long-term
  architecture, it exists and runs at `mcp.cosurg.com` with nine tools over the clinical
  knowledge base and both decision trees.
- **TTS is not the browser voice.** Speech output goes through Syv.ai's Danish Plapre
  model, EU-hosted, with the browser voice retained as the fallback it was always meant
  to be.
- **Both trees were filled.** The burns tree and a 12-step dressing procedure guide run
  on the same engine, which is the clearest available proof that trees are data and not
  code.
- **The OR voice commands are not an agent.** They are matched by deterministic rules,
  because an agent round trip costs 1–2 seconds and fails when the network does.

All five Corti product areas ended up in use, not the four the rules required.

---
---

# CoSurg (arbejdstitel) — stemmestyret beslutningsstøtte til brandsår

*(Dette er den danske udgave af afsnittene ovenfor. Engelsk er repoets hovedsprog —
[spring til den engelske udgave](#cosurg-working-title--voice-driven-decision-support-for-burns).)*

> **Dette er specifikationen som den blev skrevet torsdag morgen, før byggeriet.** Den
> er bevaret som dokumentation for hvad vi forpligtede os på, med én undtagelse:
> **Formål** nedenfor siger hvad produktet endte med at være, fordi produktet flyttede
> sig længere end noget andet enkelt punkt i dokumentet. Resten står urørt, og hvad
> der ændrede sig står under **Hvor byggeriet afveg**. Hvad det færdige system gør,
> står i [`README.md`](../README.md).

Hackathon-projekt, Corti Hack for Health 20.–21. august 2026.
Team: Mads (kode, væk fredag 11:00) · Magnus Avnstorp (klinisk indhold + præsentation) · Rami Mossad Ibrahim (klinisk indhold + præsentation).

## Formål

Skadestuelæger skal træffe præcise, komplette beslutninger om brandsår under tidspres: dybde, udbredelse (TBSA), lokalisation, cirkulær afsnøring, inhalationsskade — og glemmer noder når det er travlt. SurgAI viste at et opslagsværk ikke er nok: svaret skal komme som en **ført samtale**, ikke som en søgning. Men en ført samtale er heller ikke nok, for den tvivl der melder sig midt i en vurdering — hvordan beregnes arealet på et barn, hvad gør man egentlig ved en cirkulær forbrænding — sender lægen ind i et andet system og efterlader vurderingen bag sig.

CoSurg er derfor **ét felt**. Lægen siger hvad han står med, og appen finder selv ud af hvilken slags hjælp det var: en ført vurdering gennem et klinisk valideret beslutningstræ, et kildebelagt svar på et fagligt spørgsmål, et behandlingsopslag fra vores egen vidensbase — eller, når ytringen kan læses på to måder, et spørgsmål tilbage. Sammensmeltningen er produktet. Beslutningstræet er én af de former et svar kan tage, og det er den form der ender i en disposition, et journalnotat og koder.

Det der gør den mere præcis end en chatbot, er ikke sproget men sporbarheden. Anbefalingen kommer fra et træ klinikere har skrevet, aldrig fra en frit genererende model. Koderne kommer fra Cortis coding-API frem for at blive fundet på. Opslag er ordrette uddrag der bærer deres kilde, og tier kilderne, siger appen det. Og hvor læsningen er ægte tvetydig, spørger appen frem for at gætte — fordi et svar læst som spørgsmål koster en gentagelse, mens et spørgsmål læst som svar koster en beslutning og ikke efterlader spor af det.

## De 5 produktområder (krav: mindst 4)

| Corti-område | Rolle i CoSurg |
|---|---|
| Ambient STT | Lytter til hele encounteret (læge + patient) — svar på træets spørgsmål fanges herfra |
| Dictation STT | Lægens afsluttende tillæg/rettelser til notatet, dikteret |
| Text generation | Genererer journalnotatet fra træets udfyldte path + transkript |
| Agentic framework | Fortolker det talte svar mod den aktive nodes svarskema; rødt flag-vagt |
| Medical coding | Diagnose-/procedurekoder fra encounter + disposition |

## Scope — version 1 (demoen fredag)

1. **Session-start:** vælg sprog (dansk/engelsk) og stemmetilstand (fuld dialog / kun nøglemomenter). Begge SKAL virke — det er et krav, ikke nice-to-have.
1b. **OR-override (steril tilstand):** én knap — eller stemmekommandoen "OR mode" — slår operationsstue-tilstand til. Den ændrer fire ting på én gang: (a) svar bliver KORTE og direkte (imperativ, ét trin ad gangen — agent-prompten skifter stil), (b) mikrofonen er altid åben og alt styres med stemmen ("næste", "gentag", "tilbage", "vis billede") — kirurgen rører ALDRIG skærmen og skal ikke skrubbe ud, (c) alt læses op via TTS, ikke kun nøglemomenter, (d) skærmen viser store step-billeder af hvad der konkret skal gøres (fra Magnus' step-by-step-materiale, `kilder/magnus-materiale/pptx-billeder/` — 71 billeder udtrukket) med typografi der kan læses på 2 meters afstand. Træ-skemaet får et valgfrit `images: []`-felt pr. node/trin.
2. **Live STT:** mikrofon → Corti transcribe → transkript synligt på skærmen i realtid (det obligatoriske live-STT-moment i præsentationen).
3. **Generisk træ-motor:** motoren er tilstands-agnostisk — den kører ETHVERT træ der følger JSON-skemaet (noder: spørgsmål, svartype [ja/nej, valg, tal], kanter, røde flag, dispositioner, `{da,en}`-tekstpar). Brandsår er det FØRSTE træ, ikke det eneste mulige: UI'et har en træ-vælger (med kun ét træ i den til demoen), så udvidelsen til bidsår/forfrysninger/ætsninger er synligt triviel. Magnus + Rami skriver brandsårsindholdet i dag — indhold er ikke kode, så det må gerne bygge på deres eksisterende viden og kilderne i `kilder/`.
4. **Ført dialog:** agenten stiller den aktive nodes spørgsmål via TTS, fortolker det talte svar via Cortis agentic framework (svaret valideres mod nodens svarskema — kan svaret ikke afgøres, spørger agenten igen i stedet for at gætte), og rykker frem i træet. Skærmen viser træet fyldes ud live.
5. **Røde flag:** noder markeret kritiske (cirkulær forbrænding, inhalationsmistanke, højspænding) afbryder med stemme + rød banner uanset stemmetilstand.
6. **Afslutning:** disposition (hjem / skadestue-behandling / specialafdeling/brandsårscenter) med begrundelse fra træ-pathen → genereret journalnotat → koder → lægen dikterer tillæg (dictation).
7. **Deploy** på offentlig URL torsdag aften + demo-manuskript (EN + DA) som Magnus/Rami kan køre alene.

## Ikke i scope

- Andre skadestyper end brandsår (træ-skemaet er generisk, men KUN brandsårstræet fyldes).
- **Egen MCP-server** til guidelines/cases (som SurgAI's) — det er den LANGSIGTEDE arkitektur: træer og kilder flyttes til en MCP-server koblet på Cortis agentic framework, så indhold kan styres centralt og deles på tværs af apps. Til hackathonnet bor træet i repoet (hurtigere, færre bevægelige dele), men motorens træ-loader skrives som interface så MCP-kilden kan plugges ind senere uden at røre motoren. Nævnes i pitch som roadmap.
- Login/brugere, historik, EHR/journal-integration, PDF-eksport.
- Kropskort/TBSA-tegning (tallet siges, tegnes ikke).
- Patient-vendt output ("Med hjem"-seddel) — nævnes kun i pitch som roadmap.
- Persistens ud over sessionen (in-memory er nok til demo).

## Kliniske kilder (til træ-indhold og pitch)

- `kilder/brandsaar-dk.md` — HELE brandsaar.dk (Dansk Brandsårsforening, Ramis site): 34 sider + begge lommekort-PDF'er som tekst. Dybdevurdering, TBSA/arealberegning, Parkland-væskebehandling, inhalationsskader, ætsninger, overflytningskriterier m.m.
- `kilder/magnus-materiale.md` — Magnus' Drive-materiale: "Burns plast surgeon"-dokumentet + step-by-step forbindings-pptx'ens teksindhold. Billeder (anatomi, patofysiologi, zones of burn) ligger i `kilder/magnus-materiale/`.
- OBS: "Brandsårsforbinding tips og tricks -Final.docx" er 0 bytes på Drive — Magnus gen-uploader.
- Begge .md-filer er også lagt i teamets Google Drive-mappe.

## Arkitektur & stack

- **Next.js (App Router) + TypeScript** — Mads' hjemmebane, én deploy. API-routes som server-side proxy for Corti-tokens (klienten ser aldrig credentials — Cortis SDK-proxy-mønster).
- **Corti JS SDK** til transcribe-websocket og agent-kald. Kendte fælder (fra erfaring, ikke kode): fladt `TranscribeConfig`, audio som base64-string i JSON, `Bearer `-præfiks URL-encoded på ws-token.
- **Beslutningstræet er deterministisk klient/server-logik** — agenten fortolker KUN svar og genererer KUN tekst. Det er præcisions-pointen og skal siges i pitchen.
- **TTS:** browserens SpeechSynthesis som baseline (har både da-DK og en-US stemmer, nul latens-afhængighed) — opgradér kun hvis tid og reglerne tillader ekstern TTS uden Corti-kobling (afklar: "TTS-modeller er tilladt").
- **Tosproget indhold:** hver node har `{da, en}`-tekstpar; sprogvalg styrer STT-sprog, TTS-stemme og node-tekster.

## Færdig-kriterier

*Boksene nedenfor er ikke afkrydsede, fordi dette er dokumentet som det blev skrevet
torsdag morgen. Alle kriterier blev opfyldt — det færdige system er beskrevet i
[`README.md`](../README.md).*

- [ ] Live mikrofon → transkript på skærmen (begge sprog).
- [ ] Agenten stiller spørgsmål højt og forstår talte svar godt nok til at gennemløbe hele brandsårstræet uden tastatur.
- [ ] Mindst ét rødt flag demonstrerbart (cirkulær → eskalation).
- [ ] Journalnotat + mindst én diagnose-/procedurekode genereres ved afslutning.
- [ ] Dictation-tillæg indsættes i notatet.
- [ ] OR-tilstand demonstrerbar: hele flowet fra "OR mode" til færdigt trin gennemført med stemme alene (ingen berøring), med mindst ét step-billede vist og oplæst instruktion.
- [ ] Deployet URL virker på venue-wifi; demo-manuskript testet af Magnus/Rami fredag 9–10.
- [ ] Repo indeholder fil med brugte produkter/datasæt (regel-krav).

## Risici & åbne spørgsmål

1. **Dansk STT-kvalitet** — SPØRG CORTI-INGENIØRERNE NU. Hvis dansk er svag: dansk beholdes i UI/TTS, men demo-manuskriptets live-del køres på engelsk.
2. **Svar-fortolkningens præcision** — mitigeret ved at hver node har lukket svarskema + "spørg igen ved tvivl" (aldrig gæt). Det er dagens sværeste komponent; bygges og testes først.
3. **TTS-latens/robusthed** — browser-TTS er fallback for alt; den kan ikke fejle på venue-wifi.
4. **Corti console-opsætning af agent/experts kan ikke gøres headless** (kendt fra tidligere) — Mads konfigurerer manuelt formiddag, dokumentér i README så det kan genskabes.
5. **Credits/rate limits på hackathon-nøgler** — afklar loft, byg genbrug af context.
6. **Tidsboks:** al kode fryses torsdag ~22 (senest fredag 10:30). Fredag er KUN generalprøve og fallback.
7. **OR-tilstandens åbne mikrofon** — baggrundsstøj og andres tale kan trigge kommandoer. Mitigering: kommandoerne er få og distinkte ("næste"/"next"), og agenten kvitterer altid højt før den rykker. Demoen foregår i et roligt rum, så risikoen er primært teoretisk — men nævn den i pitchen som kendt begrænsning (wake-word er roadmap).
8. ~~Billedrettigheder~~ **AFKLARET 20/8:** alt indhold (billeder, brandsaar.dk, dokumenter) er lavet af Rami, Magnus eller andre fra teamet — alt må bruges i demo og submission-repo.

## Tidsplan i dag (torsdag)

| Fase | Hvad | Verificeret ved |
|---|---|---|
| 1 (nu) | Skelet + Corti-auth-proxy + live transcribe roundtrip + deploy af hello-world | Transkript på skærmen på deployet URL |
| 2 | Træ-motor + trævisualisering; Magnus/Rami skriver brandsårstræet parallelt (JSON-skema fra Mads) | Træet kan klikkes igennem uden stemme |
| 3 | TTS-spørgsmål + agent-svarfortolkning = fuld stemmesløjfe | Ét gennemløb hands-free |
| 4 | Røde flag + notat-generering + coding + dictation-tillæg | Færdig-kriterierne 3–5 |
| 5 (aften) | Sprogskifte-finish, stemmetilstande, UI-polish, demo-manuskript | Generalprøve |

## Hvor byggeriet afveg

Fem ting gik anderledes end specifikationen — alle i samme retning: der blev bygget
mere, ikke mindre.

- **Produktet smeltede sammen.** Scopet nedenfor beskriver en session der begynder med
  at vælge sprog, stemmetilstand og træ. Det byggede begynder med ét felt og intet
  valg: appen afgør ud fra ytringen om den skal åbne et forløb, slå noget op, hente en
  behandling eller spørge hvad der var ment. Alt det scopet nævner findes stadig — det
  er blot ikke længere noget lægen skal vælge.
- **MCP-serveren blev bygget.** Den står ovenfor som uden for scope og langsigtet
  arkitektur, men den findes og kører på `mcp.cosurg.com` med ni værktøjer over den
  kliniske vidensbase og begge beslutningstræer.
- **TTS er ikke browserstemmen.** Oplæsningen går gennem Syv.ais danske Plapre-model,
  EU-hostet, med browserstemmen bevaret som den fallback den altid skulle være.
- **Begge træer blev fyldt.** Brandsårstræet og en 12-trins procedureguide til
  forbinding kører på samme motor — det klareste bevis vi har på at træer er data og
  ikke kode.
- **OR-stemmekommandoerne er ikke en agent.** De matches med deterministiske regler,
  fordi en agent-rundtur koster 1–2 sekunder og fejler når nettet gør.

Alle fem Corti-produktområder endte i brug, ikke de fire reglerne krævede.
