---
id: NODE-INPUT-01
title: workflowInput default output carries the parsed request body
severity: critical
source_files:
  - lib/nodes/workflow-input.ts
  - components/canvas/nodes/InputNode.tsx
---

## What this tests
The default (unnamed) output handle of the `workflowInput` node returns the parsed JSON request body (`ctx.body`) — the primary data payload passed to the workflow.

## Prerequisites
- App is running at http://localhost:3000
- Navigate to any workflow canvas at `/workflow/[slug]`
- Open the Debug panel (Sandbox tab)

## Steps
1. Ensure the `workflowInput` node's primary output handle is connected to a downstream node (e.g. a Text node or Output node)
2. Enter a JSON body in the Debug panel: `{"message": "hello"}`
3. Click Run
4. Expand the `workflowInput` trace row
5. Observe the Output snapshot

## Expected result
- The `workflowInput` trace row's Output shows the full parsed request body: `{"message": "hello"}`
- Downstream nodes that receive input from the default output handle receive the parsed JSON object (not a string)
- When no specific `sourceHandle` is matched (headers, query, method, raw, ip), the execution falls through to `return { value: ctx.body, ... }`

## Failure indicators
- The workflowInput output shows `null` or an empty object when the body is `{"message": "hello"}`
- The body is received as a string instead of a parsed object
- Downstream nodes receive `undefined`

## Severity rationale
The request body is the primary data source for all workflow processing; if the default output is wrong, the entire workflow pipeline is broken.

## Source reference
`lib/nodes/workflow-input.ts` line 27 — default case `return { value: ctx.body, inputTokens: 0, outputTokens: 0 }` when no specific `sourceHandle` matches. `components/canvas/nodes/InputNode.tsx` lines 11–15 — additional named output handles: headers, query, method, raw, ip.
