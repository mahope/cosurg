const ENV = process.env.CORTI_ENVIRONMENT ?? "eu";
const TENANT = process.env.CORTI_TENANT ?? "base";

export const CORTI_API_BASE = `https://api.${ENV}.corti.app`;
const TOKEN_URL = `https://auth.${ENV}.corti.app/realms/${TENANT}/protocol/openid-connect/token`;

/**
 * Timeouts på alt udgående. Corti kan være langsom eller falde ud midt i en demo;
 * et kald uden tidsgrænse hænger til Next selv giver op, og brugeren ser intet.
 */
export const TIMEOUTS = {
  auth: 10_000,
  coding: 25_000,
  agent: 60_000,
} as const;

type CachedToken = { token: string; expiresAt: number };
const cache = new Map<string, CachedToken>();

/**
 * Tokens live 300s. Scope "openid transcribe" yields a limited-scope token that is
 * safe to hand to the browser for the STT websocket; the full-access token never leaves the server.
 */
export async function getAccessToken(scope?: string): Promise<string> {
  const key = scope ?? "full";
  const hit = cache.get(key);
  if (hit && hit.expiresAt > Date.now() + 30_000) return hit.token;

  const clientId = process.env.CORTI_CLIENT_ID;
  const clientSecret = process.env.CORTI_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    throw new Error("CORTI_CLIENT_ID / CORTI_CLIENT_SECRET mangler i miljøet");
  }

  const body = new URLSearchParams({
    grant_type: "client_credentials",
    client_id: clientId,
    client_secret: clientSecret,
  });
  if (scope) body.set("scope", scope);

  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
    cache: "no-store",
    // Uden timeout hænger hele ruten hvis Corti ikke svarer. Bedre en ærlig
    // fejl på ti sekunder end en demo der står og snurrer.
    signal: AbortSignal.timeout(TIMEOUTS.auth),
  });

  if (!res.ok) {
    throw new Error(`Corti auth fejlede: ${res.status} ${await res.text()}`);
  }

  const data = (await res.json()) as { access_token: string; expires_in: number };
  cache.set(key, {
    token: data.access_token,
    expiresAt: Date.now() + data.expires_in * 1000,
  });
  return data.access_token;
}

export function cortiHeaders(token: string): HeadersInit {
  return {
    Authorization: `Bearer ${token}`,
    "Tenant-Name": TENANT,
    "Content-Type": "application/json",
  };
}
