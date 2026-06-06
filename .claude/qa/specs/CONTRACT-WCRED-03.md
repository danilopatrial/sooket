---
id: CONTRACT-WCRED-03
title: POST workflow credentials missing nodeId returns 400
severity: high
source_files:
  - app/api/workflows/[slug]/credentials/route.ts
---

## What this tests
Verifies that POST with a missing or falsy `nodeId` returns HTTP 400 with `{"error": "Missing nodeId or credentialId"}`.

## Prerequisites
- App is running at http://localhost:3000
- A workflow exists; substitute its `slug` below

## Steps
1. POST without `nodeId`:
   ```
   curl -s -o /tmp/wcred03a.json -w "%{http_code}" \
     -X POST http://localhost:3000/api/workflows/<slug>/credentials \
     -H 'Content-Type: application/json' \
     -d '{"credentialId":1}'
   ```
2. Note the HTTP status code. Inspect: `cat /tmp/wcred03a.json`
3. POST with an empty-string `nodeId`:
   ```
   curl -s -o /tmp/wcred03b.json -w "%{http_code}" \
     -X POST http://localhost:3000/api/workflows/<slug>/credentials \
     -H 'Content-Type: application/json' \
     -d '{"nodeId":"","credentialId":1}'
   ```
4. Note the HTTP status code. Inspect: `cat /tmp/wcred03b.json`

## Expected result
Both requests return HTTP `400`. Response body is `{"error":"Missing nodeId or credentialId"}` in each case.

## Failure indicators
- Any request returns 2xx instead of 400
- Error message differs from `"Missing nodeId or credentialId"`
- Empty string `nodeId` is accepted

## Severity rationale
High: an assignment without a valid `nodeId` cannot be matched to a canvas node and would be silently orphaned.

## Source reference
`app/api/workflows/[slug]/credentials/route.ts` lines 35–37: `if (!nodeId || credentialId == null) return NextResponse.json({ error: "Missing nodeId or credentialId" }, { status: 400 });`
