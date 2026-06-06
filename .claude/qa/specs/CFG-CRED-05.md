---
id: CFG-CRED-05
title: Unlink a credential from a workflow node
severity: medium
source_files:
  - components/workflow-config/CredentialsTab.tsx
  - app/api/workflows/[slug]/credentials/route.ts
---

## What this tests
Clicking the `Trash2` icon on an assignment row sends a DELETE request and removes the node-credential link from the assignments list.

## Prerequisites
- App is running at http://localhost:3000
- Navigate to the workflow config Credentials tab
- At least one node-credential assignment exists (see CFG-CRED-04)

## Steps
1. Locate an assignment row in the "Node Assignments" section
2. Click the `Trash2` icon on the right side of that row
3. Observe the result

## Expected result
- A `DELETE /api/workflows/${slug}/credentials?nodeId=[encodedNodeId]` request is sent immediately (no confirmation step)
- On success: toast "Assignment removed" appears; the assignments list refreshes and the deleted row disappears
- On error: toast "Failed to remove assignment" appears

## Failure indicators
- Clicking `Trash2` on an assignment row has no effect
- The assignment row remains after a successful DELETE
- No toast appears after removal

## Severity rationale
Unlinking credentials is needed when reassigning a node to a different credential or removing authentication; missing this breaks credential management.

## Source reference
`components/workflow-config/CredentialsTab.tsx` lines 138–141 — `handleUnassign(nodeId)` calls `DELETE /api/workflows/${slug}/credentials?nodeId=${encodeURIComponent(nodeId)}`, toasts "Assignment removed" on success or "Failed to remove assignment" on error, then calls `loadAll()`. Lines 305–311 — `Trash2` button calls `handleUnassign(a.nodeId)` directly.
