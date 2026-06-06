---
id: CFG-KEY-04
title: Enable/disable API key — cannot disable the last active key
severity: high
source_files:
  - components/workflow-config/ApiKeysTab.tsx
  - app/api/workflows/[slug]/api-keys/[id]/route.ts
---

## What this tests
Clicking the toggle icon on an API key enables or disables it; attempting to disable the only remaining active key is rejected with an error toast.

## Prerequisites
- App is running at http://localhost:3000
- Navigate to the workflow config API Keys tab
- At least two active API keys exist (create a second one if needed)

## Steps
1. Locate a key row with an active toggle icon (`ToggleRight`, green)
2. Click the toggle icon to disable the key
3. Verify the key is now shown as inactive (`ToggleLeft`)
4. Click the toggle again to re-enable it
5. Now ensure only one active key remains
6. Attempt to disable that last active key by clicking its toggle
7. Observe the result

## Expected result
- Clicking toggle on an active key: PATCHes `{is_active: false}`, on success changes icon to `ToggleLeft` (inactive), shows "Key disabled" toast
- Clicking toggle on an inactive key: PATCHes `{is_active: true}`, on success changes icon to `ToggleRight` (active), shows "Key enabled" toast
- Attempting to disable the last active key: API returns 409 with `{"error": "Cannot disable the last active key for this workflow"}`; error toast is shown; key remains active

## Failure indicators
- Toggle click has no visual effect
- "Key enabled" / "Key disabled" toast does not appear
- The last active key can be disabled (leaving the workflow with zero active keys)
- Error toast does not appear when trying to disable the last active key

## Severity rationale
Disabling all keys would make the workflow unreachable via the API; the last-key guard is a critical safety constraint.

## Source reference
`components/workflow-config/ApiKeysTab.tsx` lines 164–180 — `handleToggle()` PATCHes `{is_active: !key.is_active}`, updates key in list, toasts. `app/api/workflows/[slug]/api-keys/[id]/route.ts` lines 39–51 — PATCH handler: when disabling (`!nextActive`), counts active keys; if `activeCount <= 1 && existing.is_active` returns 409 with error message.
