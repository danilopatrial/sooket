---
id: DASH-05
title: Empty state renders when no workflows exist
severity: medium
source_files:
  - components/workflow/WorkflowList.tsx
---

## What this tests
When the database contains no workflows, the workflow list renders a centered empty-state message instead of a blank area or an error.

## Prerequisites
- App is running at http://localhost:3000
- No workflows exist in the database (delete all existing workflows, or use a fresh database)

## Steps
1. Ensure no workflows are present (delete any existing ones via the dashboard)
2. Navigate to `http://localhost:3000/workflow`
3. Observe the area below the "Workflows" heading and separator

## Expected result
- The list area shows a centered column with two lines of text:
  - "No workflows yet."
  - "Create your first workflow to get started."
- No workflow rows, error messages, or blank space are shown
- The "New Workflow" button remains visible and functional in the header

## Failure indicators
- A blank or invisible area appears where the list should be (no empty-state text)
- An error or exception is thrown when the list is empty
- The text "No workflows yet." or "Create your first workflow to get started." is absent

## Severity rationale
Empty state is the first experience for new users; a broken or absent empty state creates a confusing onboarding experience.

## Source reference
`components/workflow/WorkflowList.tsx` lines 44–51 — when `workflows.length === 0`, renders `<div className="flex flex-col items-center justify-center py-24 text-center gap-3">` containing `<p>No workflows yet.</p>` and `<p>Create your first workflow to get started.</p>`.
