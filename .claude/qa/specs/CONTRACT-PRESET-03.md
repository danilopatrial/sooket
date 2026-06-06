---
id: CONTRACT-PRESET-03
title: POST with same name upserts existing preset
severity: medium
source_files:
  - app/api/workflows/[slug]/presets/route.ts
---

## What this tests
Posting to /api/workflows/[slug]/presets with a name that already exists for that workflow updates (overwrites) the existing preset's body, headers, and query rather than creating a duplicate.

## Prerequisites
- App is running at http://localhost:3000
- A workflow exists; record its slug

## Steps
1. Create a workflow and record its slug:
   ```
   curl -s -X POST http://localhost:3000/api/workflows \
     -H "Content-Type: application/json" \
     -d '{"name":"upsert-test"}' | jq -r '.slug'
   ```
2. Create an initial preset:
   ```
   curl -s -X POST http://localhost:3000/api/workflows/<slug>/presets \
     -H "Content-Type: application/json" \
     -d '{"name":"my preset","body":"{\"v\":1}"}' | jq '.preset.id'
   ```
   Record the returned `id`.
3. POST again with the same name but a different body:
   ```
   curl -s -X POST http://localhost:3000/api/workflows/<slug>/presets \
     -H "Content-Type: application/json" \
     -d '{"name":"my preset","body":"{\"v\":2}"}'
   ```
4. Fetch the presets list and count entries named `"my preset"`:
   ```
   curl -s http://localhost:3000/api/workflows/<slug>/presets | jq '[.presets[] | select(.name=="my preset")] | length'
   ```

## Expected result
- Step 3 returns HTTP 201 with a `preset` object whose `body` is `"{\"v\":2}"`
- The `id` in the step 3 response equals the `id` from step 2 (same row, not a new one)
- Step 4 returns `1` — exactly one entry named `"my preset"` exists (no duplicate)

## Failure indicators
- Step 4 returns a count greater than 1 (duplicate created instead of upserted)
- The `body` in the step 3 response still shows the old value `"{\"v\":1}"`
- HTTP status from step 3 is not 201
- The `id` changes between step 2 and step 3 responses

## Severity rationale
Medium — upsert semantics keep the preset list clean; without it, repeated saves from the debug panel would create duplicates that clutter the UI.

## Source reference
`app/api/workflows/[slug]/presets/route.ts` — INSERT ... ON CONFLICT(workflow_id, name) DO UPDATE SET clause (lines 89–92).
