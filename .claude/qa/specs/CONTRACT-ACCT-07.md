---
id: CONTRACT-ACCT-07
title: GET /api/binary/[nonexistent-id] returns 404
severity: low
source_files:
  - app/api/binary/[id]/route.ts
  - lib/binary-data.ts
---

## What this tests
A GET to `/api/binary/[id]` with an ID that does not exist in the binary data store returns HTTP 404 with an empty body.

## Prerequisites
- App is running at http://localhost:3000

## Steps
1. Send a GET request using a random UUID that was never stored:
   ```
   curl -s -i http://localhost:3000/api/binary/00000000-0000-0000-0000-000000000000
   ```

## Expected result
- HTTP status: `404`
- Response body is empty (no JSON error object)

## Failure indicators
- HTTP status is not 404 (e.g. 200, 500)
- Response body contains data or a stack trace

## Severity rationale
A missing binary ID is a client error; returning 404 is the correct contract and prevents confusion with server errors.

## Source reference
`app/api/binary/[id]/route.ts` lines 9 and 11 — `if (!ref) return new Response(null, { status: 404 })` and `if (!buf) return new Response(null, { status: 404 })`.

## Notes
The same 404 is returned whether the ref was never written or whether the in-memory entry expired (1-hour TTL). There is no distinction between "never existed" and "expired" in the response.
