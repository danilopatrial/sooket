---
id: API-05
title: Inactive workflow returns 403
severity: high
source_files:
  - app/api/v1/chat/route.ts
---

## What this tests
Verifies that `POST /api/v1/chat` returns 403 `{ "error": "This workflow is not active" }` when the API key is valid but its associated workflow has `is_active = 0`.

## Steps — deactivate the workflow

1. Navigate to the workflow's Config panel → **General** tab
2. Toggle the workflow to **Inactive** (or ensure no other workflow is active, leaving this one inactive)
3. Confirm the workflow dashboard shows the workflow as inactive

## Steps — request with inactive workflow

4. Send a POST request using a valid API key for the inactive workflow:
   ```bash
   curl -s -X POST http://localhost:3000/api/v1/chat \
     -H "Authorization: Bearer sk-wf-<valid-key>" \
     -H "Content-Type: application/json" \
     -d '{"message": "test"}'
   ```
5. Verify HTTP status **403** and body `{ "error": "This workflow is not active" }`
6. Verify the workflow did not execute (no new execution logs)

## Steps — re-activating restores access

7. Toggle the workflow back to **Active**
8. Send the same request — verify it returns 200 and the workflow executes

## Steps — distinction from disabled key

9. Confirm: a disabled KEY returns 401 `"Invalid API key"`, while an inactive WORKFLOW (with valid key) returns 403 `"This workflow is not active"` — these are distinct error conditions with different status codes

## Expected result
- Valid key + inactive workflow: 403 `{ "error": "This workflow is not active" }`
- Valid key + active workflow: normal execution (200 or workflow-configured status)
- Check is against `w.is_active` (the workflow's active flag), not the key's active flag
- CORS headers present on the 403 response

## Failure indicators
- Inactive workflow returns 401 instead of 403
- Inactive workflow returns the same error message as an invalid key
- Workflow executes despite being inactive
- Reactivating the workflow does not restore access without a new key

## Severity rationale
The inactive workflow check prevents request processing for workflows that are deliberately decommissioned; returning 403 (not 401) correctly signals authorization vs authentication failure to callers.

## Source reference
`app/api/v1/chat/route.ts` line 70 (`if (!keyRow.is_active) return corsJson({ error: "This workflow is not active" }, 403)` — `keyRow.is_active` is `w.is_active` from the workflow join).

## Notes
The SQL query filters `WHERE k.key = ? AND k.is_active = 1` (key-level active check). The workflow's `is_active` is returned as a separate column and checked after the query returns a row. A valid key for an inactive workflow still passes the key lookup but fails the workflow active check.
