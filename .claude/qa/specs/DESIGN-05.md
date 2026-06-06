---
id: DESIGN-05
title: Buttons inputs and form elements visually consistent
severity: low
source_files:
  - app/layout.tsx
---

## What this tests
Verifies that text inputs, number inputs, textareas, select dropdowns, and buttons use consistent styling — dark backgrounds, consistent border treatment, focus rings, and readable text — across node config panels and the workflow Config tabs.

## Prerequisites
- App is running at http://localhost:3000
- A canvas with several configured nodes (e.g. HTTP Request, Math, If) is open
- The Config panel (General, API Keys, Variables tabs) is accessible

## Steps — text input consistency

1. Open several different node config panels that have text inputs (e.g. HTTP Request URL, If Compare-To, Auth Validator Secret)
2. For each, verify the input field style:
   - Background: dark (`bg-[#252527]` or similar dark variant)
   - Border: `border border-white/[0.08]` at rest
   - Font: monospace (`font-mono`) for technical values; sans-serif for labels
   - Text color: `text-white/80` or `text-white/90`
   - Focus border: colored ring matching the node accent (e.g. `focus:border-sky-500/40`)
   - No default browser focus outline (`focus:outline-none`)
3. Verify all inputs have `rounded-lg` corners (not square, not fully rounded)

## Steps — button consistency

4. Inspect mode toggle buttons (e.g. XML↔JSON direction buttons, A/B Split branch labels):
   - Selected: accent color background + border
   - Unselected: `bg-[#252527] border-white/[0.08] text-white/30`
   - Hover: `hover:text-white/60` (text brightens on hover)
5. Inspect "Add item" buttons (dashed border):
   - Style: `border border-dashed border-white/[0.12] text-white/30`
   - Hover: `hover:border-white/25 hover:text-white/60`

## Steps — select dropdowns

6. Open the Rate Limiter node's "Key Source" dropdown; verify it uses the same dark background and border style as text inputs
7. Confirm the selected value is readable (white/80 text)

## Steps — config panel inputs

8. Navigate to Config → Variables tab; verify the variable name input matches the node input style
9. Navigate to Config → API Keys → create key; verify the label input uses consistent styling

## Steps — placeholder text

10. Inspect empty inputs with placeholders — verify placeholder text is consistently muted (`text-white/20` or `placeholder:text-white/20`)

## Expected result
- All inputs: dark background, `border-white/[0.08]` at rest, accent focus border, `rounded-lg`, `focus:outline-none`
- Selected buttons: accent color background/border/text
- Deselected buttons: `bg-[#252527]`, muted text, brightens on hover
- Add buttons: dashed border style, consistently placed below their list
- Placeholder text: consistently muted at ~20% opacity

## Failure indicators
- Some inputs have a white/light background
- Focus ring uses browser default (blue ring) instead of the accent color
- Buttons have inconsistent sizes or padding between different nodes
- Placeholder text is invisible (too dark) or too prominent (full white)

## Severity rationale
Low: form element inconsistency affects polish; inconsistent focus indicators could affect accessibility.

## Source reference
Node component files throughout `components/canvas/nodes/` (input class pattern: `rounded-lg border border-white/[0.08] bg-[#252527] px-2 py-1.5 text-[11px] text-white/80 focus:outline-none focus:border-{color}-500/40 transition-colors placeholder-white/20`); button patterns: selected state `bg-{color}-600/30 border-{color}-500/50 text-{color}-300`, unselected `bg-[#252527] border-white/[0.08] text-white/30`.
