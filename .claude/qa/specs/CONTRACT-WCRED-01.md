---
id: CONTRACT-WCRED-01
title: GET workflow credentials returns node assignment array
severity: high
source_files:
  - app/api/workflows/[slug]/credentials/route.ts
---

## What this tests
Verifies that GET `/api/workflows/[slug]/credentials` returns a bare JSON array (not wrapped in an object) of node-credential assignments, each with `nodeId`, `credentialId`, `name`, and `type`.

## Prerequisites
- App is running at http://localhost:3000
- A workflow exists; substitute its `slug` below

## Steps
1. Fetch credentials for a workflow with no assignments:
   ```
   curl -s http://localhost:3000/api/workflows/<slug>/credentials
   ```
2. Confirm the response is a bare array (not `{"assignments":[...]}`):
   ```
   curl -s http://localhost:3000/api/workflows/<slug>/credentials | \
     python3 -c "import sys,json; d=json.load(sys.stdin); print(type(d).__name__, len(d))"
   ```
3. Fetch with a non-existent slug:
   ```
   curl -s -o /tmp/wcred01.json -w "%{http_code}" \
     http://localhost:3000/api/workflows/nonexistent-slug/credentials
   ```
   Note status. Inspect: `cat /tmp/wcred01.json`

## Expected result
Steps 1 and 2 return HTTP `200`. The response body is a JSON array (`[]` when empty). Each element has exactly the fields `nodeId` (string), `credentialId` (integer), `name` (string), `type` (string). Step 3 returns HTTP `404` with `{"error":"Workflow not found"}`.

## Failure indicators
- Response is wrapped in an object (e.g. `{"assignments":[...]}`) rather than a bare array
- Any element is missing `nodeId`, `credentialId`, `name`, or `type`
- Non-existent slug returns anything other than 404

## Severity rationale
High: the bare-array shape is the contract; consumers that expect a wrapper key will fail to parse the response.

## Source reference
`app/api/workflows/[slug]/credentials/route.ts` lines 21–23: `return NextResponse.json(rows.map((r) => ({ nodeId, credentialId, name, type })))` — response is a bare array with no wrapper object.
