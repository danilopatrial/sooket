---
id: CFG-GEN-04
title: Assign an error workflow in the General config tab
severity: medium
source_files:
  - components/workflow-config/GeneralTab.tsx
  - app/api/workflows/[slug]/route.ts
---

## What this tests
The General tab provides a UI to assign another workflow as the "error workflow" — the workflow that executes when this one encounters an unhandled failure.

## Prerequisites
- App is running at http://localhost:3000
- Navigate to the workflow config General tab
- At least two workflows exist

## Steps
1. Locate an "Error Workflow" or similar section in the General tab
2. Select another workflow from a dropdown or input
3. Save the assignment
4. Trigger a workflow failure and verify the error workflow executes

## Expected result
- A UI control exists to assign an error workflow by selecting from available workflows
- The assignment is persisted via `PATCH /api/workflows/[slug]` with `{errorWorkflowId: <id>}`
- The engine invokes the assigned error workflow on unhandled failure

## Failure indicators
- No UI control for error workflow assignment exists in the General tab
- The assignment control exists but does not persist on save

## Severity rationale
Error workflow assignment is an important failure-handling feature for production workflows; without it, failures silently drop.

## Source reference
`app/api/workflows/[slug]/route.ts` line 76 — PATCH handler supports `errorWorkflowId`: `if ("errorWorkflowId" in body) { sets.push("error_workflow_id = ?"); values.push(body.errorWorkflowId ?? null); }`. The engine reads `errorWorkflowId` from the workflow row and invokes it on failure.

## Notes
**Verify in source**: As of this review, **no UI component exists** in `GeneralTab.tsx` or any other config tab to assign an error workflow. The API and engine support `error_workflow_id`, but the assignment UI has not been built. This test is expected to **fail** (no control visible in the UI). The feature is backend-ready and needs a frontend control to be testable.
