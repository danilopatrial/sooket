---
id: NODE-EXT-06
title: OAuth2 Token node fetches and caches a client-credentials token
severity: high
source_files:
  - lib/nodes/oauth2-token.ts
  - components/canvas/nodes/OAuth2TokenNode.tsx
  - lib/security/ssrf.ts
---

## What this tests
Verifies the OAuth2 Token node: it performs the OAuth2 **client-credentials** grant against a configured token endpoint, caches the access token in `node_cache` until it (nearly) expires — so the next run reuses it and auto-refreshes only once it lapses — and outputs the token string for a downstream HTTP Request node to inject via `Authorization: Bearer {{ $node.<id> }}`. Credentials accept `$VAR` references (encrypted customer variables), the token URL is SSRF-guarded, and credentials can go in the request body (default) or an HTTP Basic header.

## Prerequisites
- App is running at http://localhost:3000
- A reachable OAuth2 token endpoint that issues client-credentials tokens (or a stub), and customer variables holding the client id/secret (e.g. `OAUTH_CLIENT_ID`, `OAUTH_CLIENT_SECRET`)

## Steps — canvas + first fetch
1. Add an OAuth2 Token node. Confirm it has no input handle and a single `token` (source) output.
2. Configure: Token URL = the endpoint; Client ID = `$OAUTH_CLIENT_ID`; Client Secret = `$OAUTH_CLIENT_SECRET`; Scope (optional); Credentials In = "Request body".
3. Wire the `token` output's value into an HTTP Request node header — `Authorization: Bearer {{ $node.<oauth-node-id> }}` — and that HTTP node to an Output. Run the workflow.
4. Confirm the downstream call carries a valid `Authorization: Bearer <token>` and succeeds.

## Steps — caching / refresh
5. Run the workflow again immediately. Confirm the token endpoint is **not** called a second time (the cached token is reused) — e.g. via the endpoint's logs or the node trace.
6. Wait until the token's `expires_in` (minus the refresh skew) elapses and run again → the node fetches a fresh token.

## Steps — basic auth + variables
7. Switch "Credentials In" to "Basic auth header" and run → the request uses `Authorization: Basic base64(id:secret)` and omits `client_secret` from the body.
8. Confirm `$OAUTH_CLIENT_SECRET` is resolved from the (encrypted) customer variable, not stored literally in the workflow JSON.

## Steps — guards / errors
9. Point the Token URL at an internal/loopback address (e.g. `http://169.254.169.254/...` or `http://localhost/...`) → the run fails with an SSRF egress error and **no** request is made (unless `SOOKET_ALLOW_PRIVATE_EGRESS` is set).
10. Configure a token endpoint that returns 401 → node errors with "OAuth2 token request failed (HTTP 401)". Configure one returning JSON without `access_token` → "missing access_token". Leave Token URL or Client ID blank → "no token URL"/"no client ID".

## Expected result
- A client-credentials POST (`grant_type=client_credentials`, `application/x-www-form-urlencoded`) returns a token that the node outputs as its value.
- The token is cached with TTL = `expires_in` − refresh skew (default 60s; falls back to 300s when no `expires_in`), so repeat runs within that window reuse it.
- Basic vs body credential placement works; `$VAR` references resolve from customer variables; the cache key never includes the secret.
- Token URL is SSRF-guarded; missing config / non-2xx / missing-token responses surface as clear node errors.

## Failure indicators
- The token endpoint is hit on every run (no caching) or a stale token is served past expiry (no refresh).
- The client secret appears in the cache key, the response body when authStyle=basic, or is required to be a literal.
- An internal token URL is fetched (SSRF not enforced).
- A non-2xx / malformed token response crashes the run instead of a clear node error.

## Severity rationale
Outbound auth is core middleware work; a token node that leaks secrets, ignores SSRF, or mishandles caching/refresh would either break integrations or expose credentials — high.

## Source reference
`lib/nodes/oauth2-token.ts` — resolves `$VAR` config, checks `node_cache` (key = sha256 of workflow+style+url+client+scope, no secret), SSRF-guards via `assertEgressAllowed`, POSTs the grant (body or Basic), parses `access_token`/`expires_in`, caches with TTL = `expires_in` − skew, outputs the token. `components/canvas/nodes/OAuth2TokenNode.tsx` — config fields + single `token` source handle. Registered in both registries (`"oauth2-token": { 1: ... }`).

## Notes
This covers the client-credentials grant + automatic token caching/refresh from TODO §2.7. Request signing (AWS SigV4 / HMAC) and other grant types (authorization-code, refresh-token) are not included — HMAC signing can be done today via the Custom Code node. Code-level coverage: `__tests__/lib/nodes/oauth2-token.test.ts` (grant, caching, basic auth, `$VAR`, SSRF block, error paths) and `__tests__/nodes/OAuth2TokenNode.test.tsx`.
