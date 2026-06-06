---
id: EDGE-09
title: Importing invalid workflow JSON shows descriptive toast errors
severity: medium
source_files:
  - components/canvas/WorkflowCanvas.tsx
---

## What this tests
The workflow import function validates the uploaded JSON file at multiple layers and surfaces a descriptive toast error for each failure — without modifying the current canvas state.

## Prerequisites
- App is running at http://localhost:3000
- A workflow with existing nodes is open on the canvas
- Four test files are prepared locally (see Notes for contents)

## Steps

### Case 1 — Not valid JSON
1. Navigate to the canvas for any workflow.
2. Click the **Import workflow JSON** button (upload icon in the toolbar).
3. Select a file containing `{ this is not valid JSON`.
4. Observe the result.

### Case 2 — Missing `nodes` array
5. Click the **Import workflow JSON** button again.
6. Select a file containing `{"edges": []}`.
7. Observe the result.

### Case 3 — Edge references an unknown node
8. Click the **Import workflow JSON** button again.
9. Select a file containing:
   ```json
   {
     "nodes": [{"id":"n1","type":"workflowInput","position":{"x":0,"y":0},"data":{}}],
     "edges": [{"id":"e1","source":"n1","target":"NONEXISTENT"}]
   }
   ```
10. Observe the result.

### Case 4 — No Input node
11. Click the **Import workflow JSON** button again.
12. Select a file containing:
    ```json
    {
      "nodes": [{"id":"n1","type":"workflowOutput","position":{"x":0,"y":0},"data":{}}],
      "edges": []
    }
    ```
13. Observe the result.

### Case 5 — Confirm canvas is unchanged
14. After all four failures above, verify the canvas still shows the original nodes and edges (nothing was replaced).

## Expected result

**Case 1:** A Sonner toast appears with the message `Import failed: file is not valid JSON`. Canvas is unchanged.

**Case 2:** A Sonner toast appears with the message `Import failed: missing "nodes" array`. Canvas is unchanged.

**Case 3:** A Sonner toast appears with the message `Import failed: edges[0] "target" references unknown node "NONEXISTENT"`. Canvas is unchanged.

**Case 4:** A Sonner toast appears with the message `Import failed: workflow must have an Input node`. Canvas is unchanged.

**Case 5:** The original workflow nodes and edges are still displayed on the canvas — no partial import occurred.

## Failure indicators
- Any case shows no toast notification at all.
- The toast message is generic ("Import failed") without the specific reason.
- The canvas nodes or edges are replaced or cleared after a failed import.
- The browser console shows an uncaught exception instead of a handled toast error.
- A confirmation dialog appears for an invalid file (it should only appear for structurally valid files).

## Severity rationale
Importing a malformed file without clear feedback could silently corrupt a workflow or leave the user confused about why their import failed.

## Source reference
`components/canvas/WorkflowCanvas.tsx` lines 866–984 — `handleImportFile` validates in sequence: JSON parse (line 884–887), top-level object type (line 890–893), `nodes` array (line 897–900), `edges` array (line 901–904), per-node `id`/`type` strings (lines 910–925), per-edge `id`/`source`/`target` against known node IDs (lines 929–947), and exactly one `workflowInput` node (lines 951–959). Each failure calls `toast.error(...)` and returns early without calling `setPendingImport`.

## Notes
Prepare the four test files before starting:
- `bad.json`: `{ this is not valid JSON`
- `no-nodes.json`: `{"edges": []}`
- `bad-edge.json`: the JSON from Case 3 above
- `no-input.json`: the JSON from Case 4 above

A non-`.json` file extension is also rejected with `"Import failed: file must be a .json file"` (line 873) before any parsing occurs.
