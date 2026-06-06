---
id: CONTRACT-DBG-03
title: POST debug with __startNodeId performs partial re-run
severity: high
source_files:
  - app/api/workflows/[slug]/debug/route.ts
---

## What this tests
Verifies that supplying `__startNodeId` in the debug request body causes the endpoint to pin all ancestor nodes using the last execution's cached outputs, so only nodes at and after the start node are re-executed.

## Prerequisites
- App is running at http://localhost:3000
- A workflow exists with a known slug (referred to as `<slug>`) that has at least two nodes in sequence: an upstream node (referred to as `<upstream-id>`) and a downstream node (referred to as `<start-id>`)
- The workflow has at least one prior completed execution logged in the database (run a debug request without `__startNodeId` first to create one)

## Steps
1. First, run a full debug execution to create an execution record:
   ```
   curl -s -X POST http://localhost:3000/api/workflows/<slug>/debug \
     -H "Content-Type: application/json" \
     -d '{"message": "initial run"}' > /dev/null
   ```
2. Send a partial re-run request targeting a downstream node:
   ```
   curl -s -X POST http://localhost:3000/api/workflows/<slug>/debug \
     -H "Content-Type: application/json" \
     -d '{
       "__startNodeId": "<start-id>",
       "message": "partial run"
     }' | python3 -m json.tool
   ```
3. Inspect the `traces` array in the response.
4. Check whether the trace entry for the upstream ancestor node (`<upstream-id>`) has `"pinned": true`.
5. Check whether the trace entry for `<start-id>` has `"pinned": false` (it should have re-executed).

## Expected result
- HTTP status code is `200`.
- `ok` is `true`.
- The `traces` array contains an entry for the ancestor node (`<upstream-id>`) with `"pinned": true`, indicating it was skipped and its output was sourced from the prior execution's cache.
- The trace entry for `<start-id>` has `"pinned": false` and a non-null `durationMs`, indicating it was re-executed.

## Failure indicators
- `ok` is `false`.
- No trace entry has `"pinned": true` — this means ancestor pinning did not occur and the full workflow re-ran.
- The response returns 404 or 500.
- `traces` is absent or empty.

## Severity rationale
Partial re-run is a core debug productivity feature; if ancestor pinning silently fails, users cannot iterate quickly on downstream nodes.

## Source reference
`app/api/workflows/[slug]/debug/route.ts` lines 65–96 — `findAncestors(startNodeId, resolvedEdges)` collects ancestor IDs; the last execution's `execution_data` is fetched and those ancestors are inserted into `ephemeralPinData`; the engine then skips pinned nodes and marks their traces with `pinned: true`.

## Notes
If there is no prior completed execution in the database, ancestor pinning is skipped silently and the full workflow re-runs from scratch. The prior execution is read from the `executions` table (column `execution_data`), not from `node_execution_logs`.
