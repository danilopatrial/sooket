---
id: CONTRACT-AKEY-07
title: POST api-key negative rate_limit_override is clamped to 1
severity: medium
source_files:
  - app/api/workflows/[slug]/api-keys/route.ts
---

## What this tests
Verifies that a negative `rate_limit_override` is NOT rejected with 400 — it is silently clamped to `1` and the key is created successfully.

## Prerequisites
- App is running at http://localhost:3000
- A workflow exists; substitute its `slug` below

## Steps
1. POST with a negative `rate_limit_override`:
   ```
   curl -s -o /tmp/akey07a.json -w "%{http_code}" \
     -X POST http://localhost:3000/api/workflows/<slug>/api-keys \
     -H 'Content-Type: application/json' \
     -d '{"label":"negative-rate","rate_limit_override":-10}'
   ```
2. Note the HTTP status code. Check the stored value:
   ```
   cat /tmp/akey07a.json | python3 -c "import sys,json; d=json.load(sys.stdin); print(d['key']['rate_limit_override'])"
   ```
3. POST with zero:
   ```
   curl -s -o /tmp/akey07b.json -w "%{http_code}" \
     -X POST http://localhost:3000/api/workflows/<slug>/api-keys \
     -H 'Content-Type: application/json' \
     -d '{"label":"zero-rate","rate_limit_override":0}'
   ```
4. Note the HTTP status code. Check the stored value:
   ```
   cat /tmp/akey07b.json | python3 -c "import sys,json; d=json.load(sys.stdin); print(d['key']['rate_limit_override'])"
   ```
5. POST with a non-numeric string to confirm that DOES return 400:
   ```
   curl -s -o /tmp/akey07c.json -w "%{http_code}" \
     -X POST http://localhost:3000/api/workflows/<slug>/api-keys \
     -H 'Content-Type: application/json' \
     -d '{"label":"nan-rate","rate_limit_override":"abc"}'
   ```

## Expected result
Steps 1 and 3 return HTTP `201`. `rate_limit_override` in both responses is `1` (clamped via `Math.max(1, Math.floor(value))`). Step 5 returns HTTP `400` with `{"error":"rate_limit_override must be a positive integer"}` because `Number("abc")` is `NaN`.

## Failure indicators
- Negative value returns 400 (should be clamped, not rejected)
- Clamped value stored is not `1`
- Step 5 (NaN input) does not return 400

## Severity rationale
Medium: silent clamping of negative values diverges from the checklist expectation of a 400; callers submitting `-10` will receive a key with rate limit `1` without any warning.

## Source reference
`app/api/workflows/[slug]/api-keys/route.ts` lines 71–76: `Math.max(1, Math.floor(Number(body.rate_limit_override)))` clamps non-positive values to 1; the `< 1` guard is only reached when `Math.max` returns NaN (non-numeric input).

## Notes
The checklist description reads "negative number returns 400" but the implementation clamps to 1 and returns 201. Only truly non-numeric values (NaN after `Number()`) trigger the 400 path.
