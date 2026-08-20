/**
 * Bearer-token-autentifikation.
 *
 * Corti dokumenterer `auth: {"type": "bearer"}` paa MCP-connectorer, men
 * mekanismen der leverer selve tokenet (`authorizationData`) er ikke beskrevet
 * i deres docs. Vi accepterer derfor tokenet to steder:
 *
 *   1. `Authorization: Bearer <token>` — standarden, som enhver MCP-klient sender.
 *   2. Som sidste segment i stien: `POST /mcp/<token>` — virker selv naar
 *      connectoren kun kan konfigureres med en URL.
 *
 * Begge veje sammenlignes i konstant tid. Uden token i miljoeet starter
 * serveren ikke: en aaben klinisk endpoint er ikke et acceptabelt udfald.
 */

import { timingSafeEqual } from "node:crypto";
import type { IncomingMessage } from "node:http";

import { konfiguration } from "./konfiguration.js";

function ensLaengdeSammenligning(a: string, b: string): boolean {
  const bufA = Buffer.from(a, "utf8");
  const bufB = Buffer.from(b, "utf8");
  if (bufA.length !== bufB.length) {
    // Sammenlign alligevel mod sig selv, saa svartiden ikke afsloerer laengden.
    timingSafeEqual(bufA, bufA);
    return false;
  }
  return timingSafeEqual(bufA, bufB);
}

export function erGyldigtToken(kandidat: string | null | undefined): boolean {
  if (konfiguration.tilladUdenAuth) return true;
  if (!kandidat || kandidat === "") return false;
  let ok = false;
  for (const token of konfiguration.tokens) {
    // Ingen tidlig exit: alle tokens tjekkes hver gang.
    if (ensLaengdeSammenligning(token, kandidat)) ok = true;
  }
  return ok;
}

export interface AuthResultat {
  ok: boolean;
  /** Stien uden et eventuelt token-segment — det er den transporten skal se. */
  renSti: string;
}

/**
 * Trækker token ud af enten Authorization-headeren eller stiens sidste segment,
 * og returnerer den rensede sti.
 */
export function tjekAdgang(req: IncomingMessage, forventetSti: string): AuthResultat {
  const raaSti = (req.url ?? "/").split("?")[0] ?? "/";
  const sti = raaSti.length > 1 && raaSti.endsWith("/") ? raaSti.slice(0, -1) : raaSti;

  const header = req.headers["authorization"];
  const headerToken =
    typeof header === "string" && /^bearer\s+/i.test(header) ? header.replace(/^bearer\s+/i, "").trim() : null;

  if (sti === forventetSti) {
    return { ok: erGyldigtToken(headerToken), renSti: forventetSti };
  }

  if (sti.startsWith(`${forventetSti}/`)) {
    const stiToken = decodeURIComponent(sti.slice(forventetSti.length + 1));
    return {
      ok: erGyldigtToken(headerToken) || erGyldigtToken(stiToken),
      renSti: forventetSti,
    };
  }

  return { ok: false, renSti: sti };
}

/** Kaldes ved opstart. Kaster hvis serveren ville vaere aaben for enhver. */
export function verificerOpsaetning(): void {
  if (konfiguration.tilladUdenAuth) {
    console.warn(
      "[cosurg-mcp] ADVARSEL: MCP_ALLOW_ANONYMOUS=1 — serveren koerer UDEN autentifikation. Kun til lokal fejlsoegning.",
    );
    return;
  }
  if (konfiguration.tokens.length === 0) {
    throw new Error(
      "MCP_AUTH_TOKEN mangler. Saet mindst ét token (kommasepareret for flere), " +
        "eller MCP_ALLOW_ANONYMOUS=1 hvis du bevidst vil koere uden auth lokalt.",
    );
  }
  const forKorte = konfiguration.tokens.filter((t) => t.length < 24);
  if (forKorte.length > 0) {
    throw new Error("Hvert token i MCP_AUTH_TOKEN skal vaere mindst 24 tegn.");
  }
}
