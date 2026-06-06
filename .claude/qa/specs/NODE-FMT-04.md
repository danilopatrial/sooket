---
id: NODE-FMT-04
title: Template String node slot interpolation, syntax highlight, dynamic handles
severity: high
source_files:
  - components/canvas/nodes/TemplateStringNode.tsx
  - lib/nodes/template-string.ts
---

## What this tests
Verifies that the Template String node auto-detects `{{slotName}}` placeholders from the template, creates a dynamic left-side input handle per slot, highlights slot references in sky blue, supports per-slot fallbacks, and produces the interpolated string as output.

## Prerequisites
- App is running at http://localhost:3000
- A workflow with a Template String node exists on the canvas
- The Debug panel is accessible

## Steps — canvas configuration

1. Navigate to the canvas containing a Template String node
2. Observe the node header: title **Template String**, sky Braces icon; subtitle reads **interpolate inputs into a string** when no slots are defined
3. Confirm no left-side input handles and one right-side output handle labeled **output** (sky dot)
4. In the **Template** textarea (placeholder `e.g. Hello {{name}}, your order {{orderId}} is ready`), type: `Hello {{name}}, your score is {{score}}`
5. Observe immediately:
   - `{{name}}` and `{{score}}` appear highlighted in **sky blue** within the textarea overlay
   - Two left-side input handles appear, one per slot, aligned with their respective rows in the slot list below
   - The header subtitle updates to **2 slots wired**
   - A slot list appears with columns **slot** and **if disconnected**: rows show `{{name}}` and `{{score}}` labels in sky text, each with a fallback VarField
6. Enter fallback `World` for `{{name}}` and `0` for `{{score}}`
7. Delete `{{score}}` from the template — the `{{score}}` slot row and its handle disappear; subtitle updates to **1 slot wired**
8. Click the **Expand editor** button (Maximize2 icon, top-right of textarea) — a TextExpandModal opens; edit the template in fullscreen and close; verify changes are applied
9. Observe the hint text below the textarea: `Use {{name}} to create an input slot`

## Steps — execution

10. Type template `Dear {{greeting}}, you have {{count}} messages.`; set fallback for `greeting` = `User` and `count` = `0`
11. Connect a text node `"Alice"` to the `greeting` handle; leave `count` disconnected
12. Open the Debug panel and send a test request
13. Expand the Template String trace — `output` value is `"Dear Alice, you have 0 messages."` (greeting from handle, count from fallback)
14. Connect a value `5` to the `count` handle and re-run — output is `"Dear Alice, you have 5 messages."`
15. Disconnect `greeting` and re-run — output is `"Dear User, you have 5 messages."` (fallback applied)
16. Use a template with a repeated slot: `{{item}} and {{item}} again`; connect value `"cat"` to `item` — output is `"cat and cat again"` (all occurrences replaced)

## Expected result
- Typing `{{slotName}}` in the template immediately creates a left-side input handle for `slotName`
- Removing `{{slotName}}` from the template removes the handle and slot row
- Slot references rendered in sky blue in the textarea; non-slot text remains white
- Subtitle: "interpolate inputs into a string" (0 slots), "N slot wired" / "N slots wired" (≥1)
- Connected slot: replaces all `{{name}}` occurrences with the connected value (coerced to string)
- Disconnected slot: replaces with the configured fallback (supports `$VAR_NAME` variable references)
- After slot replacement, `$VAR_NAME` expressions in the final string are also resolved
- Expand button opens TextExpandModal for fullscreen template editing
- Output handle emits the fully interpolated string

## Failure indicators
- Input handles do not appear when `{{slotName}}` is typed in the template
- `{{slotName}}` text is not highlighted in sky blue
- Header subtitle does not update when slots are added or removed
- Slot fallback values are not applied when the handle is disconnected
- Only the first occurrence of a repeated `{{slot}}` is replaced (should replace all)
- Output contains unreplaced `{{slotName}}` placeholders
- Expand button does not open the fullscreen editor

## Severity rationale
Template String is frequently used to assemble prompts for AI nodes; unresolved slots would silently pass literal `{{name}}` text to downstream LLMs.

## Source reference
`components/canvas/nodes/TemplateStringNode.tsx` lines 24-28 (`syncSlots` — auto-derives slots from template using `parseSlots`), lines 30-45 (`HighlightedTemplate` — sky-blue highlight for `{{slot}}` patterns), lines 92-95 (subtitle logic), lines 160-163 (Expand button), lines 186-218 (slot list with fallback VarFields); `lib/nodes/template-string.ts` lines 18-34 (slot iteration, split/join replacement, final `resolveVars` pass).

## Notes
Slot names must match `[A-Za-z_][A-Za-z0-9_]*` to be highlighted (same regex used in `HighlightedTemplate`). The executor uses `string.split(`{{name}}`).join(val)` to replace all occurrences at once. After all slot replacements, the full result string passes through `resolveVars` to handle any `$VAR_NAME` customer variable references that were not inside slot placeholders.
