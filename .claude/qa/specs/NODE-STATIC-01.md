---
id: NODE-STATIC-01
title: Text node static string output with expandable editor
severity: medium
source_files:
  - components/canvas/nodes/TextNode.tsx
---

## What this tests
Verifies that the Text node outputs a configured static string value, has no input handle, provides a multi-line VarField for content entry, and supports fullscreen editing via an expand button.

## Prerequisites
- App is running at http://localhost:3000
- A workflow with a Text node exists on the canvas
- The Debug panel is accessible

## Steps — canvas configuration

1. Navigate to the canvas containing a Text node
2. Observe the node header: title **Text**, teal "T" icon badge, subtitle **outputs this exact text**
3. Confirm the node has **no left-side input handle** — only one right-side output handle (`output`, teal dot)
4. In the **Content** section, observe a VarField textarea (4 rows, placeholder `Enter text…`)
5. Type `Hello, world!` in the Content field
6. Verify the node persists the text after saving (wait for "Saved" indicator in the canvas toolbar)
7. Click the expand button (Maximize2, top-right of the textarea) — a TextExpandModal opens for fullscreen editing; edit text and close; verify changes are applied

## Steps — execution

8. Connect the Text node's output to the workflow's Output node; open the Debug panel
9. Run a test request — the response body should be `Hello, world!` (the exact text entered)
10. Change the text to a multi-line value and run again — the full multi-line string is returned

## Steps — variable interpolation

11. If a customer variable `MY_NAME` is configured, set the Content to `Hello, $MY_NAME!`; run — `output` = `"Hello, Alice!"` (variable resolved at runtime via VarField)

## Expected result
- No input handle; single output handle on the right
- Output is the exact string entered in the Content field
- Multi-line text is supported (4-row textarea with expand option)
- VarField supports `$VAR_NAME` customer variable interpolation
- Expand button opens TextExpandModal for fullscreen editing; changes are applied on close

## Failure indicators
- Node has a left-side input handle (should have none)
- Output does not match the Content field value
- Expand button absent or does not open a fullscreen modal
- Text with newlines is truncated to a single line

## Severity rationale
The Text node is the primary way to supply static string inputs (prompts, API keys, labels) to other nodes; an incorrect output would silently feed wrong values to downstream nodes.

## Source reference
`components/canvas/nodes/TextNode.tsx` line 28 (source-only handle, no target handle), lines 46-53 (VarField with 4 rows, expandTitle "Content").

## Notes
The Text node has no execution file — the workflow engine reads `node.data.text` directly as a static value. The VarField `expandTitle="Content"` controls the title shown in the TextExpandModal.
