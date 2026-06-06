---
id: CONTRACT-PRESET-09
title: DELETE preset with non-integer id returns 400
severity: medium
source_files:
  - app/api/workflows/[slug]/presets/[id]/route.ts
---

## What this tests
Verifies that DELETE with a non-integer or non-positive `id` path segment returns HTTP 400 with `{"error": "Invalid id"}`.

## Prerequisites
- App is running at http://localhost:3000
- A workflow exists; substitute its `slug` below

## Steps
1. DELETE with a string id:
   ```
   curl -s -o /tmp/preset09a.json -w "%{http_code}" \
     -X DELETE http://localhost:3000/api/workflows/<slug>/presets/abc
   ```
   Note status. Inspect: `cat /tmp/preset09a.json`
2. DELETE with a float id:
   ```
   curl -s -o /tmp/preset09b.json -w "%{http_code}" \
     -X DELETE http://localhost:3000/api/workflows/<slug>/presets/1.5
   ```
   Note status. Inspect: `cat /tmp/preset09b.json`
3. DELETE with zero:
   ```
   curl -s -o /tmp/preset09c.json -w "%{http_code}" \
     -X DELETE http://localhost:3000/api/workflows/<slug>/presets/0
   ```
   Note status. Inspect: `cat /tmp/preset09c.json`
4. DELETE with a negative integer:
   ```
   curl -s -o /tmp/preset09d.json -w "%{http_code}" \
     -X DELETE http://localhost:3000/api/workflows/<slug>/presets/-1
   ```
   Note status. Inspect: `cat /tmp/preset09d.json`

## Expected result
All four requests return HTTP `400`. Response body is `{"error":"Invalid id"}` in each case.

## Failure indicators
- Any request returns a status other than 400
- Response body does not contain `"Invalid id"`
- Zero or negative integers are accepted and attempt a DB lookup

## Severity rationale
Medium: input validation prevents spurious DB lookups; a missing check would not cause data loss but is a contract violation.

## Source reference
`app/api/workflows/[slug]/presets/[id]/route.ts` lines 8–10: `const presetId = parseInt(id, 10); if (!Number.isFinite(presetId) || presetId <= 0) return NextResponse.json({ error: "Invalid id" }, { status: 400 });`

## Notes
`parseInt("1.5", 10)` returns `1` (a valid integer), so a float id like `1.5` is parsed as `1` by JavaScript and will proceed past the validation check to a DB lookup — it will not return 400. Verify in source: `app/api/workflows/[slug]/presets/[id]/route.ts` line 8.
