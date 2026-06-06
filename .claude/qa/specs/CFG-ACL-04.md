---
id: CFG-ACL-04
title: Add a Value entry to the access list
severity: medium
source_files:
  - components/workflow-config/AccessListTab.tsx
  - app/api/workflows/[slug]/access-list/route.ts
---

## What this tests
The default "value" rule type accepts an exact-match string and creates a Value-typed access list entry used for case-insensitive string matching at runtime.

## Prerequisites
- App is running at http://localhost:3000
- Navigate to the workflow config Access List tab

## Steps
1. In the "Add Entry" form, verify "value" is selected by default (first load)
2. Observe the placeholder "exact-match-string" and hint "Case-insensitive exact match"
3. Enter a value (e.g. `my-api-consumer`)
4. Optionally enter a label (e.g. "partner A")
5. Click "Add entry"
6. Observe the entries list

## Expected result
- Default rule type is "value"; placeholder "exact-match-string"; hint "Case-insensitive exact match"
- After add: toast `"my-api-consumer" added`; entry appears in the Value group with a sky-blue `RuleTypeBadge`
- Entry row shows value in monospace and optional label in muted text

## Failure indicators
- The default rule type is not "value"
- Added entry does not appear in the Value group
- Sky-blue badge is absent or uses incorrect color

## Severity rationale
Value entries are the most common access list type for API key or token matching; if broken, no access control can be configured.

## Source reference
`components/workflow-config/AccessListTab.tsx` line 46 — `ruleType` state initialized to `"value"`. Line 18 — value meta: `placeholder: "exact-match-string"`, `hint: "Case-insensitive exact match"`, `color: "bg-sky-500/15 text-sky-400 border-sky-500/30"`. Lines 85–105 — `handleAdd()` POSTs `{value, label, rule_type: "value"}`.
