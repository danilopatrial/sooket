---
id: ENGINE-06
title: Error workflow triggered on parent workflow failure
severity: high
source_files:
  - lib/workflow-engine.ts
---

## What this tests
Verifies that when a workflow has an assigned error workflow (`errorWorkflowId`) and execution throws an uncaught exception, the engine calls `triggerErrorWorkflow` with a synthetic body containing the error message and source workflow ID — and that the error workflow itself cannot trigger a further error workflow (infinite-loop guard).

## Prerequisites
- App is running at http://localhost:3000
- Two workflows exist: a **source workflow** (configured to fail) and an **error workflow** (configured to handle errors)
- The source workflow has an error workflow assigned (via Config → General Tab → error workflow assignment)
- The Debug panel is accessible

## Steps — assigning an error workflow

1. Navigate to the source workflow's Config panel → **General** tab
2. In the **Error Workflow** section, select the error workflow from the dropdown
3. Save the configuration

## Steps — execution with failure and error workflow

4. Configure the source workflow to throw an uncaught exception (e.g. an Anthropic node with a missing API key, with no error edge to catch it)
5. Trigger an execution via the Live API endpoint (`POST /api/v1/chat`) with a valid API key
6. The source workflow fails; the error workflow is triggered automatically

## Steps — verifying the error workflow receives correct context

7. Configure the error workflow to log or return its input body
8. Check the error workflow's execution logs — it should have been called with a body of the form:
   ```json
   {
     "error": "No Anthropic API key configured for this workflow",
     "workflow": { "id": 42 },
     "timestamp": "2025-01-15T12:00:00.000Z"
   }
   ```
9. Verify the `error` field contains the original exception message
10. Verify the `workflow.id` matches the source workflow's integer ID
11. Verify `timestamp` is a valid ISO 8601 datetime string
12. Verify the request context used is `method: "INTERNAL"` (not a real HTTP request)

## Steps — infinite-loop guard

13. Assign an error workflow to the **error workflow itself** (attempt to set `errorWorkflowId` on the error workflow)
14. Trigger the source workflow to fail again
15. Verify the error workflow executes but does NOT trigger a further error workflow (the guard `if (errorWf.errorWorkflowId != null) return` prevents chaining)

## Steps — error workflow failure is silently swallowed

16. Configure the error workflow to also throw an exception
17. Trigger the source workflow to fail
18. Verify the original error is still returned to the API caller (the error workflow's failure does not override the original error response)
19. The API response still reflects the source workflow's error

## Steps — no error workflow assigned

20. Remove the error workflow assignment from the source workflow
21. Trigger a failure — no error workflow is called; execution returns the error normally

## Expected result
- Error workflow triggered when: source workflow has `errorWorkflowId` set AND an uncaught exception occurs
- Synthetic body: `{ error: "message", workflow: { id: <integer> }, timestamp: "<ISO string>" }`
- Request context: `method: "INTERNAL"`, empty URL and IP
- Error workflow with its own `errorWorkflowId`: second-level trigger is prevented (silent return)
- Error workflow's own failure: swallowed, does not override the original error
- Error workflow not found: silently skipped

## Failure indicators
- Error workflow not called when source workflow fails (and `errorWorkflowId` is set)
- Error workflow receives a body without `error`, `workflow`, or `timestamp` fields
- Error workflow with its own `errorWorkflowId` triggers a chain of error workflows (infinite loop guard not working)
- Error workflow failure propagates to the API caller (should be swallowed)
- `workflow.id` in the synthetic body is a string instead of the integer workflow ID

## Severity rationale
The error workflow pattern is the primary monitoring and alerting mechanism; a broken trigger means failures are silently unhandled.

## Source reference
`lib/workflow-engine.ts` lines 361-388 (`triggerErrorWorkflow`: not-found guard, infinite-loop guard `errorWf.errorWorkflowId != null`, synthetic body construction, `executeWorkflow` call with INTERNAL context), lines 428-433 (call site: `workflow.errorWorkflowId != null` check, swallowed catch).

## Notes
The error workflow is looked up by ID (`adapter.getWorkflowById(sourceWorkflow.errorWorkflowId!)`) not by slug. The synthetic body is also used as the raw body string via `JSON.stringify(syntheticBody)`. Error workflow execution uses `subDepth = 0` (fresh depth counter, not inheriting from any parent call depth).
