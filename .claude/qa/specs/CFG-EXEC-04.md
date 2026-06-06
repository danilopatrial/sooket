---
id: CFG-EXEC-04
title: Node output JSON is expandable within execution detail
severity: medium
source_files:
  - components/workflow-config/ExecutionsTab.tsx
---

## What this tests
Within an expanded execution row, each node output entry can be clicked to expand and show the full pretty-printed JSON value.

## Prerequisites
- App is running at http://localhost:3000
- Navigate to the workflow config Executions tab
- At least one execution with non-trivial node outputs exists (e.g. Anthropic response object)

## Steps
1. Click an execution row to expand it
2. Observe the "Node outputs" section with collapsed rows
3. Click a node output row whose value preview ends with "…" (truncated)
4. Observe the full JSON displayed below
5. Click the same row again — verify the JSON collapses

## Expected result
- Collapsed: shows node key (portion before `:` in `nodeKey`), and value preview truncated to 80 chars with "…" if longer; `ChevronRight` icon
- Clicking: `open` toggles; `ChevronDown` appears; a `<pre>` block renders `JSON.stringify(output.value, null, 2)` with monospace font and horizontal scroll
- Objects/arrays are properly indented; null shows as `"null"` string; scalars show as-is (sliced to 80 chars in preview)
- Clicking again collapses the `<pre>` block

## Failure indicators
- Clicking a node output row has no effect (no JSON expansion)
- Full JSON is not pretty-printed (no indentation)
- The `<pre>` block appears but is empty
- Chevron does not change direction on expand/collapse

## Severity rationale
Expandable JSON is the primary way to inspect what a specific node returned in a past execution; missing it forces users to use the debug panel instead.

## Source reference
`components/workflow-config/ExecutionsTab.tsx` lines 65–90 — `NodeOutputRow`: `open` state; preview: `JSON.stringify(output.value).slice(0,80)` + "…" if truncated; expanded `<pre>` shows `JSON.stringify(output.value, null, 2)`. Lines 79–82 — chevron toggles between `ChevronDown` and `ChevronRight`.
