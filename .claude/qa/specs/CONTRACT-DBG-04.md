---
id: CONTRACT-DBG-04
title: POST debug with __headers and __query injects into context
severity: medium
source_files:
  - app/api/workflows/[slug]/debug/route.ts
---

## What this tests
Verifies that `__headers` and `__query` fields in the debug request body are injected into the workflow execution context so nodes that read request headers or query parameters receive the supplied values.

## Prerequisites
- App is running at http://localhost:3000
- A workflow exists with a known slug (referred to as `<slug>`) that has a `workflowInput` node with its `headers` and/or `query` output handles wired to downstream nodes (e.g., a Text node or directly to an Output node)

## Steps
1. Send a POST request with `__headers` and `__query` objects alongside a user payload:
   ```
   curl -s -X POST http://localhost:3000/api/workflows/<slug>/debug \
     -H "Content-Type: application/json" \
     -d '{
       "__headers": {"x-custom-header": "test-header-value"},
       "__query": {"search": "hello"},
       "message": "payload"
     }' | python3 -m json.tool
   ```
2. Inspect `ok` in the response.
3. In the `traces` array, find the entry for the `workflowInput` node and examine its `outputSnapshot`.
4. Verify the `headers` handle output contains `x-custom-header: "test-header-value"`.
5. Verify the `query` handle output contains `search: "hello"`.

## Expected result
- HTTP status code is `200`.
- `ok` is `true`.
- The `workflowInput` node's `outputSnapshot` for the `headers` handle includes `"x-custom-header": "test-header-value"` (merged with the default `content-type: application/json`).
- The `workflowInput` node's `outputSnapshot` for the `query` handle includes `"search": "hello"`.
- The keys `__headers` and `__query` do not appear in the `inputSnapshot` of any node (they are stripped from the user-facing body).

## Failure indicators
- `ok` is `false`.
- The `headers` handle output does not contain `x-custom-header`.
- The `query` handle output does not contain `search`.
- `__headers` or `__query` appear in any node's `inputSnapshot` (they should be stripped).
- Non-string values supplied in `__headers` or `__query` objects are forwarded (source ignores non-string values).

## Severity rationale
Header and query injection are essential for testing workflows that inspect authentication headers or URL parameters; if injection silently fails, those code paths cannot be sandbox-tested.

## Source reference
`app/api/workflows/[slug]/debug/route.ts` lines 99–114 — `sandboxHeaders` is built from `__headers` (string-valued entries only); `sandboxUrl` has search params appended from `__query` (string-valued entries only). Both are passed to `executeWorkflow`.

## Notes
Only string-valued keys in `__headers` and `__query` objects are applied; non-string values are skipped. The default `sandboxHeaders` always includes `content-type: application/json`.
