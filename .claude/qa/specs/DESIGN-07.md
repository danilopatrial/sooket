---
id: DESIGN-07
title: Error states have clear user-friendly messages not raw stack traces
severity: medium
source_files:
  - components/workflow/WorkflowList.tsx
  - components/workflow/NewWorkflowButton.tsx
---

## What this tests
Verifies that errors surfaced in the UI use clear, human-readable messages — not raw JavaScript error objects, stack traces, or internal server error details.

## Prerequisites
- App is running at http://localhost:3000

## Steps — delete error message

1. Attempt to delete an **active** workflow (should be blocked — no delete button; but force via DevTools if needed, or simply verify the guard exists)
2. If the delete API returns an error: the workflow list shows an error banner with:
   - An `AlertTriangle` icon
   - The human-readable error message (e.g. `"Cannot delete an active workflow"`)
   - Styled with a destructive border/background (not a raw JSON dump)
3. Verify no `Error:`, `TypeError:`, or stack trace text appears in the UI

## Steps — create workflow failure

4. Simulate a create failure (e.g. disconnect from network briefly) and click **New Workflow**
5. Verify a toast appears: **"Failed to create workflow"** — a short, readable message
6. No raw error JSON or stack trace in the toast

## Steps — Debug panel execution error

7. Navigate to a canvas editor; configure a node to throw (e.g. Anthropic with no key)
8. Open the Debug panel and run a request
9. Verify the Debug panel shows the error message (e.g. `"No Anthropic API key configured for this workflow"`) — not a stack trace
10. The node trace row shows the error message string, not a raw Error object

## Steps — network error

11. Disconnect from the network; attempt to save or perform an API action
12. Verify any error shown is either `"Network error"` or similar readable text — not a JavaScript TypeError

## Expected result
- All user-facing error messages are human-readable strings
- No raw JavaScript stack traces exposed in the UI
- Errors shown with appropriate visual styling (destructive colors, icons)
- `"Delete failed"` / `"Network error"` used as fallback messages when specific errors are unavailable

## Failure indicators
- Raw `TypeError: Cannot read properties of undefined` visible in the UI
- JSON error objects displayed as `[object Object]`
- Stack traces visible in the canvas debug panel or toast notifications

## Severity rationale
Medium: raw stack traces expose internal paths and implementation details; user-friendly messages are essential for a production tool.

## Source reference
`components/workflow/WorkflowList.tsx` lines 30-32 (error: `d.error ?? "Delete failed"`, line 37: fallback `"Network error"`), lines 55-59 (error banner with `AlertTriangle` icon); `components/workflow/NewWorkflowButton.tsx` line 17 (`toast.error("Failed to create workflow")`).
