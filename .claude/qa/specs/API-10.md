---
id: API-10
title: Error workflow invoked on execution failure
severity: high
source_files:
  - app/api/v1/chat/route.ts
---

## What this tests
Verifies that when a workflow execution throws an uncaught error at `POST /api/v1/chat` and the workflow has an `errorWorkflowId` assigned, the error workflow is triggered with a synthetic body — and that the original error response is still returned to the caller.

## Steps — setup

1. Create an **error workflow** that logs or returns its input body
2. Assign it to the **source workflow** via Config → General → Error Workflow dropdown
3. Configure the source workflow to throw an uncaught exception (e.g. an Anthropic node with a missing API key and no error edge)

## Steps — triggering and verifying

4. Send a POST request to the source workflow via the live API:
   ```bash
   curl -si -X POST http://localhost:3000/api/v1/chat \
     -H "Authorization: Bearer sk-wf-<key>" \
     -H "Content-Type: application/json" \
     -d '{"message": "trigger error"}'
   ```
5. Verify the response: HTTP **500** with body `{ "error": "..." }` (the source workflow's error message)
6. Check the **error workflow's** execution logs — it should have been triggered with a synthetic body:
   ```json
   {
     "error": "<source workflow error message>",
     "workflow": { "id": <integer> },
     "timestamp": "<ISO 8601 string>"
   }
   ```

## Steps — error workflow failure is swallowed

7. Configure the error workflow to also throw an exception
8. Re-trigger the source workflow failure
9. Verify the API caller still receives the original 500 error (error workflow's failure is silently swallowed — does not replace the original error)

## Steps — no error workflow assigned

10. Remove the error workflow assignment; re-trigger the source failure
11. Verify only 500 is returned; no secondary workflow execution occurs

## Expected result
- Source workflow fails + `errorWorkflowId` set: error workflow triggered asynchronously with `{ error, workflow: { id }, timestamp }`
- Original 500 response is returned to the caller regardless of error workflow outcome
- Error workflow failure is swallowed (`try { await triggerErrorWorkflow() } catch { /* swallow */ }`)
- No `errorWorkflowId` set: no error workflow triggered

## Failure indicators
- Error workflow not triggered when source fails
- Error workflow triggered when source succeeds
- Error workflow failure returns a different error to the caller (swallow not working)
- Error workflow receives a body without `workflow.id` or `timestamp` fields

## Severity rationale
Error workflows are the monitoring/alerting hook; a broken trigger means production failures are silently unobserved.

## Source reference
`app/api/v1/chat/route.ts` lines 428-433 (catch block in `executeWorkflow` call: `if (workflow.errorWorkflowId != null) { try { await triggerErrorWorkflow(...) } catch { /* swallow */ } }`), line 148 (`if (error) return corsJson({ error }, 500)` — original error returned).

## Notes
See ENGINE-06 for the full `triggerErrorWorkflow` implementation details (synthetic body shape, INTERNAL request context, infinite-loop guard).
