---
id: VARFIELD-04
title: VarField expand button opens TextExpandModal for fullscreen editing
severity: medium
source_files:
  - components/canvas/VarField.tsx
  - components/canvas/TextExpandModal.tsx
---

## What this tests
Textarea VarFields that have an `expandTitle` prop show a `Maximize2` expand button; clicking it opens `TextExpandModal` in the current value and syncs changes back to the field.

## Prerequisites
- App is running at http://localhost:3000
- Navigate to any workflow canvas with a node that has a textarea VarField with an expand button (e.g. Anthropic node → System Prompt field, Template String body)

## Steps
1. Hover over a textarea VarField — observe the `Maximize2` icon in the top-right corner
2. Click the `Maximize2` icon
3. Edit text in the modal
4. Close the modal by clicking the `X` button or pressing Esc
5. Verify the field in the node reflects the edits

## Expected result
- `Maximize2` button is visible only on `as="textarea"` fields with an `expandTitle` prop
- Clicking it: sets `expandOpen=true`, opening `TextExpandModal` with the current `value` and the field's `expandTitle`
- Modal displays as a wide dialog (65vw) in text mode; edits call `onChange` immediately (two-way sync)
- Closing via `X`, Esc, or outside-click: sets `expandOpen=false`; edited text is preserved in the node field
- The expand button is positioned `absolute top-1.5 right-1.5 z-10`, does not interfere with typing

## Failure indicators
- The `Maximize2` button is absent on textarea VarFields
- Clicking the button has no effect
- Modal opens with wrong or empty value
- Edits made in the modal are lost when the modal closes

## Severity rationale
The expand modal is the only ergonomic way to edit long text (system prompts, templates); without it users are constrained to the small node textarea.

## Source reference
`components/canvas/VarField.tsx` lines 122 — `expandOpen` state; lines 287–297 — `Maximize2` button rendered only when `as === "textarea" && expandTitle`; lines 383–391 — `TextExpandModal` with `open={expandOpen}`, `onChange={onChange}`. `components/canvas/TextExpandModal.tsx` — Dialog with text/code modes, auto-focus on open.
