---
id: NODE-STATIC-03
title: Boolean node true/false toggle
severity: low
source_files:
  - components/canvas/nodes/BooleanNode.tsx
---

## What this tests
Verifies that the Boolean node outputs a static boolean value toggled by a single button, switches between true and false with matching color styling, and has no input handle.

## Prerequisites
- App is running at http://localhost:3000
- A workflow with a Boolean node exists on the canvas
- The Debug panel is accessible

## Steps — canvas configuration

1. Navigate to the canvas containing a Boolean node
2. Observe the node: title **Boolean**, emerald `01` icon badge, subtitle **true or false**; node is narrow (no extra config fields)
3. Confirm the node has **no left-side input handle** — only one right-side output handle (`output`, emerald dot)
4. In the node body, observe a single full-width button; its default state shows **false** in rose/red styling (dark rose background, rose border, rose text)
5. Click the button — it switches to **true** with emerald green styling (emerald background, emerald border, emerald text)
6. Click again — reverts to **false** with rose styling
7. Verify the toggle persists after canvas auto-save (wait for "Saved" indicator)

## Steps — execution

8. Set the toggle to **true**; open the Debug panel and run — `output` = `true` (boolean, not the string `"true"`)
9. Set the toggle to **false`; run — `output` = `false` (boolean)

## Expected result
- Single toggle button: false (rose) ↔ true (emerald)
- No left-side input handle
- Execution output is a JavaScript boolean (`true` or `false`), not a string
- Default state: false

## Failure indicators
- Node has a left-side input handle (should have none)
- Output is the string `"true"` instead of boolean `true`
- Toggle button does not change color when clicked
- False state shows emerald color (should be rose)

## Severity rationale
Low: the node has a single, clear behavior; a boolean type mismatch (string vs boolean) would be caught quickly by downstream If or Type Cast nodes.

## Source reference
`components/canvas/nodes/BooleanNode.tsx` line 27 (source-only handle), lines 42-52 (toggle button: emerald for true, rose for false), line 43 (`!value` toggle on click).

## Notes
The Boolean node has no execution file — the workflow engine reads `node.data.value` (boolean) directly as the static output. Default value is `false` (line 14: `d.value ?? false`).
