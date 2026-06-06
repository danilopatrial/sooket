---
id: CONTRACT-VER-04
title: POST versions with invalid versionId returns 400 or 404
severity: medium
source_files:
  - app/api/workflows/[slug]/versions/route.ts
---

## What this tests
Verifies that `POST /api/workflows/[slug]/versions` returns 400 when `versionId` is not a number, and 404 when `versionId` is a number but does not correspond to any version belonging to this workflow.

## Prerequisites
- App is running at http://localhost:3000
- A workflow exists with a known slug (referred to as `<slug>`)

## Steps

### Case A — `versionId` is not a number (expects 400)
1. Send a POST with a string `versionId`:
   ```
   curl -s -o /tmp/ver04a.json -w "%{http_code}" \
     -X POST http://localhost:3000/api/workflows/<slug>/versions \
     -H "Content-Type: application/json" \
     -d '{"versionId": "not-a-number"}'
   ```
2. Inspect the HTTP status code and `/tmp/ver04a.json`.

### Case B — `versionId` is absent (expects 400)
1. Send a POST with no `versionId` field:
   ```
   curl -s -o /tmp/ver04b.json -w "%{http_code}" \
     -X POST http://localhost:3000/api/workflows/<slug>/versions \
     -H "Content-Type: application/json" \
     -d '{}'
   ```
2. Inspect the HTTP status code and `/tmp/ver04b.json`.

### Case C — `versionId` is a number but does not exist (expects 404)
1. Send a POST with a large integer that is unlikely to be a real version id:
   ```
   curl -s -o /tmp/ver04c.json -w "%{http_code}" \
     -X POST http://localhost:3000/api/workflows/<slug>/versions \
     -H "Content-Type: application/json" \
     -d '{"versionId": 999999999}'
   ```
2. Inspect the HTTP status code and `/tmp/ver04c.json`.

## Expected result
- **Case A**: HTTP 400, body `{"error":"versionId must be a number"}`.
- **Case B**: HTTP 400, body `{"error":"versionId must be a number"}`.
- **Case C**: HTTP 404, body `{"error":"Version not found"}`.
- In all cases the workflow's live nodes/edges are unchanged.

## Failure indicators
- Case A or B returns 200 or any status other than 400.
- Case C returns 200 or any status other than 404.
- Any case returns a 500 or unhandled exception.
- Error body does not contain the `error` field.

## Severity rationale
Missing input validation on `versionId` could allow type-confusion bugs or unintended row matches in the version query.

## Source reference
`app/api/workflows/[slug]/versions/route.ts` lines 54–55 — `if (typeof body.versionId !== "number") return NextResponse.json({ error: "versionId must be a number" }, { status: 400 })`.  
Line 62 — `if (!version) return NextResponse.json({ error: "Version not found" }, { status: 404 })`.

## Notes
Case C also covers the scenario where a valid numeric `versionId` belongs to a different workflow: the query filters `WHERE id = ? AND workflow_id = ?`, so cross-workflow version IDs return 404.
