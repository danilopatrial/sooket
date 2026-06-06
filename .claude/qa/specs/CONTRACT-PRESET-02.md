---
id: CONTRACT-PRESET-02
title: POST /api/workflows/[slug]/presets creates preset and returns it
severity: high
source_files:
  - app/api/workflows/[slug]/presets/route.ts
---

## What this tests
POST /api/workflows/[slug]/presets with a valid `{name, body}` payload creates the preset in the database and returns the full preset object with HTTP 201.

## Prerequisites
- App is running at http://localhost:3000
- A workflow exists; record its slug

## Steps
1. Create a workflow and record its slug:
   ```
   curl -s -X POST http://localhost:3000/api/workflows \
     -H "Content-Type: application/json" \
     -d '{"name":"preset-create-test"}' | jq -r '.slug'
   ```
2. POST a new preset to that workflow:
   ```
   curl -s -X POST http://localhost:3000/api/workflows/<slug>/presets \
     -H "Content-Type: application/json" \
     -d '{"name":"hello test","body":"{\"message\":\"hi\"}"}'
   ```
3. Confirm the preset now appears in the list:
   ```
   curl -s http://localhost:3000/api/workflows/<slug>/presets | jq '.presets'
   ```

## Expected result
- Step 2 returns HTTP 201
- Response body is `{"preset": {...}}` with a single `preset` object containing:
  - `id` — positive integer
  - `name` — `"hello test"`
  - `body` — `"{\"message\":\"hi\"}"`
  - `headers` — `{}`
  - `query` — `{}`
  - `createdAt` — ISO timestamp string
- Step 3 shows the newly created preset in the `presets` array

## Failure indicators
- HTTP status is not 201
- Response wraps the preset under a key other than `preset`
- Any of the fields `id`, `name`, `body`, `headers`, `query`, `createdAt` is missing
- `headers` or `query` is `null` instead of `{}`
- The preset does not appear in the subsequent GET response

## Severity rationale
High — creating presets is the primary write operation for the debug panel's preset system; a broken POST means testers cannot save any test payloads.

## Source reference
`app/api/workflows/[slug]/presets/route.ts` — POST handler (lines 53–111); 201 status and `{preset: {...}}` shape defined on lines 98–107.
