---
id: SEC-08
title: Health endpoint does not leak sensitive info
severity: medium
source_files:
  - app/api/health/route.ts
---

## What this tests
Verifies that `GET /api/health` returns only safe operational metadata (status, uptime, timestamp) and does not expose sensitive information such as environment variables, API keys, workflow data, database contents, or internal paths.

## Steps — normal health check response

1. Send a GET request:
   ```bash
   curl -si http://localhost:3000/api/health
   ```
2. Verify HTTP status **200**
3. Verify response body contains exactly these fields and no others:
   ```json
   {
     "status": "ok",
     "uptime": 42,
     "timestamp": "2025-01-15T12:34:56.789Z"
   }
   ```
4. `status`: always the string `"ok"`
5. `uptime`: non-negative integer (seconds since server start)
6. `timestamp`: valid ISO 8601 datetime string

## Steps — verify no sensitive fields

7. Confirm the response does NOT contain any of:
   - `ENCRYPTION_SECRET` or any env variable values
   - API keys, workflow slugs, or workflow counts
   - Database file paths or schema information
   - Node.js version, process ID, or memory usage
   - Internal error messages or stack traces
   - Any field beyond `status`, `uptime`, `timestamp`

## Steps — no authentication required

8. Send the request without any `Authorization` header — verify 200 (no auth gate)

## Steps — uptime is reasonable

9. Note the `uptime` value; wait a few seconds and send another request
10. Verify `uptime` increased by approximately the elapsed time (uptime is live, not static)

## Expected result
- Response shape: `{ status: "ok", uptime: N, timestamp: "..." }` — exactly three fields
- No env vars, secrets, or internal data exposed
- HTTP 200, no authentication required
- `uptime` counts seconds since the module loaded (server start)

## Failure indicators
- Response includes fields beyond `status`, `uptime`, `timestamp`
- Any environment variable name or value appears in the response
- Health endpoint requires authentication (should be publicly accessible)
- `uptime` is always 0 or does not increment

## Severity rationale
Health endpoints are publicly accessible by monitoring systems; leaking internal paths or config values would give attackers reconnaissance data.

## Source reference
`app/api/health/route.ts` lines 3-14 (`startTime = Date.now()` at module load, GET returns `{ status: "ok", uptime: Math.floor((Date.now() - startTime) / 1000), timestamp: new Date().toISOString() }`).

## Notes
Unlike `GET /api/v1/chat` (which also acts as a health check), this endpoint does not check `ENCRYPTION_SECRET` — it always returns `status: "ok"`. The `uptime` measures time since the Node.js module was loaded, not since the OS process started.
