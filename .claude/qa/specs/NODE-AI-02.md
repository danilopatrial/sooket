---
id: NODE-AI-02
title: Anthropic node temperature hidden for Sonnet 4.6 and Opus 4.7
severity: medium
source_files:
  - components/canvas/nodes/AnthropicNode.tsx
  - lib/nodes/anthropic.ts
---

## What this tests
Verifies that the temperature slider is hidden and replaced with "fixed for this model" text when Sonnet 4.6 or Opus 4.7 is selected, and that Haiku 4.5 continues to show the slider.

## Prerequisites
- App is running at http://localhost:3000
- At least one workflow exists with an Anthropic node on its canvas

## Steps
1. Navigate to the canvas for any workflow containing an Anthropic node
2. Click the Anthropic node to select it and observe its body
3. With **Haiku 4.5** selected (default), verify the **Temperature** section shows a slider with a numeric readout (e.g. `0.70`) and the label "Temperature — creative vs precise"
4. Click the **Sonnet 4.6** model button
5. Observe the Temperature section — the slider must disappear and be replaced by the text "fixed for this model"
6. Click the **Opus 4.7** model button
7. Verify the Temperature section still shows only "fixed for this model" (no slider, no numeric readout)
8. Click back to **Haiku 4.5**
9. Verify the slider reappears with its previous numeric value and the "precise" / "creative" end-labels

## Expected result
- Haiku 4.5 selected: temperature slider visible, range 0–1, step 0.01, with numeric readout and end-labels
- Sonnet 4.6 selected: slider absent; section shows only the label "Temperature" and the text "fixed for this model"
- Opus 4.7 selected: same as Sonnet 4.6 — slider absent, "fixed for this model" text present
- Switching back to Haiku 4.5 restores the slider

## Failure indicators
- Temperature slider is visible when Sonnet 4.6 or Opus 4.7 is selected
- "fixed for this model" text does not appear for Sonnet 4.6 or Opus 4.7
- Slider is absent when Haiku 4.5 is selected
- Switching models does not update the Temperature section without a page reload

## Severity rationale
Sending a temperature parameter to models that do not support it causes API errors; hiding it prevents misconfiguration but is lower than critical since it affects UX rather than data integrity.

## Source reference
`components/canvas/nodes/AnthropicNode.tsx` lines 15-17 (`MODELS_WITHOUT_TEMPERATURE` set) and lines 152-184 (conditional render of slider vs "fixed for this model" text); `lib/nodes/anthropic.ts` lines 5 and 68-70 (temperature omitted from payload for those models).

## Notes
The executor (`lib/nodes/anthropic.ts`) independently checks `NO_TEMPERATURE_MODELS` before including temperature in the Anthropic API payload, so the restriction is enforced server-side even if the UI control were somehow visible.
