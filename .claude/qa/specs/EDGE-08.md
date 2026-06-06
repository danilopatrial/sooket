---
id: EDGE-08
title: A/B Split invalid weights show red warning and error on execution
severity: medium
source_files:
  - components/canvas/nodes/ABSplitNode.tsx
  - lib/nodes/ab-split.ts
---

## What this tests
When an A/B Split node's branch weights do not sum to 100%, the canvas shows a red "≠ 100" indicator, and executing the workflow throws a descriptive error rather than silently misbehaving.

## Prerequisites
- App is running at http://localhost:3000
- A workflow exists with an A/B Split node on the canvas
- The A/B Split node has its input connected and at least one output branch connected to an Output node

## Steps

### Part A — Canvas warning
1. Navigate to the canvas for the workflow.
2. Click the A/B Split node to select it.
3. Change branch A's weight to `30` and branch B's weight to `50` (total = 80, not 100).
4. Observe the weight total indicator at the bottom of the node body.

### Part B — Execution error
5. Open the **Debug Panel** and go to the **Sandbox** tab.
6. Enter a simple JSON body, e.g. `{"x": 1}`.
7. Click **Send**.
8. Observe the response in the debug panel.

## Expected result

**Part A:** The weight total indicator displays `80% ≠ 100` in red (`text-red-400/80`). When weights are valid (sum = 100), the same indicator shows the total in green (`text-green-400/60`) with no "≠ 100" suffix.

**Part B:** The execution returns `{"ok": false, "error": "A/B Split: branch weights must sum to 100 (currently 80)", ...}`. The `traces` array is present. No output is produced by the A/B Split node.

## Failure indicators
- Part A: The total indicator remains green or does not append "≠ 100" when the sum is not 100.
- Part A: The indicator shows the wrong total value.
- Part B: The execution succeeds (routes to a branch) despite invalid weights.
- Part B: The error message is missing or does not include the current total (e.g. "currently 80").
- Part B: The server returns HTTP 500 instead of a structured `{ ok: false, error: "..." }` response.

## Severity rationale
Invalid weights that execute silently would produce statistically incorrect traffic routing; the explicit error forces operators to fix the configuration before the workflow is used.

## Source reference
`components/canvas/nodes/ABSplitNode.tsx` lines 52–53 and 173–179 — `weightValid = totalWeight === 100`; when false, the indicator renders in `text-red-400/80` with the suffix `" ≠ 100"`. `lib/nodes/ab-split.ts` lines 20–23 — executor checks `if (totalWeight !== 100)` and throws `"A/B Split: branch weights must sum to 100 (currently ${totalWeight})"`.

## Notes
Each weight input is clamped to `[0, 100]` per `updateWeight` in the node component (`Math.max(0, Math.min(100, parsed))`), so individual weights can never exceed 100, but their sum can be anything from 0 to 800 (with up to 8 branches).
