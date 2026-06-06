---
id: NODE-INPUT-03
title: query output handle returns parsed URL search params
severity: medium
source_files:
  - lib/nodes/workflow-input.ts
  - components/canvas/nodes/InputNode.tsx
---

## What this tests
The `query` output handle of the `workflowInput` node returns URL query parameters as a flat key-value object.

## Prerequisites
- App is running at http://localhost:3000
- Navigate to any workflow canvas at `/workflow/[slug]`
- Connect the `workflowInput` node's `query` output handle to a downstream node
- Open the Debug panel

## Steps
1. In the Debug panel Sandbox tab, add query params via the Query Params KV editor (e.g. `limit=10`, `filter=active`)
2. Click Run
3. Inspect the execution trace for the node receiving the `query` output

## Expected result
- The output is a plain JS object: `{"limit": "10", "filter": "active"}`
- All sandbox query params set via the KV editor appear as string values
- If no query params are set, returns an empty object `{}`
- If the URL is malformed: silently returns empty object (exception caught)

## Failure indicators
- The `query` output is `null` or `undefined`
- Query params added in the sandbox are missing
- Values are numbers instead of strings (all URL params are strings)

## Severity rationale
Query param access is required for workflows that route or filter based on URL parameters.

## Source reference
`lib/nodes/workflow-input.ts` lines 11–16 — when `sourceHandle === "query"`: wraps `new URL(ctx.reqCtx.url).searchParams.forEach(...)` in try/catch; builds plain object; returns empty on malformed URL. `components/canvas/nodes/InputNode.tsx` line 12 — `{id: "query", label: "query", desc: "query params"}`.
