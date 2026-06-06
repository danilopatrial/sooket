---
id: CONTRACT-DBG-02
title: POST debug with __nodes/__edges overrides saved workflow
severity: high
source_files:
  - app/api/workflows/[slug]/debug/route.ts
---

## What this tests
Verifies that passing `__nodes` and `__edges` in the debug request body causes the endpoint to execute against the supplied graph instead of the workflow's saved nodes and edges.

## Prerequisites
- App is running at http://localhost:3000
- At least one workflow exists with a known slug (referred to as `<slug>` below)
- The workflow has a saved graph that differs from the override graph used in the test

## Steps
1. Construct a minimal override graph — two nodes (a `workflowInput` and an `output`) connected by one edge. For example, supply a Text node that emits a fixed string `"override-value"` connected to the output node.
2. Send a POST request that includes `__nodes` and `__edges` alongside a user payload:
   ```
   curl -s -X POST http://localhost:3000/api/workflows/<slug>/debug \
     -H "Content-Type: application/json" \
     -d '{
       "__nodes": [
         {"id":"n1","type":"workflowInput","data":{},"position":{"x":0,"y":0}},
         {"id":"n2","type":"text","data":{"text":"override-value"},"position":{"x":200,"y":0}},
         {"id":"n3","type":"output","data":{},"position":{"x":400,"y":0}}
       ],
       "__edges": [
         {"id":"e1","source":"n2","target":"n3","sourceHandle":"output","targetHandle":"input"}
       ],
       "message": "original-payload"
     }' | python3 -m json.tool
   ```
3. Inspect the `output` field of the response.
4. Verify the `traces` array contains entries for the nodes supplied in `__nodes`, not the nodes stored in the database.

## Expected result
- HTTP status code is `200`.
- `ok` is `true`.
- `output` reflects the result of executing the override graph (e.g., `"override-value"`), not the saved workflow's graph.
- The `__nodes` and `__edges` keys do not appear in the trace `inputSnapshot` — the internal keys are stripped from the body passed to the workflow engine.

## Failure indicators
- `ok` is `false`.
- `output` matches the result of the saved (not the override) workflow, indicating `__nodes`/`__edges` were ignored.
- The response contains a 404 or 500 status.
- `__nodes` or `__edges` appear verbatim in any trace `inputSnapshot` (they should be stripped from the body).

## Severity rationale
The override mechanism is what makes the debug sandbox reflect unsaved canvas edits; if it falls back silently to the saved state, users test the wrong workflow.

## Source reference
`app/api/workflows/[slug]/debug/route.ts` lines 51–56 — `nodes: Array.isArray(__nodes) ? __nodes : JSON.parse(workflowRow.nodes)` and `resolvedEdges` selection shows the override path.  
Lines 47–49 — `rawBody` is re-derived as `JSON.stringify(body)` (without `__nodes`/`__edges`) when either override key is present.

## Notes
The override applies only for the duration of this single request; the database record is not modified.
