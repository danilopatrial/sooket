---
id: NODE-FMT-02
title: JSON Builder node constructs JSON from dynamic input handles
severity: high
source_files:
  - components/canvas/nodes/JsonBuilderNode.tsx
  - lib/nodes/json-builder.ts
---

## What this tests
Verifies that the JSON Builder node creates a dynamic left-side input handle per configured field, assembles a JSON object from connected inputs (or configured fallbacks), and emits the result via a single output handle.

## Prerequisites
- App is running at http://localhost:3000
- A workflow with a JSON Builder node exists on the canvas
- The Debug panel is accessible

## Steps — canvas configuration

1. Navigate to the canvas containing a JSON Builder node
2. Observe the node header: title **JSON Builder**, amber `{}` icon; subtitle reads **construct a JSON object from inputs** when no fields are defined
3. Confirm no left-side input handles are present yet and one right-side output handle labeled **output** (amber dot) at the bottom
4. Click **Add field** — a new row appears with two columns: **key name** (VarField, placeholder `e.g. userId`) and **if disconnected** (fallback, VarField, placeholder `fallback`)
5. Enter key name `name`; a left-side amber input handle appears aligned with that row
6. Click **Add field** again; enter key name `score` and fallback `0`
7. Verify header subtitle updates to **2 fields assembled**
8. Click × on the `name` row — the row and its input handle disappear; subtitle updates to **1 field assembled**
9. Re-add `name` with no fallback; now add a third field with an **empty key name** — leave it blank

## Steps — execution

10. Connect text node `"Alice"` to the `name` input handle; leave `score` disconnected (fallback `0`)
11. Open the Debug panel and send a test request
12. Expand the JSON Builder trace — the `output` handle value is `{"name": "Alice", "score": "0"}`
13. Connect a numeric value `42` to the `score` handle and re-run — output is `{"name": "Alice", "score": 42}` (connected value overrides fallback)
14. Leave both handles disconnected; set fallback for `name` to `"anon"` and re-run — output is `{"name": "anon", "score": "0"}`
15. Verify the empty-key field added in step 9 is **absent** from the output object (fields with empty keys are skipped)
16. Leave `name` disconnected with no fallback and re-run — output includes `{"name": undefined}` or the key is absent; verify the node does not throw

## Expected result
- Each field row creates exactly one left-side input handle aligned with the row
- Header subtitle: "construct a JSON object from inputs" (0 fields), "N field assembled" / "N fields assembled" (≥1)
- Connected handle: key is set to the handle's connected value
- Disconnected handle with fallback: key is set to the fallback string
- Disconnected handle with no fallback: key is omitted from the output (the executor only sets `obj[f.key]` when `src` is connected or `f.fallback !== undefined`)
- Fields with empty key names are silently skipped — they do not appear in the output object
- Single `output` handle returns the assembled plain object

## Failure indicators
- Input handles do not appear as fields are added
- Empty-key fields appear in the output object
- Disconnected fields with a fallback do not appear in the output object
- Output is an empty object when all handles are disconnected but fallbacks are set
- Adding/removing fields does not update the header subtitle count
- Output handle is absent or produces `undefined`

## Severity rationale
Incorrect key assembly silently corrupts the JSON object passed to downstream nodes, making this a high-severity data integrity issue.

## Source reference
`components/canvas/nodes/JsonBuilderNode.tsx` lines 110-114 (header subtitle logic), lines 131-135 (column headers: "key name" / "if disconnected"), lines 84-93 (per-field input handles); `lib/nodes/json-builder.ts` lines 9-19 (field iteration: skip empty key, use connected value or fallback, accumulate into `obj`).

## Notes
The fallback value is always a string (from the VarField input). If a connected handle returns a non-string value (number, object), that typed value is used as-is. Fields are added to the output object in the order they appear in the `fields` array. The `onRemoveField` callback (used when the canvas wires edge cleanup) takes priority over `onChange` when removing a field.
