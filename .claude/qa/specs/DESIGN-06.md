---
id: DESIGN-06
title: Loading states spinners Creating text present where expected
severity: low
source_files:
  - components/workflow/NewWorkflowButton.tsx
  - components/workflow/WorkflowList.tsx
---

## What this tests
Verifies that buttons and interactive elements show loading indicators ("Creating…", "Deleting…") during async operations — preventing double-submission and communicating progress to the user.

## Prerequisites
- App is running at http://localhost:3000

## Steps — New Workflow button loading state

1. Navigate to the workflow dashboard (`/workflow`)
2. Click **New Workflow**
3. Immediately observe the button:
   - Button text changes from **New Workflow** to **Creating…**
   - Button is disabled (unclickable during creation)
   - Plus icon remains visible
4. After navigation to the new canvas, the button is no longer visible (page changed)

## Steps — Delete workflow loading state

5. On the dashboard, click the Trash icon on an inactive workflow
6. Click **Yes** to confirm deletion
7. Observe the **Yes** button text changes to **Deleting…** while the DELETE request is in progress
8. After deletion completes, the workflow row disappears from the list

## Steps — Canvas autosave indicator

9. Navigate to a canvas editor; make any change (e.g. move a node)
10. After ~800ms (debounce), verify the canvas toolbar shows a **Saved** indicator
11. During the save: a loading/pending indicator should briefly appear

## Steps — Complexity node loading state

12. Open a Complexity Score node; type a prompt in the Test Prompt field that falls in the ambiguous 0.25–0.70 band
13. While the embedding API call is in progress, verify the node header shows **scoring…** in amber with a pulse animation

## Expected result
- New Workflow button: disabled + "Creating…" text during creation
- Delete confirm button: disabled + "Deleting…" text during deletion
- Canvas autosave: "Saved" indicator appears after 800ms debounce
- Complexity node: "scoring…" during embedding API call

## Failure indicators
- New Workflow button remains clickable while creating (allows double-submission)
- Button text does not change during loading (no visual feedback)
- Delete button remains "Yes" while the API call is in flight

## Severity rationale
Low: loading states prevent double-submission and communicate progress; their absence is a UX regression but not a functional failure.

## Source reference
`components/workflow/NewWorkflowButton.tsx` lines 11-29 (`loading` state → "Creating…" text + `disabled`); `components/workflow/WorkflowList.tsx` lines 21-41 (`deleting` state → "Deleting…" text on confirm button).
