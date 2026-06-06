---
id: DASH-01
title: Workflow list loads and displays all workflows
severity: critical
source_files:
  - app/(main)/workflow/page.tsx
  - components/workflow/WorkflowList.tsx
---

## What this tests
The `/workflow` page fetches all workflows from the database (ordered by creation date descending) and renders each one as a card in a list.

## Prerequisites
- App is running at http://localhost:3000
- At least two workflows exist in the database

## Steps
1. Navigate to `http://localhost:3000/workflow`
2. Observe the page heading and workflow list
3. Verify each workflow card shows the workflow name, slug (monospace), creation date, and an Active/Inactive badge
4. Verify the list is ordered with the most recently created workflow first

## Expected result
- The page heading "Workflows" and subtitle "Your API middleware pipelines" are visible
- Each workflow appears as a row with:
  - Workflow name (truncated if long) on the left
  - Slug displayed in monospace font below the name
  - Creation date (formatted via `toLocaleDateString()`) on the right (hidden on narrow viewports)
  - A badge reading "Active" or "Inactive" depending on `is_active`
- The list is ordered most-recent-first (matching `ORDER BY created_at DESC`)
- Each row is a link that navigates to `/workflow/[slug]` when clicked

## Failure indicators
- The page renders but the workflow list is empty when workflows exist in the database
- Workflows are shown in the wrong order
- A workflow card is missing the name, slug, date, or badge
- Clicking a workflow row does not navigate to its canvas

## Severity rationale
The workflow list is the primary dashboard — failure to load it makes the entire app unusable.

## Source reference
`app/(main)/workflow/page.tsx` — queries `SELECT id, name, slug, is_active, created_at FROM workflows ORDER BY created_at DESC` and passes results to `WorkflowList`. `components/workflow/WorkflowList.tsx` — renders each workflow as a `<li>` with a `<Link href="/workflow/[slug]">` containing name, slug, date, and badge.
