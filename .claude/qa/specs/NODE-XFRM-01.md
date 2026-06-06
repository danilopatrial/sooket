---
id: NODE-XFRM-01
title: String Ops node UPPER lower trim split slice operations
severity: medium
source_files:
  - components/canvas/nodes/StringOpsNode.tsx
  - lib/nodes/string-ops.ts
---

## What this tests
Verifies that the String Ops node correctly applies each of its five operations (UPPER, lower, trim, split, slice), shows operation-specific config fields only when relevant, and labels the output as "array" for split and "string" for all others.

## Prerequisites
- App is running at http://localhost:3000
- A workflow with a String Ops node exists on the canvas
- The Debug panel is accessible

## Steps — canvas configuration

1. Navigate to the canvas containing a String Ops node
2. Observe the node header: title **String Ops**, sky Type icon, subtitle **transform text values**
3. Confirm one left-side input handle and one right-side output handle (both sky dots)
4. In the **Operation** section, verify five buttons: **UPPER**, **lower**, **trim**, **split**, **slice** (default: UPPER highlighted)
5. Click **split** — a **Separator** VarField appears (default `,`, placeholder `e.g. "," or " "`); the output type label at the bottom changes to **array**
6. Click any other operation — Separator field disappears; output label returns to **string**
7. Click **slice** — two fields appear:
   - **Start**: number input (default `0`)
   - **End** with an **off/on** toggle button (default off); when off, no End input is shown
8. Click the **on** toggle — it highlights in sky blue, and the End number input appears
9. Click **off** — End input disappears; toggle reverts to dimmed

## Steps — execution (UPPER)

10. Connect text input `"hello world"`; select **UPPER**; run — `output` = `"HELLO WORLD"`
11. Input `"MixedCase"` — `output` = `"MIXEDCASE"`

## Steps — execution (lower)

12. Select **lower**; input `"HELLO WORLD"` — `output` = `"hello world"`

## Steps — execution (trim)

13. Select **trim**; input `"  spaces around  "` — `output` = `"spaces around"` (leading/trailing whitespace removed)
14. Input `"no spaces"` — `output` = `"no spaces"` (unchanged)

## Steps — execution (split)

15. Select **split**; set separator to `,`; input `"a,b,c"` — `output` = `["a", "b", "c"]` (array)
16. Set separator to ` ` (single space); input `"hello world"` — `output` = `["hello", "world"]`
17. Set separator to an empty string; input `"abc"` — `output` = `["a", "b", "c"]` (split into individual characters)

## Steps — execution (slice)

18. Select **slice**; set Start to `2`, End toggle **off**; input `"hello"` — `output` = `"llo"` (from index 2 to end)
19. Enable End toggle; set End to `4`; input `"hello"` — `output` = `"ll"` (slice from 2 to 4, exclusive)
20. Set Start to `0`, End to `-2`; input `"hello"` — `output` = `"hel"` (negative end index supported via `str.slice`)

## Steps — error case

21. Disconnect the input handle and run — expect error: **String Ops node has no input connected**

## Expected result
- UPPER: `str.toUpperCase()` — all characters uppercase
- lower: `str.toLowerCase()` — all characters lowercase
- trim: `str.trim()` — leading and trailing whitespace removed
- split: `str.split(separator)` — returns an **array** of strings; separator supports `$VAR_NAME`
- slice without end: `str.slice(start)` — substring from start to end of string
- slice with end enabled: `str.slice(start, end)` — substring from start to end (exclusive); negative indices supported
- All operations coerce their input to a string via `toText()` before processing
- Output type label: "array" for split, "string" for all others

## Failure indicators
- split returns a string instead of an array
- Output type label shows "array" for non-split operations
- Separator field visible when UPPER/lower/trim/slice is selected
- Slice End field visible when End toggle is off
- Negative slice indices throw an error instead of working as per JavaScript `slice()` semantics
- Non-string input is not coerced to string before operation

## Severity rationale
Wrong output type (string vs array) silently breaks downstream nodes expecting array iteration or string operations.

## Source reference
`components/canvas/nodes/StringOpsNode.tsx` lines 21-27 (OPS array), lines 105-120 (split Separator field, conditional), lines 123-156 (slice config with Start/End and toggle), lines 162-165 (output type label: "array" vs "string"); `lib/nodes/string-ops.ts` lines 16-23 (switch: each op, split returns array, slice uses `sliceEndEnabled`), line 14 (`resolveVars` applied to separator).

## Notes
Input values are always coerced to string via `toText()` before the operation — numbers, booleans, and objects are stringified. The separator in split mode supports `$VAR_NAME` variable interpolation. An empty separator string splits the input into individual characters (standard JavaScript `String.prototype.split("")` behavior).
