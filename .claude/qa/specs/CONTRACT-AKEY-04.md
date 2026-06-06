---
id: CONTRACT-AKEY-04
title: POST api-key with empty label returns 400
severity: high
source_files:
  - app/api/workflows/[slug]/api-keys/route.ts
---

## What this tests
Verifies that POST with a missing, empty-string, or whitespace-only `label` returns HTTP 400 with `{"error": "label is required"}`.

## Prerequisites
- App is running at http://localhost:3000
- A workflow exists; substitute its `slug` below

## Steps
1. POST without `label`:
   ```
   curl -s -o /tmp/akey04a.json -w "%{http_code}" \
     -X POST http://localhost:3000/api/workflows/<slug>/api-keys \
     -H 'Content-Type: application/json' \
     -d '{}'
   ```
2. Note the HTTP status code. Inspect: `cat /tmp/akey04a.json`
3. POST with an empty-string `label`:
   ```
   curl -s -o /tmp/akey04b.json -w "%{http_code}" \
     -X POST http://localhost:3000/api/workflows/<slug>/api-keys \
     -H 'Content-Type: application/json' \
     -d '{"label":""}'
   ```
4. Note the HTTP status code. Inspect: `cat /tmp/akey04b.json`
5. POST with a whitespace-only `label`:
   ```
   curl -s -o /tmp/akey04c.json -w "%{http_code}" \
     -X POST http://localhost:3000/api/workflows/<slug>/api-keys \
     -H 'Content-Type: application/json' \
     -d '{"label":"   "}'
   ```
6. Note the HTTP status code. Inspect: `cat /tmp/akey04c.json`

## Expected result
All three requests return HTTP `400`. Response body is `{"error":"label is required"}` in each case.

## Failure indicators
- Any request returns 2xx instead of 400
- Response body does not contain `"label is required"`
- Whitespace-only label is accepted (trimming not applied before empty check)

## Severity rationale
High: an unlabelled API key cannot be identified or revoked by name; accepting blank labels would create unmanageable keys.

## Source reference
`app/api/workflows/[slug]/api-keys/route.ts` lines 62–63: `const label = (body.label ?? "").trim().slice(0, 100); if (!label) return NextResponse.json({ error: "label is required" }, { status: 400 });`
