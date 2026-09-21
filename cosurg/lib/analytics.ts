/**
 * Umami-events. Kontrakten står i magnus/docs/ANALYTICS-EVENTS.md.
 *
 * Reglen der bærer alt andet: INGEN personhenførbare data. Aldrig fritekst fra
 * lægen, aldrig transskript, aldrig et billede — kun enum-værdier, offentlige
 * id'er (forløbs-id, kilde-id) og tal. Det er ikke en stilistisk præference:
 * ytringerne i appen kan beskrive en patient.
 *
 * Værterne kommer fra env med de kendte produktionsværdier som reserve, så et
 * deploy uden env stadig sender data (jf. spec, regel 5).
 */

export const UMAMI_HOST = (
  process.env.NEXT_PUBLIC_UMAMI_HOST || "https://analytics.nordicsurgerylab.com"
).replace(/\/+$/, "");

export const UMAMI_WEBSITE_ID =
  process.env.NEXT_PUBLIC_UMAMI_WEBSITE_ID || "4073d1cb-67f0-48d4-bf82-bb0db5b0d059";

/** Flade properties: streng/tal/bool, max ~10 pr. event. */
export type EventData = Record<string, string | number | boolean>;

declare global {
  interface Window {
    umami?: {
      track: (name: string, data?: EventData) => void;
    };
  }
}

/**
 * Client-side. Kaster aldrig: scriptet kan være blokeret af en adblocker, ikke
 * indlæst endnu, eller vi kan stå i en server-render. Et manglende event må
 * aldrig koste lægen noget.
 */
export function track(name: string, data?: EventData): void {
  if (typeof window === "undefined") return;
  try {
    window.umami?.track(name, data);
  } catch {
    /* analytics må aldrig vælte appen */
  }
}

// Umamis isbot-filter dropper stille (200 "beep boop") alt der ikke ligner en rigtig browser.
const FALLBACK_USER_AGENT =
  "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36";

/**
 * Headers til POST /api/send. Umami hasher IP + User-Agent til visitor-id'et
 * og læser IP fra `x-forwarded-for` (første værdi) / `x-real-ip`. Med den
 * oprindelige request videresender vi lægens IP + UA, så server-eventet
 * lander på samme besøgende/session som browser-eventerne (funnels). Uden
 * request bruges en browser-lignende UA, så bot-filteret beholder eventet.
 */
export function sendHeaders(req?: Request): Record<string, string> {
  const h = req?.headers;
  const ip = h?.get("x-forwarded-for")?.split(",")[0]?.trim() || h?.get("x-real-ip") || null;
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    "User-Agent": h?.get("user-agent") || FALLBACK_USER_AGENT,
  };
  if (ip) {
    headers["X-Forwarded-For"] = ip;
    headers["X-Real-IP"] = ip;
  }
  return headers;
}

/**
 * Server-side (API-ruter uden browser). POST til Umamis /api/send med en
 * User-Agent — Umami afviser requests uden, og den SKAL ligne en rigtig browser:
 * Umamis isbot-filter dropper alt andet stille (200 "beep boop"). Fire-and-forget: kald med `void`,
 * aldrig i request-kritisk sti. No-op når env mangler.
 *
 * `url`/`hostname` er hvad Umami viser som "side" for eventet; giv ruten
 * (fx "/api/chat") og værten fra request-headeren. `req` er den oprindelige
 * request: dens IP + UA videresendes, så eventet tilskrives samme besøgende.
 */
export function sendEvent(
  name: string,
  data: EventData | undefined,
  ctx: { url: string; hostname?: string; req?: Request },
): Promise<void> {
  if (!UMAMI_HOST || !UMAMI_WEBSITE_ID) return Promise.resolve();

  const payload = {
    type: "event",
    payload: {
      website: UMAMI_WEBSITE_ID,
      hostname: ctx.hostname ?? "cosurg.com",
      url: ctx.url,
      name,
      data: { source: "server", ...data },
    },
  };

  return fetch(`${UMAMI_HOST}/api/send`, {
    method: "POST",
    headers: sendHeaders(ctx.req),
    body: JSON.stringify(payload),
    cache: "no-store",
    signal: AbortSignal.timeout(3_000),
  })
    .then(() => undefined)
    .catch(() => undefined);
}

/** Værten fra request-headeren, uden port. Til `sendEvent`-kontekst. */
export function hostnameFrom(req: Request): string | undefined {
  const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host");
  return host ? host.split(":")[0] : undefined;
}
