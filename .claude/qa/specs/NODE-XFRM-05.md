---
id: NODE-XFRM-05
title: Array Length node counts array items
severity: low
source_files:
  - components/canvas/nodes/ArrayLengthNode.tsx
  - lib/nodes/array-length.ts
---

## What this tests
Verifies that the Array Length node returns the element count of an array, character count of a string, key count of an object, and 0 for all other types — with no configurable fields.

## Prerequisites
- App is running at http://localhost:3000
- A workflow with an Array Length node exists on the canvas
- The Debug panel is accessible

## Steps — canvas configuration

1. Navigate to the canvas containing an Array Length node
2. Observe the node: title **Array Length**, indigo List icon, subtitle **count items in a list**; the node is narrow (no configurable fields in the body)
3. Confirm one left-side input handle: **list / array** (indigo dot) and one right-side output handle: **count** (indigo dot)
4. Verify the body contains a single row showing "list / array" on the left and "count" on the right — no input fields, dropdowns, or toggles

## Steps — execution (arrays)

5. Connect a JSON array `[1, 2, 3]` and run — `output` = `3`
6. Connect an empty array `[]` — `output` = `0`
7. Connect a 10-element array — `output` = `10`

## Steps — execution (strings)

8. Connect the string `"hello"` — `output` = `5` (character count)
9. Connect `""` — `output` = `0`

## Steps — execution (objects)

10. Connect an object `{"a": 1, "b": 2, "c": 3}` — `output` = `3` (key count via `Object.keys()`)
11. Connect `{}` — `output` = `0`

## Steps — execution (other types)

12. Connect the number `42` — `output` = `0`
13. Connect `null` — `output` = `0`
14. Connect `true` — `output` = `0`

## Steps — error case

15. Disconnect the input handle and run — expect error: **Array Length node has no input connected**

## Expected result
- Array input: returns `array.length` (integer element count)
- String input: returns `string.length` (character count)
- Plain object input (non-null, non-array): returns `Object.keys(obj).length`
- Number, boolean, null, undefined: returns `0`
- Output is always an integer ≥ 0

## Failure indicators
- Array length returns a non-integer or is off by one
- String input returns `0` instead of character count
- Object input throws instead of returning key count
- `null` throws `TypeError` instead of returning `0`
- Node has configurable fields (should have none)

## Severity rationale
Low: the node has a narrow, well-defined scope; errors in length counting are immediately visible when downstream logic uses the count for iteration or comparison.

## Source reference
`components/canvas/nodes/ArrayLengthNode.tsx` — entire file (no configurable fields); `lib/nodes/array-length.ts` lines 10-13 (type dispatch: array → `.length`, string → `.length`, object → `Object.keys().length`, else → `0`).

## Notes
The Array Length node is one of the simplest nodes in the system — it has no configuration and no mode switches. String length and object key count are side-effect behaviors that may surprise users expecting array-only input; the subtitle "count items in a list" refers primarily to the array case.
