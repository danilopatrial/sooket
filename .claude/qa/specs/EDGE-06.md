---
id: EDGE-06
title: Special characters in names and JSON payloads handled correctly
severity: medium
source_files:
  - app/api/workflows/[slug]/route.ts
  - app/api/workflows/[slug]/variables/route.ts
  - app/api/workflows/[slug]/debug/route.ts
  - components/canvas/WorkflowCanvas.tsx
---

## What this tests
Special characters in workflow names are stored and displayed correctly; variable names containing special characters are rejected; and JSON payloads containing special characters in values pass through the workflow engine without corruption.

## Prerequisites
- App is running at http://localhost:3000
- At least one workflow exists; its slug is known (e.g. `test-wf`)
- The workflow has an Input node connected to an Output node

## Steps

### Part A — Workflow name with special characters
1. Navigate to the canvas for the workflow (e.g. `/workflow/test-wf`).
2. Click the workflow name field in the top bar and clear the current value.
3. Type a name containing special characters, e.g.: `Test "Flow" & <Special> émojis 🚀`
4. Click outside the name field (or wait ~800 ms for the autosave debounce).
5. Observe the `saved` indicator appear briefly.
6. Refresh the page.

### Part B — Variable name with special characters (rejected)
7. Navigate to the Variables tab in workflow settings (e.g. `/workflow-config/test-wf?tab=variables`).
8. Attempt to create a variable with name `MY-VARIABLE` (contains a hyphen).
9. Observe the response.

### Part C — JSON payload with special characters passes through
10. Return to the canvas and open the **Debug Panel**.
11. In the Sandbox tab, enter the following JSON body:
    ```json
    {"text": "Hello \"world\" & <test> é🚀"}
    ```
12. Click **Send**.
13. Observe the response in the debug panel.

## Expected result

**Part A:** After page refresh, the name field displays `Test "Flow" & <Special> émojis 🚀` exactly as entered. The special characters are not escaped or mangled (React renders the `<input value>` safely without HTML encoding).

**Part B:** The request returns HTTP 400 with body `{"error":"Name must be UPPER_SNAKE_CASE (e.g. MY_KEY)"}`. The hyphen is rejected by the `NAME_RE = /^[A-Z][A-Z0-9_]*$/` pattern.

**Part C:** The execution returns `{"ok":true, ...}`. The `output` value contains the original string `Hello "world" & <test> é🚀` with all special characters intact and unescaped.

## Failure indicators
- Part A: The workflow name is truncated, HTML-encoded (e.g. `&amp;`), or reverts to the old value after refresh.
- Part B: A variable with a hyphenated name is accepted (200 response) instead of rejected.
- Part C: The output value has characters corrupted, stripped, or double-encoded (e.g. `é` appears literally instead of `é`).

## Severity rationale
Character corruption in names or payloads would silently break workflows that carry user-facing text, internationalized content, or structured strings through the pipeline.

## Source reference
`app/api/workflows/[slug]/route.ts` line 73 — `name` is stored verbatim with no sanitization. `app/api/workflows/[slug]/variables/route.ts` line 6 — `NAME_RE = /^[A-Z][A-Z0-9_]*$/` rejects any non-UPPER_SNAKE_CASE name. `app/api/workflows/[slug]/debug/route.ts` lines 27–28 — body is decoded via `JSON.parse()` and passed through; special chars in string values survive the round-trip.

## Notes
The workflow name input is a React controlled `<input>` (`WorkflowCanvas.tsx` line 1013), so React handles escaping; no raw HTML injection is possible. Emoji and multi-byte Unicode should round-trip correctly because SQLite stores UTF-8 and `JSON.parse`/`JSON.stringify` handle full Unicode.
