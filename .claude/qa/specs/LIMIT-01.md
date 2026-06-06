---
id: LIMIT-01
title: /api/v1/chat rejects oversized body with 413 before auth
severity: high
source_files:
  - app/api/v1/chat/route.ts
  - lib/request-limit.ts
---

## What this tests
Verifies that `POST /api/v1/chat` rejects a request body larger than the configured cap with `413 { error: "Request body too large" }`, and that this guard fires **before** API-key authentication (so an unauthenticated caller cannot stream an unbounded body into memory).

## Prerequisites
- App is running at http://localhost:3000
- Default cap is 1 MiB (`DEFAULT_MAX_BODY_BYTES`); overridable via `SOOKET_MAX_BODY_BYTES`

## Steps
1. Send an oversized body with **no** Authorization header:
   ```bash
   head -c 1100000 /dev/zero | tr '\0' 'x' > /tmp/big.txt
   curl -si -X POST http://localhost:3000/api/v1/chat \
     -H "Content-Type: application/json" --data-binary @/tmp/big.txt | head -15
   ```
2. Send an oversized body **with** a valid key and confirm it is still rejected with 413 (not 401).

## Expected result
- Both requests return HTTP `413` with `{ "error": "Request body too large" }`.
- CORS headers are present on the 413 response.
- The 413 is returned even with no/invalid API key (the body cap precedes auth).

## Failure indicators
- An oversized body returns `401`/`400`/`500` instead of `413`.
- The body is fully buffered/executed before rejection.
- The 413 response omits CORS headers.

## Severity rationale
Without an enforced cap a single unauthenticated request could exhaust process memory; the guard must run before auth to be effective.

## Source reference
`app/api/v1/chat/route.ts` lines 24–38 — `readLimitedText(request)` runs at the top of `POST`, before any key lookup; `RequestBodyTooLargeError` maps to a 413 with CORS headers.

## Notes
The cap is enforced via `Content-Length` fast-path and streaming byte-count (`lib/request-limit.ts`), so a missing or spoofed `Content-Length` is still caught. A body that cannot be read (but is not oversized) returns `400 { error: "Failed to read request body" }`.
