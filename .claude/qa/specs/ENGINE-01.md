---
id: ENGINE-01
title: Error edges main-path inactive on throw, error-path gets error object
severity: critical
source_files:
  - lib/workflow-engine.ts
---

## What this tests
Verifies that when a node throws and has a downstream error-typed edge, main-path consumers receive `{ active: false }` (not the error) while error-path consumers receive `{ error: "message" }` — and that without an error edge, exceptions propagate normally.

## Prerequisites
- App is running at http://localhost:3000
- A workflow exists with a node that can be made to throw (e.g. HTTP Request with an invalid URL, or Anthropic node with no key)
- The canvas supports error-typed edges (right-click an edge → toggle to error connection type per CANVAS-18)
- The Debug panel is accessible

## Steps — setup with error edge

1. Create a workflow:
   - **Node A**: HTTP Request pointing at `https://0.0.0.0/` (will throw/timeout)
   - **Node B**: connected to Node A via a **main** edge → Output node A (observes main path)
   - **Node C**: connected to Node A via an **error** edge → Output node B (observes error path)
2. Set timeout to 500ms on Node A to make it fail quickly

## Steps — execution when node throws with error edge present

3. Open the Debug panel and run a test request
4. Observe Node A's trace: it should show an error message
5. Observe Node B (main path): `output` = `active: false` — Node B receives an inactive value, not the error
6. Observe Node C (error path): `output` = `{"error": "...error message..."}` — the error object with an `error` key containing the message string
7. Verify Node C's downstream sees the error object and can process it (e.g. pass through a Template String to extract `{{ $json.error }}`)

## Steps — error edge inactive when source succeeds

8. Configure Node A to succeed (point at a valid URL); re-run
9. Observe Node B (main path): `output` = the Node A response value (active)
10. Observe Node C (error path): `output` = `active: false` — error path is inactive when source succeeds (no error occurred)

## Steps — no error edge: exception propagates

11. Remove the error edge from Node A; keep only the main edge to Node B
12. Configure Node A to throw (invalid URL); run
13. Verify the entire workflow execution fails with Node A's error — the exception propagates and the Debug panel shows the error at the workflow level (not handled gracefully)

## Steps — error object structure

14. With Node A throwing and an error edge present, examine the error path output carefully
15. The value on the error edge is an object: `{"error": "error message string"}` — not just the string itself
16. Verify the `error` key contains the full error message from the node that threw

## Expected result
- Node throws AND has error edge: main-path `cache[key] = { active: false }`; error-path `cache[key:__error__] = { value: { error: "msg" } }`
- Error-path consumer receives `{ error: "message" }` as its input value
- Main-path consumer receives `active: false`
- Node throws AND NO error edge: exception propagates up, workflow fails
- Source succeeds AND error edge exists: error-path consumer gets `active: false`

## Failure indicators
- Main-path consumer receives `{ error: "..." }` instead of `active: false`
- Error-path consumer receives `active: false` when source throws (should get the error object)
- Entire workflow fails even when an error edge is present (exception should be caught)
- Error edge output is a string instead of an object with an `error` key
- Error-path is active when source succeeds (should only be active when source throws)

## Severity rationale
Error edges are the primary mechanism for graceful error handling in workflows; incorrect routing would either expose errors on the main path or silence them on the error path, making recovery impossible.

## Source reference
`lib/workflow-engine.ts` lines 298-312 (catch block: checks for error edges, sets `inactiveResult` on main cache key and `errResult = { value: { error: errMsg } }` on `__error__` key), lines 107-112 (`evalInput` for error-typed edges: reads from `__error__` cache key; returns `active: false` if source succeeded).

## Notes
The error object placed on the error path has the shape `{ error: "message string" }` — it is a plain object, not an `Error` instance. Downstream nodes receiving this on their input handle will see an object; to extract the message, use `{{ $json.error }}` or a Pick node with key `error`. The `connectionType` field on workflow edges distinguishes `"main"` (or absent) from `"error"` edges.
