---
id: VARFIELD-01
title: Typing $VAR_NAME triggers variable autocomplete suggestions
severity: medium
source_files:
  - components/canvas/VarField.tsx
---

## What this tests
In any VarField input on the canvas (e.g. node text fields, template strings), typing `$` followed by uppercase letters shows a dropdown of matching customer variable names.

## Prerequisites
- App is running at http://localhost:3000
- Navigate to any workflow canvas at `/workflow/[slug]`
- At least one customer variable exists (create via Variables config tab)
- A node with a VarField input is present (e.g. Template String, Anthropic system prompt)

## Steps
1. Click into a VarField input on a node (e.g. Template String body field)
2. Type `$` — observe whether a suggestion dropdown appears
3. Continue typing the first few letters of a known variable name (e.g. `$MY`)
4. Observe the filtered dropdown

## Expected result
- Typing `$` followed by `[A-Z0-9_]*` at the cursor matches `PARTIAL_VAR = /\$([A-Z0-9_]*)$/`
- A suggestion dropdown appears below/above the field listing variable names that start with the typed prefix
- Each suggestion row shows `$` in violet (`text-violet-400`) + variable name in monospace
- The active suggestion is highlighted (`bg-violet-600/25 text-violet-200`)
- No suggestions appear when no variables match the typed prefix
- The footer hint reads "↑↓ · Enter insert · Esc dismiss"

## Failure indicators
- No dropdown appears after typing `$` followed by letters
- The dropdown appears but shows variables that don't match the prefix
- Variable names appear without the `$` violet prefix styling

## Severity rationale
Variable autocomplete is the primary ergonomic way to reference encrypted variables in node fields; without it, users must know and type exact names manually.

## Source reference
`components/canvas/VarField.tsx` lines 10 — `PARTIAL_VAR = /\$([A-Z0-9_]*)$/`; lines 155–162 — `computeSuggestions()`: matches `PARTIAL_VAR` against text before cursor, filters `names` array; lines 359–373 — renders variable suggestion buttons in violet; line 376 — footer hint text.
