---
id: CANVAS-13
title: TextExpandModal opens for long text fields via expand button
severity: medium
source_files:
  - components/canvas/TextExpandModal.tsx
  - components/canvas/VarField.tsx
---

## What this tests
Multi-line text fields on nodes (rendered as `textarea` VarFields with an `expandTitle`) show a `Maximize2` expand button; clicking it opens a fullscreen `TextExpandModal` dialog for comfortable editing.

## Prerequisites
- App is running at http://localhost:3000
- Navigate to any workflow canvas at `/workflow/[slug]`
- Add a node with a multi-line text field (e.g. Anthropic node → System Prompt field, or Template String node)

## Steps
1. Hover over a `textarea`-style input field on a node (e.g. the System Prompt field on an Anthropic node)
2. Locate the small `Maximize2` icon button in the top-right corner of the field
3. Click the expand button
4. Observe the modal that opens
5. Edit the text in the modal
6. Close the modal by clicking the `X` button, pressing Esc, or clicking outside
7. Verify the edited text is reflected back in the node field

## Expected result
- A `Maximize2` (expand) icon button is visible in the top-right of textarea VarFields that have an `expandTitle` prop
- Clicking it opens a `Dialog` modal (65vw wide, dark themed) with:
  - A header showing the field's title in uppercase
  - An `X` close button in the header
  - Either a plain `textarea` (18 rows, mode="text") or a CodeMirror editor (mode="code") depending on the field type
  - A hint "Esc or click outside to close" below the editor
- Edits made in the modal are immediately propagated back to the node field (via `onChange`)
- Closing via `X`, Esc, or outside click dismisses the modal

## Failure indicators
- No expand button appears on textarea node fields
- Clicking the expand button has no effect (modal does not open)
- Changes made in the modal are not reflected in the node field after closing
- The modal opens but shows an empty/wrong value

## Severity rationale
The expand modal is the only way to comfortably edit long text (system prompts, templates, code); without it, multi-line editing is cramped.

## Source reference
`components/canvas/VarField.tsx` lines 287–296 — renders `<Maximize2>` button when `as === "textarea" && expandTitle`; clicking sets `expandOpen=true`. Lines 384+ — `<TextExpandModal open={expandOpen} onOpenChange={setExpandOpen} ...>`. `components/canvas/TextExpandModal.tsx` — Dialog (65vw) with text/code mode; on open, focuses textarea and moves cursor to end (lines 43–55).
