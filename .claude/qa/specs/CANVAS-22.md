---
id: CANVAS-22
title: Import workflow from JSON — validates input node count and edge references
severity: high
source_files:
  - components/canvas/WorkflowCanvas.tsx
---

## What this tests
Importing a workflow JSON file validates: file extension is `.json`, top-level is an object with `nodes` and `edges` arrays, every node has `id` and `type` strings, every edge's `source`/`target` references a real node ID, and exactly one `workflowInput` node exists.

## Prerequisites
- App is running at http://localhost:3000
- Navigate to any workflow canvas at `/workflow/[slug]`

## Steps
1. Click the `Upload` icon in the canvas status bar — a file picker opens
2. **Valid import**: select a valid `.json` file (exported from another workflow); confirm the import dialog; verify canvas updates
3. **No `.json` extension**: select a `.txt` file — verify a toast error "Import failed: file must be a .json file"
4. **Invalid JSON**: select a `.json` file containing non-JSON text — verify a toast error "Import failed: file is not valid JSON"
5. **Missing `nodes` array**: select a `.json` file like `{"edges":[]}` — verify toast "Import failed: missing \"nodes\" array"
6. **Edge references unknown node**: select a file where an edge `source` ID doesn't match any node `id` — verify toast with the bad edge index and unknown node ID
7. **Zero input nodes**: select a file where no node has `type: "workflowInput"` — verify toast "Import failed: workflow must have an Input node"
8. **Two input nodes**: select a file with two `workflowInput` nodes — verify toast "Import failed: workflow has more than one Input node"

## Expected result
- Valid import: a confirmation dialog appears ("Importing will replace all nodes and edges"); clicking confirm replaces the canvas with the imported nodes/edges and shows "Workflow imported successfully" toast
- Each invalid file triggers a descriptive `toast.error` explaining exactly what failed; the canvas is not modified
- After any error, the same file can be re-selected (input value is reset after each attempt)

## Failure indicators
- A non-`.json` file is accepted without error
- An invalid JSON file is accepted or crashes the page
- An edge referencing a non-existent node is accepted without error
- A file with 0 or 2+ `workflowInput` nodes is accepted without error
- On valid import, the canvas is not updated to show the imported workflow
- The same file cannot be re-selected after an error

## Severity rationale
Import validation protects the canvas from corrupt or incompatible workflow files that would break execution.

## Source reference
`components/canvas/WorkflowCanvas.tsx` lines 866–985 — `handleImportFile` validates: `.json` extension (line 872), JSON parse (lines 883–888), top-level object (lines 890–893), `nodes`/`edges` arrays (lines 897–904), per-node `id`/`type` strings (lines 910–925), per-edge `source`/`target` referencing real node IDs (lines 928–948), exactly 1 `workflowInput` node (lines 951–959). On success sets `pendingImport`; `confirmImport()` (lines 845–864) applies and shows success toast.
