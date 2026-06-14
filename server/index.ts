/**
 * Standalone execution server.
 *
 * Runs the workflow execution engine in its own Node.js process, completely
 * independent of Next.js. Shares the same SQLite file as the Next.js app
 * (WAL mode is already enabled, so concurrent access is safe).
 *
 * Usage:
 *   npm run execution-server
 *
 * Environment:
 *   EXECUTION_PORT      — port to listen on (default: 3001)
 *   SOOKET_HOST         — interface to bind to (default: 127.0.0.1 / localhost-only).
 *                         Set to 0.0.0.0 to expose on all interfaces — only do this
 *                         behind a trusted network or reverse proxy.
 *   ENCRYPTION_SECRET   — must match the Next.js app's secret
 *   SOOKET_DATA_DIR     — optional SQLite data directory override
 */
import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { handleExecutionRequest, corsHeaders } from "@/lib/execution-handler";
import { warnIfExposedWithoutAuth } from "@/lib/security/auth";

const PORT = Number(process.env.EXECUTION_PORT ?? 3001);
// Bind to localhost by default so the server is not reachable from the network
// unless the operator explicitly opts in via SOOKET_HOST=0.0.0.0. An empty value
// is treated as unset (matches the `${SOOKET_HOST:-127.0.0.1}` default in package.json).
const HOST = process.env.SOOKET_HOST?.trim() || "127.0.0.1";

// ─── Body reader ──────────────────────────────────────────────────────────────

function readBody(req: IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    req.on("data", (chunk: Buffer) => chunks.push(chunk));
    req.on("end", () => resolve(Buffer.concat(chunks).toString("utf-8")));
    req.on("error", reject);
  });
}

// ─── Response helpers ─────────────────────────────────────────────────────────

function sendJson(res: ServerResponse, status: number, body: unknown, extra?: Record<string, string>) {
  const payload = typeof body === "string" ? body : JSON.stringify(body);
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...extra,
  };
  res.writeHead(status, headers);
  res.end(payload);
}

function sendCors(res: ServerResponse, cors: Record<string, string>) {
  res.writeHead(204, cors);
  res.end();
}

// ─── Server ───────────────────────────────────────────────────────────────────

const server = createServer(async (req: IncomingMessage, res: ServerResponse) => {
  const url = req.url ?? "/";
  const method = req.method?.toUpperCase() ?? "GET";

  // Resolve the CORS policy for this request's Origin (deny-by-default unless
  // CORS_ORIGIN opts in). The /v1/chat path uses the headers returned by the
  // execution handler instead.
  const originHeader = req.headers.origin;
  const cors = corsHeaders(typeof originHeader === "string" ? originHeader : null);

  // OPTIONS preflight for all paths
  if (method === "OPTIONS") {
    sendCors(res, cors);
    return;
  }

  // Health check
  if (url === "/health" && method === "GET") {
    sendJson(res, 200, { ok: true }, cors);
    return;
  }

  // Execution endpoint
  if (url === "/v1/chat" && method === "POST") {
    const rawBody = await readBody(req);

    const authHeader = (req.headers.authorization ?? "");
    const apiKey = authHeader.startsWith("Bearer ")
      ? authHeader.slice(7).trim()
      : authHeader.trim() || null;

    const forwarded = req.headers["x-forwarded-for"];
    const ip = (
      typeof forwarded === "string" ? forwarded.split(",")[0].trim() :
      Array.isArray(forwarded)      ? forwarded[0].trim()           : null
    ) ?? req.socket.remoteAddress ?? "";

    // Reconstruct Web API Headers from Node's incoming headers
    const headers = new Headers();
    for (const [key, val] of Object.entries(req.headers)) {
      if (val === undefined) continue;
      const value = Array.isArray(val) ? val.join(", ") : val;
      headers.set(key, value);
    }

    const fullUrl = `http://localhost:${PORT}${url}`;

    const { status, body, corsHeaders: responseCors } = await handleExecutionRequest({
      apiKey,
      rawBody,
      headers,
      ip,
      method,
      url: fullUrl,
    });

    sendJson(res, status, body, responseCors);
    return;
  }

  // 404 for everything else
  sendJson(res, 404, { error: "Not found" }, cors);
});

warnIfExposedWithoutAuth();

server.listen(PORT, HOST, () => {
  console.log(`Sooket execution server listening on ${HOST}:${PORT}`);
});

server.on("error", (err) => {
  console.error("Execution server error:", err);
  process.exit(1);
});
