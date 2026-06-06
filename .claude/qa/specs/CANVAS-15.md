---
id: CANVAS-15
title: Disabled node is visually dimmed and passes through input unchanged
severity: high
source_files:
  - components/canvas/WorkflowCanvas.tsx
  - lib/workflow-engine.ts
---

## What this tests
A node toggled to disabled via the right-click context menu renders at 40% opacity on the canvas, and during execution passes its first upstream input through unchanged instead of running its own logic.

## Prerequisites
- App is running at http://localhost:3000
- Navigate to any workflow canvas at `/workflow/[slug]`
- A non-input node exists on the canvas (e.g. a Template String or If node) with an upstream connection

## Steps
1. Right-click a node to open its context menu
2. Click "Disable node"
3. Observe the node's appearance on the canvas
4. Open the Debug panel and send a test request that routes through the disabled node
5. Inspect the execution trace for the disabled node's row

## Expected result
- After disabling: the node renders with `opacity: 0.4` (visually dimmed compared to normal nodes)
- The context menu item changes to "Enable node" when the node is already disabled
- In the execution trace: the disabled node's row shows `disabled: true`; its `inputSnapshot` and `outputSnapshot` are both `"null"`; its `durationMs` is `0`
- The value returned by the disabled node equals the value received from its first upstream connected edge (pass-through), not the result of the node's own logic

## Failure indicators
- Disabled node appears at full opacity (no visual distinction)
- Context menu shows "Disable node" even when the node is already disabled
- Disabled node executes its own logic instead of passing through
- The execution trace does not mark the node as `disabled: true`

## Severity rationale
Disabled nodes are used during debugging to bypass steps without deleting them; incorrect behavior silently alters workflow logic.

## Source reference
`components/canvas/WorkflowCanvas.tsx` lines 625–634 — `isDisabledNode` check applies `opacity: 0.4` style; lines 1183–1203 — context menu toggles `disabled` flag via `setNodes`. `lib/workflow-engine.ts` lines 266–284 — when `node.disabled`, engine finds the first upstream main-type edge, evaluates it as the passthrough result, and pushes a trace entry with `disabled: true, durationMs: 0`.
