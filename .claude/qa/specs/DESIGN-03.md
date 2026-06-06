---
id: DESIGN-03
title: Spacing and alignment follow a consistent grid
severity: low
source_files:
  - app/layout.tsx
---

## What this tests
Verifies that page content, node panels, and config tabs use consistent spacing and alignment based on Tailwind's 4px-base grid system — with no misaligned elements, inconsistent margins, or content overflowing its container.

## Prerequisites
- App is running at http://localhost:3000
- Browser with DevTools for measuring layout

## Steps — dashboard page layout

1. Navigate to `/workflow` (dashboard)
2. Verify the content area is centered with `max-w-3xl` (48rem) and horizontal padding `px-4` (16px on each side)
3. Verify vertical spacing between sections uses `space-y-8` (32px)
4. Verify the page heading and New Workflow button are horizontally aligned with `flex items-center justify-between`

## Steps — node body spacing

5. Navigate to a canvas editor; click any node to inspect it
6. Verify node body padding: fields use either `p-3` (12px), `p-4` (16px), or `px-3 py-2.5` — consistent within a node type
7. Verify field rows have consistent heights (e.g. `h-6` or `h-7` for single-line input rows)
8. Verify the separator lines (`border-t border-white/[0.06]`) are evenly spaced between sections

## Steps — config panel alignment

9. Open Config → General tab
10. Verify labels are left-aligned and inputs fill available width
11. Verify all input fields are vertically consistent (same height, same padding)

## Steps — handle alignment

12. On the canvas, verify node input/output handles are precisely aligned with their corresponding label rows (not floating above or below)

## Expected result
- Page content: `max-w-3xl`, `px-4`, `py-12`, `space-y-8` on dashboard
- Node padding: `p-3` or `p-4` consistently applied within each node
- Field rows: consistent heights (`h-6`, `h-7`)
- No element visually overflows or mis-aligns with adjacent elements

## Failure indicators
- Dashboard content is left-aligned instead of centered
- Node rows are different heights within the same node, causing handle misalignment
- Config fields have inconsistent horizontal padding between tabs

## Severity rationale
Low: spacing inconsistencies are visual polish issues; they don't affect functionality but reduce perceived quality.

## Source reference
`app/(main)/workflow/page.tsx` lines 21-24 (`max-w-3xl w-full px-4 py-12 space-y-8`); node component patterns throughout `components/canvas/nodes/` (consistent `p-3`/`p-4` body, `h-6`/`h-7` row heights, `px-4 py-3` header padding).
