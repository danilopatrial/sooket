---
id: DEBUG-08
title: Custom request headers can be set via KV editor in Sandbox tab
severity: medium
source_files:
  - components/canvas/DebugPanel.tsx
---

## What this tests
The "Headers" KV editor in the Sandbox tab allows adding key-value pairs that are passed as `__headers` in the debug request body, making them accessible to nodes that inspect request headers.

## Prerequisites
- App is running at http://localhost:3000
- Navigate to any workflow canvas at `/workflow/[slug]`
- Open the Debug panel; Sandbox tab is active

## Steps
1. Locate the "HEADERS" collapsible section below the Request Body textarea
2. Click "Add" to add a header row
3. Enter a key (e.g. `Authorization`) and value (e.g. `Bearer test-token`) in the row
4. Verify the section label shows the count of active rows (e.g. `(1)` in violet)
5. Run the workflow and inspect the trace for a node that uses `{{$headers}}` or the `headers` output of the Input node

## Expected result
- The KV editor shows a collapsed header with an "Add" button
- Clicking "Add" appends a row with "key" and "value" inputs plus a `Trash2` delete button
- The section label shows `(N)` in `text-violet-400/70` next to "HEADERS" when N > 0
- When running, custom headers are sent in the request as `__headers: {"Authorization": "Bearer test-token"}`
- A workflow that reads request headers (via the `headers` output handle of the Input node) receives the custom header values

## Failure indicators
- The "HEADERS" section is absent from the Sandbox tab
- Clicking "Add" does not create a row
- Header values are not passed to the workflow execution (node that reads headers sees empty object)
- The active count indicator is absent when rows exist

## Severity rationale
Custom headers are required to test workflows that validate Authorization headers or other request metadata.

## Source reference
`components/canvas/DebugPanel.tsx` lines 368 — `headerRows` state initialized as empty `KVRow[]`; line 406 — `kvRowsToObject(headerRows)` converts to object and sends as `__headers` if non-empty (line 415). Lines 104–201 — `KVEditor` component renders collapsible rows with add/remove/update and active count badge.
