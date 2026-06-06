---
id: CFG-ACL-08
title: Delete an access list entry
severity: medium
source_files:
  - components/workflow-config/AccessListTab.tsx
  - app/api/workflows/[slug]/access-list/route.ts
---

## What this tests
Clicking the `Trash2` icon on an access list entry sends a DELETE request and removes the entry from the list immediately.

## Prerequisites
- App is running at http://localhost:3000
- Navigate to the workflow config Access List tab
- At least one entry exists

## Steps
1. Locate any entry row in the list
2. Click the `Trash2` icon on the right side of that row
3. Observe the result

## Expected result
- A `DELETE /api/workflows/${slug}/access-list?id=[id]` request is sent immediately (no confirmation step)
- While deleting: the `Trash2` button for that specific entry is disabled (`opacity-40`)
- On success: toast `"[value]" removed`; the entry row is removed from local state and disappears from the list
- On error: toast "Failed to remove entry"
- If that entry was the last in its group, the entire group section disappears

## Failure indicators
- Clicking `Trash2` has no effect
- The entry row remains visible after a successful DELETE
- No toast appears after deletion
- The delete button is not disabled during the request

## Severity rationale
Access list deletion allows revocation of previously permitted values; a broken delete means stale entries accumulate and cannot be removed.

## Source reference
`components/workflow-config/AccessListTab.tsx` lines 107–117 — `handleDelete(id, value)` sets `deletingId`, calls `DELETE /api/workflows/${slug}/access-list?id=${id}`, toasts `"${value}" removed` on success, filters entry from `entries` state. Lines 233–238 — `Trash2` button disabled when `deletingId === entry.id`. `app/api/workflows/[slug]/access-list/route.ts` lines 61–73 — DELETE handler removes by id and workflow_id.
