/**
 * Klient til CoSurgs egen MCP-server (cosurg-mcp).
 *
 * Serveren holder teamets validerede kliniske viden — brandsaar.dk (Dansk
 * Brandsårsforening / Rigshospitalets brandsårsafdeling) og teamets eget
 * materiale — og svarer KUN med ordrette uddrag der bærer deres kilde. Den
 * opfinder ikke tekst, og den siger rent ud når et emne ikke er dækket.
 *
 * Derfor kalder vi den direkte herfra i stedet for at bede en sprogmodel om at
 * huske indholdet: alt hvad guide- og faldgrubesiderne viser, kan spores til en
 * URL eller et dokumentnavn. Går serveren ned, viser siderne at der ikke er
 * dækning — de finder ikke på noget i mellemtiden.
 *
 * Transporten er streamable HTTP, som i praksis er JSON-RPC over ét POST-kald.
 * Serveren er stateless, så der er ingen session at holde styr på.
 */

/** Ét ordret uddrag fra vidensbasen, med alt der skal til for at citere det. */
export interface KildeUddrag {
  /** Uddragets id hos MCP-serveren, fx "brandsaar:09#1". Bruges til dedup. */
  id: string;
  /** Kildeafsnittets id, fx "brandsaar:09". Hele siden kan hentes med det. */
  afsnitId: string;
  /** URL eller dokumentnavn. */
  kilde: string;
  /** Er kilden en URL vi kan linke til? Dokumenter kan kun navngives. */
  erUrl: boolean;
  /** Samlingens titel, fx "brandsaar.dk — Dansk Brandsårsforening …". */
  samling: string;
  /** Overskriftsstien inde i kilden, fx ["Behandling før transport"]. */
  overskrifter: string[];
  /** BM25-score fra serveren. Absolut tal — brug den kun til at sammenligne. */
  relevans: number;
  /** Selve teksten, ordret fra kilden. */
  tekst: string;
}

export interface SoegeSvar {
  uddrag: KildeUddrag[];
  /** Sand når serveren eksplicit meldte at emnet ikke er dækket. */
  ingenDaekning: boolean;
}

const INGEN_DAEKNING = "INGEN DAEKNING I VIDENSBASEN";

/**
 * Serveren er hurtig (BM25 i hukommelsen), men netværket er ikke. En guide-side
 * fyrer otte søgninger af på én gang, og en enkelt hængende forbindelse må ikke
 * kunne holde hele siden tilbage.
 */
const TIMEOUT_MS = 12_000;

/**
 * Vidensbasen er statisk — den indlæses én gang ved serverens opstart og ændrer
 * sig ikke mens den kører. Derfor kan svarene caches uden risiko for at vise
 * forældet klinisk indhold, og en faldgrube der vises igen og igen under et
 * forløb koster kun ét kald.
 */
const CACHE_TTL_MS = 15 * 60_000;
const CACHE_MAX = 300;
const cache = new Map<string, { tid: number; svar: SoegeSvar }>();

function mcpUrl(): string | null {
  const raw = process.env.MCP_URL ?? process.env.COSURG_MCP_URL;
  if (!raw) return null;
  const trimmed = raw.replace(/\/+$/, "");
  // Begge former accepteres i miljøet: med og uden /mcp-stien.
  return trimmed.endsWith("/mcp") ? trimmed : `${trimmed}/mcp`;
}

function mcpToken(): string | null {
  return process.env.MCP_AUTH_TOKEN ?? process.env.COSURG_MCP_TOKEN ?? null;
}

/** Er serveren overhovedet konfigureret? Ruterne skal sige det, ikke gætte. */
export function mcpKonfigureret(): boolean {
  return !!mcpUrl() && !!mcpToken();
}

interface McpSvar {
  error?: { message?: string };
  result?: { content?: Array<{ type?: string; text?: string }> };
}

/** Kalder ét MCP-værktøj og returnerer den samlede tekst. */
async function kaldVaerktoej(navn: string, argumenter: Record<string, unknown>): Promise<string> {
  const url = mcpUrl();
  const token = mcpToken();
  if (!url || !token) throw new Error("MCP_URL / MCP_AUTH_TOKEN mangler i miljøet");

  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json, text/event-stream",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: 1,
      method: "tools/call",
      params: { name: navn, arguments: argumenter },
    }),
    cache: "no-store",
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });

  if (!res.ok) throw new Error(`MCP-kald fejlede: ${res.status} ${await res.text()}`);

  const body = (await res.json()) as McpSvar;
  if (body.error) throw new Error(body.error.message ?? "MCP-fejl uden besked");
  return (body.result?.content ?? []).map((c) => c.text ?? "").join("\n");
}

/**
 * Serveren svarer i markdown, ikke i JSON. Formatet er vores eget og fast:
 *
 *   ## Traeffer 1 — <samling> — <kilde> › <overskrift> › <overskrift>
 *   Kilde: <url eller "dokument: navn">
 *   Uddrag-id: `id` · afsnit-id: `afsnitId` · relevans: 12.34
 *
 *   <ordret tekst>
 *
 * Vi parser det til struktur, så UI'et kan sætte kilden ved hvert afsnit i
 * stedet for at dumpe en markdown-klump på skærmen. Går parsingen galt for én
 * blok, springes blokken over — et halvt citat uden kilde er værre end intet.
 */
