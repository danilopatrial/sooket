---
id: CFG-KEY-05
title: Delete an API key via two-click inline confirmation
severity: high
source_files:
  - components/workflow-config/ApiKeysTab.tsx
  - app/api/workflows/[slug]/api-keys/[id]/route.ts
---

## What this tests
Clicking the `Trash2` icon on a key row reveals inline "Confirm" and "Cancel" buttons; clicking "Confirm" deletes the key and removes it from the list; "Cancel" aborts without deleting.

## Prerequisites
- App is running at http://localhost:3000
- Navigate to the workflow config API Keys tab
- At least two API keys exist (so the last-key guard does not interfere)

## Steps
1. Locate a key row that is not the last active key
2. Click the `Trash2` icon on the right side of the row
3. Observe the row changes to show "Confirm" and "Cancel" buttons
4. Click "Cancel" — verify the row returns to normal (trash icon visible again)
5. Click the `Trash2` icon again
6. Click "Confirm"
7. Observe the result

## Expected result
- Clicking `Trash2`: sets `confirmDeleteId` to this key's ID; the trash icon is replaced by "Confirm" (red destructive button) and "Cancel" (muted border button)
- Clicking Cancel: clears `confirmDeleteId`; trash icon is restored
- Clicking Confirm: button shows "Deleting…" and is disabled while the DELETE request is in flight; on success the key row is removed from the list and a toast "Key '[label]' deleted" appears

## Failure indicators
- Clicking the `Trash2` icon immediately deletes without showing confirmation
- "Confirm" / "Cancel" buttons do not appear after clicking `Trash2`
- Clicking Cancel does not restore the trash icon
- After clicking Confirm, the key row remains in the list
- No toast appears after deletion

## Severity rationale
Two-step confirmation prevents accidental deletion of API keys that may be in active use by callers.

## Source reference
`components/workflow-config/ApiKeysTab.tsx` lines 317–346 — delete control: `confirmDeleteId === key.id` shows "Confirm"/"Cancel" buttons; otherwise shows `Trash2` icon that sets `confirmDeleteId`. Lines 182–194 — `handleDelete()` calls `DELETE /api/workflows/${slug}/api-keys/${key.id}`, filters key from list, toasts. `app/api/workflows/[slug]/api-keys/[id]/route.ts` lines 93–121 — DELETE handler.
