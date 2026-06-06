---
id: NODE-FMT-01
title: JSON Parser node dynamic output handles per field, dot-notation
severity: high
source_files:
  - components/canvas/nodes/JsonParserNode.tsx
  - lib/nodes/json-parser.ts
---

## What this tests
Verifies that the JSON Parser node creates a dynamic output handle for each configured field, supports dot-notation path extraction, uses a configurable fallback when a field is missing, and updates its header subtitle to show the active field count.

## Prerequisites
- App is running at http://localhost:3000
- A workflow with a JSON Parser node exists on the canvas
- The Debug panel is accessible

## Steps — canvas configuration

1. Navigate to the canvas containing a JSON Parser node
2. Observe the node header: title **JSON Parser**, sky `{}` icon; subtitle reads **pull values out of incoming data** when no fields are defined
3. Confirm exactly one left-side input handle: **input** (sky dot, fixed near the top)
4. Confirm no right-side output handles are present yet
5. Click **Add field** — a new row appears with two VarField inputs: **field name** (placeholder `e.g. userId`) and **if missing** (fallback, placeholder `fallback`)
6. Enter field name `userId` — a new sky dot output handle appears on the right side, aligned with that row
7. Click **Add field** again; enter name `user.email` (dot notation) — a second output handle appears
8. Verify the header subtitle updates to **2 fields extracted**
9. Enter a fallback value `unknown` in the **if missing** column for the `user.email` field
10. Click × on the `userId` row — the row and its output handle both disappear; subtitle updates to **1 field extracted**
11. Note the hint text below the fields: **dot notation works · e.g. user.email**

## Steps — execution

12. Connect the `input` handle to a node providing `{"userId": "abc123", "user": {"email": "a@b.com"}}`
13. Re-add `userId` field (no fallback); connect both output handles to the workflow Output
14. Open the Debug panel and send a test request
15. Expand the JSON Parser trace:
    - `userId` handle output: `"abc123"`
    - `user.email` handle output: `"a@b.com"` (dot-notation traversal into nested object)
16. Send a request with `{"userId": "abc123"}` (no `user.email` key)
    - `user.email` handle output: `"unknown"` (the configured fallback)
17. Send with `{"userId": "abc123", "user": {}}` (email key absent from nested object)
    - `user.email` handle output: `"unknown"` (fallback applies)
18. Send a JSON string input (e.g. `"{ \"userId\": \"x\" }"` as a string) — verify the node parses it before extracting
19. Connect a non-JSON string (e.g. `"hello"`) — verify the node returns `undefined` / fallback without throwing

## Expected result
- Each field row creates exactly one right-side output handle, aligned with that row
- Header subtitle: "pull values out of incoming data" (0 fields), "N field extracted" / "N fields extracted" (≥1)
- Dot notation (`a.b.c`) traverses nested objects correctly
- Missing field returns the configured fallback; no fallback returns `undefined`
- JSON string input is parsed before extraction; parse failure silently treats data as `{}`
- Output handle ID is the internal field `id` (not the field name) — the handle-to-field mapping is stable

## Failure indicators
- Output handles do not appear when fields are added
- Header subtitle does not reflect the current field count
- Dot-notation path `user.email` returns the raw string `"user.email"` instead of the nested value
- Missing field returns `undefined` even when a fallback is configured
- Non-JSON string input throws an error instead of silently returning fallback values
- Removing a field does not remove its output handle

## Severity rationale
JSON extraction is a fundamental data-shaping operation; incorrect path resolution or missing fallbacks would silently corrupt downstream node inputs.

## Source reference
`components/canvas/nodes/JsonParserNode.tsx` lines 102-106 (header subtitle logic), line 171 (dot notation hint), lines 131-167 (field rows with name/fallback columns); `lib/nodes/json-parser.ts` lines 14-18 (JSON parse/object coercion), lines 21-25 (`resolvePath` for dot-notation, fallback application).

## Notes
The output handle ID is the field's internal random `id` (e.g. `"a3f9k2"`), not the field name string. The executor looks up the correct field by matching `sourceHandle` to `field.id`. Fields with an empty `name` return `undefined` with no extraction attempted (line 22: `if (!field?.name)`).
