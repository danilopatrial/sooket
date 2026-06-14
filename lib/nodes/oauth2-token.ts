import type { INodeExecutor, NodeContext } from "./types";
import type { WorkflowNode, EvalResult } from "@/lib/workflow-types";
import type { OAuth2TokenNodeData } from "@/lib/node-types";
import { resolveVars } from "./utils";
import { assertEgressAllowed } from "@/lib/security/ssrf";

/**
 * Fetch an OAuth2 **client-credentials** access token and cache it until it
 * (nearly) expires, so a downstream HTTP Request node can inject it via
 * `Authorization: Bearer {{ $node.<id> }}` without a hand-rolled token-fetch
 * sub-pipeline. The token is cached in `node_cache` keyed by
 * workflow+endpoint+client+scope (never the secret) with TTL = `expires_in`
 * minus a refresh skew, giving automatic refresh on the next run after it lapses.
 *
 * Secrets should be supplied as `$VAR` references (resolved from encrypted
 * customer variables) rather than typed literally into the workflow JSON.
 */
class OAuth2TokenNode implements INodeExecutor {
  async execute(node: WorkflowNode, _sourceHandle: string | null | undefined, ctx: NodeContext): Promise<EvalResult> {
    const data = (node.data as unknown) as OAuth2TokenNodeData;
    const tokenUrl = resolveVars(data.tokenUrl ?? "", ctx.vars).trim();
    const clientId = resolveVars(data.clientId ?? "", ctx.vars).trim();
    const clientSecret = resolveVars(data.clientSecret ?? "", ctx.vars);
    const scope = resolveVars(data.scope ?? "", ctx.vars).trim();
    const authStyle = data.authStyle === "basic" ? "basic" : "body";
    const skew = Math.max(0, Math.floor(data.refreshSkewSeconds ?? 60));
    const timeout = Math.max(1, Math.floor(data.timeout ?? 10000));

    if (!tokenUrl) throw new Error("OAuth2 Token node: no token URL configured");
    if (!clientId) throw new Error("OAuth2 Token node: no client ID configured");

    // Cache key excludes the secret on purpose.
    const rawKey = `oauth2:${ctx.workflow.id}:${authStyle}:${tokenUrl}:${clientId}:${scope}`;
    const hashBytes = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(rawKey));
    const cacheKey = Array.from(new Uint8Array(hashBytes)).map((b) => b.toString(16).padStart(2, "0")).join("");

    const now = Math.floor(Date.now() / 1000);
    const cached = ctx.getCacheEntry(cacheKey, now);
    if (cached !== null) {
      return { value: cached, inputTokens: 0, outputTokens: 0 };
    }

    // SSRF guard before any outbound call — same posture as the HTTP node.
    await assertEgressAllowed(tokenUrl);

    const body = new URLSearchParams();
    body.set("grant_type", "client_credentials");
    if (scope) body.set("scope", scope);
    const headers: Record<string, string> = {
      "Content-Type": "application/x-www-form-urlencoded",
      Accept: "application/json",
    };
    if (authStyle === "basic") {
      headers.Authorization = `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString("base64")}`;
    } else {
      body.set("client_id", clientId);
      body.set("client_secret", clientSecret);
    }

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeout);
    let res: Response;
    try {
      res = await fetch(tokenUrl, { method: "POST", headers, body: body.toString(), signal: controller.signal });
    } catch (err) {
      if (err instanceof Error && err.name === "AbortError") {
        let target = tokenUrl;
        try { const u = new URL(tokenUrl); target = `${u.protocol}//${u.host}${u.pathname}`; } catch { /* use raw */ }
        throw new Error(`OAuth2 token request to ${target} timed out after ${timeout} ms`);
      }
      throw err;
    } finally {
      clearTimeout(timer);
    }

    if (!res.ok) {
      throw new Error(`OAuth2 token request failed (HTTP ${res.status})`);
    }

    let parsed: { access_token?: unknown; expires_in?: unknown };
    try {
      parsed = await res.json() as { access_token?: unknown; expires_in?: unknown };
    } catch {
      throw new Error("OAuth2 token response was not valid JSON");
    }

    const accessToken = parsed.access_token;
    if (typeof accessToken !== "string" || accessToken.length === 0) {
      throw new Error("OAuth2 token response missing access_token");
    }

    const expiresIn = typeof parsed.expires_in === "number" && Number.isFinite(parsed.expires_in)
      ? parsed.expires_in
      : null;
    const ttl = expiresIn !== null ? Math.max(1, Math.floor(expiresIn) - skew) : 300;

    ctx.evictExpiredCacheEntries(now);
    ctx.setCacheEntry(cacheKey, accessToken, now + ttl);

    return { value: accessToken, inputTokens: 0, outputTokens: 0 };
  }
}

export const execute = new OAuth2TokenNode();
