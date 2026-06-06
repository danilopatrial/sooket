---
id: CFG-CRED-03
title: Delete a global credential
severity: medium
source_files:
  - components/workflow-config/CredentialsTab.tsx
  - app/api/credentials/route.ts
---

## What this tests
Clicking the `Trash2` icon on a credential row sends a DELETE request and removes the credential from the pool list immediately.

## Prerequisites
- App is running at http://localhost:3000
- Navigate to the workflow config Credentials tab
- At least one credential exists in the pool

## Steps
1. Locate a credential row in the "Credentials Pool" section
2. Click the `Trash2` icon on the right side of that row
3. Observe the result

## Expected result
- A `DELETE /api/credentials?id=[id]` request is sent immediately (no confirmation step)
- On success: toast "Credential deleted" appears; the credential list refreshes (the deleted row disappears)
- On error: toast "Failed to delete" appears

## Failure indicators
- Clicking `Trash2` has no effect
- The credential row remains after clicking delete even on a successful API response
- No toast appears after deletion

## Severity rationale
Credential deletion is needed to revoke or clean up stale secrets; a broken delete flow leads to credential accumulation.

## Source reference
`components/workflow-config/CredentialsTab.tsx` lines 110–113 — `handleDelete(id)` calls `DELETE /api/credentials?id=${id}`, toasts "Credential deleted" and calls `loadAll()` on success; toasts "Failed to delete" on error. Lines 230–237 — `Trash2` button calls `handleDelete(c.id)` directly (no confirmation step). `app/api/credentials/route.ts` lines 25–38 — DELETE handler validates `id`, calls `adapter.deleteCredential(id)`.
