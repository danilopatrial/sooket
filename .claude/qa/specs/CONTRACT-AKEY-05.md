---
id: CONTRACT-AKEY-05
title: POST api-key label > 100 chars is silently truncated
severity: medium
source_files:
  - app/api/workflows/[slug]/api-keys/route.ts
---

## What this tests
Verifies that a `label` longer than 100 characters is silently truncated to 100 characters and the key is created successfully — a 400 is NOT returned.

## Prerequisites
- App is running at http://localhost:3000
- A workflow exists; substitute its `slug` below

## Steps
1. POST with a 101-character label:
   ```
   curl -s -o /tmp/akey05.json -w "%{http_code}" \
     -X POST http://localhost:3000/api/workflows/<slug>/api-keys \
     -H 'Content-Type: application/json' \
     -d '{"label":"AAAAAAAAAABBBBBBBBBBCCCCCCCCCCDDDDDDDDDDEEEEEEEEEEAAAAAAAAAABBBBBBBBBBCCCCCCCCCCDDDDDDDDDDEEEEEEEEEE1"}'
   ```
2. Note the HTTP status code. Inspect: `cat /tmp/akey05.json`
3. Check the label length in the response:
   ```
   cat /tmp/akey05.json | python3 -c "import sys,json; d=json.load(sys.stdin); print(len(d['key']['label']))"
   ```

## Expected result
HTTP `201` is returned. `key.label` in the response is exactly 100 characters (the input was truncated). No 400 error is returned.

## Failure indicators
- HTTP 400 returned for a 101-character label (server truncates, not rejects)
- HTTP 201 returned but label length is 101 (truncation not applied)
- Any non-201 status

## Severity rationale
Medium: silent truncation may surprise callers who submitted a long label and receive a shortened one back, but no key is lost.

## Source reference
`app/api/workflows/[slug]/api-keys/route.ts` line 62: `const label = (body.label ?? "").trim().slice(0, 100);` — truncation is applied before the empty check; no 400 for oversized labels.

## Notes
The checklist description reads "returns 400" but the implementation silently truncates via `.slice(0, 100)` and returns 201. Spec documents actual source behavior.
