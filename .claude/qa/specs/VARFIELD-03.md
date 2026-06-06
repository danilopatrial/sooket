---
id: VARFIELD-03
title: Known references highlighted violet/sky; unknown references highlighted amber
severity: medium
source_files:
  - components/canvas/VarField.tsx
---

## What this tests
Variable references and node references in VarField inputs are syntax-highlighted in the backdrop layer: known variables show violet, known node references show sky-blue, and unrecognized references show amber.

## Prerequisites
- App is running at http://localhost:3000
- Navigate to any workflow canvas with at least one VarField node (e.g. Template String)
- At least one customer variable exists (e.g. `MY_KEY`)
- At least one non-input node exists on the canvas

## Steps
1. Open a Template String node's body field
2. Type `$MY_KEY` (a known variable name) — observe the text color in the field
3. Type `$UNKNOWN_VAR` (a non-existent variable) — observe the text color
4. Type `{{$node.[existing-node-id]}}` — observe the color
5. Type `{{$node.nonexistent-node-id}}` — observe the color

## Expected result
- `$MY_KEY` (known variable, in `names`): rendered in **violet** (`text-violet-400`, `font-semibold`) by `HighlightedSegment`
- `$UNKNOWN_VAR` (not in `names`): rendered in **amber** (`text-amber-400`, `font-semibold`)
- `{{$node.[known-id]}}` (node ID in `knownNodeIds`): rendered in **sky-blue** (`text-sky-400`, `font-semibold`)
- `{{$node.[unknown-id]}}` (not in `knownNodeIds`): rendered in **amber** (`text-amber-400`, `font-semibold`)
- `{{ }}` blocks that are not node references (e.g. `{{$json}}`): rendered in sky-blue at lower opacity (`text-sky-400/70`)
- Highlighting is applied in the transparent backdrop layer; the input itself has invisible text (`text-transparent`)

## Failure indicators
- All text appears in a single color (no differentiation by known/unknown)
- Known variables are shown amber instead of violet
- Unknown variables are shown violet instead of amber
- The backdrop and input are misaligned (text appears doubled or offset)

## Severity rationale
Color-coded validation gives instant feedback on whether a reference will resolve at runtime; missing highlighting leaves users unaware of typos in variable or node names.

## Source reference
`components/canvas/VarField.tsx` lines 39–58 — `HighlightedSegment`: variable pattern `/^\$[A-Z][A-Z0-9_]*$/`; known → `text-violet-400`; unknown → `text-amber-400`. Lines 61–98 — `Highlighted`: `{{ }}` blocks with `$node.[id]` → sky or amber based on `knownNodeIds`; other `{{ }}` → `text-sky-400/70`. Lines 264–270 — input uses `text-transparent caret-white/80` so only backdrop shows.
