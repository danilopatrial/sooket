---
id: NODE-LOGIC-14
title: Null Check node fallback input disabled when connected
severity: medium
source_files:
  - components/canvas/nodes/NullCheckNode.tsx
  - lib/nodes/null-check.ts
---

## What this tests
Verifies that the Null Check node passes its input through when non-null/non-undefined, substitutes a fallback value when the input is null or undefined, disables the static fallback field when the `fallback` handle is connected, and supports both a static text fallback and a dynamic connected fallback.

## Prerequisites
- App is running at http://localhost:3000
- A workflow with a Null Check node exists on the canvas
- The Debug panel is accessible

## Steps — canvas configuration

1. Navigate to the canvas containing a Null Check node
2. Observe the node header: title **Null Check**, amber ShieldAlert icon, subtitle **fallback if value is empty**
3. Verify two left-side input handles: **value** (amber dot) and an unlabeled `fallback` handle (white/30 dot)
4. Verify one right-side output handle: **output** (amber dot)
5. In the **Fallback** section, observe a VarField (placeholder `backup value…`) — currently enabled
6. Type `default value` in the fallback field
7. Connect something to the `fallback` input handle — the VarField becomes **disabled** (grayed out, uneditable) and the label "using connected value" appears below it
8. Disconnect the `fallback` handle — the VarField becomes editable again; "using connected value" disappears

## Steps — execution (input is not null/undefined)

9. Connect input value `"hello"` to the `value` handle; set static fallback to `"fallback-text"`
10. Open Debug panel and run — `output` = `"hello"` (input passed through; fallback not used)
11. Connect input `0` (number zero) — `output` = `0` (zero is not null/undefined; passes through)
12. Connect input `false` — `output` = `false` (false is not null/undefined; passes through)
13. Connect input `""` (empty string) — `output` = `""` (empty string is not null/undefined; passes through)

## Steps — execution (input is null or undefined)

14. Connect a node that explicitly outputs `null` to the `value` handle; run — `output` = `"fallback-text"` (static fallback)
15. Leave the `value` handle disconnected entirely; run — `output` = `"fallback-text"` (undefined input → fallback)
16. Connect a node producing `undefined`; run — `output` = `"fallback-text"`

## Steps — dynamic fallback handle

17. Connect a text node emitting `"dynamic-fallback"` to the `fallback` input handle; clear the static fallback field
18. Connect `null` to the `value` handle; run — `output` = `"dynamic-fallback"` (connected fallback takes priority)
19. Verify the static fallback field is disabled while the handle is connected

## Steps — variable support in static fallback

20. Set static fallback to `$MY_VAR` (a customer variable); run with null input — `output` = the resolved variable value

## Steps — active:false propagation

21. Connect an upstream node that returns `active: false` to the `value` handle; run — `output` = `active: false` (does not substitute fallback for inactive inputs)

## Expected result
- Non-null, non-undefined input: passed through unchanged regardless of type (0, false, "" all pass through)
- Null or undefined input: fallback is used — dynamic handle first, static field second
- Disconnected `value` handle: treated as undefined → fallback is used
- Connected `fallback` handle: static fallback VarField is disabled + "using connected value" label shown
- Static fallback field supports `$VAR_NAME` variable interpolation
- Upstream `active: false` propagates through — fallback is NOT substituted for inactive inputs

## Failure indicators
- Empty string `""` triggers the fallback (should not — only null/undefined trigger it)
- `0` triggers the fallback (should not)
- `false` triggers the fallback (should not)
- Static fallback field remains editable while the `fallback` handle is connected
- "using connected value" label absent when handle is connected
- `active: false` from upstream causes fallback substitution instead of propagation

## Severity rationale
Incorrectly treating `""`, `0`, or `false` as null would silently substitute fallback values for valid data, corrupting downstream processing.

## Source reference
`components/canvas/nodes/NullCheckNode.tsx` lines 22 (`isFallbackConnected`), lines 91 (`disabled={isFallbackConnected}`), lines 97-99 ("using connected value" label); `lib/nodes/null-check.ts` lines 13-15 (`active: false` propagation), lines 18-20 (null/undefined check — not falsy check), lines 22-26 (dynamic fallback handle takes priority over static).

## Notes
The null check is strict: only `null` and `undefined` trigger fallback substitution. This differs from JavaScript's falsy check — `0`, `false`, `""`, and `NaN` all pass through unchanged. The `fallback` handle value is used as-is (not stringified); the static fallback field passes through `resolveVars` to support `$VAR_NAME` expressions.
