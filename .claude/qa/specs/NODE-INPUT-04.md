---
id: NODE-INPUT-04
title: method output handle returns the HTTP method string
severity: low
source_files:
  - lib/nodes/workflow-input.ts
  - components/canvas/nodes/InputNode.tsx
---

## What this tests
The `method` output handle of the `workflowInput` node returns the HTTP method of the incoming request as an uppercase string (e.g. `"POST"`).

## Prerequisites
- App is running at http://localhost:3000
- Navigate to any workflow canvas at `/workflow/[slug]`
- Connect the `workflowInput` node's `method` output handle to a downstream node
- Open the Debug panel

## Steps
1. Run the workflow via the Debug panel Sandbox tab (which uses POST)
2. Inspect the output of the node receiving the `method` handle

## Expected result
- The value is the string `"POST"` (since all sandbox and live API calls use POST to `/api/v1/chat` or the debug endpoint)
- The value is the raw `ctx.reqCtx.method` string from the request context

## Failure indicators
- The `method` output is `null` or `undefined`
- The method is returned in lowercase

## Severity rationale
Method inspection allows workflows to behave differently based on the HTTP verb; the debug panel always uses POST so testing other methods requires live API calls.

## Source reference
`lib/nodes/workflow-input.ts` lines 18–20 — when `sourceHandle === "method"`: `return { value: ctx.reqCtx.method, ... }`. `components/canvas/nodes/InputNode.tsx` line 13 — `{id: "method", label: "method", desc: "HTTP method"}`.
