---
id: NODE-EXT-05
title: Webhook node fires and forgets — errors silently swallowed
severity: medium
source_files:
  - components/canvas/nodes/WebhookNode.tsx
  - lib/nodes/webhook.ts
---

## What this tests
Verifies that the Webhook node fires an HTTP request asynchronously without blocking the workflow response, silently swallows all errors (no failure output handle), and passes its input value through to the output unchanged.

## Prerequisites
- App is running at http://localhost:3000
- A workflow with a Webhook node exists on the canvas
- The Debug panel is accessible

## Steps — canvas configuration

1. Navigate to the canvas containing a Webhook node
2. Observe the node header: title **Webhook**, subtitle **fire-and-forget side effect**, rose Webhook icon; a method badge (default **POST** in sky/blue) in the top-right
3. Observe the rose info box at the bottom of the node body: **"Fires asynchronously — never blocks the response"**
4. Verify the **Method** section shows four buttons: **POST** (sky), **PUT** (amber), **PATCH** (violet), **GET** (emerald) — note DELETE is absent
5. With **POST** selected, confirm three left-side input handles: **input**, **url**, and **body**; and one right-side output handle: **output**
6. Switch to **GET** — the **body** handle disappears and the **Body** template section disappears from the node body; only **input** and **url** remain as input handles
7. Switch back to **POST** — observe the **Body** section reappears: a textarea (3 rows, placeholder `{"text": "notification text"}`) and hint "connect body handle to use dynamic value"
8. In the **URL** field, enter a test URL (e.g. a webhook.site URL); observe hint "connect url handle to override dynamically"
9. Add a header row via **Add header** (key: `Content-Type`, value: `application/json`); verify × removes it

## Steps — execution (pass-through and fire-and-forget)

10. Connect a text value (e.g. `"hello"`) to the `input` handle; set URL to a valid endpoint
11. Open the Debug panel and send a test request
12. Verify the workflow response returns **immediately** (the webhook call does not block the response)
13. Expand the Webhook node trace — the `output` handle value is `"hello"` (the original input, passed through unchanged)
14. Verify the trace does not contain any webhook response body or status code (the response is not captured)

## Steps — error handling

15. Set the URL to an unreachable address (e.g. `https://0.0.0.0/webhook`) and run
16. Verify the workflow still completes successfully and returns the pass-through value — the failed HTTP request does not cause the node to error or the workflow to fail
17. Leave the URL field empty and run — node should still return the input pass-through without throwing (empty URL skips the fetch entirely)

## Expected result
- Methods: POST, PUT, PATCH, GET (no DELETE)
- Body handle and Body template section visible only for POST, PUT, PATCH
- `output` handle passes the original `input` value through unchanged regardless of webhook success/failure
- Webhook HTTP call is fire-and-forget: `fetch(...).catch(() => {})` — all errors silently discarded
- Empty URL: fetch is not called; node returns pass-through without error
- Workflow response is not delayed by the webhook call
- No failure output handle exists — there is no way to detect webhook delivery failure in the workflow

## Failure indicators
- Workflow response is delayed until the webhook call completes or times out
- Webhook failure causes the node to throw an error or return `active: false`
- `output` handle returns the webhook response body instead of the original input
- Body template or body handle is present when GET method is selected
- DELETE method appears in the method picker

## Severity rationale
Silent error swallowing is intentional for fire-and-forget, but important to verify — if errors were propagated, downstream workflows relying on this behavior would break.

## Source reference
`components/canvas/nodes/WebhookNode.tsx` line 35 (`HAS_BODY` set excludes DELETE), line 113 (subtitle "fire-and-forget side effect"), lines 214-218 (rose info box), lines 159-173 (body template section, POST/PUT/PATCH only); `lib/nodes/webhook.ts` line 50 (`fetch(...).catch(() => {})` — silent error discard), lines 49-51 (URL check before fetch), line 53 (pass-through return of original input value).

## Notes
The `body` input handle takes priority over the `bodyTemplate` textarea when both are present (executor checks `bodySrc` first, line 36-38, then falls back to `bodyTemplate`). Variable interpolation (`$VAR_NAME`) is supported in the URL, body template, and header values. The webhook response (status, body) is never captured or returned.
