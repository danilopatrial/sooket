---
id: EDGE-01
title: Workflow with only input and output nodes executes gracefully
severity: high
source_files:
  - lib/workflow-engine.ts
  - lib/nodes/workflow-input.ts
---

## What this tests
Verifies that the minimal valid workflow (Input node → Output node, no intermediate nodes) executes successfully and returns the request body as the response — and that a workflow with no edge to the Output node returns an appropriate error rather than crashing.

## Prerequisites
- App is running at http://localhost:3000
- A workflow with only the default Input and Output nodes is available (or can be created)
- A valid API key exists

## Steps — minimal workflow executes

1. Ensure the workflow canvas has only:
   - One **Input** (workflowInput) node
   - One **Output** (workflowOutput) node
   - A single edge connecting Input → Output
2. Send a test request via the Debug panel or live API:
   ```bash
   curl -s -X POST http://localhost:3000/api/v1/chat \
     -H "Authorization: Bearer sk-wf-<key>" \
     -H "Content-Type: application/json" \
     -d '{"message": "hello"}'
   ```
3. Verify the response: `{ "reply": {"message": "hello"} }` — the request body is returned verbatim
4. Verify no error occurs; execution trace shows the Input node and Output node

## Steps — Output node not connected returns error

5. Remove the edge between Input and Output (disconnect the Output node)
6. Send a request — expect the workflow execution to return: `{ "error": "No output node is connected" }` with HTTP 400 (no active path reached output)
7. Verify the server does not crash or hang

## Steps — correct input node output

8. The Input node (workflowInput) with no specific `sourceHandle` returns `ctx.body` (the full JSON request body)
9. Verify this by sending `{"foo": "bar", "nested": {"key": 1}}` — response is the same object returned in `reply`

## Steps — Debug panel for minimal workflow

10. Open the Debug panel; enter body `{"test": 123}` and run
11. Execution trace should show the Input node completed successfully and the Output node received `{"test": 123}`
12. No error in the trace

## Expected result
- Input → Output with an edge: response = `{ "reply": <request body> }` (HTTP 200)
- No edge to Output: `{ "error": "No output node is connected" }` (HTTP 400 — `result: null`)
- No intermediate processing nodes are required for a valid execution
- Execution completes in < 100ms (no external calls needed)

## Failure indicators
- Minimal workflow throws an unhandled exception
- Response is empty or malformed JSON
- Disconnected Output produces a 500 instead of 400
- Input node returns `undefined` instead of the request body

## Severity rationale
High: the minimal workflow is the baseline test for the entire execution engine; if it fails, no workflow can execute correctly.

## Source reference
`lib/nodes/workflow-input.ts` line 27 (`return { value: ctx.body, ... }` — default handle returns full request body); `lib/workflow-engine.ts` lines 402-406 (output node check: `outputEdges.length === 0 → return { result: null, error: "No output node is connected" }`).
