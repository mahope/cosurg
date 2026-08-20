# cosurg-mcp

MCP-server med CoSurgs kliniske viden om brandsår. Den kobles på Cortis agentic
framework som **MCP-connector**, så Cortis agent kan slå op i vores egne kilder i
stedet for at svare ud fra almen viden.

Serveren opfinder aldrig indhold. Hvert svar er enten et ordret uddrag med
kildehenvisning, et stykke af et beslutningstræ klinikerne har skrevet, en
PubMed-post med PMID — eller en klar melding om at vi ikke har dækning. Det
sidste er et gyldigt svar, og værktøjerne siger det med rene ord
(`INGEN DAEKNING I VIDENSBASEN`) frem for at gætte. Det er hele forskellen på
CoSurg og en chatbot.

## Hvad den indeholder

| Kilde | Kildetype | Omfang | Kildeangivelse |
|---|---|---|---|
| `data/kilder/brandsaar-dk.md` | retningslinje | Hele brandsaar.dk — Dansk Brandsårsforening / Rigshospitalets brandsårsafdeling. Dybdevurdering, TBSA/arealberegning, Parkland-væskebehandling, inhalationsskader, ætsninger, forfrysninger, cirkulære forbrændinger, overflytningskriterier, ambulant behandling, smertebehandling. | URL pr. afsnit |
| `data/kilder/magnus-materiale.md` | retningslinje | Teamets eget materiale: "Burns plast surgeon"-dokumentet og forbindingsguiden fra Rigshospitalets Afsnit 6052. | Dokumentnavn + kapitelsti |
| `data/kilder/plastsurgeon-brandsaar.md` | retningslinje | Kapitlet Burn Surgery fra teamets egen håndbog beta.plastsurgeon.com: anatomi, patofysiologi, gradsvurdering, arealberegning, henvisning til brandsårsafsnit, Parkland og 4:2:1-princippet, antibiotika, opfølgning samt de fem procedurer (rensning, forbinding, forbindingsskift, kirurgisk debridement, hudtransplantation). | URL pr. kapitelside + forfatterliste |
| `data/kilder/jpbrs-cases.md` | **case** | Peer-reviewede brandsårscases fra teamets eget tidsskrift beta.jpbrs.com — hvert forløb med case-id, titel, forfattere, institution, trin-for-trin-operationsbeskrivelse og efterforløb. | URL + case-id + forfatterliste |
| `cosurg/content/trees/*.json` | — | Beslutningstræerne `burns-dk` (8 noder, 3 dispositioner) og `dressing-hand-arm` (12 trin). | Træ-id, version, filnavn og forfatterliste |

Ved opstart indlæses **54 kildeafsnit → 323 søgbare uddrag** samt begge træer:
brandsaar.dk 36 afsnit / 128 uddrag, teamets eget materiale 2 / 80,
PlastSurgeon-håndbogen 14 / 96 og JPBRS-caserne 2 / 19. Alt ligger i hukommelsen;
der er ingen database og ingen skrivbar tilstand.

### Retningslinje eller case — forskellen står i svaret

De to første kilder siger *hvad der anbefales*. JPBRS-caserne siger *hvad der blev
gjort for én patient*. Det er ikke det samme, og en læge skal kunne se hvilken slags
kilde et udsagn kommer fra. Derfor bærer hvert kildeafsnit en **kildetype**:

- Hver søgetræffer skriver den ud (`Kildetype: KLINISK CASE …` / `RETNINGSLINJE/HAANDBOG …`),
  og et svar med mindst én case får en eksplicit advarsel om ikke at læse den som en anbefaling.
- `soeg_klinisk_viden` og `list_kilder` tager `kildetype: "retningslinje" | "case" | "alle"`,
  så man kan spørge "hvad siger retningslinjen" og "har nogen gjort det her før" hver for sig.
