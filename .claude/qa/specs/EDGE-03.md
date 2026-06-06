---
id: EDGE-03
title: Large payload trace truncated with ellipsis suffix
severity: medium
source_files:
  - lib/node-trace.ts
  - lib/workflow-engine.ts
  - components/canvas/DebugPanel.tsx
---

## What this tests
Node execution traces in the debug panel are capped at 4096 bytes and suffixed with `…[truncated]` when the serialized input or output exceeds that limit.

## Prerequisites
- App is running at http://localhost:3000
- A workflow exists with at least an Input node connected to an Output node
- The workflow's slug is known (e.g. `my-workflow`)

## Steps
1. Navigate to the canvas for the workflow (e.g. `/workflow/my-workflow`)
2. Open the Debug Panel by clicking the bug icon in the toolbar
3. In the Sandbox tab, paste a JSON body whose `message` field value is a string longer than 4096 characters — for example:
   ```json
   {"message": "AAAA..."}
   ```
   where the `"message"` value is at least 4100 `A` characters so the entire serialized object exceeds 4096 characters.
4. Click the **Send** button to execute the debug request.
5. Wait for the response to appear.
6. In the execution trace list, click the row for the **Input** node to expand it.
7. Inspect the **Output** section of the expanded trace row.

## Expected result
The Output field ends with `…[truncated]` — the raw snapshot string is sliced to 4084 characters (4096 − length of `"…[truncated]"`) followed by the literal suffix `…[truncated]`. The truncated text is still valid partial JSON.

## Failure indicators
- The Output field displays the full, untruncated payload with no `…[truncated]` suffix.
- The panel throws a rendering error or shows blank content for large payloads.
- The suffix is `[truncated]` without the leading `…` character.

## Severity rationale
Trace truncation prevents the UI from becoming unresponsive on large payloads; a regression could freeze or crash the debug panel for real-world large responses.

## Source reference
`lib/node-trace.ts` — `truncatePayload()` defines `MAX_SNAPSHOT_BYTES = 4096` and the suffix `"…[truncated]"`. `lib/workflow-engine.ts` lines 346–347 apply it to `inputSnapshot` and `outputSnapshot` for every node trace entry.

## Notes
String length is used as a byte proxy (accurate for ASCII, approximate for multi-byte Unicode). Tests with pure ASCII content (repeated `A` characters) give exact, reproducible results.
