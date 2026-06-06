---
id: DEBUG-06
title: Partial re-run from a specific node trace row
severity: medium
source_files:
  - components/canvas/DebugPanel.tsx
  - app/api/workflows/[slug]/debug/route.ts
---

## What this tests
After a successful run, clicking "Re-run from here" on a trace row re-executes the workflow starting from that node, using the previous execution's outputs as pinned data for all ancestor nodes (so they are not re-evaluated).

## Prerequisites
- App is running at http://localhost:3000
- Navigate to any workflow canvas with multiple nodes connected in series
- Open the Debug panel, run a test request, and obtain a successful result with at least two trace rows

## Steps
1. Expand a non-first trace row (e.g. a middle node like Template String or If)
2. Click the "Re-run from here" button (`CornerDownRight` icon) at the bottom of the expanded row
3. Observe the run behavior and the resulting trace

## Expected result
- A new run is triggered via `POST /api/workflows/[slug]/debug` with `__startNodeId` set to the clicked node's ID
- The debug route fetches the most recent execution's `execution_data`, extracts ancestor node outputs, and pins them as ephemeral `pinData`
- Ancestor nodes (upstream of the start node) appear in the trace with `pinned: true` — they do not re-execute
- The start node and its descendants execute fresh
- The result reflects only the downstream portion of the workflow

## Failure indicators
- Clicking "Re-run from here" triggers a full re-run (all nodes re-execute including ancestors)
- Ancestor nodes are not shown as pinned in the trace
- The "Re-run from here" button has no effect
- An error occurs because no prior execution data exists

## Severity rationale
Partial re-run enables fast iteration when debugging a specific node without waiting for all upstream nodes to re-execute (especially costly Anthropic calls).

## Source reference
`components/canvas/DebugPanel.tsx` lines 472–477 — `rerunTriggerRef.current` is set to call `handleRun(nodeId)`, passing the `nodeId` as `__startNodeId`. Lines 290–299 — "Re-run from here" button in expanded `TraceRow` calls `onRerunFrom()`. `app/api/workflows/[slug]/debug/route.ts` lines 65–96 — when `startNodeId` is set, calls `findAncestors()`, fetches the last execution's `execution_data`, and pins ancestor node outputs as ephemeral `pinData` so they are skipped during re-execution.
