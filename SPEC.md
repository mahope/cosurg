# CoSurg (arbejdstitel) — stemmestyret beslutningsstøtte til brandsår

Hackathon-projekt, Corti Hack for Health 20.–21. august 2026.
Team: Mads (kode, væk fredag 11:00) · Magnus Avnstorp (klinisk indhold + præsentation) · Rami Mossad Ibrahim (klinisk indhold + præsentation).

## Formål

Skadestuelæger skal træffe præcise, komplette beslutninger om brandsår under tidspres: dybde, udbredelse (TBSA), lokalisation, cirkulær afsnøring, inhalationsskade — og glemmer noder når det er travlt. SurgAI viste at et opslagsværk ikke er nok: svaret skal komme som en **ført samtale**, ikke som en søgning.

CoSurg er en stemmestyret copilot der AKTIVT navigerer et klinisk valideret beslutningstræ: agenten stiller næste afklarende spørgsmål højt (TTS), lægen svarer med tale, træet udfyldes node for node til en disposition — og til sidst falder journalnotat + koder ud automatisk. Deterministisk træ + AI kun til fortolkning = "mere præcist end SurgAI": anbefalingen kommer fra træet (klinikere har skrevet det), aldrig fra en frit genererende model.

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
7. **Deploy** på offentlig URL torsdag aften + fallback-video + demo-manuskript (EN + DA) som Magnus/Rami kan køre alene.

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

- [ ] Live mikrofon → transkript på skærmen (begge sprog).
- [ ] Agenten stiller spørgsmål højt og forstår talte svar godt nok til at gennemløbe hele brandsårstræet uden tastatur.
- [ ] Mindst ét rødt flag demonstrerbart (cirkulær → eskalation).
- [ ] Journalnotat + mindst én diagnose-/procedurekode genereres ved afslutning.
- [ ] Dictation-tillæg indsættes i notatet.
- [ ] OR-tilstand demonstrerbar: hele flowet fra "OR mode" til færdigt trin gennemført med stemme alene (ingen berøring), med mindst ét step-billede vist og oplæst instruktion.
- [ ] Deployet URL virker på venue-wifi; fallback-video optaget; demo-manuskript testet af Magnus/Rami fredag 9–10.
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
| 5 (aften) | Sprogskifte-finish, stemmetilstande, UI-polish, fallback-video, demo-manuskript | Generalprøve |
