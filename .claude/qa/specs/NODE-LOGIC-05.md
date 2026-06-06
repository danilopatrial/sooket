---
id: NODE-LOGIC-05
title: Router node multi-case routing, dynamic handles, optional default
severity: high
source_files:
  - components/canvas/nodes/RouterNode.tsx
  - lib/nodes/router.ts
---

## What this tests
Verifies that the Router node creates a dynamic output handle per case, matches the input value against configured match values, fires only the matching handle (or the default when no case matches), and supports an optional `data` pass-through.

## Prerequisites
- App is running at http://localhost:3000
- A workflow with a Router node exists on the canvas
- The Debug panel is accessible

## Steps — canvas configuration

1. Navigate to the canvas containing a Router node
2. Observe the node header: title **Router**, orange Shuffle icon; subtitle reads **route by value** when no cases are defined
3. Confirm two left-side input handles: **input value** (orange dot) and **data** (sky dot, with "pass-through" label when connected)
4. Confirm no right-side output handles yet; output area shows **no outputs yet**
5. Click **Add case** — a case row appears with two VarField columns: **label** (placeholder `label`) and **match value** (placeholder `exact value`, orange text)
6. Enter label `success` and match value `200`; a violet right-side output handle appears aligned with the row; output label row shows `success`
7. Click **Add case** again; enter label `error` and match `500`; a second violet handle appears
8. Verify the header subtitle updates to **2 cases**
9. Click × on the `error` case row — the row, its handle, and output label disappear; subtitle updates to **1 case**
10. Locate the **Default fallback** toggle (pill switch, off by default); click it — it turns on; a white/30 `default` handle appears at the bottom right; subtitle updates to **1 case + default**
11. Click the toggle again — default handle disappears
12. Re-enable it; note the output label row shows `default` in muted text

## Steps — execution (case match)

13. Set up two cases: `low` matching `"small"`, `high` matching `"large"`; enable Default fallback
14. Connect an input value `"small"` and open the Debug panel
15. Run — expand the trace: the `low` case handle fires with the input value; `high` and `default` are inactive
16. Change input to `"large"` — `high` fires; `low` and `default` are inactive
17. Change input to `"unknown"` — `default` fires; `low` and `high` are inactive

## Steps — execution (numeric and boolean matching)

18. Add a case with match value `42`; connect a numeric input `42`
19. Run — the case fires (numeric comparison: `raw === 42`, not `"42" === "42"`)
20. Add a case with match value `true`; connect boolean `true`
21. Run — the boolean case fires (comparison: `String(true) === "true"`)

## Steps — execution (no match, no default)

22. Disable the Default fallback; connect input `"nomatch"`
23. Run — all case handles return `active: false`; no error thrown

## Steps — data pass-through

24. Connect a different value to the `data` handle (e.g. `"routed-payload"`); trigger a match
25. Run — the matching output handle emits `"routed-payload"` (not the input value)

## Steps — error case

26. Disconnect the `input` handle and run — expect error: **Router node has no input connected**

## Expected result
- Each case row creates a violet right-side output handle aligned with its label row
- Default toggle adds/removes a white/30 `default` handle
- Subtitle: "route by value" (0 cases), "N case(s)" or "N case(s) + default"
- Output label shows `c.label` if set, otherwise `c.match`, otherwise `"(case)"`
- Matching: string equality for strings, numeric equality for numbers, string-boolean for booleans
- First matching case fires; all other handles return `active: false`
- No match + default enabled: `default` fires
- No match + no default: all handles inactive (no error)
- `data` handle value used as pass-through when connected instead of the input value

## Failure indicators
- Multiple case handles fire simultaneously for the same input
- `default` handle fires when a case matched
- Numeric input `42` does not match a case with match value `"42"` (should match via numeric comparison)
- Removing a case does not remove its output handle
- No-match with no default causes an unhandled error instead of returning inactive
- Header subtitle does not update when cases or default toggle changes

## Severity rationale
Incorrect routing silently sends traffic to the wrong branch; if both the matched and default handles fire, downstream nodes receive duplicate invocations.

## Source reference
`components/canvas/nodes/RouterNode.tsx` lines 82-85 (subtitle logic), lines 115-135 (per-case and default handles), lines 230-253 (Default fallback toggle); `lib/nodes/router.ts` lines 38-46 (match logic: numeric/boolean/string), lines 48-51 (single matched handle or default fires, all others inactive).

## Notes
Case matching uses `Array.find` — only the **first** matching case fires even if multiple cases share the same match value. The `data` handle overrides the pass-through value only when its upstream is active; if `data` returns `active: false`, the original input value is used instead.
