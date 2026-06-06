---
id: NODE-INPUT-05
title: raw output handle returns the raw request body string
severity: low
source_files:
  - lib/nodes/workflow-input.ts
  - components/canvas/nodes/InputNode.tsx
---

## What this tests
The `raw` output handle of the `workflowInput` node returns the raw request body as a string before JSON parsing, useful for binary-safe access or when the body is not JSON.

## Prerequisites
- App is running at http://localhost:3000
- Navigate to any workflow canvas at `/workflow/[slug]`
- Connect the `workflowInput` node's `raw` output handle to a downstream node
- Open the Debug panel

## Steps
1. In the Debug panel body textarea, enter `{"test": "value"}`
2. Run the workflow
3. Inspect the output of the node receiving the `raw` handle

## Expected result
- The value is the raw string: `'{"test": "value"}'` (the original text, not a parsed object)
- For binary content, the value would be the binary string representation
- The raw body is `ctx.reqCtx.rawBody` from the request context

## Failure indicators
- The `raw` output is `null` or `undefined`
- The value is a parsed JavaScript object instead of a string

## Severity rationale
Raw body access is needed when processing non-JSON content types or verifying request signatures; without it, binary or non-JSON workflows cannot access the original payload.

## Source reference
`lib/nodes/workflow-input.ts` lines 21–23 — when `sourceHandle === "raw"`: `return { value: ctx.reqCtx.rawBody, ... }`. `components/canvas/nodes/InputNode.tsx` line 14 — `{id: "raw", label: "raw", desc: "body as text"}`.
