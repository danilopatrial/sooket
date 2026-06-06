---
id: NODE-XFRM-02
title: Regex Replace node pattern, replacement, flags, live preview with error
severity: medium
source_files:
  - components/canvas/nodes/RegexReplaceNode.tsx
  - lib/nodes/regex-replace.ts
---

## What this tests
Verifies that the Regex Replace node applies a configurable regex pattern with flags to its input string, supports dynamic pattern and replacement via input handles, shows a live preview against a sample string, and displays an error in the preview for invalid regex patterns.

## Prerequisites
- App is running at http://localhost:3000
- A workflow with a Regex Replace node exists on the canvas
- The Debug panel is accessible

## Steps — canvas configuration

1. Navigate to the canvas containing a Regex Replace node
2. Observe the node header: title **Regex Replace**, teal Replace icon, subtitle **find & replace with regex**
3. Verify three left-side input handles: **input** (teal, top), **pattern** (teal), **replace** (teal); and one right-side output handle labeled **string** (teal)
4. In the **Pattern** field (VarField, placeholder `e.g. \d+ or [aeiou]`): type `\d+`
5. In the **Replace** field (VarField, placeholder `e.g. "**" or $1`): type `NUM`
6. In the **Flags** field (default `g`, maxLength 6): leave as `g`
7. Observe the **Preview** section at the bottom: immediately shows the result of applying the regex to the sample string `"Hello World 123"` — expected: `"Hello World NUM"` (teal text)
8. Change Replace to `NUM-$&` — preview updates to `"Hello World NUM-123"` (capture group `$&` = matched text)
9. Enter an invalid pattern in Pattern (e.g. `[unclosed`) — preview shows **Invalid regex** in rose/red
10. Fix the pattern — preview returns to the valid result
11. Connect something to the `pattern` handle — the **Pattern** label turns teal; the pattern handle overrides the static field
12. Observe the Flags field: accepts strings like `g`, `gi`, `gim` (max 6 characters)

## Steps — execution

13. Set pattern to `\d+`, replace to `NUM`, flags to `g`; connect text input `"abc 123 def 456"`
14. Open Debug panel and run — `output` = `"abc NUM def NUM"` (global replace, all matches replaced)
15. Change flags to empty string (or `i` without `g`) — only the first match is replaced: `"abc NUM def 456"`
16. Set flags to `gi`; pattern `hello`; replace `hi`; input `"Hello world hello"` — `output` = `"hi world hi"` (case-insensitive global)
17. Connect a text node `"world"` to the `pattern` handle; run — pattern override applies; static Pattern field is ignored
18. Set pattern to an empty string (no pattern); run — `output` = the input string unchanged (empty pattern skips replacement)

## Steps — error cases

19. Set an invalid pattern (e.g. `(?invalid)`) and run — expect error: **Regex Replace: invalid pattern "(?invalid)" with flags "g"**
20. Note: the preview shows "Invalid regex" before executing; execution throws with the actual pattern/flags in the message

## Expected result
- Live preview applied to sample `"Hello World 123"` in real time as pattern/replace/flags are typed
- Valid regex: preview shows the substituted sample text in teal
- Invalid regex: preview shows **Invalid regex** in rose/red; no exception in the UI
- Execution: applies `str.replace(new RegExp(pattern, flags), replace)` to the connected input
- Empty pattern: input returned unchanged (no replacement attempted)
- Invalid pattern at execution: throws with exact pattern and flags in the error message
- `g` flag by default: all matches replaced; without `g`, only the first match

## Failure indicators
- Preview does not update when pattern/replace/flags fields are edited
- "Invalid regex" not shown in preview for an invalid pattern (no visual error indicator)
- Empty pattern causes execution to throw (should return input unchanged)
- Pattern handle connection doesn't override the static Pattern field
- `g` flag absent by default causes only the first match to be replaced

## Severity rationale
An invalid regex silently passing through execution instead of throwing would corrupt string output; incorrect default flags would cause incomplete replacements for users expecting global replace.

## Source reference
`components/canvas/nodes/RegexReplaceNode.tsx` lines 17 (SAMPLE string `"Hello World 123"`), lines 20-28 (`preview` function), lines 60 (preview called on every render), lines 150-155 (preview rendered: teal for valid, rose for error); `lib/nodes/regex-replace.ts` lines 30 (empty pattern → return str unchanged), lines 31-36 (try/catch RegExp construction → throw with pattern+flags), line 37 (`str.replace(re, replace)`).

## Notes
Both the Pattern and Replace fields support `$VAR_NAME` variable interpolation via `resolveVars`. The preview uses the static field values only — connected handle values are not reflected in the canvas preview. The preview applies the regex to a hardcoded sample `"Hello World 123"` regardless of what the actual runtime input will be.
