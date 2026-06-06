---
id: CONTRACT-AKEY-08
title: POST api-key with expires_at in the past returns 400
severity: high
source_files:
  - app/api/workflows/[slug]/api-keys/route.ts
---

## What this tests
Verifies that POST with an `expires_at` timestamp in the past returns HTTP 400 with `{"error": "expires_at must be in the future"}`, and that a non-parseable date string also returns 400.

## Prerequisites
- App is running at http://localhost:3000
- A workflow exists; substitute its `slug` below

## Steps
1. POST with a past ISO date:
   ```
   curl -s -o /tmp/akey08a.json -w "%{http_code}" \
     -X POST http://localhost:3000/api/workflows/<slug>/api-keys \
     -H 'Content-Type: application/json' \
     -d '{"label":"past-expiry","expires_at":"2020-01-01T00:00:00.000Z"}'
   ```
2. Note the HTTP status code. Inspect: `cat /tmp/akey08a.json`
3. POST with an invalid date string:
   ```
   curl -s -o /tmp/akey08b.json -w "%{http_code}" \
     -X POST http://localhost:3000/api/workflows/<slug>/api-keys \
     -H 'Content-Type: application/json' \
     -d '{"label":"bad-date","expires_at":"not-a-date"}'
   ```
4. Note the HTTP status code. Inspect: `cat /tmp/akey08b.json`
5. POST with a future ISO date to confirm acceptance:
   ```
   curl -s -o /tmp/akey08c.json -w "%{http_code}" \
     -X POST http://localhost:3000/api/workflows/<slug>/api-keys \
     -H 'Content-Type: application/json' \
     -d '{"label":"future-expiry","expires_at":"2099-01-01T00:00:00.000Z"}'
   ```
6. Note the HTTP status code for step 5.

## Expected result
Step 1 returns HTTP `400` with `{"error":"expires_at must be in the future"}`. Step 3 returns HTTP `400` with `{"error":"expires_at must be a valid ISO date"}`. Step 5 returns HTTP `201` and `key.expires_at` is `"2099-01-01T00:00:00.000Z"`.

## Failure indicators
- Past date accepted with 201
- Invalid date string accepted with 201
- Error message differs from `"expires_at must be in the future"` or `"expires_at must be a valid ISO date"`
- Future date rejected instead of accepted

## Severity rationale
High: accepting an already-expired key would make it immediately unusable at the `/api/v1/chat` endpoint, creating a confusing UX with no functional key.

## Source reference
`app/api/workflows/[slug]/api-keys/route.ts` lines 79–84: `if (isNaN(d.getTime())) return ... 400`; `if (d <= new Date()) return ... 400 "expires_at must be in the future"`.
