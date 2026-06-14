---
id: ENGINE-11
title: Recursion depth guard aborts a too-deep workflow with 400
severity: high
source_files:
  - lib/workflow-engine.ts
  - lib/execution-handler.ts
  - lib/workflow-types.ts
---

## What this tests
Verifies that a workflow whose active path is deeper than the recursion limit (`EXECUTION_MAX_DEPTH`, default 1000 nodes) is aborted with a `WorkflowDepthError` *before* the JS call stack overflows, that the live API maps it to HTTP `400` with a message containing "depth exceeded", and that the limit is terminal — not absorbed by an error edge. Cycle detection only catches *circular* references; this guard covers a legitimately deep *acyclic* chain (e.g. a generated workflow) that would otherwise crash the process with a `RangeError: Maximum call stack size exceeded`.

## Prerequisites
- App is running at http://localhost:3000
- A valid workflow API key (`sk-wf-...`) for an active workflow
- A way to produce a deep linear chain of nodes (e.g. import a workflow JSON with a long `txt → null-check → null-check → … → output` chain) and to set `EXECUTION_MAX_DEPTH` for the server process

## Steps
1. Start the server with a small limit so it is easy to hit:
   ```
   EXECUTION_MAX_DEPTH=50 npm run dev
   ```
2. Build/import a workflow whose active path from the Output node back to its source exceeds 50 nodes (a long chain of pass-through nodes).
3. Call the live API:
   ```bash
   curl -s -X POST http://localhost:3000/api/v1/chat \
     -H "Authorization: Bearer sk-wf-..." \
     -H "Content-Type: application/json" -d '{"message":"deep"}'
   ```
4. Inspect the HTTP status and JSON error body.
5. Restart with the default (unset) and a chain of, say, ~3000 nodes; confirm the request still returns a clean error (400) and the **server process does not crash** (no `RangeError`/stack-overflow exit).
6. Restart with `EXECUTION_MAX_DEPTH=0` (disabled) and a chain comfortably within the stack budget; confirm it runs to completion (200) — proving the limit is what aborts in steps 3–5, not some other failure.

## Expected result
- Step 3/4: HTTP **400** with `{ "error": "Workflow execution depth exceeded (max 50)" }` (message contains "depth exceeded").
- Step 5: HTTP **400** with the same shape; the Node process stays up and continues serving (no crash, no `RangeError` surfaced or logged as a fatal).
- Step 6: with the guard disabled, a within-stack workflow returns **200**.
- The depth abort is terminal: an error edge on a node along the chain does **not** catch it and resume the graph.

## Failure indicators
- A deep workflow crashes the server (`RangeError: Maximum call stack size exceeded`) or returns `500`/hangs instead of a clean `400`.
- The depth error is caught by an error edge and the workflow continues.
- `EXECUTION_MAX_DEPTH=0` still aborts a within-stack workflow (disable ignored).
- The limit applies per sub-workflow instead of across the whole execution (a chain of sub-workflows could still overflow).

## Severity rationale
An unbounded recursive evaluator lets a pathological or generated workflow crash the entire single-process instance with a stack overflow, taking down every caller; high because it directly affects availability and is reachable by anyone who can save a workflow.

## Source reference
`lib/workflow-engine.ts` — `executionMaxDepth()` resolves the limit (`EXECUTION_MAX_DEPTH`, default `DEFAULT_MAX_EXECUTION_DEPTH` = 1000; `0`/negative disables); `executeWorkflow` arms `reqCtx.maxDepth` for the top-level run (`subDepth === 0`); `evaluateNode` throws `WorkflowDepthError` when `visiting.size >= reqCtx.maxDepth` (the `visiting` set holds exactly the ancestors on the active path, so its size is the live recursion depth); the node `catch` re-throws `WorkflowDepthError` before any error-edge routing. `lib/execution-handler.ts` maps `error.includes(WORKFLOW_DEPTH_ERROR)` to status `400`.

## Notes
The guard counts *path depth* (the vertical recursion), not total node count — a wide, shallow fan-out is bounded instead by the execution deadline (ENGINE-09) and the concurrency cap (ENGINE-07). Sub-workflows inherit the parent's `maxDepth` through the shared `reqCtx`, so a chain of nested sub-workflows is bounded by the same limit across the whole execution (independent of the separate sub-workflow recursion cap of 5). Deterministic code-level coverage — including a 3000-deep chain that returns a clean error instead of a `RangeError` — is in `__tests__/lib/workflow-engine-depth.test.ts`, and the 400 mapping in `__tests__/api/chat.test.ts`.
