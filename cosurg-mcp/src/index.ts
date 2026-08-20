/**
 * HTTP-indgangen til cosurg-mcp.
 *
 * Transport: streamable HTTP paa `/mcp` — det er den eneste transport Cortis v2
 * agentic framework bruger til MCP-connectorer (`transportType` blev fjernet i
 * v2 netop fordi valget ikke findes laengere).
 *
 * Serveren koeres stateless: hver anmodning faar sin egen McpServer og sin egen
 * transport, mens vidensbasen deles paa tvaers. Det betyder ingen sessioner der
 * kan gaa i stykker under en demo, og ingen hukommelse der vokser.
 */

import { randomUUID } from "node:crypto";
import { createServer, type IncomingMessage, type ServerResponse } from "node:http";

import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";

import { tjekAdgang, verificerOpsaetning } from "./autentifikation.js";
import { konfiguration } from "./konfiguration.js";
import { opretServer, opstartsstatus } from "./server.js";

const MAKS_KROP_BYTES = 1_000_000;

function svarJson(res: ServerResponse, status: number, krop: unknown): void {
  const tekst = JSON.stringify(krop);
  res.writeHead(status, {
    "Content-Type": "application/json",
    "Content-Length": Buffer.byteLength(tekst),
    "Cache-Control": "no-store",
  });
  res.end(tekst);
}

function svarJsonRpcFejl(res: ServerResponse, status: number, kode: number, besked: string): void {
  svarJson(res, status, { jsonrpc: "2.0", error: { code: kode, message: besked }, id: null });
}

/** Laeser og JSON-parser anmodningens krop med en haard stoerrelsesgraense. */
async function laesKrop(req: IncomingMessage): Promise<unknown> {
  const stykker: Buffer[] = [];
  let bytes = 0;
  for await (const stykke of req) {
    const buf = stykke as Buffer;
    bytes += buf.length;
    if (bytes > MAKS_KROP_BYTES) throw new Error("Anmodningens krop er for stor");
    stykker.push(buf);
  }
  if (bytes === 0) return undefined;
  return JSON.parse(Buffer.concat(stykker).toString("utf8")) as unknown;
}

/**
 * Nogle MCP-klienter sender kun `Accept: application/json`. Specifikationen
 * kraever begge typer, og SDK'et afviser med 406. Vi udvider headeren i stedet
 * for at afvise en klient der ellers ville virke — svaret leveres alligevel som
 * ren JSON (`enableJsonResponse`).
 */
function normaliserAccept(req: IncomingMessage): void {
  const nu = String(req.headers["accept"] ?? "");
  const harJson = nu.includes("application/json") || nu.includes("*/*");
  const harSse = nu.includes("text/event-stream") || nu.includes("*/*");
  if (!harJson || !harSse) {
    req.headers["accept"] = "application/json, text/event-stream";
  }
}

async function haandterMcp(req: IncomingMessage, res: ServerResponse, renSti: string): Promise<void> {
  normaliserAccept(req);
  req.url = renSti; // fjern et eventuelt token-segment foer transporten ser stien

  let krop: unknown;
  if (req.method === "POST") {
    try {
      krop = await laesKrop(req);
    } catch (e) {
      svarJsonRpcFejl(res, 400, -32700, `Kunne ikke laese anmodningen: ${e instanceof Error ? e.message : String(e)}`);
      return;
    }
  }

  const transport = new StreamableHTTPServerTransport({
    sessionIdGenerator: undefined, // stateless
    enableJsonResponse: true,
  });
  const server = opretServer();

  res.on("close", () => {
    void transport.close();
    void server.close();
  });

  await server.connect(transport);
  await transport.handleRequest(req, res, krop);
}

const httpServer = createServer((req, res) => {
  const sti = (req.url ?? "/").split("?")[0] ?? "/";

  // Uautentificeret helbredstjek — Openship/Traefik skal kunne pinge uden token.
  if (sti === "/health" || sti === "/healthz") {
    svarJson(res, 200, {
      status: "ok",
      navn: "cosurg-mcp",
      version: "1.0.0",
      mcpSti: konfiguration.mcpSti,
      transport: "streamable_http",
      uddrag: opstartsstatus.uddrag,
      afsnit: opstartsstatus.afsnit,
      traeer: opstartsstatus.traeer,
    });
    return;
  }

  if (sti === "/" && req.method === "GET") {
    svarJson(res, 200, {
      navn: "cosurg-mcp",
      beskrivelse:
        "MCP-server med CoSurgs kliniske vidensbase for brandsaar. Kobles paa Cortis agentic framework som MCP-connector.",
      mcpEndpoint: konfiguration.mcpSti,
      transport: "streamable_http",
      autentifikation: "Bearer-token i Authorization-headeren, eller som sidste segment i stien",
    });
    return;
  }

  const adgang = tjekAdgang(req, konfiguration.mcpSti);
  if (adgang.renSti !== konfiguration.mcpSti) {
    svarJson(res, 404, { fejl: `Ukendt sti "${sti}". MCP-endpointet er ${konfiguration.mcpSti}.` });
    return;
  }
  if (!adgang.ok) {
    res.setHeader("WWW-Authenticate", 'Bearer realm="cosurg-mcp"');
    svarJsonRpcFejl(res, 401, -32001, "Ugyldigt eller manglende bearer-token.");
    return;
  }

  haandterMcp(req, res, adgang.renSti).catch((e: unknown) => {
    const id = randomUUID();
    console.error(`[cosurg-mcp] fejl ${id}:`, e);
    if (!res.headersSent) {
      svarJsonRpcFejl(res, 500, -32603, `Intern fejl (${id}).`);
    } else {
      res.end();
    }
  });
});

function start(): void {
  verificerOpsaetning();

  if (opstartsstatus.uddrag === 0) {
    console.error(
      `[cosurg-mcp] FEJL: ingen kildetekst indlaest. Soegte i: ${konfiguration.kildeMapper.join(", ")}. ` +
        "Serveren ville kun kunne svare 'ingen daekning'. Retter du COSURG_KILDE_DIR, starter den.",
    );
    process.exit(1);
  }

  httpServer.listen(konfiguration.port, konfiguration.vaert, () => {
    console.log(
      `[cosurg-mcp] lytter paa http://${konfiguration.vaert}:${konfiguration.port}${konfiguration.mcpSti} (streamable_http)`,
    );
    console.log(
      `[cosurg-mcp] vidensbase: ${opstartsstatus.afsnit} kildeafsnit / ${opstartsstatus.uddrag} uddrag fra ${opstartsstatus.kildemappe}`,
    );
    console.log(
      `[cosurg-mcp] beslutningstraeer: ${opstartsstatus.traeer.join(", ") || "(ingen)"} fra ${opstartsstatus.traemappe}`,
    );
    if (opstartsstatus.traefejl.length > 0) {
      console.warn(`[cosurg-mcp] traefejl: ${JSON.stringify(opstartsstatus.traefejl)}`);
    }
  });
}

for (const signal of ["SIGINT", "SIGTERM"] as const) {
  process.on(signal, () => {
    console.log(`[cosurg-mcp] ${signal} modtaget — lukker ned.`);
    httpServer.close(() => process.exit(0));
    setTimeout(() => process.exit(0), 3000).unref();
  });
}

start();
