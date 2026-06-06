---
id: DASH-02
title: Create new workflow — button, loading state, canvas navigation
severity: critical
source_files:
  - components/workflow/NewWorkflowButton.tsx
  - app/api/workflows/route.ts
---

## What this tests
Clicking "New Workflow" POSTs to `/api/workflows`, shows a loading state while the request is in flight, then navigates to the newly created workflow's canvas.

## Prerequisites
- App is running at http://localhost:3000
- Navigate to `http://localhost:3000/workflow`

## Steps
1. Locate the "New Workflow" button in the top-right of the Workflows page
2. Click the button
3. Observe the button label while the request is in flight
4. Observe the URL after the request completes

## Expected result
- While the POST is in flight: the button is disabled and its label changes to "Creating…"
- After success: the browser navigates to `/workflow/[slug]` where `[slug]` is a 10-character nanoid string
- The new workflow is named "Untitled Workflow" (set by the API on creation)
- No error toast is shown

## Failure indicators
- The button label does not change to "Creating…" during the request
- The button remains clickable while loading (not disabled)
- After clicking, the browser stays on `/workflow` instead of navigating to the canvas
- A "Failed to create workflow" error toast appears
- The navigated URL is not `/workflow/[slug]`

## Severity rationale
Creating a workflow is the primary onboarding action; failure makes the app a dead end.

## Source reference
`components/workflow/NewWorkflowButton.tsx` — sets `loading=true`, disables the button, shows "Creating…" label, POSTs to `/api/workflows`, then calls `router.push("/workflow/" + slug)` on success or `toast.error("Failed to create workflow")` on failure. `app/api/workflows/route.ts` — POST handler inserts a new workflow with name "Untitled Workflow" and returns `{ slug }`.
