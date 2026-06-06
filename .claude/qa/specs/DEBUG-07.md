---
id: DEBUG-07
title: Execution error is surfaced in the debug panel with error message
severity: high
source_files:
  - components/canvas/DebugPanel.tsx
  - app/api/workflows/[slug]/debug/route.ts
---

## What this tests
When a workflow execution fails (e.g. a node throws, missing API key, network error), the debug panel shows an error indicator and the error message text instead of an output value.

## Prerequisites
- App is running at http://localhost:3000
- Navigate to any workflow canvas at `/workflow/[slug]` that will produce an error (e.g. an Anthropic node without a provider key configured, or a Custom Code node with `throw new Error("test")`)
- Open the Debug panel

## Steps
1. Set up a workflow that will fail during execution
2. Click the Run button
3. Observe the Output section of the result

## Expected result
- The "Output" section header shows an `AlertCircle` red icon instead of a `CheckCircle2` green icon
- A red box (`bg-red-500/10 border border-red-500/20`) appears containing the error message text in monospace red (`text-red-300 font-mono`)
- No output `<pre>` block is shown
- Node trace rows still appear (if the execution got that far); any node that failed shows `AlertCircle` red icon in its trace row
- The overall `result.ok` is `false`

## Failure indicators
- An error in execution shows a green checkmark instead of red alert icon
- The error message text is not displayed (blank output section)
- A JavaScript exception crashes the panel instead of displaying the error gracefully
- The panel shows a raw stack trace or `[object Object]` instead of the error message

## Severity rationale
Clear error surfacing is essential for debugging; if errors are swallowed or displayed incorrectly, users cannot understand what went wrong.

## Source reference
`components/canvas/DebugPanel.tsx` lines 570–590 — when `result` is set: if `result.ok` is false, shows `AlertCircle` (line 577); if `result.error` is set, renders a red box with `result.error` text (lines 579–582); otherwise renders a `<pre>` with `result.output`. Lines 420–424 — network-level errors set `result = {ok: false, error: String(err), traces: []}`.
