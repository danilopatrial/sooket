---
id: DESIGN-09
title: Responsive layout on narrow viewports
severity: low
source_files:
  - app/layout.tsx
  - components/workflow/WorkflowList.tsx
---

## What this tests
Verifies that the dashboard and config pages adapt gracefully on narrow viewports (≤640px / mobile), and that key content remains readable even if some secondary information is hidden.

## Prerequisites
- App is running at http://localhost:3000
- Browser with DevTools for viewport simulation (toggle device toolbar)

## Steps — dashboard at 375px width

1. Open browser DevTools → Toggle Device Toolbar; set viewport to 375px × 812px (iPhone-sized)
2. Navigate to `/workflow`
3. Verify the workflow list is visible and readable:
   - Workflow name and slug are not truncated beyond the available width
   - **Active**/**Inactive** badge is visible
   - The creation date column (`hidden sm:block`) is **hidden** (not visible at 375px — this is intentional)
4. Verify the **New Workflow** button is visible and tappable in the top-right
5. Verify no horizontal scrollbar appears on the page

## Steps — config panel at narrow viewport

6. Navigate to a workflow's Config panel at 375px width
7. Verify Config tab labels are visible (may wrap or scroll)
8. Verify form inputs fill the available width and are not clipped

## Steps — canvas editor at narrow viewport

9. Navigate to a canvas editor at 375px
10. Verify the canvas renders (React Flow may not be fully optimized for mobile, but it should not crash or produce a broken layout)
11. Note: the canvas editor is primarily a desktop tool; verify in Notes if mobile support is limited

## Steps — body overflow

12. Verify `overflow-hidden` on `<body>` prevents unwanted scrollbars on the main layout
13. Verify the canvas fills the available space without causing the page to scroll horizontally

## Expected result
- Dashboard: responsive at 375px — creation date hidden (`hidden sm:block`), name/badge/slug visible
- No horizontal overflow on any page at narrow widths
- Config panel: inputs fill available width
- Canvas: renders without layout breakage (may not be fully mobile-optimized)

## Failure indicators
- Horizontal scrollbar appears on the dashboard at 375px
- Workflow name is clipped and unreadable
- New Workflow button is hidden or overflows the header
- Config form inputs extend beyond the viewport

## Severity rationale
Low: the app is primarily a desktop tool (canvas editor requires a large screen); mobile responsiveness is best-effort for the dashboard and config pages.

## Source reference
`app/layout.tsx` line 27 (`overflow-hidden` on body prevents scroll overflow); `components/workflow/WorkflowList.tsx` line 77 (`hidden sm:block` — creation date hidden below sm breakpoint).

## Notes
The canvas editor (`/workflow/<slug>`) requires a large viewport for practical use. React Flow handles its own internal viewport management. The primary responsive concern is the dashboard and config panel pages, not the canvas itself.
