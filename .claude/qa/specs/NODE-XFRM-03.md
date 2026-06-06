---
id: NODE-XFRM-03
title: Math node all operators and live preview in subtitle
severity: medium
source_files:
  - components/canvas/nodes/MathNode.tsx
  - lib/nodes/math.ts
---

## What this tests
Verifies that the Math node exposes all nine operators (+, −, ×, ÷, %, xⁿ, min, max, abs), shows a live `= {result}` preview in the header subtitle when inputs are not connected, disables the B input for the unary abs operator, and throws on division/modulo by zero or non-numeric input.

## Prerequisites
- App is running at http://localhost:3000
- A workflow with a Math node exists on the canvas
- The Debug panel is accessible

## Steps — canvas configuration

1. Navigate to the canvas containing a Math node
2. Observe the node header: title **Math**, purple operator icon (shows the selected operator symbol); subtitle shows `= 0` (default: A=0, B=0, operator=+)
3. Confirm two left-side input handles: **A** (white/30 dot) and **B** (white/30 dot); one right-side output handle: **result** (purple dot)
4. The node body shows two numeric input fields: **A** (default `0`) and **B** (default `0`)
5. In the **operator** grid (two rows), verify these buttons in order:
   - Row 1: **+** (add), **−** (subtract), **×** (multiply), **÷** (divide)
   - Row 2: **%** (mod), **xⁿ** (power), **min**, **max**, **|a|** (abs)
6. Change A to `5` and B to `3`; click **+** — subtitle shows `= 8`
7. Click **−** — subtitle shows `= 2`; click **×** — `= 15`; click **÷** — `= 1.6666...`
8. Click **%** — `= 2`; click **xⁿ** — `= 125`; click **min** — `= 3`; click **max** — `= 5`
9. Click **|a|** (abs): subtitle shows `= 5` (abs of A only); verify the **B** input field becomes **dimmed and disabled** (opacity reduced, pointer-events-none)
10. Set B to `0` and select **÷**: subtitle shows **÷0 err** in the preview; select **%**: shows **%0 err**
11. Connect something to the `a` handle — the A input field is grayed out; subtitle changes to **numeric operation** (preview hidden when any handle is connected)
12. Disconnect the handle — preview and editable fields restore

## Steps — execution

13. Set A=10, B=3; select **+**; run — `result` = `13` (number, not string)
14. Select **−**; run — `result` = `7`
15. Select **×**; run — `result` = `30`
16. Select **÷**; run — `result` = `3.3333333333333335`
17. Set B=0; select **÷**; run — expect error: **Math node: division by zero**
18. Set B=0; select **%**; run — expect error: **Math node: modulo by zero**
19. Select **xⁿ**; A=2, B=10; run — `result` = `1024`
20. Select **min**; A=7, B=3; run — `result` = `3`
21. Select **max**; run — `result` = `7`
22. Select **|a|**; A=-5; run — `result` = `5` (B is ignored)
23. Connect a text node `"hello"` to the `a` handle; run — expect error: **Math node: input A received a non-numeric value ("hello")**

## Expected result
- Nine operators: +, −, ×, ÷, %, xⁿ, min, max, abs
- Header icon shows the selected operator symbol (label from OPS array)
- Subtitle: `= {result}` when neither A nor B handle is connected; **numeric operation** when any handle is connected
- Division by zero: throws; modulo by zero: throws
- Canvas preview shows "÷0 err" / "%0 err" for zero-divisor when using static fields
- `abs` is unary: B field dimmed/disabled; B input/handle ignored in computation
- Non-numeric connected value: throws with the value in the error message
- All results returned as JavaScript numbers (not strings)

## Failure indicators
- Subtitle does not update as A, B, or operator changes
- `abs` does not dim the B field (B remains editable/active)
- Division by zero does not throw (returns `Infinity` instead)
- Operator result returned as a string instead of a number
- Preview still shows `= {result}` when a handle is connected (should show "numeric operation")

## Severity rationale
Silent division-by-zero (`Infinity`) would corrupt downstream numeric comparisons; non-numeric input silently coerced to NaN would propagate invisibly.

## Source reference
`components/canvas/nodes/MathNode.tsx` lines 17-27 (OPS array with labels and hints), line 54 (`isUnary = operator === "abs"`), lines 77 (`showPreview = !isAConnected && !isBConnected`), lines 101-103 (subtitle: preview vs "numeric operation"), lines 29-41 (`preview` function with ÷0/% 0 error strings), lines 143-154 (B row dimmed for unary); `lib/nodes/math.ts` lines 34-35 (division/modulo by zero throws), lines 18-19 (non-numeric input throws), line 39 (`abs` ignores B).

## Notes
The `abs` operator only reads input A; B is structurally present (the handle exists) but its value is never used in the executor. The live preview uses the static `defaultA`/`defaultB` values and does not call the executor — it is purely client-side calculation. The header icon size adjusts between `text-base` and `text-[9px]` depending on whether the operator label is a single character or multi-character (e.g. "min", "max").
