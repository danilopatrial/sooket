---
id: NODE-AI-01
title: Anthropic node model, system prompt, and temperature config
severity: high
source_files:
  - components/canvas/nodes/AnthropicNode.tsx
  - lib/nodes/anthropic.ts
---

## What this tests
Verifies that the Anthropic node exposes model selection (Haiku 4.5, Sonnet 4.6, Opus 4.7), a system prompt field, and a temperature slider, and that the selected model is correctly reflected in the node header subtitle.

## Prerequisites
- App is running at http://localhost:3000
- At least one workflow exists; navigate to its canvas
- The Anthropic node has been added to the canvas

## Steps
1. Navigate to the canvas for any workflow (e.g. `http://localhost:3000/workflow/<slug>`)
2. Drag the **Anthropic** node from the sidebar onto the canvas (category: AI)
3. Observe the node header: a violet "A" icon, the label "Anthropic", and a subtitle showing the current model label in the monospace font below it
4. In the **Model** section, verify three buttons are visible: **Haiku 4.5** (affordable), **Sonnet 4.6** (balanced), **Opus 4.7** (most capable)
5. Confirm **Haiku 4.5** is selected by default (highlighted with a violet background)
6. Observe the **Temperature** section below System Prompt — a slider with range 0–1, step 0.01, labeled "Temperature — creative vs precise" with "precise" on the left and "creative" on the right
7. Note the current temperature value displayed as a monospace decimal (default `0.70`)
8. Drag the temperature slider to approximately 0.30 and observe the numeric readout updates in real time
9. Click **Sonnet 4.6** in the Model section
10. Observe that the **Temperature** section changes to display the text "fixed for this model" (slider hidden)
11. Click **Opus 4.7**
12. Verify the Temperature section still shows "fixed for this model"
13. Click **Haiku 4.5**
14. Verify the temperature slider reappears
15. In the **System Prompt** field, clear the placeholder and type a custom string (e.g. "You are a pirate")
16. Verify the text is accepted and persisted after saving the canvas (wait for "Saved" indicator in the toolbar)

## Expected result
- Three model buttons rendered: Haiku 4.5 / Sonnet 4.6 / Opus 4.7, with sublabels "affordable" / "balanced" / "most capable" respectively
- Haiku 4.5 is selected by default; header subtitle reads "Haiku 4.5"
- Temperature slider (0–1, step 0.01, default 0.70) is visible only when Haiku 4.5 is selected
- Selecting Sonnet 4.6 or Opus 4.7 replaces the slider with the text "fixed for this model"
- System Prompt VarField accepts multi-line text; placeholder is "You are a helpful assistant"
- All changes are persisted after the 800 ms autosave debounce

## Failure indicators
- Temperature slider is visible when Sonnet 4.6 or Opus 4.7 is selected
- Temperature slider is missing when Haiku 4.5 is selected
- Model buttons are absent or have incorrect labels/sublabels
- Header subtitle does not update to reflect the newly selected model
- System prompt field is absent or does not accept input
- Canvas does not show "Saved" after editing

## Severity rationale
The Anthropic node is the primary LLM integration point; misconfigured model or temperature settings directly affect every AI-dependent workflow.

## Source reference
`components/canvas/nodes/AnthropicNode.tsx` — MODELS array (lines 9-13), `MODELS_WITHOUT_TEMPERATURE` set (lines 15-17), temperature render branch (lines 152-184)

## Notes
`claude-sonnet-4-6` and `claude-opus-4-7` are in `NO_TEMPERATURE_MODELS` in `lib/nodes/anthropic.ts` (line 5); the UI mirrors this via `MODELS_WITHOUT_TEMPERATURE` in `AnthropicNode.tsx`.

**Fallback default:** when a node's stored `data` lacks a `model` field, both the UI
(`AnthropicNode.tsx`) and the executor (`lib/nodes/anthropic.ts`) fall back to
`claude-sonnet-4-6` — matching the registry `defaultData`. A node missing its `model`
field therefore renders with Sonnet 4.6 selected and the Temperature section showing
"fixed for this model" (Sonnet has no temperature control). Previously the UI fell back
to Haiku 4.5 while the executor fell back to Sonnet 4.6; these are now aligned so the
displayed model always matches the one that executes.
