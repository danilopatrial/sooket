---
id: CFG-EXEC-02
title: Click execution row to expand node output detail
severity: high
source_files:
  - components/workflow-config/ExecutionsTab.tsx
---

## What this tests
Clicking an execution row toggles an expanded panel showing per-node output data; each node output row is itself collapsible to show the full JSON value.

## Prerequisites
- App is running at http://localhost:3000
- Navigate to the workflow config Executions tab
- At least one execution with node outputs exists

## Steps
1. Click on an execution row
2. Observe the expanded panel that appears below the row header
3. Verify "Node outputs" section header is visible
4. Verify node output rows are listed with a node key and value preview
5. Click a node output row — verify the full JSON expands below it
6. Click the execution row again — verify the panel collapses

## Expected result
- Clicking the row header: `open` toggles; chevron changes from `ChevronRight` to `ChevronDown`
- Expanded panel shows: "NODE OUTPUTS" header + one `NodeOutputRow` per key in `exec.nodeOutputs`
- Each `NodeOutputRow` (collapsed): node key (portion before `:`, monospace, 120px min-width) + truncated value preview (max 80 chars + "…")
- Clicking a `NodeOutputRow`: expands a `<pre>` showing `JSON.stringify(output.value, null, 2)`
- If `nodeOutputs` is empty: "No node output data captured for this execution." message shown
- Second click on row header collapses the panel

## Failure indicators
- Clicking an execution row has no effect (panel does not expand)
- The "Node outputs" section is absent even when `nodeOutputs` has keys
- Node key or value preview is missing
- Clicking a node output row does not expand its JSON

## Severity rationale
Node output expansion is the primary way to inspect what each step produced; without it, debugging execution failures is impossible.

## Source reference
`components/workflow-config/ExecutionsTab.tsx` lines 92–127 — `ExecutionRow`: `open` state toggled by row click; expanded panel renders `NodeOutputRow` per key or "No node output data" message. Lines 65–90 — `NodeOutputRow`: truncated preview + expandable `<pre>` with `JSON.stringify(output.value, null, 2)`.
