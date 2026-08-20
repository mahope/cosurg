# BurnTree

Stemmestyret klinisk beslutningsstøtte til brandsår. Bygget på Corti API til
Corti Hack for Health, august 2026.

Lægen taler; appen fører gennem beslutningstræet, skriver journalnotatet og
henter diagnosekoderne. Alt klinisk indhold ligger i JSON (`content/trees/`),
aldrig i kode.

## Corti-produktområder — hvad koden faktisk kalder

Denne tabel er skrevet efter verificerede kald mod EU-miljøet, ikke efter hensigt.

| Produktområde | Bruges? | Hvor | Hvordan |
|---|---|---|---|
| **Ambient speech-to-text** | Ja | `lib/audio/useTranscribe.ts` | `/transcribe`-websocket via `@corti/sdk`, `automaticPunctuation`, interim-resultater. Lytter mens lægen svarer på træets spørgsmål. |
| **Text generation** | Ja | `app/api/note/route.ts` | Journalnotatet skrives af en Corti-agent ud fra beslutningsvejen, transskriptet og diktatet. |
| **Agentic framework** | Ja | `lib/corti/agent.ts` | Tre agenter med schema-connectors og struktureret output: svarfortolker (flagger tvivl i stedet for at gætte), skribent, OR-kommandogenkender. |
| **Medical coding** | Ja | `lib/corti/coding.ts`, `app/api/coding/route.ts` | Corti Symphony, `POST /v2/tools/coding/`. Koderne kommer fra kode-API'et — sprogmodellen må kun begrunde dem. |
| **Dictation speech-to-text** | Hook klar, UI-tilkobling udestår | `lib/audio/useDictation.ts` | Samme `/transcribe`-socket, men konfigureret som diktat frem for ambient: `spokenPunctuation` (lægen siger "punktum", "nyt afsnit") og journalnær talformatering. Verificeret mod API'et med rigtig lyd (se nedenfor); tages først i brug når `NotePanel` kalder hooken. |

### Forbehold vi ikke skjuler

- **SKS (dansk ICD-10) er ikke tilgængeligt for os.** Corti dokumenterer SKS
  (`/coding/icd-10-dk`), men det er tidlig alpha for udvalgte partnere. Alle
  danske systemnavne blev afvist med 400 ("`sks`", "`sks-diagnosis`",
  "`icd10dk`", "`icd10dk-inpatient`", "`icd10dk-outpatient`", "`icd10-dk`"). Vi
  bruger derfor `icd10int-outpatient` — international ICD-10, som SKS'
  diagnosedel er en dansk udvidelse af. Får vi adgang, sættes
  `CORTI_CODING_SYSTEM=…` og intet andet skal ændres.
- **Stemmekommandoer i diktat er konfigureret, men ikke aktive.** Corti svarer
  `CONFIG_ACCEPTED`, men markerer hver kommando `"registered": false` for vores
  tenant — også på engelsk og med enkeltord. Vi påstår derfor ikke at
  voice commands virker.
- **TTS er ikke Corti.** Oplæsning sker via Syv.ai (Plapre, dansk, EU-hostet)
  med fallback til browserens egen stemme. Hackathon-reglerne tillader
  eksterne TTS-modeller eksplicit.

## Medical coding — hvorfor det er sat op som det er

Den tidligere udgave lod skribent-agenten selv finde på ICD-10-koder. En
sprogmodel kan producere en kode der ser rigtig ud og ikke findes. Nu:

1. Beslutningsvej, transskript og diktat sendes som **tre adskilte kontekster**
   til `/v2/tools/coding/`, så evidensen kan spores til den rigtige kilde.
2. Maskinværdier (`partial-deep`) oversættes først til de kliniske etiketter fra
   træet (`Partiel dyb (2. grad)`) — kodemodellen læser klinisk tekst, ikke
   vores interne enum-værdier.
3. Corti returnerer `codes` (skal kodes) og `candidates` (relevante, valgfrie).
   De holdes adskilt hele vejen ud i UI'et.
4. Skribent-agenten får koderne som en fast liste og må kun skrive **hvilket
   trin i beslutningsvejen der understøtter hver kode**. Den kan ikke tilføje,
   ændre eller omformatere en kode.

Fejler kode-kaldet, skrives notatet alligevel og `coding.error` sættes: et notat
uden koder er brugbart, et notat med opfundne koder er ikke.

### Evidens-tekst repareres lokalt

Corti ekkoer `evidence.text` tilbage som UTF-8-bytes læst som latin-1, så danske
tegn kommer retur som `flammeforbrÃ¦nding`. `start`/`end` er derimod korrekte
tegn-offsets. Vi klipper derfor uddraget ud af vores egen inputtekst i stedet for
at bruge Cortis echo (`lib/corti/coding.ts`).

## Diktat vs. ambient — den målte forskel

Begge tilstande bruger `/transcribe`, men konfigurationen gør dem til to
forskellige produkter. Samme danske lydklip, to konfigurationer, faktiske svar
fra API'et:

| Konfiguration | Resultat |
|---|---|
| `automaticPunctuation` (ambient, som i dag) | `… patienten er 42 har **komma** … **punktum** **nyt afsnit**.` — tegnsætningsordene ender som tekst i journalen. |
| `spokenPunctuation` (diktat) | `…, patienten er 42 har.` + linjeskift — ordene bliver til tegn og fjernes fra teksten. |

(Ordgenkendelsen er svag i tabellen fordi testlyden er syntetisk tale; det er
tegnsætningsmekanismen der demonstreres.)

## API-ruter

| Rute | Metode | Formål |
|---|---|---|
| `/api/tree` | GET | Beslutningstræer |
| `/api/corti/token` | GET | Kortlivet token med scope `openid transcribe` til browseren |
| `/api/interpret` | POST | Talt svar → tilladt træværdi (agent) |
| `/api/note` | POST | Journalnotat + koder |
| `/api/coding` | GET/POST | Fritstående kodning af klinisk tekst |
| `/api/tts` | POST | Dansk oplæsning (Syv.ai) |

Alle betalte ruter er bag `guard()` i `lib/guard.ts`: origin-lås plus per-IP-kvote,
og al fritekst længdebegrænses før den sendes til en betalt API.

## Kom i gang

```bash
cp .env.example .env.local   # udfyld CORTI_CLIENT_ID / CORTI_CLIENT_SECRET
npm install
npm run dev
```

| Miljøvariabel | Standard | Note |
|---|---|---|
| `CORTI_ENVIRONMENT` | `eu` | `eu` eller `us` |
| `CORTI_TENANT` | `base` | Indgår i både auth-URL og `Tenant-Name`-header |
| `CORTI_CLIENT_ID` / `CORTI_CLIENT_SECRET` | — | Fra Corti Console |
| `CORTI_CODING_SYSTEM` | `icd10int-outpatient` | Sæt til et SKS-systemnavn den dag adgangen findes |
| `SYV_API_KEY` | — | Uden nøgle falder oplæsning tilbage til browserstemmen |
| `ALLOWED_ORIGINS` | — | Kommasepareret, til preview-udrulninger |
