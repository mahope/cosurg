/**
 * Konfiguration laest af miljoevariabler.
 *
 * Serveren har ingen database og ingen skrivbar tilstand. Alt den kan svare paa
 * kommer fra filerne der laeses ved opstart — det er hele pointen: svarene skal
 * kunne spores til en kilde, ikke genereres.
 */

import { existsSync } from "node:fs";
import { dirname, isAbsolute, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const denneFil = fileURLToPath(import.meta.url);
/** Pakkeroden (cosurg-mcp/), uanset om vi koerer fra src/ eller dist/. */
export const pakkeRod = resolve(dirname(denneFil), "..");

function tekst(navn: string, standard: string): string {
  const v = process.env[navn];
  return v === undefined || v.trim() === "" ? standard : v.trim();
}

function tal(navn: string, standard: number): number {
  const v = process.env[navn];
  if (v === undefined || v.trim() === "") return standard;
  const n = Number(v);
  if (!Number.isFinite(n)) {
    throw new Error(`Miljoevariablen ${navn} skal vaere et tal, fik "${v}"`);
  }
  return n;
}

function stiListe(navn: string, standarder: string[]): string[] {
  const v = process.env[navn];
  const raa = v && v.trim() !== "" ? v.split(",") : standarder;
  return raa
    .map((s) => s.trim())
    .filter((s) => s !== "")
    .map((s) => (isAbsolute(s) ? s : resolve(pakkeRod, s)));
}

/**
 * Mapper der gennemsoeges efter kildedokumenter (.md) og beslutningstraeer (.json).
 * I Docker ligger de under /app/data; i udvikling ligger de i naboemapper i repoet.
 */
export const konfiguration = {
  /** Port HTTP-serveren lytter paa. */
  port: tal("PORT", 8787),
  /** Bind-adresse. 0.0.0.0 i container, saa Traefik/Openship kan naa den. */
  vaert: tekst("HOST", "0.0.0.0"),
  /** Sti som streamable-HTTP-transporten eksponeres paa. */
  mcpSti: tekst("MCP_PATH", "/mcp"),

  /**
   * Gyldige bearer-tokens, kommasepareret. Tom liste = serveren naegter at starte.
   * Se autentifikation.ts for hvorfor tokenet ogsaa accepteres i URL-stien.
   */
  tokens: tekst("MCP_AUTH_TOKEN", "")
    .split(",")
    .map((s) => s.trim())
    .filter((s) => s !== ""),

  /** Saet til "1" for at koere helt uden auth (kun til lokal fejlsoegning). */
  tilladUdenAuth: tekst("MCP_ALLOW_ANONYMOUS", "") === "1",

  kildeMapper: stiListe("COSURG_KILDE_DIR", ["data/kilder", "../kilder"]),
  traeMapper: stiListe("COSURG_TRAE_DIR", ["data/trees", "../cosurg/content/trees"]),

  /** PubMed E-utilities. Nøgle er valgfri (hoejere rate limit med). */
  pubmedBasis: tekst("PUBMED_BASE_URL", "https://eutils.ncbi.nlm.nih.gov/entrez/eutils"),
  pubmedApiNoegle: tekst("PUBMED_API_KEY", ""),
  /** NCBI beder om et vaerktoejsnavn og en kontaktmail paa alle kald. */
  pubmedVaerktoej: tekst("PUBMED_TOOL", "cosurg-mcp"),
  pubmedEmail: tekst("PUBMED_EMAIL", "mads@mahope.dk"),
  pubmedTimeoutMs: tal("PUBMED_TIMEOUT_MS", 12_000),
} as const;

/** Foerste eksisterende mappe i listen, eller null hvis ingen findes. */
export function foersteEksisterende(mapper: readonly string[]): string | null {
  for (const m of mapper) {
    if (existsSync(m)) return m;
  }
  return null;
}
