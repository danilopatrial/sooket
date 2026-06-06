---
id: CONTRACT-WF-08
title: PATCH workflow assigns error workflow via errorWorkflowId
severity: medium
source_files:
  - app/api/workflows/[slug]/route.ts
---

## What this tests
PATCH /api/workflows/[slug] with an `errorWorkflowId` field stores it as `error_workflow_id` in the database and returns `{ok: true}`.

## Prerequisites
- App is running at http://localhost:3000
- At least two workflows exist; note their slugs (e.g. `SLUG_A` for the target, `SLUG_B` for the error workflow)
- Obtain the numeric `id` of `SLUG_B` by querying GET /api/workflows/[SLUG_B] first

## Steps
1. Get the id of the error workflow:
   ```
   curl -s http://localhost:3000/api/workflows/SLUG_B
   ```
   Note the returned `id` value (e.g. `2`).

2. Assign it as the error workflow for SLUG_A:
   ```
   curl -s -X PATCH http://localhost:3000/api/workflows/SLUG_A \
     -H "Content-Type: application/json" \
     -d '{"errorWorkflowId": 2}'
   ```

3. Verify the assignment was persisted by fetching SLUG_A via debug or direct DB inspection (the GET /api/workflows/[slug] response does not expose `errorWorkflowId`, so use a subsequent PATCH with `{"errorWorkflowId": null}` and confirm it still returns `{ok: true}` to show the field is accepted in both directions).

## Expected result
- Step 2 returns HTTP 200 with body `{"ok":true}`.
- The `error_workflow_id` column for SLUG_A is set to the provided numeric id in the SQLite database.
- Passing `{"errorWorkflowId": null}` in a follow-up PATCH also returns HTTP 200 `{"ok":true}` and clears the assignment (because the handler uses `body.errorWorkflowId ?? null`).

## Failure indicators
- Response status is not 200.
- Response body does not contain `{"ok":true}`.
- Passing `{"errorWorkflowId": null}` returns an error instead of succeeding.
- The field is ignored when `errorWorkflowId` is present in the request body.

## Severity rationale
Error workflow assignment is a correctness feature (not a security or availability concern), so medium severity is appropriate.

## Source reference
`app/api/workflows/[slug]/route.ts` line 77 — `if ("errorWorkflowId" in body) { sets.push("error_workflow_id = ?"); values.push(body.errorWorkflowId ?? null); }`

## Notes
The handler uses the `in` operator (not a truthiness check), so passing `{"errorWorkflowId": null}` explicitly is a valid way to clear the assignment. A missing `errorWorkflowId` key is ignored entirely and does not touch the column.
