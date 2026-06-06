---
id: CONTRACT-WCRED-04
title: POST workflow credentials missing credentialId returns 400
severity: high
source_files:
  - app/api/workflows/[slug]/credentials/route.ts
---

## What this tests
Verifies that POST with a missing or null `credentialId` returns HTTP 400 with `{"error": "Missing nodeId or credentialId"}`.

## Prerequisites
- App is running at http://localhost:3000
- A workflow exists; substitute its `slug` below

## Steps
1. POST without `credentialId`:
   ```
   curl -s -o /tmp/wcred04a.json -w "%{http_code}" \
     -X POST http://localhost:3000/api/workflows/<slug>/credentials \
     -H 'Content-Type: application/json' \
     -d '{"nodeId":"node-abc-123"}'
   ```
2. Note the HTTP status code. Inspect: `cat /tmp/wcred04a.json`
3. POST with `credentialId: null`:
   ```
   curl -s -o /tmp/wcred04b.json -w "%{http_code}" \
     -X POST http://localhost:3000/api/workflows/<slug>/credentials \
     -H 'Content-Type: application/json' \
     -d '{"nodeId":"node-abc-123","credentialId":null}'
   ```
4. Note the HTTP status code. Inspect: `cat /tmp/wcred04b.json`

## Expected result
Both requests return HTTP `400`. Response body is `{"error":"Missing nodeId or credentialId"}` in each case.

## Failure indicators
- Any request returns 2xx instead of 400
- Error message differs from `"Missing nodeId or credentialId"`
- `null` credentialId is accepted

## Severity rationale
High: linking a node to a null credential would produce an orphaned assignment that cannot resolve to a real credential at runtime.

## Source reference
`app/api/workflows/[slug]/credentials/route.ts` lines 35–37: `credentialId == null` covers both `undefined` (missing field) and explicit `null`; returns 400 in both cases.
