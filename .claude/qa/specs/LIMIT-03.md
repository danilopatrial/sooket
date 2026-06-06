---
id: LIMIT-03
title: /api/workflows/[slug]/debug rejects oversized body with 413
severity: medium
source_files:
  - app/api/workflows/[slug]/debug/route.ts
  - lib/request-limit.ts
---

## What this tests
Verifies that the sandbox debug endpoint enforces the same body-size cap as the live APIs: an oversized body returns `413 { error: "Request body too large" }`, malformed JSON within an allowed body returns `400 { error: "Invalid JSON body" }`, and an unreadable body returns `400 { error: "Failed to read request body" }`.

## Prerequisites
- App is running at http://localhost:3000
- A workflow exists with a known slug (`<slug>`)
- Default cap is 1 MiB; overridable via `SOOKET_MAX_BODY_BYTES`

## Steps
1. Oversized body:
   ```bash
   head -c 1100000 /dev/zero | tr '\0' 'x' > /tmp/big.txt
   curl -s -o /dev/null -w "%{http_code}\n" -X POST \
     http://localhost:3000/api/workflows/<slug>/debug \
     -H "Content-Type: application/json" --data-binary @/tmp/big.txt
   ```
2. Malformed JSON within an allowed size:
   ```bash
   curl -si -X POST http://localhost:3000/api/workflows/<slug>/debug \
     -H "Content-Type: application/json" --data-raw '{not json' | head -10
   ```

## Expected result
- Step 1: HTTP `413` with `{ "error": "Request body too large" }`.
- Step 2: HTTP `400` with `{ "error": "Invalid JSON body" }`.

## Failure indicators
- An oversized body is buffered/executed instead of returning `413`.
- Malformed JSON returns `500` (or is silently accepted) instead of `400 Invalid JSON body`.

## Severity rationale
The debug path runs the same engine and shares the same memory exposure; medium because it is a local authoring tool rather than a public endpoint.

## Source reference
`app/api/workflows/[slug]/debug/route.ts` lines 30–40 — `readLimitedText` with 413 (`RequestBodyTooLargeError`), 400 ("Failed to read request body"), and 400 ("Invalid JSON body") branches.

## Notes
This overlaps with CONTRACT-DBG-01's body-cap step but is listed separately so the three call sites (chat, webhook, debug) are each tracked. See LIMIT-04 for boundary/override behavior.