- Cases bærer deres case-id, titel og forfatterliste hele vejen ud i kildehenvisningen.
- Serverens `instructions` kræver at agenten siger *case* højt når den gengiver en case.

### Hvad der bevidst ikke er med

- **Kursusmodulerne** `beta.plastsurgeon.com/courses/burns-*` (kemiske og elektriske
  forbrændinger, inhalationsskade, pædiatriske brandsår, væskebehandling, kirurgisk
  behandling m.fl.) kræver betalt medlemskab. Uden adgang er de ikke hentet — der
  gættes ikke på indhold. Har teamet et login, er de næste kilde ind.
- **Ikke-brandsårscases på JPBRS.** Alle 73 cases på sitet blev hentet og
  gennemsøgt; kun to handler om brandsår, og kun de to er med. Tre andre matchede
  udelukkende på afdelingsnavnet "Department of Burns and Plastic Surgery" og er
  udeladt. Begrundelsen står i toppen af `data/kilder/jpbrs-cases.md`.
- **Quizzer og MCQ-sider** fra håndbogen. Et spørgsmål med svarmuligheder er ikke en
  klinisk anvisning, og et uddrag derfra ville kunne citeres som om det var.
- **Kapitlet Skin Transplantation** ligger uden for brandsårskapitlet. Selve
  hudtransplantationen ved brandsår er dækket af
  `burns-treatment/procedures/procedure-skin-grafting`, som er med.

## Værktøjer

| Værktøj | Formål |
|---|---|
| `soeg_klinisk_viden` | Fritekstsøgning i de kliniske kilder. Returnerer ordrette uddrag med URL/dokumentnavn, kildetype, forfattere, overskriftssti, uddrag-id og relevansscore. Kan begrænses til én samling (`brandsaar`, `magnus`, `plastsurgeon`, `jpbrs`) og til én kildetype (`retningslinje`, `case`). |
| `hent_kildeafsnit` | Hele siden bag et søgetræf — via afsnit-id eller URL. Til når tre linjer ikke er kontekst nok. Viser kildetype, case-id og forfattere. |
| `list_kilder` | Alle kildeafsnit med id, kildetype (`[CASE]` / `[retningslinje]`), titel og URL. Til at afgøre om et emne overhovedet er dækket. Kan filtreres på samling og kildetype. |
| `list_beslutningstraeer` | Træerne med id, navn, version, forfattere, rodnode og nodeantal. |
| `hent_beslutningstrae` | Et helt træ som læsbar oversigt eller som ordret JSON. |
| `hent_trae_node` | Én node (spørgsmål, tilladte svarværdier med synonymer, røde flag, kanter ud, hvilke noder man kommer fra) eller én disposition. |
| `soeg_pubmed` | Litteratursøgning via NCBI E-utilities når vores egen viden ikke rækker. Titel, år, tidsskrift, forfattere, publikationstype, PMID, DOI og link — aldrig et resultat uden reference. Rate-limits og timeouts genforsøges med voksende ventetid, så et 429 ikke bliver til "der findes ingen litteratur". |
| `hent_pubmed_abstrakt` | Fulde abstracts (MEDLINE, ordret fra NCBI) for op til 10 PMID'er. En titel er ikke et resultat. |
| `videnbase_status` | Hvad serveren faktisk har indlæst. Til at skelne "ingen dækning" fra "fejlkonfiguration". |

Serveren sender desuden `instructions` med i `initialize`, så agenten får reglen
med fra start: slå op før du svarer, citér kilden, anbefalinger kommer fra træet,
sig højt når et uddrag er en klinisk case og ikke en retningslinje, og meld ærligt
når der ikke er dækning.

## Kobling på en Corti-agent

Corti v2 (`/v2/agentic/...`) har MCP som **connector-type**. Skemaet er lille:
`type`, `name`, `url`, `auth`. Der er **intet `transportType`-felt** — det blev
fjernet i v2 fordi MCP-connectorer altid bruger streamable HTTP. Bygger du efter
v1-eksemplerne i det arkiverede docs-afsnit (`transportType`,
`authorizationType`), afvises payloaden.

