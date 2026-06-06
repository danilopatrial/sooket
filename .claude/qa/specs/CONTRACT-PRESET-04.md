---
id: CONTRACT-PRESET-04
title: POST with non-JSON body string returns 400
severity: medium
source_files:
  - app/api/workflows/[slug]/presets/route.ts
---

## What this tests
POST /api/workflows/[slug]/presets with a `body` field that is a string but not valid JSON returns HTTP 400 with `{"error":"Invalid request"}`.

## Prerequisites
- App is running at http://localhost:3000
- A workflow exists; record its slug

## Steps
1. Create a workflow and record its slug:
   ```
   curl -s -X POST http://localhost:3000/api/workflows \
     -H "Content-Type: application/json" \
     -d '{"name":"bad-body-test"}' | jq -r '.slug'
   ```
2. POST a preset with an invalid JSON string as `body`:
   ```
   curl -s -w "\n%{http_code}" -X POST http://localhost:3000/api/workflows/<slug>/presets \
     -H "Content-Type: application/json" \
     -d '{"name":"bad preset","body":"not valid json {"}'
   ```

## Expected result
- HTTP 400
- Response body is `{"error":"Invalid request"}`
- No preset is created (confirm with `GET /api/workflows/<slug>/presets` — returns empty `presets` array)

## Failure indicators
- HTTP status is 201 or 200 (preset incorrectly created with a non-JSON body string)
- Response body contains a key other than `error`
- Error message is a raw stack trace or server error message

## Severity rationale
Medium — the debug panel stores preset bodies that are later sent as HTTP payloads; silently accepting non-JSON body strings would corrupt downstream test executions.

## Source reference
`app/api/workflows/[slug]/presets/route.ts` — `JSON.parse(payload.body)` on line 69 throws for invalid JSON; caught on line 83 returning 400 `{"error":"Invalid request"}`.
