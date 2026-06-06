---
id: DESIGN-02
title: Typography hierarchy consistent headings body labels
severity: low
source_files:
  - app/layout.tsx
---

## What this tests
Verifies that headings, body text, and labels follow a consistent typographic hierarchy across all pages — using the globally loaded Geist Sans and Geist Mono fonts with consistent size/weight conventions.

## Prerequisites
- App is running at http://localhost:3000
- Browser DevTools accessible

## Steps — font loading

1. Open any page; open DevTools → Network tab; filter by "font"
2. Verify Geist Sans and Geist Mono are loaded (CSS variable names: `--font-geist-sans`, `--font-geist-mono`)
3. Inspect a heading element in DevTools → Computed → font-family: should include "Geist"
4. Inspect a code/monospace element: should include "Geist Mono"

## Steps — heading hierarchy (dashboard)

5. Navigate to `/workflow` (dashboard)
6. Verify page heading ("Workflows" or similar) uses a larger, heavier weight than body text
7. Verify card titles use a consistent mid-weight, mid-size

## Steps — label consistency (canvas node)

8. Navigate to a canvas editor; inspect a node
9. Verify node field labels (e.g. "Model", "System Prompt") are uppercase, smaller than body text, lighter opacity
10. Verify the node title (e.g. "Anthropic") is `text-[13px] font-semibold text-white`
11. Verify the node subtitle is `text-[11px]` with reduced opacity

## Steps — monospace usage

12. Verify API keys, token counts, code values, and numeric displays use the Geist Mono font
13. Inspect a key_hint value in the API Keys tab — font-family should include "Geist Mono"

## Steps — cross-page consistency

14. Compare the text sizes and weights on the dashboard vs. the config panel vs. the canvas
15. Verify `text-[10px]` uppercase tracking labels appear in the same style across all node config panels and config tabs

## Expected result
- Geist Sans for all UI text (headings, body, labels)
- Geist Mono for code, keys, monospace values
- Consistent label style: small (`text-[10px]`), uppercase, letter-spacing, muted opacity
- Node titles: `text-[13px] font-semibold text-white`
- Node subtitles: `text-[11px]` with accent color at reduced opacity
- No page uses a different typeface for equivalent UI elements

## Failure indicators
- Body text uses a system font instead of Geist (Geist failed to load)
- Heading sizes differ between pages for semantically equivalent elements
- Code/key values rendered in a proportional (non-monospace) font

## Severity rationale
Low: typography inconsistency is a polish issue; misaligned text sizes would be immediately visible to users but don't affect functionality.

## Source reference
`app/layout.tsx` lines 6-13 (Geist Sans as `--font-geist-sans`, Geist Mono as `--font-geist-mono`, applied to `<html>` className), line 25 (`antialiased` for consistent font rendering).

## Notes
Label size `text-[10px]` with `uppercase tracking-wider` is a repeating pattern across all node config panels and config tab sections — established by individual component files, not a global rule. Consistency should be verified visually across several different nodes and config tabs.