### Tilknyt connectoren til en eksisterende agent

```bash
AGENT_ID="<dit-agent-id>"
ENVIRONMENT="eu"                 # eu | us
TENANT="<dit-tenant-navn>"
TOKEN="<dit-corti-access-token>"

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

### Eller inline når agenten oprettes

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

**`connectors`-arrayet erstattes helt ved PATCH.** Send alle connectorer med, ikke
kun den nye. Connector-`PATCH`-endpointet svarer i øvrigt 501 (private preview) —
skal en connector ændres, slettes den og oprettes igen. Og `type` er immutabelt.

Når agenten kaldes, så sæt `timeoutInSeconds: 180`. Standarden er 60 sekunder, og
den skærer orkestratorer af der fanner ud til connectorer.

### Hvorfor tokenet står i URL'en

Corti dokumenterer `auth: {"type": "bearer"}` på MCP-connectorer, men mekanismen
der leverer selve tokenet — `authorizationData` — er **ikke defineret nogen steder
i deres docs**. Sender vi `auth: {"type":"bearer"}` uden at kunne levere
credentials, ender opgaven i `TASK_STATE_AUTH_REQUIRED`, som REST-bindingen
maskerer som `TASK_STATE_FAILED`.

Serveren accepterer derfor tokenet to steder, og begge sammenlignes i konstant tid:

1. `Authorization: Bearer <token>` — standarden, som enhver MCP-klient sender.
2. Som sidste segment i stien: `POST /mcp/<token>` — virker når connectoren kun
   kan konfigureres med en URL.

Får I `authorizationData` dokumenteret, skift til den rene `/mcp`-URL med
`"auth": {"type": "bearer"}` og lad tokenet blive leveret den vej. Serveren
kræver ingen ændring — den accepterer allerede headeren.

Serveren starter ikke uden `MCP_AUTH_TOKEN` (mindst 24 tegn). En åben klinisk
endpoint er ikke et acceptabelt udfald.

## Kald fra CoSurg-appen

Appen kan kalde serveren direkte uden en Corti-agent i midten. Streamable HTTP er
almindelig JSON-over-HTTP; serveren svarer med `Content-Type: application/json`
(ikke SSE), så et `fetch` er nok:

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

Nogle klienter skal først kalde `initialize`; det gør denne server ikke krav om i
stateless tilstand — `tools/list` og `tools/call` virker direkte.

## Kør lokalt

```bash
npm install
npm run build
MCP_AUTH_TOKEN=$(openssl rand -hex 32) npm start
```

Serveren finder selv kilderne i `data/kilder` og træerne i
`../cosurg/content/trees` når den kører fra repoet — samme stier som i
containeren. Se `data/README.md` for hvad der må ligge i vidensbasen.

Røgtesten starter serveren, kobler en rigtig MCP-klient på og kalder hvert
værktøj — inklusive PubMed mod det virkelige API:

```bash
npm run smoke            # alt
npm run smoke -- --offline   # uden PubMed
```

## Udrulning

Byggekonteksten er **repo-roden**, ikke `cosurg-mcp/` — kilderne og træerne
ligger i naboemapper og bages ind i imaget:

```bash
docker build -f cosurg-mcp/Dockerfile -t cosurg-mcp:1.0.0 .

docker run -d --name cosurg-mcp -p 8787:8787 \
  -e MCP_AUTH_TOKEN="$(openssl rand -hex 32)" \
  --read-only --memory 256m \
  cosurg-mcp:1.0.0
```

Eller med compose (samme kontekst, Traefik-labels til Openship-stacken):

```bash
MCP_AUTH_TOKEN=$(openssl rand -hex 32) \
  docker compose -f cosurg-mcp/docker-compose.yml up -d --build
