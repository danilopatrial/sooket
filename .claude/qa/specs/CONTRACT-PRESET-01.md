---
id: CONTRACT-PRESET-01
title: GET /api/workflows/[slug]/presets returns presets array
severity: medium
source_files:
  - app/api/workflows/[slug]/presets/route.ts
---

## What this tests
GET /api/workflows/[slug]/presets returns a `{presets: []}` envelope where each entry has `id`, `name`, `body`, `headers`, `query`, and `createdAt` fields, ordered newest-first.

## Prerequisites
- App is running at http://localhost:3000
- A workflow exists; note its slug (e.g. `abc1234567`)
- At least one preset has been created for that workflow (via POST)

## Steps
1. Create a workflow and record its slug:
   ```
   curl -s -X POST http://localhost:3000/api/workflows \
     -H "Content-Type: application/json" \
     -d '{"name":"preset-test"}' | jq -r '.slug'
   ```
2. Create a preset for that workflow:
   ```
   curl -s -X POST http://localhost:3000/api/workflows/<slug>/presets \
     -H "Content-Type: application/json" \
     -d '{"name":"my preset","body":"{\"hello\":\"world\"}"}'
   ```
3. Fetch the presets list:
   ```
   curl -s http://localhost:3000/api/workflows/<slug>/presets
   ```

## Expected result
- HTTP 200
- Response body is a JSON object with a `presets` array
- Each preset object in the array contains exactly these fields:
  - `id` — integer
  - `name` — string (`"my preset"`)
  - `body` — string (`"{\"hello\":\"world\"}"`)
  - `headers` — object (empty `{}` when none were set)
  - `query` — object (empty `{}` when none were set)
  - `createdAt` — ISO timestamp string
- Presets are ordered newest-first (descending by `created_at`)

## Failure indicators
- Response is not a JSON object with a `presets` key
- `presets` value is not an array
- Any expected field (`id`, `name`, `body`, `headers`, `query`, `createdAt`) is missing from a preset entry
- `headers` or `query` is returned as `null` instead of `{}`
- HTTP status is not 200

## Severity rationale
Medium — the presets list is required for the debug panel to reload saved test payloads; a broken GET blocks test preset restore without losing data.

## Source reference
`app/api/workflows/[slug]/presets/route.ts` — GET handler (lines 30–51); shape defined by the `.map()` on line 42.

## Notes
- A workflow with no presets returns `{"presets":[]}` — the empty array is valid.
- If the slug does not exist, the endpoint returns 404 `{"error":"Not found"}` (line 33).
