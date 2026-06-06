---
id: EDGE-04
title: Null Check node uses static fallback when input is unconnected
severity: medium
source_files:
  - lib/nodes/null-check.ts
  - components/canvas/nodes/NullCheckNode.tsx
  - lib/workflow-engine.ts
---

## What this tests
When a Null Check node's `input` handle has no connected edge, the node treats the value as `undefined` and returns the static text entered in its **Fallback** field rather than propagating `undefined` downstream.

## Prerequisites
- App is running at http://localhost:3000
- A workflow exists with at least one Null Check node on the canvas
- The Null Check node's `input` handle is **not** connected to any upstream node
- The Null Check node's `fallback` handle is also **not** connected
- The Null Check node's **Fallback** text field contains a non-empty value, e.g. `default-value`
- The Null Check node's output is connected to the workflow Output node

## Steps
1. Navigate to the canvas for the workflow (e.g. `/workflow/[slug]`).
2. Confirm that the Null Check node stands alone — no edge enters its **value** (left top) handle.
3. Confirm the **Fallback** field reads `default-value` (or whatever static text was entered).
4. Open the Debug Panel and go to the **Sandbox** tab.
5. Enter any valid JSON body (e.g. `{}`).
6. Click **Send**.
7. Wait for the response to appear.
8. In the execution trace list, click the row for the **Null Check** node to expand it.

## Expected result
- The execution completes without an error.
- The Null Check node's **Output** in the trace shows `default-value` (the static fallback string).
- The overall workflow response contains `default-value` as its output value.

## Failure indicators
- The workflow returns `null`, `undefined`, or an empty value instead of `default-value`.
- The execution trace for the Null Check node shows an error.
- The node crashes the execution rather than falling back gracefully.

## Severity rationale
Fallback behavior on unconnected inputs is a safety mechanism that prevents silent `undefined` propagation through workflows; a regression breaks any workflow that deliberately omits the input handle.

## Source reference
`lib/nodes/null-check.ts` lines 7–26 — when `inputSrc` is `null` (no connected edge), `inputVal` stays `undefined`; since `undefined` satisfies the null check, the node returns `staticFallback` (`node.data.fallback` resolved via `resolveVars`).

## Notes
The `fallback` VarField on the canvas is disabled when the `fallback` handle is connected (`isFallbackConnected`). This test requires the fallback handle to be disconnected so the static field value is used. To test the connected-fallback path, see NODE-LOGIC-14.
