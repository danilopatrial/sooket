---
id: DASH-06
title: Delete inactive workflow via inline confirm/cancel flow
severity: high
source_files:
  - components/workflow/WorkflowList.tsx
  - app/api/workflows/route.ts
---

## What this tests
Clicking the trash icon on an inactive workflow reveals an inline "Delete? Yes / No" confirmation; "Yes" deletes the workflow and removes it from the list; "No" cancels without deleting.

## Prerequisites
- App is running at http://localhost:3000
- At least one **inactive** workflow exists (is_active = 0)

## Steps
1. Navigate to `http://localhost:3000/workflow`
2. Locate an inactive workflow row (shows "Inactive" badge)
3. Click the trash icon (`Trash2`) on the right side of the row
4. Observe that the trash button is replaced by inline text and two buttons
5. Click "No" — verify the row returns to its normal state with the trash icon
6. Click the trash icon again
7. Click "Yes" and observe the result

## Expected result
- After clicking the trash icon: the right side of the row shows "Delete?" label, a "Yes" button (destructive styling: `bg-destructive/15 text-destructive`), and a "No" button
- After clicking "No": the inline confirmation disappears and the trash icon is restored; the workflow remains in the list
- After clicking "Yes": the button label changes to "Deleting…" and becomes disabled while the DELETE request is in flight; on success the workflow row is removed from the list without a page reload

## Failure indicators
- Clicking the trash icon immediately deletes without showing any confirmation
- The "Yes" / "No" confirmation buttons do not appear after clicking the trash icon
- Clicking "No" does not restore the trash icon (confirmation stays open)
- After clicking "Yes", the workflow row remains in the list
- An error message appears for a valid delete operation

## Severity rationale
Inline confirmation prevents accidental deletion of workflows; failure in either direction (no confirmation or confirm not working) is a significant usability and data-safety issue.

## Source reference
`components/workflow/WorkflowList.tsx` lines 86–118 — trash button sets `confirmSlug`; when `isConfirming`, renders "Delete?" + "Yes" (calls `handleDelete`) + "No" (clears `confirmSlug`). `handleDelete` calls `DELETE /api/workflows/[slug]` then filters the workflow out of local state and calls `router.refresh()`.