function parseTraeffere(svar: string): KildeUddrag[] {
  const blokke = svar.split(/\n-{3,}\n/);
  const uddrag: KildeUddrag[] = [];

  for (const blok of blokke) {
    const overskrift = blok.match(/^##\s+Traeffer\s+\d+\s+—\s+(.+)$/m);
    const kildeLinje = blok.match(/^Kilde:\s*(.+)$/m);
    const meta = blok.match(/^Uddrag-id:\s*`([^`]+)`\s*·\s*afsnit-id:\s*`([^`]+)`\s*·\s*relevans:\s*([\d.]+)\s*$/m);
    if (!overskrift || !kildeLinje || !meta) continue;

    // Teksten begynder efter metalinjen og løber blokken ud. Halen med
    // brugsanvisningen til agenten hører ikke til citatet.
    const efterMeta = blok.slice(blok.indexOf(meta[0]) + meta[0].length);
    const tekst = efterMeta
      .replace(/\n\*Brug hent_kildeafsnit[^\n]*\*\s*$/, "")
      .replace(/^\s*```\s*\n\s*```\s*/, "")
      .trim();
    if (!tekst) continue;

    const raaKilde = kildeLinje[1].trim();
    const erUrl = /^https?:\/\//i.test(raaKilde);
    const kilde = erUrl ? raaKilde : raaKilde.replace(/^dokument:\s*/i, "");

    // Overskriftsstien står efter kilden, adskilt med "›". Samlingstitlen er
    // resten foran — den indeholder selv tankestreger, så vi klipper på kilden.
    const dele = overskrift[1].split(" › ");
    const hoved = dele[0];
    const samling = hoved.replace(new RegExp(`\\s*—\\s*${escapeRegex(raaKilde.replace(/^dokument:\s*/i, ""))}\\s*$`), "").trim();

    uddrag.push({
      id: meta[1],
      afsnitId: meta[2],
      kilde,
      erUrl,
      samling: samling || hoved,
      overskrifter: dele.slice(1),
      relevans: Number(meta[3]),
      tekst,
    });
  }

  return uddrag;
}

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export interface SoegeMuligheder {
  /** Antal uddrag der ønskes. Serveren tillader 1-10. */
  antal?: number;
  /** Begræns til én samling. */
  samling?: "alle" | "brandsaar" | "magnus";
  /**
   * Hele uddraget frem for et vindue omkring træfferen. Til en guide man skal
   * LÆSE er hele afsnittet rigtigt; til en faldgrube der skal fanges på et
   * sekund er vinduet bedre.
   */
  fuldt?: boolean;
}

/**
 * Fritekstsøgning i CoSurgs kliniske kilder.
 *
 * Kaster ved netværks- eller konfigurationsfejl — kalderen skal kunne skelne
 * "vi kunne ikke spørge" fra "der er ikke dækning", for de to beskeder betyder
 * vidt forskellige ting for en kliniker.
 */
export async function soegKliniskViden(
  forespoergsel: string,
  { antal = 4, samling = "alle", fuldt = false }: SoegeMuligheder = {},
): Promise<SoegeSvar> {
  const noegle = `${forespoergsel}|${antal}|${samling}|${fuldt}`;
  const hit = cache.get(noegle);
  if (hit && Date.now() - hit.tid < CACHE_TTL_MS) return hit.svar;

  const tekst = await kaldVaerktoej("soeg_klinisk_viden", {
    forespoergsel: forespoergsel.slice(0, 400),
    antal,
    samling,
    fuldt_uddrag: fuldt,
  });

  const svar: SoegeSvar = tekst.includes(INGEN_DAEKNING)
    ? { uddrag: [], ingenDaekning: true }
    : { uddrag: parseTraeffere(tekst), ingenDaekning: false };

  if (cache.size >= CACHE_MAX) {
    // Simpel udrensning: den ældste halvdel ryger. Vidensbasen er statisk, så
    // et tabt cache-hit koster kun ét hurtigt kald.
    const sorteret = [...cache.entries()].sort((a, b) => a[1].tid - b[1].tid);
    sorteret.slice(0, Math.floor(CACHE_MAX / 2)).forEach(([k]) => cache.delete(k));
  }
  cache.set(noegle, { tid: Date.now(), svar });
  return svar;
}

/**
 * Frasortér svage træffere.
 *
 * BM25-scoren er absolut og afhænger af hvor sjældne søgeordene er, så en fast
 * grænse ville enten lukke gode træffere ude eller lukke støj ind. Vi måler i
 * stedet mod feltets egen top: er en træffer markant svagere end den bedste,
 * handler den om noget andet. Bunden holder de tilfælde ude hvor selv den
 * bedste træffer kun ramte et almindeligt ord som "brandsår".
 */
export function filtrerRelevante(uddrag: KildeUddrag[], mindsteAndel = 0.35, bund = 2.5): KildeUddrag[] {
  if (uddrag.length === 0) return uddrag;
  const top = uddrag[0].relevans;
  if (top < bund) return [];
  return uddrag.filter((u) => u.relevans >= Math.max(top * mindsteAndel, bund));
}

/** Kort, læsbar kildeangivelse: "brandsaar.dk › Behandling før transport". */
export function kildeEtiket(u: KildeUddrag): string {
  const vaert = u.erUrl ? safeHost(u.kilde) : u.kilde;
  return [vaert, ...u.overskrifter].join(" › ");
}

function safeHost(url: string): string {
  try {
    return new URL(url).host.replace(/^www\./, "");
  } catch {
    return url;
  }
}
