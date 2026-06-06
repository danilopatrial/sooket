---
id: NODE-STATIC-02
title: Number node fixed value or slider with min/max range
severity: medium
source_files:
  - components/canvas/nodes/NumberNode.tsx
---

## What this tests
Verifies that the Number node outputs either a fixed value (entered directly) or a slider-based value within a configurable min/max range, disables the slider section when a fixed value is set, and updates the header subtitle to reflect the current output value.

## Prerequisites
- App is running at http://localhost:3000
- A workflow with a Number node exists on the canvas
- The Debug panel is accessible

## Steps — canvas configuration

1. Navigate to the canvas containing a Number node
2. Observe the node header: title **Number**, amber "#" icon, subtitle shows `value: 0.500` (default slider mode, value=0.5)
3. Confirm no left-side input handle — only one right-side output handle (`output`, amber dot)
4. In the **Fixed Value** field (placeholder `leave empty to use slider`), type `42`
5. Observe: subtitle updates to `fixed: 42`; the **Range** and **Value** slider section becomes **dimmed and unresponsive** (opacity reduced, pointer-events disabled)
6. Clear the Fixed Value field — slider section re-enables; subtitle returns to `value: 0.500`
7. In the **Range** section, verify two fields: **Min** (default `0`) and **Max** (default `1`)
8. Change Min to `0` and Max to `100`; observe the slider step is now 1 (100/100)
9. Drag the **Value** slider to approximately 75 — the numeric readout and subtitle update to `value: 75.000`
10. Confirm the slider clamps: setting value below Min or above Max snaps to the boundary

## Steps — execution (slider mode)

11. Set Min=0, Max=1, drag slider to 0.7; clear Fixed Value; open Debug panel and run — `output` = approximately `0.7` (float)
12. Set Min=0, Max=100, slider at 50; run — `output` = `50` or `50.000` (numeric)

## Steps — execution (fixed value mode)

13. Type `1024` in Fixed Value; run — `output` = `1024` (integer or float as entered)
14. Type `3.14159` — `output` = `3.14159`
15. Clear Fixed Value — slider mode resumes; output reverts to slider value

## Expected result
- No input handle; single output handle on the right
- Fixed Value set: outputs that exact number; Range/slider section dimmed
- Fixed Value empty (null): outputs slider value clamped to [min, max]
- Header subtitle: `fixed: {value}` when fixed; `value: {n.nnn}` (3 decimal places) in slider mode
- Slider step = `max(0.001, (max - min) / 100)`
- Slider value is clamped to [min, max]: `Math.min(Math.max(value, min), max)`

## Failure indicators
- Node has a left-side input handle (should have none)
- Range/slider section remains interactive when Fixed Value is set
- Subtitle does not update when Fixed Value is entered or slider is moved
- Slider value exceeds the configured Min or Max
- Clearing Fixed Value does not restore slider mode

## Severity rationale
The Number node is used to supply numeric parameters (temperatures, thresholds, counts) to other nodes; an incorrect value silently misconfigures downstream logic.

## Source reference
`components/canvas/nodes/NumberNode.tsx` line 38 (source-only handle), lines 24-26 (`isFixed`, `safeValue`, `step` calculations), lines 47-49 (subtitle: "fixed: N" vs "value: N.NNN"), lines 74 (Range/slider dimmed when `isFixed`), lines 61-70 (Fixed Value input: empty → null), lines 113-122 (Slider with computed step).

## Notes
The Number node has no execution file — the workflow engine reads `node.data.fixedValue` (when set and not NaN) or `node.data.value` (slider value) directly as the static output. The Fixed Value field stores `null` when cleared; `null` and `NaN` both result in slider mode being active.
