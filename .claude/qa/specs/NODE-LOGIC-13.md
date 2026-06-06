---
id: NODE-LOGIC-13
title: Merge node First/Join/Object modes, separator, slot keys
severity: high
source_files:
  - components/canvas/nodes/MergeNode.tsx
  - lib/nodes/merge.ts
---

## What this tests
Verifies that the Merge node combines multiple inputs via First (first active), Join (concatenate with separator), or Object (key-value map) modes; shows the separator field only in Join mode; shows editable slot key fields only in Object mode; and respects input count limits (2–8).

## Prerequisites
- App is running at http://localhost:3000
- A workflow with a Merge node exists on the canvas; at least 2 upstream values are available
- The Debug panel is accessible

## Steps — canvas configuration

1. Navigate to the canvas containing a Merge node
2. Observe the node header: title **Merge**, emerald Merge icon; subtitle reads **first active** (default mode)
3. Verify N left-side input handles (emerald dots) — one per configured input (default 2)
4. Verify one right-side output handle: **output** (emerald dot)
5. In the **Mode** section, verify a 3-column grid: **First**, **Join**, **Object**
6. In the **Inputs** section, note +/− buttons to add/remove inputs; default shows 2 input rows labeled **1** and **2**
7. Click **+** — a third input row appears (labeled **3**); handle count increases; subtitle updates to reflect count if mode is join/object
8. Click **−** — row 3 disappears; with 2 rows, **−** becomes disabled (minimum 2)
9. Add inputs up to 8 — **+** becomes disabled (maximum 8)

## Steps — First mode

10. Select **First** mode; connect `"alpha"` to input-0 and `"beta"` to input-1
11. Run — `output` = `"alpha"` (first active input wins)
12. Disconnect input-0 (leave input-1 connected with `"beta"`); run — `output` = `"beta"` (first active is now input-1)
13. Disconnect all inputs; run — `output` = `active: false`

## Steps — Join mode

14. Select **Join** mode; notice a **Separator** VarField appears (placeholder `e.g. ", " or " "`)
15. Verify header subtitle updates to **join 2** (or the current input count)
16. Enter separator `, `; connect `"hello"` to input-0 and `"world"` to input-1
17. Run — `output` = `"hello, world"`
18. Clear separator (empty string); run — `output` = `"helloworld"`
19. Disconnect input-0; run — `output` = `"world"` (only active input, no separator needed)
20. Switch to **First** mode — Separator field disappears

## Steps — Object mode

21. Select **Object** mode; observe the input rows now show editable key name text inputs instead of type labels
22. Header subtitle updates to **object (2)**
23. Default key names are `field0` and `field1`; rename them to `name` and `age`
24. Connect `"Alice"` to input-0 and `30` to input-1
25. Run — `output` = `{"name": "Alice", "age": 30}`
26. Disconnect input-0; run — `output` = `{"age": 30}` (only active inputs included)
27. Leave all key names as defaults (`field0`, `field1`) and run — keys in output use the default names

## Expected result
- Mode selector updates header subtitle: "first active" / "join N" / "object (N)"
- Separator field: visible only in Join mode
- Slot key inputs: visible only in Object mode; default `field{i}` per input
- Input count: min 2, max 8; +/− buttons enforce limits
- First mode: returns the first active input value unchanged
- Join mode: stringifies all active input values, joins with the separator string
- Object mode: builds `{key: value}` for each active input; skips inactive inputs
- All inputs inactive: returns `active: false`

## Failure indicators
- Separator field visible in First or Object mode
- Slot key inputs visible in First or Join mode
- Output includes values from disconnected/inactive inputs
- All inputs disconnected does not return `active: false`
- Join output is an array instead of a concatenated string
- Object output uses numeric indices instead of configured key names

## Severity rationale
Incorrect merge behavior silently produces wrong output shapes (wrong keys, wrong join) that corrupt downstream JSON parsing or LLM prompts.

## Source reference
`components/canvas/nodes/MergeNode.tsx` lines 18-19 (MIN/MAX_INPUTS), lines 21-25 (MODES), line 81 (`modeLabel` subtitle), lines 148-161 (Join separator field, conditional), lines 207-224 (Object mode slot key inputs vs type labels); `lib/nodes/merge.ts` lines 22-28 (collect active inputs), line 30 (all-inactive returns inactive), lines 35-37 (First: first active value), lines 40-42 (Join: toText + join with separator), lines 44-49 (Object: slotKeys[i] key lookup with field{i} fallback).

## Notes
The Merge node evaluates ALL connected inputs (not lazily) — every connected upstream chain runs regardless of mode. In Object mode, inactive inputs are excluded from the output object (their keys are simply absent). The `toText()` coercion in Join mode serializes objects to JSON strings.
