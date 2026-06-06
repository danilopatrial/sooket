---
id: API-11
title: GET /api/v1/chat returns health check ok true local true
severity: low
source_files:
  - app/api/v1/chat/route.ts
---

## What this tests
Verifies that `GET /api/v1/chat` returns a health check response `{ ok: true, local: true }` when the server is configured correctly, and `{ ok: false, local: true }` with status 500 if `ENCRYPTION_SECRET` is not set.

## Steps — normal health check

1. Send a GET request:
   ```bash
   curl -si http://localhost:3000/api/v1/chat
   ```
2. Verify HTTP status **200**
3. Verify response body:
   ```json
   { "ok": true, "local": true }
   ```

## Steps — no Authentication required

4. Send GET with no Authorization header — verify it still returns 200 `{ ok: true, local: true }` (no auth check on GET)

## Steps — missing ENCRYPTION_SECRET

5. Restart the app without `ENCRYPTION_SECRET` set in the environment
6. Send `GET /api/v1/chat` — verify HTTP status **500** and body `{ "ok": false, "local": true }` (the `ok` field reflects `!!ENCRYPTION_SECRET`)

## Expected result
- GET with `ENCRYPTION_SECRET` set: 200 `{ ok: true, local: true }`
- GET without `ENCRYPTION_SECRET`: 500 `{ ok: false, local: true }`
- `local: true` is always present regardless of configuration
- No Authorization required

## Failure indicators
- GET returns 405 Method Not Allowed
- Response missing `local: true`
- `ok` is always `true` even when `ENCRYPTION_SECRET` is absent

## Severity rationale
Low: this is a convenience health check endpoint; its failure doesn't block API usage, but it's used by monitoring scripts.

## Source reference
`app/api/v1/chat/route.ts` lines 34-37 (`const allOk = !!ENCRYPTION_SECRET; return NextResponse.json({ ok: allOk, local: true }, { status: allOk ? 200 : 500 })`).

## Notes
This endpoint uses `NextResponse.json` (not `corsJson`), so it may not include CORS headers. It is not the same endpoint as `GET /api/health`.
