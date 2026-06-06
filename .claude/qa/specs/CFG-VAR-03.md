---
id: CFG-VAR-03
title: Invalid variable name is rejected client-side and server-side
severity: medium
source_files:
  - components/workflow-config/VariablesTab.tsx
  - app/api/workflows/[slug]/variables/route.ts
---

## What this tests
Variable names that fail the `^[A-Z][A-Z0-9_]*$` pattern show an inline client-side error and are also rejected by the server with a 400 response.

## Prerequisites
- App is running at http://localhost:3000
- Navigate to the workflow config Variables tab

## Steps
1. In the "Add Variables" form, type `1_INVALID` in the name field
2. Observe the inline error message below the field
3. Verify the "Save" button is not clickable for this row (invalid row excluded)
4. Clear and type `VALID_NAME`, enter a value, then click Save
5. Verify no inline error and the variable saves successfully

## Expected result
- Client-side: after typing `1INVALID` (digit start), the name field shows inline error "Must start with a letter (e.g. MY_KEY)" in `text-destructive` color
- Rows with `nameError` set are excluded from the POST batch; the Save button is only enabled for rows that are valid (`canSave` requires at least one row with name, value, and no error)
- Server-side: a direct POST with `{name: "1INVALID", value: "x"}` returns 400 `{"error": "Name must be UPPER_SNAKE_CASE (e.g. MY_KEY)"}`

## Failure indicators
- An invalid name (e.g. `1INVALID`) shows no inline error
- A variable with an invalid name can be saved (bypassing client validation)
- The server accepts invalid names (bypassing server validation)
- The "Save" button is enabled even when all rows have name errors

## Severity rationale
Variable names must be valid identifiers for template interpolation (`$VAR_NAME`); invalid names would fail silently at runtime.

## Source reference
`components/workflow-config/VariablesTab.tsx` line 8 — `NAME_RE = /^[A-Z][A-Z0-9_]*$/`; lines 64–67 — `updateRow()` sets `nameError = "Must start with a letter (e.g. MY_KEY)"` when pattern fails. Line 130 — `canSave = rows.some(r => r.name && r.value && !r.nameError)`. `app/api/workflows/[slug]/variables/route.ts` lines 38–42 — POST validates `NAME_RE.test(name)`, returns 400 on failure.
