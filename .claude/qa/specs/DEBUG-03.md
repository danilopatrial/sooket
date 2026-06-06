---
id: DEBUG-03
title: Node-level execution trace rows are displayed and expandable
severity: high
source_files:
  - components/canvas/DebugPanel.tsx
---

## What this tests
After a sandbox run completes, each executed node appears as a collapsible trace row showing its type label, output preview, and duration; clicking a row expands it to reveal Input and Output panels plus "Re-run from here" and Pin/Unpin actions.

## Prerequisites
- App is running at http://localhost:3000
- Navigate to any workflow canvas at `/workflow/[slug]`
- Open the Debug panel; run a test request so a result is present

## Steps
1. After a successful run, observe the list of trace rows below the result output
2. Verify each row shows: a chevron icon, a success (`CheckCircle2` green) or error (`AlertCircle` red) icon, the node type label, a truncated output preview, and duration in ms
3. Click a trace row to expand it
4. Verify the expanded section shows "Input" and "Output" panels side-by-side with formatted JSON
5. Verify the expanded section also shows the node ID and "Re-run from here" button
6. Click the trace row header again — verify it collapses

## Expected result
- Each `NodeTraceEntry` in the result renders as a `TraceRow` with collapsed state by default
- Collapsed row: `ChevronRight` → expands; `CheckCircle2` (green, `text-emerald-500/60`) for success; `AlertCircle` (red, `text-red-400`) for error; node type label (max 28 char truncated), output snapshot preview (max 60 chars + "…"), duration in ms
- Clicking a row: toggles `expanded` state; highlights the corresponding node on the canvas (violet glow)
- Expanded row: two-column grid with "INPUT" and "OUTPUT" labels; pre-formatted JSON in monospace; node ID; "Re-run from here" button; Pin/Unpin button
- If the trace has an error: a red error box appears above the Input/Output grid

## Failure indicators
- No trace rows appear after a successful run
- Clicking a trace row does not expand it
- Expanded section is missing Input or Output panels
- Duration shows `undefined` or `NaN` instead of a number
- Error traces do not show the red error indicator or error message

## Severity rationale
Trace rows are how users diagnose which node produced a given output or error; without them the debug panel is blind.

## Source reference
`components/canvas/DebugPanel.tsx` lines 206–338 — `TraceRow` component: collapsed header (lines 233–263) shows chevron, status icon, `nodeTypeLabel(trace.nodeType)`, output preview, `durationMs`. Expanded body (lines 265–338): error box when `hasError`, Input/Output two-column pre blocks using `formatSnapshot()`, node ID, Re-run and Pin buttons.
