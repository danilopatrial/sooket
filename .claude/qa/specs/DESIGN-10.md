---
id: DESIGN-10
title: Icons are consistent in style and size
severity: low
source_files:
  - app/layout.tsx
---

## What this tests
Verifies that all icons across the application come from the same library (lucide-react) at consistent sizes — `h-4 w-4` for node badge icons, `h-3.5 w-3.5` for list/button icons — and that no mixed icon libraries or inconsistent sizes are used.

## Prerequisites
- App is running at http://localhost:3000

## Steps — node icon badge sizes

1. Open a canvas editor with several different node types
2. Inspect the icon badge in each node header (the colored `h-8 w-8 rounded-lg` square)
3. Verify all node badge icons are `h-4 w-4` (16×16px) — consistent across AI, Logic, Transform, and Static nodes
4. Verify all icons are SVG from lucide-react (uniform stroke width, consistent visual style)

## Steps — list/button icon sizes

5. On the dashboard, inspect the Trash icon on a workflow card — should be `h-3.5 w-3.5`
6. In the Config → API Keys tab, inspect the × remove buttons — should be `h-3 w-3` or `h-3.5 w-3.5`
7. In the **New Workflow** button, inspect the Plus icon — should be `h-4 w-4`
8. In the **Add field** / **Add case** buttons in node config panels, inspect the Plus icon — should be `h-3 w-3`

## Steps — icon color consistency

9. Verify node badge icons are `text-white` (white against colored background)
10. Verify action button icons (delete, close) are muted (`text-white/20` or `text-muted-foreground`) at rest and become colored (`text-destructive`, `text-red-400`) on hover
11. Verify status indicator icons (AlertTriangle in error banners) match their surrounding text color

## Steps — no mixed icon libraries

12. Open browser DevTools → Sources; verify no Font Awesome, Material Icons, Heroicons, or other icon CSS files are loaded
13. All SVG icons should have the characteristic lucide stroke-based style (thin, rounded strokes)

## Expected result
- All icons from lucide-react — consistent visual language (thin stroke, rounded caps)
- Node badge icons: `h-4 w-4 text-white`
- Small action icons (×, trash, plus in add-item rows): `h-3 w-3` or `h-3.5 w-3.5`
- Main action icons (Plus in buttons): `h-4 w-4`
- No mixed icon libraries

## Failure indicators
- Some nodes use pixel-art or filled icons while others use stroke icons
- Icon sizes visibly inconsistent between similar UI elements
- Font-icon glyphs (squares/rectangles) appear instead of SVG icons (icon font failed to load)
- Alert icons or action icons are a different style from node badge icons

## Severity rationale
Low: icon inconsistency is a visual polish issue; mixed icon library usage could indicate a dependency conflict.

## Source reference
Node component files throughout `components/canvas/nodes/` — all use `import { IconName } from "lucide-react"` with `className="h-4 w-4 text-white"` in badge containers; `components/workflow/WorkflowList.tsx` uses `Trash2, AlertTriangle` from lucide at `h-3.5 w-3.5`.
