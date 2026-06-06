---
id: DEBUG-09
title: Custom query params can be set via KV editor in Sandbox tab
severity: medium
source_files:
  - components/canvas/DebugPanel.tsx
---

## What this tests
The "Query Params" KV editor in the Sandbox tab allows adding key-value pairs that are passed as `__query` in the debug request body, making them accessible to nodes that read URL query parameters.

## Prerequisites
- App is running at http://localhost:3000
- Navigate to any workflow canvas at `/workflow/[slug]`
- Open the Debug panel; Sandbox tab is active

## Steps
1. Locate the "QUERY PARAMS" collapsible section below the Headers section
2. Click "Add" to add a query param row
3. Enter a key (e.g. `limit`) and value (e.g. `10`) in the row
4. Verify the section label shows the count `(1)` in violet
5. Run the workflow and inspect the trace for a node that uses the `query` output handle of the Input node

## Expected result
- The "QUERY PARAMS" KV editor has the same structure as Headers: collapsible, "Add" button, key/value row pairs with trash delete
- Active count `(N)` shows in `text-violet-400/70` when rows exist
- When running with a query param `{limit: "10"}`, the debug route receives `__query: {"limit": "10"}` and appends those params to the sandbox URL via `u.searchParams.set(k, v)`
- A workflow reading `query` output from the Input node receives `{"limit": "10"}`

## Failure indicators
- The "QUERY PARAMS" section is absent from the Sandbox tab
- Query param values are not received by nodes that read `$query`
- The section count badge does not appear when rows exist

## Severity rationale
Query param injection is needed to test workflows that route or filter based on URL parameters.

## Source reference
`components/canvas/DebugPanel.tsx` line 369 — `queryRows` state; line 407 — `kvRowsToObject(queryRows)` as `sandboxQuery`; line 416 — sent as `__query` if non-empty; line 630 — `<KVEditor label="Query Params" rows={queryRows} onChange={setQueryRows} />`. `app/api/workflows/[slug]/debug/route.ts` lines 108–114 — `__query` entries appended to sandbox URL via `u.searchParams.set`.
