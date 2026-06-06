---
id: DESIGN-08
title: Toast notifications appear for all key actions create delete save error
severity: medium
source_files:
  - components/workflow/NewWorkflowButton.tsx
  - app/layout.tsx
---

## What this tests
Verifies that Sonner toast notifications appear for key user actions: workflow creation failure, provider key save/remove, variable create/delete, access list add/remove, API key copy — and that the global `<Toaster />` is mounted.

## Prerequisites
- App is running at http://localhost:3000

## Steps — Toaster mounted globally

1. Open any page; open DevTools → Elements
2. Verify `<li data-sonner-toast>` elements appear when actions are taken (Sonner renders toasts in a portal; the `<Toaster />` is in `app/layout.tsx`)

## Steps — create workflow failure toast

3. Simulate a network failure (DevTools → Network → Offline) and click **New Workflow**
4. Verify a **red error toast** appears: `"Failed to create workflow"`
5. Re-enable network

## Steps — provider key save/remove toast

6. Navigate to Config → Provider Keys tab
7. Enter a valid Anthropic key and save — verify a **green success toast**: `"Anthropic key saved"`
8. Remove the key — verify a **green success toast**: `"Anthropic key removed"`
9. Save with an invalid key (if the server returns an error) — verify an **error toast** with the server's error message

## Steps — variable save/delete toast

10. Navigate to Config → Variables tab
11. Add a variable `TEST_VAR` = `"value"` — verify toast on success
12. Delete `TEST_VAR` — verify a **green toast**: `"$TEST_VAR deleted"`

## Steps — access list add/remove toast

13. Navigate to Config → Access List tab
14. Add an entry `"test-value"` — verify toast: `'"test-value" added'`
15. Remove it — verify toast: `'"test-value" removed'`

## Steps — API key copy toast

16. Navigate to Config → API Keys; reveal a key and click the copy button
17. Verify toast: `"API key copied"` (green)

## Steps — toast auto-dismiss

18. Verify toasts disappear automatically after a few seconds without user interaction

## Expected result
- `<Toaster />` registered in global layout
- Error events: red toast with descriptive message
- Success events: green toast with descriptive message
- Toasts auto-dismiss; don't stack infinitely

## Failure indicators
- No toast appears on key actions (Toaster not mounted or toast() not called)
- Error toast appears for successful operations (green/error colors swapped)
- Toasts don't dismiss automatically and accumulate on screen

## Severity rationale
Medium: toast feedback is the primary non-blocking way to confirm actions; missing toasts leave users uncertain whether their action succeeded.

## Source reference
`app/layout.tsx` line 29 (`<Toaster />` — global Sonner mount); `components/workflow/NewWorkflowButton.tsx` line 17; grep for `toast.success`/`toast.error` in `components/` for full list of toast callsites.
