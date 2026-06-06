---
id: CONTRACT-PRESET-07
title: DELETE preset by id removes it successfully
severity: high
source_files:
  - app/api/workflows/[slug]/presets/[id]/route.ts
---

## What this tests
Verifies that DELETE `/api/workflows/[slug]/presets/[id]` removes the preset and returns `{"ok": true}`.

## Prerequisites
- App is running at http://localhost:3000
- A workflow exists; substitute its `slug` below
- A preset exists in that workflow; note its integer `id`

## Steps
1. Create a preset to delete:
   ```
   curl -s -X POST http://localhost:3000/api/workflows/<slug>/presets \
     -H 'Content-Type: application/json' \
     -d '{"name":"delete-me","body":"{}"}' | python3 -c "import sys,json; d=json.load(sys.stdin); print(d['preset']['id'])"
   ```
   Note the returned `id`.
2. Delete the preset:
   ```
   curl -s -o /tmp/preset07.json -w "%{http_code}" \
     -X DELETE http://localhost:3000/api/workflows/<slug>/presets/<id>
   ```
3. Note the HTTP status code. Inspect: `cat /tmp/preset07.json`
4. Confirm deletion by fetching the presets list:
   ```
   curl -s http://localhost:3000/api/workflows/<slug>/presets
   ```
   Verify the deleted preset `id` is no longer present.

## Expected result
Step 2 returns HTTP `200`. Response body is `{"ok":true}`. The preset list in step 4 no longer contains the deleted preset.

## Failure indicators
- HTTP status other than 200
- Response body is not `{"ok":true}`
- Preset still appears in the presets list after deletion

## Severity rationale
High: delete is a core preset management operation; failure leaves stale presets that cannot be removed.

## Source reference
`app/api/workflows/[slug]/presets/[id]/route.ts` lines 16–20: `DELETE FROM workflow_test_presets WHERE id = ? AND workflow_id = ?`, returns `{ok: true}`.
