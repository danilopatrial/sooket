---
id: CFG-CRED-04
title: Link a credential to a workflow node
severity: medium
source_files:
  - components/workflow-config/CredentialsTab.tsx
  - app/api/workflows/[slug]/credentials/route.ts
---

## What this tests
The "Node Assignments" section provides two dropdowns (node selector and credential selector) and an "Assign" button; completing the form POSTs the assignment and adds it to the assignments list.

## Prerequisites
- App is running at http://localhost:3000
- Navigate to the workflow config Credentials tab
- At least one credential exists in the pool
- At least one non-input/output node exists on the canvas

## Steps
1. Scroll to the "Node Assignments" section
2. Verify the assignment form is visible (requires both nodes and credentials to exist)
3. Select a node from the "— select node —" dropdown
4. Select a credential from the "— select credential —" dropdown
5. Click "Assign"
6. Observe the assignments list below

## Expected result
- The assignment form shows two dropdowns side by side: one listing nodes (format: `type (nodeId[:8])`, excluding workflowInput and workflowOutput) and one listing credentials (format: `name (type)`)
- "Assign" button is disabled when either dropdown is unselected
- On success: POSTs `{nodeId, credentialId}` to `/api/workflows/${slug}/credentials`; toast "Credential assigned"; dropdowns reset; assignments list refreshes showing the new assignment row
- Assignment row shows: `LinkIcon`, node ID (monospace), credential name and type below it, and a `Trash2` remove button

## Failure indicators
- The assignment form is not visible even when nodes and credentials exist
- Dropdowns are empty or show wrong values
- "Assign" button is not disabled when dropdowns are unset
- After assigning, the new entry does not appear in the assignments list

## Severity rationale
Node-credential assignment is how credentials are injected at runtime; without it, nodes requiring authentication cannot be configured.

## Source reference
`components/workflow-config/CredentialsTab.tsx` lines 116–136 — `handleAssign()` POSTs `{nodeId, credentialId}`, toasts, resets, calls `loadAll()`. Lines 251–287 — assignment form (visible when `nodes.length > 0 && credentials.length > 0`): node select, credential select, "Assign" button disabled when either unset. Lines 295–314 — assignments list rows with `LinkIcon` and unassign `Trash2`.