```

Sluttrinnet er `distroless/nodejs22` — ingen shell, ingen pakkemanager, non-root,
filsystemet kan være read-only. Der er ingen skrivbar tilstand at miste.

`GET /health` er uautentificeret, så Traefik og Openship kan pinge uden token:

```json
{"status":"ok","navn":"cosurg-mcp","version":"1.0.0","mcpSti":"/mcp",
 "transport":"streamable_http","uddrag":323,"afsnit":54,"cases":2,
 "traeer":["burns-dk","dressing-hand-arm"]}
```

## Miljøvariabler

| Variabel | Standard | Note |
|---|---|---|
| `MCP_AUTH_TOKEN` | — | **Påkrævet.** Kommasepareret for flere. Mindst 24 tegn pr. token. |
| `PORT` / `HOST` | `8787` / `0.0.0.0` | |
| `MCP_PATH` | `/mcp` | Stien streamable HTTP eksponeres på. |
| `COSURG_KILDE_DIR` | `data/kilder`, ellers `../kilder` | Første eksisterende mappe vinder. |
| `COSURG_TRAE_DIR` | `data/trees`, ellers `../cosurg/content/trees` | Samme. |
| `PUBMED_API_KEY` | — | Valgfri. Uden nøgle 3 kald/sek., med nøgle 10. |
| `PUBMED_EMAIL` / `PUBMED_TOOL` | `mads@mahope.dk` / `cosurg-mcp` | NCBI beder om begge på alle kald. |
| `PUBMED_TIMEOUT_MS` | `12000` | |
| `MCP_ALLOW_ANONYMOUS` | — | `1` slår autentifikation fra. Kun til lokal fejlsøgning. |

## Sådan er søgningen bygget

BM25 i hukommelsen over 323 uddrag. Ingen embeddings, ingen vektordatabase — 221 KB
tekst svarer på under et millisekund, og BM25 har den egenskab der betyder noget
her: den kan ikke hallucinere. Et resultat er altid et ordret uddrag med sin
kilde, eller også er der intet resultat.

Tre ting er tilpasset dansk klinisk tekst:

- **Foldning.** `æ→ae`, `ø→oe`, `å→aa`, så "ætsning", "aetsning" og "AETSNING"
  matcher hinanden.
- **Præfiksmatch.** Danske sammensætninger betyder at en søgning på "inhalation"
  skal ramme "inhalationsskade". Delvise match scorer lavere end fulde.
- **Overskriftsvægt.** Overskrifter tæller tre gange — de navngiver emnet.

To ting holder "ingen dækning" ærligt, nu hvor basen også indeholder engelsk tekst:

- **Mindste dækning.** Et uddrag skal ramme mindst halvdelen af søgningens
  forskellige ord. Ellers slog ét tilfældigt ordsammenfald igennem — en søgning på
  "kolorektal anastomoselækage stapler" ramte overskriften "Staples" i
  hudtransplantationsafsnittet og fik høj score, fordi overskrifter vejer tungt og
  uddraget var kort. Svaret var ikke opdigtet, men det var irrelevant, og det er
  lige så skadeligt når det leveres i stedet for "vi har ingen dækning".
- **Ingen billed-uddrag.** Et uddrag der kun består af et billede-link indekseres
  ikke. Alt-teksten er ofte casens eller kapitlets titel, så et sådant uddrag scorer
  højest på præcis den søgning man stiller — og svarer med et billede i stedet for
  et klinisk udsagn. Billederne bliver stående i de uddrag der også har brødtekst.

Uddrag afgrænses af markdown-overskrifter, så en træffer altid bærer sin
kapitelsti. Over 1400 tegn deles ved afsnitsgrænser, aldrig midt i en sætning.
Resultater under en relevanstærskel frasorteres — det er dér "vi ved det ikke"
bliver et ærligt svar i stedet for et dårligt.
