---
id: CFG-VAR-02
title: Create a variable with UPPER_SNAKE_CASE name and encrypted value
severity: high
source_files:
  - components/workflow-config/VariablesTab.tsx
  - app/api/workflows/[slug]/variables/route.ts
---

## What this tests
The "Add Variables" form accepts a name (auto-uppercased, non-letter characters stripped) and a value; submitting POSTs to the API which validates the name format and stores the value AES-encrypted.

## Prerequisites
- App is running at http://localhost:3000
- Navigate to the workflow config Variables tab

## Steps
1. Locate the "Add Variables" form at the bottom of the tab
2. Enter a name in the name field (e.g. type `my_key` — observe it auto-uppercases to `MY_KEY`)
3. Enter a value in the value field (e.g. `secret123`)
4. Click the "Save" button (or "Save N variables" if multiple rows)
5. Observe the result

## Expected result
- Name input: auto-converts to uppercase and strips non-`[A-Z0-9_]` characters as the user types; first character must be a letter (pattern `^[A-Z][A-Z0-9_]*$`)
- If name starts with a digit or is invalid: inline error "Must start with a letter (e.g. MY_KEY)"
- On save: each row with a non-empty name, non-empty value, and no name error is POSTed to `POST /api/workflows/[slug]/variables`; the value is AES-encrypted server-side before storage
- Toast: `$MY_KEY saved` (single) or `N variables saved` (multiple)
- On success: saved rows are removed from the form; the variable list refreshes showing the new name (no value shown)
- Failed rows show individual error toasts: `$NAME: error message`

## Failure indicators
- Name input does not auto-uppercase
- Invalid names (starting with digit) are accepted by the API
- After saving, the variable does not appear in the existing variables list
- The value appears in the list (should be masked)

## Severity rationale
Variables are the primary way to inject runtime secrets; if creation is broken, nodes cannot access encrypted values.

## Source reference
`components/workflow-config/VariablesTab.tsx` lines 8, 60–72 — `NAME_RE = /^[A-Z][A-Z0-9_]*$/`; `updateRow()` auto-uppercases and strips invalid chars, sets `nameError`. Lines 78–113 — `handleSave()` filters valid rows, POSTs each, toasts results. `app/api/workflows/[slug]/variables/route.ts` lines 6, 38–43 — POST validates name against `NAME_RE`, encrypts value with `encrypt(value.trim(), SECRET)`.
