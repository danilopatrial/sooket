---
id: API-04
title: Disabled API key returns 401
severity: high
source_files:
  - app/api/v1/chat/route.ts
---

## What this tests
Verifies that a valid API key that has been disabled (`is_active = 0`) via the Config → API Keys tab is rejected at `POST /api/v1/chat` with 401, without executing the workflow.

## Steps — disable an existing key

1. Navigate to the workflow's Config panel → **API Keys** tab
2. Locate an active key; click the **enable/disable** toggle to disable it
3. Confirm the key row now shows a disabled state

## Steps — request with disabled key

4. Send a POST request using the disabled key:
   ```bash
   curl -s -X POST http://localhost:3000/api/v1/chat \
     -H "Authorization: Bearer sk-wf-<disabled-key>" \
     -H "Content-Type: application/json" \
     -d '{"message": "test"}'
   ```
5. Verify HTTP status **401** and body `{ "error": "Invalid API key" }`
6. Verify the workflow did **not** execute (no new entry in the workflow's execution logs)

## Steps — re-enabling restores access

7. Re-enable the key via the API Keys tab
8. Send the same request — verify it now returns 200 and the workflow executes

## Steps — last active key protection

9. Verify via the API Keys tab that disabling the **last active key** is blocked (UI prevents it per CFG-KEY-04/CFG-KEY-06) — there is always at least one active key available

## Expected result
- Disabled key (`is_active = 0`) is excluded from the `WHERE k.key = ? AND k.is_active = 1` DB query
- API returns 401 `{ "error": "Invalid API key" }` — same response as a non-existent key
- Workflow execution is not triggered; no logs written
- Re-enabling the key immediately restores API access

## Failure indicators
- Disabled key returns 200 and workflow executes
- Disabled key returns a different status code (e.g. 403) or different error message
- Workflow logs show an execution triggered by the disabled key request

## Severity rationale
Disabling an API key is the primary revocation mechanism; if disabled keys still execute workflows, revocation is ineffective.

## Source reference
`app/api/v1/chat/route.ts` lines 46-59 (DB query: `WHERE k.key = ? AND k.is_active = 1`; returns 401 `"Invalid API key"` if no row found — disabled keys are filtered before the row is returned).

## Notes
Disabled keys return the same error as non-existent keys (`"Invalid API key"`) — there is no distinct `"API key is disabled"` message. This is intentional to avoid leaking information about whether a given key value exists in the system.
