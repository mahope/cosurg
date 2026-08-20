import { NextResponse } from "next/server";

/**
 * Appen er offentlig uden login under hackathonnet. Uden værn kan enhver der finder
 * URL'en brænde vores Corti-credits og Syv.ai-kroner (1 kr/1000 tegn). Derfor:
 * hård længdegrænse på alt input og en simpel per-IP-kvote pr. rute.
 */

const WINDOW_MS = 60_000;
const buckets = new Map<string, { count: number; resetAt: number }>();

export const LIMITS = {
  /** Ét talt svar. Længere end dette er ikke et svar — det er misbrug. */
  utterance: 600,
  /** Transskript til notatgenerering. */
  transcript: 20_000,
  dictation: 5_000,
  /** TTS afregnes pr. tegn — hold den stram. */
  tts: 500,
} as const;

function clientIp(req: Request): string {
  const fwd = req.headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0].trim();
  return req.headers.get("x-real-ip") ?? "ukendt";
}

/** Returnerer et 429-svar hvis kvoten er brugt, ellers null. */
export function rateLimit(req: Request, route: string, max: number): NextResponse | null {
  const key = `${route}:${clientIp(req)}`;
  const now = Date.now();
  const hit = buckets.get(key);

  if (!hit || hit.resetAt < now) {
    buckets.set(key, { count: 1, resetAt: now + WINDOW_MS });
  } else if (hit.count >= max) {
    return NextResponse.json(
      { error: "For mange forespørgsler — prøv igen om lidt" },
      { status: 429, headers: { "Retry-After": String(Math.ceil((hit.resetAt - now) / 1000)) } },
    );
  } else {
    hit.count += 1;
  }

  // Ryd udløbne nøgler, så kortet ikke vokser ubegrænset i en lang session.
  if (buckets.size > 500) {
    for (const [k, v] of buckets) if (v.resetAt < now) buckets.delete(k);
  }
  return null;
}

/** Afkorter og trimmer fritekst før den sendes videre til en betalt API. */
export function cap(value: unknown, max: number): string {
  if (typeof value !== "string") return "";
  return value.slice(0, max).trim();
}

/**
 * Origin-lås: API'et svarer kun på kald fra vores egen app. Det stopper en fremmed
 * side i at kalde ruterne fra en browser og bruge vores credits.
 *
 * Bemærk at Origin kan forfalskes af en ikke-browser-klient (curl) — dette er et
 * lag oven på kvoten, ikke i stedet for. Ekstra domæner sættes via ALLOWED_ORIGINS
 * (kommasepareret), fx til preview-udrulninger.
 */
// Begge domæner står her med vilje: navneskiftet skete få timer før demoen, og
// ingen af os skal opdage fredag kl. 14 at låsen peger på det gamle navn.
const DEFAULT_ORIGINS = [
  "https://cosurg.com",
  "https://www.cosurg.com",
  "http://localhost:3000",
  "http://127.0.0.1:3000",
];

function allowedOrigins(): string[] {
  const extra = (process.env.ALLOWED_ORIGINS ?? "")
    .split(",")
    .map((o) => o.trim())
    .filter(Boolean);
  return [...DEFAULT_ORIGINS, ...extra];
}

/**
 * Kaldet kommer fra appen selv, uanset hvilket domæne den er udrullet på.
 * Låsen skal stoppe FREMMEDE sider i at bruge vores credits — ikke vores egen
 * side i at virke. Derfor sammenlignes med Host-headeren og ikke kun med en
 * hardkodet liste: et domæneskift må aldrig kunne slå demoen ihjel.
 */
function isSameOrigin(req: Request, candidateOrigin: string): boolean {
  const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host");
  if (!host) return false;
  try {
    return new URL(candidateOrigin).host === host;
  } catch {
    return false;
  }
}

export function checkOrigin(req: Request): NextResponse | null {
  const origin = req.headers.get("origin");
  const referer = req.headers.get("referer");

  // Ingen af delene sat: server-til-server-kald eller en direkte navigation.
  // Vi afviser ikke — kvoten dækker det tilfælde.
  if (!origin && !referer) return null;

  let candidate: string | null = origin;
  if (!candidate && referer) {
    try {
      candidate = new URL(referer).origin;
    } catch {
      candidate = null;
    }
  }
  if (!candidate) return null;

  if (isSameOrigin(req, candidate)) return null;
  if (allowedOrigins().includes(candidate)) return null;

  return NextResponse.json({ error: "Ikke tilladt oprindelse" }, { status: 403 });
}

/** Kvote + origin-lås i ét kald — brug den i alle betalte ruter. */
export function guard(req: Request, route: string, max: number): NextResponse | null {
  return checkOrigin(req) ?? rateLimit(req, route, max);
}
