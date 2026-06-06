---
id: DEBUG-02
title: Send a test request in Sandbox tab and see execution result
severity: critical
source_files:
  - components/canvas/DebugPanel.tsx
  - app/api/workflows/[slug]/debug/route.ts
---

## What this tests
Entering a JSON body in the Sandbox tab and clicking Run sends a POST to the debug endpoint using the current canvas nodes/edges, then displays the result and per-node execution trace.

## Prerequisites
- App is running at http://localhost:3000
- Navigate to any workflow canvas at `/workflow/[slug]`
- Open the Debug panel (click the Bug icon)
- The "sandbox" tab is active (default)

## Steps
1. Verify the body input is pre-filled with `{"messages": [{"role": "user", "content": "Hello"}]}`
2. Click the Run button (▶ icon, top-right of the panel header, Sandbox tab only)
3. Observe the panel while the request is in flight
4. Observe the result section that appears after completion

## Expected result
- While running: the Run button shows a `RefreshCw` spinner and is disabled
- After success: a result panel appears showing:
  - The final output value (formatted JSON)
  - A list of per-node trace rows (one per node that executed), each showing: node type label, duration in ms, and a chevron to expand input/output snapshots
- The POST request goes to `/api/workflows/[slug]/debug` with the body including the current `__nodes` and `__edges` arrays from the canvas alongside the user's JSON payload

## Failure indicators
- Clicking Run has no effect (no spinner, no result)
- The result panel does not appear after the request completes
- Node trace rows are absent from the result
- The request fails with an error (e.g. "Workflow not found")

## Severity rationale
The sandbox run is the primary way to test a workflow during development; without it, there is no way to validate behavior without a live API key.

## Source reference
`components/canvas/DebugPanel.tsx` lines 396–427 — `handleRun()` parses `inputJson`, posts to `/api/workflows/${slug}/debug` with `{...body, __nodes, __edges, __headers?, __query?, __startNodeId?}`, stores result in `result` state. `app/api/workflows/[slug]/debug/route.ts` lines 14–30 — POST handler fetches the workflow, merges `__nodes`/`__edges` overrides from the body, executes via `executeWorkflow()`, and returns `{ok, output, traces}`.
