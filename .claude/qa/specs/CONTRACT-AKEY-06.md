---
id: CONTRACT-AKEY-06
title: POST api-key invalid scopes silently defaults to execute
severity: medium
source_files:
  - app/api/workflows/[slug]/api-keys/route.ts
---

## What this tests
Verifies that an invalid `scopes` value does not return 400 — instead, unrecognized scope strings are filtered out and the key is created with `["execute"]` as the default.

## Prerequisites
- App is running at http://localhost:3000
- A workflow exists; substitute its `slug` below

## Steps
1. POST with an entirely invalid scopes array:
   ```
   curl -s -o /tmp/akey06a.json -w "%{http_code}" \
     -X POST http://localhost:3000/api/workflows/<slug>/api-keys \
     -H 'Content-Type: application/json' \
     -d '{"label":"bad-scopes","scopes":["admin","read","write"]}'
   ```
2. Note the HTTP status code. Check scopes: `cat /tmp/akey06a.json | python3 -c "import sys,json; d=json.load(sys.stdin); print(d['key']['scopes'])"`
3. POST with a non-array `scopes`:
   ```
   curl -s -o /tmp/akey06b.json -w "%{http_code}" \
     -X POST http://localhost:3000/api/workflows/<slug>/api-keys \
     -H 'Content-Type: application/json' \
     -d '{"label":"non-array-scopes","scopes":"execute"}'
   ```
4. Note the HTTP status code. Check scopes: `cat /tmp/akey06b.json | python3 -c "import sys,json; d=json.load(sys.stdin); print(d['key']['scopes'])"`

## Expected result
Both requests return HTTP `201`. In both cases `key.scopes` is `["execute"]`. No 400 error is returned for unrecognized or malformed scope values.

## Failure indicators
- HTTP 400 returned for invalid scope strings
- `key.scopes` is not `["execute"]` after filtering all-invalid values
- Any non-201 status

## Severity rationale
Medium: the silent fallback to `["execute"]` is intentional but may surprise callers who expect validation; documents the actual contract.

## Source reference
`app/api/workflows/[slug]/api-keys/route.ts` lines 65–68: invalid scopes are filtered out; if the filtered array is empty, `"execute"` is pushed back in. `VALID_SCOPES = ["execute"]` (only one valid scope currently).

## Notes
The checklist description reads "returns 400" but the implementation silently defaults to `["execute"]`. Since `"execute"` is currently the only valid scope, any non-`"execute"` value is always discarded.
