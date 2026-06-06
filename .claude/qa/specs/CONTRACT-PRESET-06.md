---
id: CONTRACT-PRESET-06
title: POST preset missing name returns 400
severity: high
source_files:
  - app/api/workflows/[slug]/presets/route.ts
---

## What this tests
Verifies that a POST request with a missing or empty `name` field returns HTTP 400 with `{"error": "name is required"}`.

## Prerequisites
- App is running at http://localhost:3000
- A workflow exists; substitute its `slug` below

## Steps
1. POST without `name` field:
   ```
   curl -s -o /tmp/preset06a.json -w "%{http_code}" \
     -X POST http://localhost:3000/api/workflows/<slug>/presets \
     -H 'Content-Type: application/json' \
     -d '{"body":"{}"}'
   ```
2. Note the HTTP status code. Inspect: `cat /tmp/preset06a.json`
3. POST with an empty-string `name`:
   ```
   curl -s -o /tmp/preset06b.json -w "%{http_code}" \
     -X POST http://localhost:3000/api/workflows/<slug>/presets \
     -H 'Content-Type: application/json' \
     -d '{"name":"","body":"{}"}'
   ```
4. Note the HTTP status code. Inspect: `cat /tmp/preset06b.json`
5. POST with a whitespace-only `name`:
   ```
   curl -s -o /tmp/preset06c.json -w "%{http_code}" \
     -X POST http://localhost:3000/api/workflows/<slug>/presets \
     -H 'Content-Type: application/json' \
     -d '{"name":"   ","body":"{}"}'
   ```
6. Note the HTTP status code. Inspect: `cat /tmp/preset06c.json`

## Expected result
All three requests return HTTP `400`. Response body is `{"error":"name is required"}` in each case.

## Failure indicators
- Any request returns 2xx instead of 400
- Response body does not contain `"name is required"`
- Only missing `name` is rejected but empty string or whitespace-only is accepted

## Severity rationale
High: missing required field validation is a fundamental API contract; accepting an empty name would create unusable presets.

## Source reference
`app/api/workflows/[slug]/presets/route.ts` lines 64–65: `if (typeof payload.name !== "string" || !payload.name.trim()) return NextResponse.json({ error: "name is required" }, { status: 400 });`
