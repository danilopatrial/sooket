---
id: CFG-ACL-05
title: Add a Header entry to the access list
severity: medium
source_files:
  - components/workflow-config/AccessListTab.tsx
  - app/api/workflows/[slug]/access-list/route.ts
---

## What this tests
Selecting the "header" rule type and entering a header value string creates a Header-typed access list entry used to match against request header values at runtime.

## Prerequisites
- App is running at http://localhost:3000
- Navigate to the workflow config Access List tab

## Steps
1. In the "Add Entry" form, click the "header" tab in the rule type selector
2. Observe the placeholder changes to "Bearer my-token" and the hint reads "Header value to match"
3. Enter a header value (e.g. `Bearer secret-token`)
4. Click "Add entry"
5. Observe the entries list

## Expected result
- Selecting "header" type: placeholder changes to "Bearer my-token"; hint "Header value to match"; rule type selector shows "header" as active (`bg-accent text-foreground`)
- After add: toast `"Bearer secret-token" added`; entry appears in the Header group with an emerald `RuleTypeBadge`
- Entry row shows the value in monospace

## Failure indicators
- The "header" tab does not change the placeholder or hint text
- Added entry appears under the wrong group (e.g. Value)
- Emerald badge is absent or incorrectly colored

## Severity rationale
Header value matching allows workflows to verify bearer tokens or custom headers; if header entries cannot be added, token-based access control is unavailable.

## Source reference
`components/workflow-config/AccessListTab.tsx` line 21 — header meta: `placeholder: "Bearer my-token"`, `hint: "Header value to match"`, `color: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30"`. Lines 73–83 — `grouped` places header entries in position 3. Lines 85–105 — `handleAdd()` POSTs `{value, label, rule_type: "header"}`.
