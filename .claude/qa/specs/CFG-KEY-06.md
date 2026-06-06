---
id: CFG-KEY-06
title: Cannot delete the last active API key
severity: high
source_files:
  - components/workflow-config/ApiKeysTab.tsx
  - app/api/workflows/[slug]/api-keys/[id]/route.ts
---

## What this tests
Attempting to delete the last remaining active API key is rejected with a 409 error and an error toast; the key remains in the list.

## Prerequisites
- App is running at http://localhost:3000
- Navigate to the workflow config API Keys tab
- Exactly one active API key exists for this workflow (disable or delete others first)

## Steps
1. Verify only one active key remains (count badge at bottom: "1 active")
2. Click the `Trash2` icon on that active key
3. Click "Confirm" in the inline confirmation
4. Observe the result

## Expected result
- The DELETE request to `/api/workflows/[slug]/api-keys/[id]` returns 409 with `{"error": "Cannot delete the last active key for this workflow"}`
- An error toast appears with that message
- The key row remains in the list unchanged

## Failure indicators
- The last active key is successfully deleted (leaving zero active keys)
- No error toast appears when attempting to delete the last active key
- The UI removes the key row even though the API rejected the deletion

## Severity rationale
Deleting all active keys would make the workflow permanently unreachable via the API until a new key is created.

## Source reference
`app/api/workflows/[slug]/api-keys/[id]/route.ts` lines 109–117 — DELETE handler: if the key `is_active` and `activeCount <= 1`, returns 409 `{"error": "Cannot delete the last active key for this workflow"}`. `components/workflow-config/ApiKeysTab.tsx` lines 182–194 — `handleDelete()` calls the DELETE endpoint and on non-ok response shows `toast.error(data.error ?? "Failed to delete key")`.
