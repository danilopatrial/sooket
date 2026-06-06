---
id: NODE-LOGIC-01
title: If node all comparison operators equality numeric string and unary
severity: high
source_files:
  - components/canvas/nodes/IfNode.tsx
  - lib/nodes/if.ts
---

## What this tests
Verifies that the If node correctly evaluates all supported operators across four groups (Equality, Numeric, String, Check), routes the correct value through the `true` or `false` handle, and optionally passes a separate `data` handle value through instead of the input value.

## Prerequisites
- App is running at http://localhost:3000
- A workflow with an If node exists on the canvas; both `true` and `false` output handles are connected to observable outputs
- The Debug panel is accessible

## Steps — canvas configuration

1. Navigate to the canvas containing an If node
2. Observe the node header: title **If**, orange GitBranch icon, subtitle **split flow on a condition**
3. Locate the **Condition** dropdown; open it and confirm four optgroups with the following options:
   - **Equality**: `== equals`, `!= not equals`
   - **Numeric**: `> greater than`, `< less than`, `>= at least`, `<= at most`
   - **String**: `contains`, `starts with`, `ends with`
   - **Check**: `is empty / null`, `is truthy / set`
4. Confirm left-side handles: **value** (orange), **compare** (white/30), **data** (sky)
5. Confirm right-side handles: **true** (emerald), **false** (rose)

## Steps — execution (Equality)

6. Set operator to `== equals`; set **Compare To** to `hello`; connect input value `"hello"`; run — `true` handle fires with value `"hello"`, `false` is inactive
7. Connect input `"world"`; run — `false` fires, `true` is inactive
8. Set operator to `!= not equals`; input `"world"` vs compare `"hello"` — `true` fires

## Steps — execution (Numeric)

9. Set operator to `> greater than`; compare to `5`; input `10` — `true` fires
10. Input `3` — `false` fires
11. Input `"abc"` (non-numeric) — `false` fires (NaN guard: returns false when either value is NaN)
12. Set operator to `<= at most`; compare `10`; input `10` — `true` fires (boundary inclusive)
13. Input `11` — `false` fires

## Steps — execution (String)

14. Set operator to `contains`; compare to `world`; input `"hello world"` — `true` fires
15. Input `"hello"` — `false` fires (does not contain "world")
16. Set operator to `starts with`; compare `hel`; input `"hello"` — `true` fires
17. Set operator to `ends with`; compare `rld`; input `"hello world"` — `true` fires

## Steps — execution (Check)

18. Set operator to `is empty / null`; no compare needed; input `""` — `true` fires
19. Input `null` — `true` fires
20. Input `0` — `false` fires (0 is not empty/null; `toText(0)` is `"0"`, not `""`)
21. Set operator to `is truthy / set`; input `1` — `true` fires; input `0` — `false` fires; input `""` — `false` fires; input `"hello"` — `true` fires

## Steps — data pass-through

22. Connect a different value (e.g. `"routed-data"`) to the **data** handle; set condition to `== equals` with matching input
23. Run — the `true` handle emits `"routed-data"` (not the input value); `false` handle emits `"routed-data"` on mismatch
24. Disconnect the **data** handle; re-run — output reverts to the input value on the matching handle

## Expected result
- All 11 operators produce correct boolean results per their documented semantics
- Numeric operators return `false` (not an error) when either side is NaN
- `==` / `!=` compare stringified values (so `"5"` == `"5"` is true; `5` == `"5"` is also true)
- `isEmpty`: true for `null`, `undefined`, and `""` only
- `isTruthy`: `!!value` — false for `null`, `undefined`, `0`, `""`, `false`
- Active output handle emits `data` value if connected, otherwise `input` value
- Inactive output handle returns `active: false`

## Failure indicators
- A numeric operator returns `true` for non-numeric input (should return `false` via NaN guard)
- `isEmpty` returns `true` for `0` or `false`
- `isTruthy` returns `true` for `0` or `""`
- Both `true` and `false` handles fire simultaneously for the same condition
- The `data` pass-through value is not used when the `data` handle is connected

## Severity rationale
The If node is the primary branching mechanism; wrong operator evaluation silently routes requests to the wrong workflow branch.

## Source reference
`components/canvas/nodes/IfNode.tsx` lines 22-34 (OPERATORS array with groups/labels), lines 74-78 (handle colors); `lib/nodes/if.ts` lines 32-45 (switch statement for all operators), lines 35-38 (NaN guard for numeric operators), lines 42-43 (`isEmpty` and `isTruthy` definitions), lines 47-56 (data pass-through and handle routing).

## Notes
`==` and `!=` compare stringified values via `toText()` — they are string equality, not JavaScript `===` by type. For strict type-aware comparison, use upstream Type Cast nodes. The `compare` handle overrides the **Compare To** field when connected; its value is used raw (not stringified before comparison).
