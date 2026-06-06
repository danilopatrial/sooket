---
id: CFG-ACL-06
title: Duplicate access list entry is rejected with 409
severity: medium
source_files:
  - components/workflow-config/AccessListTab.tsx
  - app/api/workflows/[slug]/access-list/route.ts
---

## What this tests
Attempting to add a value that already exists in the access list for the same workflow returns a 409 response, and an error toast is shown; no duplicate row is created.

## Prerequisites
- App is running at http://localhost:3000
- Navigate to the workflow config Access List tab
- At least one entry already exists (e.g. value "test-value")

## Steps
1. Note an existing entry's value (e.g. "test-value")
2. In the "Add Entry" form, enter the exact same value with the same rule type
3. Click "Add entry"
4. Observe the result

## Expected result
- The POST to `/api/workflows/[slug]/access-list` returns 409 with `{"error": "Entry already exists"}`
- An error toast appears: "Entry already exists"
- The entry list is not updated (no duplicate row added)
- The form input retains the value so the user can correct it

## Failure indicators
- A duplicate entry is successfully created (two rows with identical values)
- No error toast is shown
- The API returns 200 instead of 409

## Severity rationale
Duplicate entries would confuse the access list structure and may cause unexpected runtime behavior in access control matching.

## Source reference
`app/api/workflows/[slug]/access-list/route.ts` lines 44–58 — INSERT with UNIQUE constraint; catches `UNIQUE` SQLite error and returns 409 `{"error": "Entry already exists"}`. `components/workflow-config/AccessListTab.tsx` lines 100–103 — on non-ok response, shows `toast.error(data.error ?? "Failed to add entry")`.
