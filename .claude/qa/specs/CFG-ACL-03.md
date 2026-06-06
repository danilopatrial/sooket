---
id: CFG-ACL-03
title: Add a CIDR entry to the access list
severity: medium
source_files:
  - components/workflow-config/AccessListTab.tsx
  - app/api/workflows/[slug]/access-list/route.ts
---

## What this tests
Selecting the "cidr" rule type and entering a CIDR notation string creates a CIDR-typed access list entry.

## Prerequisites
- App is running at http://localhost:3000
- Navigate to the workflow config Access List tab

## Steps
1. In the "Add Entry" form, click the "cidr" tab in the rule type selector
2. Observe the placeholder changes to "10.0.0.0/8" and the hint reads "CIDR notation (display only — matched as-is)"
3. Enter a valid CIDR range (e.g. `10.0.0.0/8`)
4. Click "Add entry"
5. Observe the entries list

## Expected result
- Selecting "cidr" type: placeholder changes to "10.0.0.0/8"; hint "CIDR notation (display only — matched as-is)"
- After successful add: toast `"10.0.0.0/8" added`; entry appears in the CIDR group with an amber `RuleTypeBadge`
- The hint text "(display only — matched as-is)" clarifies that the CIDR value is stored and matched as a string, not evaluated as a subnet mask at the access list node level

## Failure indicators
- The "cidr" rule type button does not change the placeholder or hint
- Adding a CIDR entry places it in the wrong group (e.g. Value)
- Amber badge is absent or shows wrong color

## Severity rationale
CIDR entries allow blocking or allowing entire IP ranges; incorrect storage prevents subnet-based access control.

## Source reference
`components/workflow-config/AccessListTab.tsx` line 20 — CIDR type meta: `placeholder: "10.0.0.0/8"`, `hint: "CIDR notation (display only — matched as-is)"`, `color: "bg-amber-500/15 text-amber-400 border-amber-500/30"`. Lines 73–83 — `grouped` memo places CIDR entries in order position 2. Lines 85–105 — `handleAdd()` POSTs `{value, label, rule_type: "cidr"}`.
