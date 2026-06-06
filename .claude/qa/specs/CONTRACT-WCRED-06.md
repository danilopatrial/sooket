---
id: CONTRACT-WCRED-06
title: DELETE workflow credential without nodeId returns 400
severity: medium
source_files:
  - app/api/workflows/[slug]/credentials/route.ts
---

## What this tests
Verifies that DELETE without a `nodeId` query parameter returns HTTP 400 with `{"error": "Missing nodeId"}`.

## Prerequisites
- App is running at http://localhost:3000
- A workflow exists; substitute its `slug` below

## Steps
1. DELETE with no query params:
   ```
   curl -s -o /tmp/wcred06a.json -w "%{http_code}" \
     -X DELETE http://localhost:3000/api/workflows/<slug>/credentials
   ```
2. Note the HTTP status code. Inspect: `cat /tmp/wcred06a.json`
3. DELETE with an empty `nodeId` param:
   ```
   curl -s -o /tmp/wcred06b.json -w "%{http_code}" \
     -X DELETE "http://localhost:3000/api/workflows/<slug>/credentials?nodeId="
   ```
4. Note the HTTP status code. Inspect: `cat /tmp/wcred06b.json`

## Expected result
Both requests return HTTP `400`. Response body is `{"error":"Missing nodeId"}` in each case.

## Failure indicators
- Any request returns a status other than 400
- Error message differs from `"Missing nodeId"`
- Empty `nodeId` param proceeds to an `unlinkCredential` call

## Severity rationale
Medium: missing parameter validation prevents accidentally unlinking all credentials for a workflow via a malformed request.

## Source reference
`app/api/workflows/[slug]/credentials/route.ts` lines 52–53: `const nodeId = searchParams.get("nodeId"); if (!nodeId) return NextResponse.json({ error: "Missing nodeId" }, { status: 400 });`
