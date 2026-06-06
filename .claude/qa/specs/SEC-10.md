---
id: SEC-10
title: Expired API keys rejected at /api/v1/chat
severity: high
source_files:
  - app/api/v1/chat/route.ts
---

## What this tests
Verifies that `POST /api/v1/chat` rejects API keys whose `expires_at` timestamp has passed, ensuring time-bound access control is enforced at the live API endpoint.

## Steps

1. Create an API key with an expiry date set to yesterday:
   ```bash
   # Create key with past expiry (use any past ISO date)
   curl -s -X POST http://localhost:3000/api/workflows/<slug>/api-keys \
     -H "Content-Type: application/json" \
     -d '{"label": "expiring-key", "expires_at": "2020-01-01T00:00:00.000Z"}'
   ```
   Note the full key value from the 201 response

2. Send a workflow execution request with the expired key:
   ```bash
   curl -si -X POST http://localhost:3000/api/v1/chat \
     -H "Authorization: Bearer sk-wf-<expired-key>" \
     -H "Content-Type: application/json" \
     -d '{"message": "test"}'
   ```

3. Verify HTTP status **401** and body `{ "error": "API key has expired" }`

4. Confirm the workflow did NOT execute (check execution logs — no new entry)

## Steps — active key is unaffected

5. Use a key with no expiry (or future expiry) — verify it executes normally (200)

## Steps — expiry check precision

6. The expiry check is `new Date(expires_at) <= new Date()`:
   - A key expiring at the exact current millisecond is considered expired (≤ not <)
   - `expires_at = null` never triggers the expiry check

## Expected result
- Expired key (`expires_at` in past): 401 `{ "error": "API key has expired" }`
- Valid key with future or null expiry: workflow executes normally
- Expiry check uses the current server time, not the client-provided time

## Failure indicators
- Expired key executes the workflow (401 not returned)
- Expired key returns `"Invalid API key"` instead of `"API key has expired"`
- Null `expires_at` causes a false-positive expiry rejection

## Severity rationale
Time-bound API keys are a security feature for limiting exposure windows; failure to enforce expiry allows revoked access to persist indefinitely.

## Source reference
`app/api/v1/chat/route.ts` lines 61-63 (`if (keyRow.expires_at && new Date(keyRow.expires_at) <= new Date()) return corsJson({ error: "API key has expired" }, 401)`).

## Notes
This is the live-API enforcement of the expiry check. The same expiry logic applies both here and in the Config UI (CFG-KEY-09 — expired badge). The check runs after the key is found in the DB (active key lookup); a key that is both expired and disabled returns `"Invalid API key"` (filtered by `is_active = 1` before the expiry check).
