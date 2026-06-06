---
id: NODE-XFRM-04
title: Concat node string joining with separator, dynamic input count 2-8
severity: medium
source_files:
  - components/canvas/nodes/ConcatNode.tsx
  - lib/nodes/concat.ts
---

## What this tests
Verifies that the Concat node joins between 2 and 8 string inputs using a configurable separator, dynamically adds/removes input handles via +/− buttons, and returns `active: false` if any connected input is inactive.

## Prerequisites
- App is running at http://localhost:3000
- A workflow with a Concat node exists on the canvas
- The Debug panel is accessible

## Steps — canvas configuration

1. Navigate to the canvas containing a Concat node
2. Observe the node header: title **Concat**, pink Link2 icon; subtitle reads **join 2 strings** (default)
3. Confirm two left-side input handles (pink dots, labeled **1** and **2**) and one right-side output handle: **output** (pink)
4. In the **Separator** field (VarField, placeholder `e.g. ", " or " "`), leave empty (default)
5. In the **Inputs** section, note +/− buttons; click **+** — a third input row appears, labeled **3**; subtitle updates to **join 3 strings**; a third input handle appears
6. Click **+** repeatedly up to 8 inputs — at 8, the **+** button becomes disabled
7. Click **−** repeatedly — rows are removed; at 2, the **−** button becomes disabled
8. With 2 inputs, verify input rows are labeled **1** and **2** with "string" type; connected handles light up pink

## Steps — execution (basic concatenation)

9. Set separator to ` ` (space); connect `"Hello"` to input-1, `"World"` to input-2; run — `output` = `"Hello World"`
10. Set separator to `, `; connect three inputs: `"a"`, `"b"`, `"c"`; run — `output` = `"a, b, c"`
11. Set separator to empty; connect `"foo"` and `"bar"`; run — `output` = `"foobar"`

## Steps — disconnected inputs are skipped

12. Add a third input; connect only input-1 (`"hello"`) and input-3 (`"world"`); leave input-2 disconnected; set separator ` `
13. Run — `output` = `"hello world"` (disconnected input-2 is skipped; order maintained by index)

## Steps — inactive input propagation

14. Connect a node that returns `active: false` to any input; run — `output` = `active: false` (any inactive connected input short-circuits the whole node)

## Steps — non-string input coercion

15. Connect a number `42` to input-1 and `"px"` to input-2; separator empty; run — `output` = `"42px"` (numbers coerced via `toText()`)

## Expected result
- Input count: min 2, max 8; +/− buttons enforce limits
- Subtitle updates dynamically: "join N strings"
- Connected inputs coerced to string via `toText()` and joined with separator
- Disconnected handles are silently skipped (not counted as empty string)
- Any connected input returning `active: false`: entire node returns `active: false`
- Separator supports `$VAR_NAME` variable interpolation
- No inputs connected at all: returns `""` (empty join of empty parts array)

## Failure indicators
- Subtitle does not update when inputs are added/removed
- − button is clickable when only 2 inputs remain
- + button is visible/clickable at 8 inputs
- Disconnected inputs contribute an empty string instead of being skipped
- Inactive input does not short-circuit the node (should return `active: false`)
- Output is an array instead of a joined string

## Severity rationale
A disconnected input contributing an empty string would silently insert extra separators in the output (e.g. `"a,,c"` instead of `"a,c"`), corrupting prompts passed downstream.

## Source reference
`components/canvas/nodes/ConcatNode.tsx` lines 16-17 (MIN/MAX_INPUTS), line 88 (subtitle "join N strings"), lines 119-129 (−/+ buttons with disabled states); `lib/nodes/concat.ts` lines 10-17 (loop: skips disconnected inputs, short-circuits on active:false, coerces with `toText`), line 8 (`resolveVars` on separator), line 18 (`parts.join(separator)` return).

## Notes
The Concat node intentionally skips disconnected handles rather than substituting empty strings — this makes it possible to wire only some inputs without producing extra separators. Inputs are iterated in handle order (0, 1, 2...) regardless of which ones are connected.
