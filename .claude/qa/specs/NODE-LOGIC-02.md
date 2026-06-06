---
id: NODE-LOGIC-02
title: If node compare handle hidden for unary operators
severity: medium
source_files:
  - components/canvas/nodes/IfNode.tsx
  - lib/nodes/if.ts
---

## What this tests
Verifies that the `compare` input handle and the **Compare To** field are hidden when a unary operator (`is empty / null` or `is truthy / set`) is selected, and reappear when a binary operator is selected.

## Prerequisites
- App is running at http://localhost:3000
- A workflow with an If node exists on the canvas

## Steps

1. Navigate to the canvas containing an If node
2. Set the **Condition** dropdown to any binary operator (e.g. `== equals`)
3. Confirm the following are all visible:
   - A **compare** input handle on the left side (white/30 dot)
   - The **Compare To** label and VarField below the Condition dropdown
4. Change the operator to `is empty / null` (in the **Check** group)
5. Verify immediately:
   - The **compare** handle on the left side **disappears**
   - The **Compare To** label and VarField **disappear**
   - The node body becomes shorter (no Compare To section)
6. Change to `is truthy / set` — same result: compare handle and Compare To field are absent
7. Change back to `== equals` — compare handle and Compare To field reappear
8. Test each binary operator in turn (`!=`, `>`, `<`, `>=`, `<=`, `contains`, `starts with`, `ends with`) and confirm the compare handle and Compare To field are present for all of them
9. Connect something to the **compare** handle while a binary operator is selected — observe the Compare To VarField becomes disabled and shows "using connected value" below it
10. Switch to a unary operator while the compare handle is still connected — handle disappears from the UI (though the edge may still be in the canvas data); switch back — handle and "using connected value" label reappear

## Expected result
- Unary operators (`isEmpty`, `isTruthy`): no `compare` handle, no **Compare To** section
- All other operators (binary): `compare` handle present, **Compare To** section visible
- When `compare` handle is connected in binary mode: VarField is disabled with "using connected value" hint
- Switching between unary and binary operators updates the UI immediately

## Failure indicators
- `compare` handle visible when `is empty / null` or `is truthy / set` is selected
- Compare To field visible for unary operators
- Compare To field absent for binary operators
- No "using connected value" label when the compare handle is connected
- Compare To VarField remains editable when the compare handle is connected

## Severity rationale
Exposing the compare handle for unary operators is misleading and could lead users to wire connections that are silently ignored; hiding it prevents configuration errors.

## Source reference
`components/canvas/nodes/IfNode.tsx` line 36 (`UNARY` set containing `"isEmpty"` and `"isTruthy"`), line 46 (`isUnary = UNARY.has(operator)`), lines 90-92 (compare handle rendered only when `!isUnary`), lines 143-164 (Compare To section rendered only when `!isUnary`), lines 160-163 ("using connected value" label when `isCompareConnected`).

## Notes
The executor does not use `compareVal` at all for unary operators — `isEmpty` and `isTruthy` only inspect `inputVal`. Hiding the compare handle in the UI correctly reflects this; if a `compare` edge exists in saved workflow data while a unary operator is configured, the executor ignores it.
