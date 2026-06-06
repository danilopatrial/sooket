---
id: CONTRACT-PRESET-08
title: DELETE preset from wrong workflow returns 404
severity: high
source_files:
  - app/api/workflows/[slug]/presets/[id]/route.ts
---

## What this tests
Verifies that deleting a preset using a `slug` that belongs to a different workflow than the preset returns HTTP 404.

## Prerequisites
- App is running at http://localhost:3000
- Two workflows exist; note their slugs (`slug-a` and `slug-b`)
- A preset exists in `slug-a`; note its integer `id`

## Steps
1. Create a preset in workflow A:
   ```
   curl -s -X POST http://localhost:3000/api/workflows/<slug-a>/presets \
     -H 'Content-Type: application/json' \
     -d '{"name":"cross-wf-test","body":"{}"}' | python3 -c "import sys,json; d=json.load(sys.stdin); print(d['preset']['id'])"
   ```
   Note the returned `id`.
2. Attempt to delete that preset using workflow B's slug:
   ```
   curl -s -o /tmp/preset08.json -w "%{http_code}" \
     -X DELETE http://localhost:3000/api/workflows/<slug-b>/presets/<id>
   ```
3. Note the HTTP status code. Inspect: `cat /tmp/preset08.json`
4. Confirm the preset was NOT deleted by fetching workflow A's presets:
   ```
   curl -s http://localhost:3000/api/workflows/<slug-a>/presets
   ```
   Verify the preset still exists.

## Expected result
Step 2 returns HTTP `404`. Response body is `{"error":"Preset not found"}`. The preset in workflow A is unaffected (still present in step 4).

## Failure indicators
- HTTP 200 returned (cross-workflow deletion succeeded — security issue)
- Preset disappears from workflow A after the cross-workflow delete attempt
- HTTP status other than 404

## Severity rationale
High: allowing cross-workflow deletion would let any caller delete another workflow's presets by guessing integer IDs.

## Source reference
`app/api/workflows/[slug]/presets/[id]/route.ts` lines 16–20: `DELETE FROM workflow_test_presets WHERE id = ? AND workflow_id = ?` — if `workflow_id` does not match, `changes` is 0 and a 404 is returned.
