---
id: NODE-XFRM-07
title: Size Of node character count of a string
severity: low
source_files:
  - components/canvas/nodes/SizeOfNode.tsx
  - lib/nodes/size-of.ts
---

## What this tests
Verifies that the Size Of node returns the character count of a string (or element/key count for arrays/objects), has no configurable fields, and does not throw when the input is disconnected.

## Prerequisites
- App is running at http://localhost:3000
- A workflow with a Size Of node exists on the canvas
- The Debug panel is accessible

## Steps — canvas configuration

1. Navigate to the canvas containing a Size Of node
2. Observe the node: title **Size Of**, indigo `|x|` icon badge, subtitle **counts characters**; node is narrow with no configuration fields
3. Confirm one left-side input handle (**text input**, indigo, lit when connected) and one right-side output handle (**char count**, indigo)
4. Verify the body contains a single row "text input" / "char count" — no input fields, dropdowns, or toggles

## Steps — execution (string input)

5. Connect the string `"hello"` to the input; run — `output` = `5`
6. Connect `"hello world"` (11 chars including space) — `output` = `11`
7. Connect `""` (empty string) — `output` = `0`
8. Connect `"abc"` — `output` = `3`

## Steps — execution (non-string coercion)

9. Connect number `42`; run — `output` = `2` (`toText(42)` = `"42"`, length 2)
10. Connect `true`; run — `output` = `4` (`"true"` has 4 characters)
11. Connect `false`; run — `output` = `5`

## Steps — execution (array and object)

12. Connect array `[1, 2, 3]`; run — `output` = `3` (element count, not stringified length)
13. Connect object `{"a": 1, "b": 2}`; run — `output` = `2` (key count via `Object.keys()`)

## Steps — disconnected input

14. Disconnect the input handle and run — expect `output` = `0` (no error thrown; undefined coerced to `""`)

## Expected result
- String input: character count (`string.length`)
- Number/boolean input: coerced to string via `toText()`, then character count
- Array input: element count (same as Array Length)
- Object input: key count (same as Array Length)
- No input connected: returns `0` (no exception)
- Output is always a non-negative integer

## Failure indicators
- String input returns element count instead of character count
- Number `42` returns `0` instead of `2`
- Disconnected input throws an error instead of returning `0`
- Node has configurable fields (should have none)
- Output is a string instead of a number

## Severity rationale
Low: the node has a narrow, well-defined scope; errors would be immediately visible in downstream numeric comparisons.

## Source reference
`components/canvas/nodes/SizeOfNode.tsx` lines 46-48 (`|x|` icon badge), line 51 (subtitle "counts characters"), lines 56-62 (single body row, no config); `lib/nodes/size-of.ts` lines 8-11 (evaluates input if connected; no throw if disconnected), lines 14-20 (type dispatch: array → `.length`, object → `Object.keys().length`, else → `toText(value).length`).

## Notes
The checklist description says "character count of a string" but the executor also handles arrays (element count) and objects (key count) identically to Array Length. The key behavioral difference from Array Length is: (1) Size Of does not throw for a disconnected input; (2) non-array/non-object values are coerced to string and their character count is returned (so `42` → 2, `true` → 4), whereas Array Length returns 0 for those types.
