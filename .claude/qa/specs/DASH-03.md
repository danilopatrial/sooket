---
id: DASH-03
title: Workflow card shows name, slug, creation date, and active badge
severity: high
source_files:
  - components/workflow/WorkflowList.tsx
  - app/(main)/workflow/page.tsx
---

## What this tests
Each workflow row on the dashboard displays all four expected data fields: name, slug, creation date, and Active/Inactive badge.

## Prerequisites
- App is running at http://localhost:3000
- At least one workflow exists

## Steps
1. Navigate to `http://localhost:3000/workflow`
2. Locate any workflow row in the list
3. Verify the workflow name appears as the primary text on the left
4. Verify the slug appears below the name in monospace font
5. Verify a creation date appears on the right side of the row (may be hidden on very narrow viewports)
6. Verify an "Active" or "Inactive" badge appears to the right of the date

## Expected result
- Workflow name: rendered as `text-sm font-medium`, truncated with ellipsis if long
- Slug: rendered as `text-xs text-muted-foreground font-mono`, truncated if long
- Creation date: formatted via `new Date(created_at).toLocaleDateString()`, visible on `sm` and wider viewports (`hidden sm:block`)
- Badge: reads "Active" (default variant) for `is_active = 1` or "Inactive" (secondary variant) for `is_active = 0`

## Failure indicators
- The workflow name is missing or shows a raw ID instead
- The slug field is absent or not in monospace font
- The creation date is absent on a normal desktop viewport
- The badge is missing, or shows the wrong text for the workflow's active state

## Severity rationale
These four fields are the core identity of each workflow on the dashboard; missing any one degrades usability significantly.

## Source reference
`components/workflow/WorkflowList.tsx` lines 72–83 — renders `wf.name` as `<p className="text-sm font-medium truncate">`, `wf.slug` as `<p className="text-xs text-muted-foreground font-mono truncate">`, creation date as `<span className="hidden sm:block">` with `toLocaleDateString()`, and `<Badge variant={isActive ? "default" : "secondary"}>` showing "Active" or "Inactive".
