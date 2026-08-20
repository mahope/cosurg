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

| Kilde | Omfang | Kildeangivelse |
|---|---|---|
| `kilder/brandsaar-dk.md` | Hele brandsaar.dk — Dansk Brandsårsforening / Rigshospitalets brandsårsafdeling. Dybdevurdering, TBSA/arealberegning, Parkland-væskebehandling, inhalationsskader, ætsninger, forfrysninger, cirkulære forbrændinger, overflytningskriterier, ambulant behandling, smertebehandling. | URL pr. afsnit |
| `kilder/magnus-materiale.md` | Teamets eget materiale: "Burns plast surgeon"-dokumentet og forbindingsguiden fra Rigshospitalets Afsnit 6052. | Dokumentnavn + kapitelsti |
| `cosurg/content/trees/*.json` | Beslutningstræerne `burns-dk` (8 noder, 3 dispositioner) og `dressing-hand-arm` (12 trin). | Træ-id, version, filnavn og forfatterliste |

Ved opstart indlæses **38 kildeafsnit → 211 søgbare uddrag** samt begge træer.
Alt ligger i hukommelsen; der er ingen database og ingen skrivbar tilstand.

## Værktøjer

| Værktøj | Formål |
|---|---|
| `soeg_klinisk_viden` | Fritekstsøgning i de kliniske kilder. Returnerer ordrette uddrag med URL/dokumentnavn, overskriftssti, uddrag-id og relevansscore. Kan begrænses til én samling. |
| `hent_kildeafsnit` | Hele siden bag et søgetræf — via afsnit-id eller URL. Til når tre linjer ikke er kontekst nok. |
| `list_kilder` | Alle kildeafsnit med id og URL. Til at afgøre om et emne overhovedet er dækket. |
| `list_beslutningstraeer` | Træerne med id, navn, version, forfattere, rodnode og nodeantal. |
| `hent_beslutningstrae` | Et helt træ som læsbar oversigt eller som ordret JSON. |
| `hent_trae_node` | Én node (spørgsmål, tilladte svarværdier med synonymer, røde flag, kanter ud, hvilke noder man kommer fra) eller én disposition. |
| `soeg_pubmed` | Litteratursøgning via NCBI E-utilities når vores egen viden ikke rækker. Titel, år, tidsskrift, forfattere, publikationstype, PMID, DOI og link — aldrig et resultat uden reference. Rate-limits og timeouts genforsøges med voksende ventetid, så et 429 ikke bliver til "der findes ingen litteratur". |
| `hent_pubmed_abstrakt` | Fulde abstracts (MEDLINE, ordret fra NCBI) for op til 10 PMID'er. En titel er ikke et resultat. |
| `videnbase_status` | Hvad serveren faktisk har indlæst. Til at skelne "ingen dækning" fra "fejlkonfiguration". |

Serveren sender desuden `instructions` med i `initialize`, så agenten får reglen
med fra start: slå op før du svarer, citér kilden, anbefalinger kommer fra træet,
og meld ærligt når der ikke er dækning.

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

Serveren finder selv kilderne i `../kilder` og træerne i
`../cosurg/content/trees` når den kører fra repoet.

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
 "transport":"streamable_http","uddrag":211,"afsnit":38,
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

BM25 i hukommelsen over 211 uddrag. Ingen embeddings, ingen vektordatabase — 166 KB
tekst svarer på under et millisekund, og BM25 har den egenskab der betyder noget
her: den kan ikke hallucinere. Et resultat er altid et ordret uddrag med sin
kilde, eller også er der intet resultat.

Tre ting er tilpasset dansk klinisk tekst:

- **Foldning.** `æ→ae`, `ø→oe`, `å→aa`, så "ætsning", "aetsning" og "AETSNING"
  matcher hinanden.
- **Præfiksmatch.** Danske sammensætninger betyder at en søgning på "inhalation"
  skal ramme "inhalationsskade". Delvise match scorer lavere end fulde.
- **Overskriftsvægt.** Overskrifter tæller tre gange — de navngiver emnet.

Uddrag afgrænses af markdown-overskrifter, så en træffer altid bærer sin
kapitelsti. Over 1400 tegn deles ved afsnitsgrænser, aldrig midt i en sætning.
Resultater under en relevanstærskel frasorteres — det er dér "vi ved det ikke"
bliver et ærligt svar i stedet for et dårligt.
