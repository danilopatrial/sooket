---
id: NODE-FMT-05
title: Type Cast node String, Number, and Boolean conversion
severity: medium
source_files:
  - components/canvas/nodes/TypeCastNode.tsx
  - lib/nodes/type-cast.ts
---

## What this tests
Verifies that the Type Cast node converts its input to String, Number, or Boolean using defined coercion rules, and that the correct target option is highlighted in the UI.

## Prerequisites
- App is running at http://localhost:3000
- A workflow with a Type Cast node exists on the canvas
- The Debug panel is accessible

## Steps — canvas configuration

1. Navigate to the canvas containing a Type Cast node
2. Observe the node header: title **Type Cast**, yellow ArrowLeftRight icon; subtitle reads **convert to string** (monospace, default)
3. Confirm one left-side input handle and one right-side output handle (yellow dots, fixed position — no dynamic handles)
4. In the **Convert To** section, verify three full-width option buttons:
   - **string** (teal highlight when selected)
   - **number** (amber highlight when selected)
   - **boolean** (emerald highlight when selected)
5. **string** is selected by default; click **number** — header subtitle updates to **convert to number**, number button turns amber
6. Click **boolean** — header subtitle updates to **convert to boolean**, button turns emerald
7. Click **string** to revert

## Steps — execution (string)

8. Connect an input value `42` (number); set target to **string**
9. Open the Debug panel, run — output is `"42"` (string, not number)
10. Connect input `true` (boolean); run — output is `"true"` (string)

## Steps — execution (number)

11. Set target to **number**; connect input `"3.14"` (string); run — output is `3.14` (number)
12. Connect input `""` (empty string); run — output is `NaN` (JavaScript `Number("")` is `NaN`)
13. Connect input `true`; run — output is `1` (`Number(true)`)
14. Connect input `false`; run — output is `0`

## Steps — execution (boolean)

15. Set target to **boolean**; test each of these inputs and confirm the output:
    - `true` (boolean) → `true`
    - `false` (boolean) → `false`
    - `1` (number) → `true`
    - `0` (number) → `false`
    - `"hello"` (any non-empty, non-falsy string) → `true`
    - `""` (empty string) → `false`
    - `"false"` → `false`
    - `"0"` → `false`
    - `"no"` → `false`
    - `"off"` → `false`
    - `"true"` → `true`
    - `"yes"` → `true`

## Steps — error case

16. Disconnect the input handle and run — expect error: **Type Cast node has no input connected**

## Expected result
- Three target options with correct color highlighting: string (teal), number (amber), boolean (emerald)
- Header subtitle shows current target: "convert to string/number/boolean"
- string: stringifies any value via `toText()`
- number: uses JavaScript `Number()` coercion — `NaN` for non-numeric strings
- boolean: pass-through for booleans; `v !== 0` for numbers; for strings: `""`, `"false"`, `"0"`, `"no"`, `"off"` → `false`; everything else → `true`

## Failure indicators
- Target button color does not update when a new target is selected
- Header subtitle does not update
- Number cast returns a string instead of a JS number
- Boolean cast returns `true` for `"false"`, `"0"`, `"no"`, or `"off"` inputs
- Boolean cast returns `false` for `"true"` or `"yes"` inputs
- Disconnected input causes unhandled exception instead of the expected error

## Severity rationale
Type coercion errors are silent — downstream numeric comparisons or boolean routing fail without an obvious error message.

## Source reference
`components/canvas/nodes/TypeCastNode.tsx` lines 17-21 (TARGETS array with labels/colors), line 48 (subtitle "convert to {target}"); `lib/nodes/type-cast.ts` lines 12-27 (switch on target: number via `Number()`, boolean coercion with string falsy list, string via `toText()`).

## Notes
The `boolean` cast string falsy list is case-insensitive (input is lowercased with `.trim().toLowerCase()` before comparison). Custom format strings are not supported for the `string` target — `toText()` handles all value types including objects (serialized to JSON). A custom format string field is not present on this node.
