---
id: CFG-VAR-01
title: Variables tab lists variable names only (values write-only)
severity: high
source_files:
  - components/workflow-config/VariablesTab.tsx
  - app/api/workflows/[slug]/variables/route.ts
---

## What this tests
The Variables tab lists existing customer variables showing only the name and creation date — never the encrypted value — with a masked placeholder and a delete button on each row.

## Prerequisites
- App is running at http://localhost:3000
- Navigate to the workflow config Variables tab
- At least one variable has been created

## Steps
1. Open the Variables config tab
2. Observe the list of variable rows
3. Verify each row shows: `$` prefix, variable name (monospace), masked value (`••••••••`), creation date, and a delete icon

## Expected result
- Variables are fetched via `GET /api/workflows/[slug]/variables` which returns only `{name, created_at}` — no value field
- Each row displays:
  - `$` in violet (`text-violet-400`)
  - Variable name in monospace (`font-mono text-foreground`)
  - `••••••••` in muted monospace (masked placeholder — value is never returned)
  - Creation date formatted as "Mon DD, YYYY" (hidden on narrow viewports)
  - `Trash2` delete icon button
- Empty state: dashed box with "No variables yet" and "Add your first variable below"
- The tab header explains: "Values are AES-encrypted and never exposed to the frontend"

## Failure indicators
- Variable values (actual secrets) are visible in the list
- Variable names are absent or show raw IDs
- The masked `••••••••` is absent
- Creation dates are missing or show raw ISO strings

## Severity rationale
Variables store encrypted secrets; exposing values in the UI would be a security vulnerability.

## Source reference
`app/api/workflows/[slug]/variables/route.ts` lines 24–28 — GET returns only `name` and `created_at` columns; no encrypted value is included. `components/workflow-config/VariablesTab.tsx` lines 159–176 — renders each variable with `$` prefix, name, `••••••••` mask, date, and `Trash2` button.
