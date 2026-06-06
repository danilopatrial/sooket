---
id: NODE-LOGIC-06
title: A/B Split node weighted routing, weight validator red at ≠100%
severity: medium
source_files:
  - components/canvas/nodes/ABSplitNode.tsx
  - lib/nodes/ab-split.ts
---

## What this tests
Verifies that the A/B Split node creates a dynamic output handle per branch, validates that weights sum to exactly 100% (showing a red indicator otherwise), enforces branch count limits (2–8), and randomly routes traffic according to configured weights at execution time.

## Prerequisites
- App is running at http://localhost:3000
- A workflow with an A/B Split node exists on the canvas
- The Debug panel is accessible

## Steps — canvas configuration

1. Navigate to the canvas containing an A/B Split node
2. Observe the node header: title **A/B Split**, green Dices icon; subtitle shows current weights (default: **A:50% B:50%**)
3. Confirm one left-side input handle (**input**, green dot) and two right-side output handles (**A** and **B**, green dots)
4. Confirm two branch rows labeled **A** (green chip) and **B**; each has a weight input (0–100) and a **%** suffix; default weights are 50 and 50
5. Observe the **total** indicator at the bottom: shows **100%** in green when weights sum to 100
6. Change branch A's weight to `30` — total indicator shows **80%** in red with **≠ 100** suffix; header subtitle updates to **A:30% B:50%**
7. Change branch B's weight to `70` — total indicator returns to **100%** in green
8. Click **Add branch** — branch **C** appears with weight `0`; total now shows **170%** in red (100 not reached); Add another branch up to **D**, **E**... up to the maximum of **8 total** branches
9. With 8 branches, confirm the **Add branch** button is hidden
10. Click × on a branch row (not A or B) — branch is removed; with only 2 branches remaining, confirm the × buttons are **disabled** (grayed out, unclickable)
11. Output label rows at the bottom show branch letter and weight percentage (e.g. **A · 30%**)

## Steps — execution (valid weights)

12. Set branches to A=70%, B=30%; set both handles to observable outputs
13. Open the Debug panel and run ~10 test requests
14. Verify that roughly 70% route to A and 30% to B (statistical, not exact); confirm only one branch fires per request
15. Each firing branch emits the original input value as its output; inactive branches return `active: false`

## Steps — execution (invalid weights)

16. Change A to 60%, B to 20% (total 80%); run — expect error: **A/B Split: branch weights must sum to 100 (currently 80)**
17. Remove all branches (reduce to 2 minimum) and set both to 0; run — same error with total 0

## Steps — error case

18. Disconnect the `input` handle and run (with valid weights) — expect error: **A/B Split node has no input connected**

## Expected result
- Default: 2 branches (A=50%, B=50%), minimum 2, maximum 8
- Weight total indicator: green when total === 100, red + "≠ 100" suffix when total ≠ 100
- × button disabled when at minimum 2 branches; **Add branch** hidden at maximum 8
- Header subtitle: lists all branches as "A:N% B:N%..." dynamically
- Execution with valid weights: exactly one branch fires per request, chosen via weighted random selection
- Weights not summing to 100: execution throws with the current total in the error message
- Output passes the input value through unchanged

## Failure indicators
- Weight total indicator stays green when weights don't sum to 100
- Multiple branch handles fire simultaneously for a single request
- × button is clickable when only 2 branches remain
- Add branch button appears when 8 branches are already configured
- Execution succeeds when weights sum to 80% or 120% (should throw)

## Severity rationale
Incorrect weight validation allows misconfigured distributions to execute silently with skewed traffic splits; at non-100% totals the behavior would be undefined (last branch catches all remaining probability).

## Source reference
`components/canvas/nodes/ABSplitNode.tsx` lines 19-21 (BRANCH_LABELS, MAX_BRANCHES, MIN_BRANCHES), lines 52-53 (totalWeight/weightValid), lines 66-69 (weight clamped 0–100), lines 75-77 (subtitle), lines 173-181 (total indicator with red/green color); `lib/nodes/ab-split.ts` lines 20-23 (total !== 100 throws), lines 25-31 (weighted random selection), line 33 (floating-point fallback to last branch).

## Notes
Branch IDs are internal random strings (not "A", "B") — the letter labels are positional in the `BRANCH_LABELS` string and exist only in the UI. The executor selects by branch `id`, not letter. Floating-point rounding is handled by falling through to the last branch if no branch was selected (line 33).
