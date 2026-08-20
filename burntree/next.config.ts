import type { NextConfig } from "next";

/**
 * CSP: appen indlæser intet fra fremmede domæner. connect-src skal dog rumme
 * Cortis WebSocket til speech-to-text, som browseren forbinder direkte til.
 *
 * Værterne udledes af CORTI_ENVIRONMENT i stedet for at være hardkodet til "eu".
 * Skifter nogen region fredag morgen, følger CSP'en med — ellers ville browseren
 * blokere mikrofon-socket'en med en fejl ingen på scenen kan tyde.
 * auth-værten er med, fordi SDK'et kan forsøge at forny tokenet undervejs.
 */
const cortiEnv = process.env.CORTI_ENVIRONMENT ?? "eu";
const cortiHosts = [
  `https://api.${cortiEnv}.corti.app`,
  `wss://api.${cortiEnv}.corti.app`,
  `https://auth.${cortiEnv}.corti.app`,
].join(" ");

const csp = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob:",
  "media-src 'self' blob:",
  `connect-src 'self' ${cortiHosts}`,
  "font-src 'self'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
].join("; ");

const nextConfig: NextConfig = {
  // Standalone-output holder runtime-imaget lille — nsl-server har kun 3,7 GB RAM.
  output: "standalone",
  poweredByHeader: false,
  compress: true,

  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "Content-Security-Policy", value: csp },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "X-Frame-Options", value: "DENY" },
          // Mikrofonen skal virke; alt andet er slået fra.
          { key: "Permissions-Policy", value: "camera=(), geolocation=(), microphone=(self)" },
          { key: "Strict-Transport-Security", value: "max-age=31536000; includeSubDomains" },
        ],
      },
      {
        // Step-billederne er statiske og ændrer sig ikke inden for en session.
        source: "/step-images/:path*",
        headers: [{ key: "Cache-Control", value: "public, max-age=31536000, immutable" }],
      },
    ];
  },
};

export default nextConfig;
