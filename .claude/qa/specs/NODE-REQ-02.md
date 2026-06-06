---
id: NODE-REQ-02
title: Response Builder node status code, dynamic headers, and body
severity: high
source_files:
  - components/canvas/nodes/ResponseBuilderNode.tsx
  - lib/nodes/response-builder.ts
---

## What this tests
Verifies that the Response Builder node lets users pick or type a custom HTTP status code, add/remove dynamic response header rows, and connect a body value — and that execution emits a structured response object causing the workflow to return that status, headers, and body to the caller.

## Prerequisites
- App is running at http://localhost:3000
- A workflow with a Response Builder node exists on the canvas; its `reply` output is connected to the Output node
- The Debug panel is accessible

## Steps — canvas configuration

1. Navigate to the canvas containing a Response Builder node
2. Observe the node header: title **Response Builder**, blue Braces icon; subtitle shows the current status label (e.g. **200 · OK**)
3. In the **Status Code** section, verify six quick-pick preset buttons arranged in a 3-column grid: **200** / OK, **201** / Created, **400** / Bad Input, **401** / Needs Login, **403** / Forbidden, **500** / Error
4. Click **201** — confirm the button highlights (blue background) and the node header subtitle updates to **201 · Created**
5. In the custom code input field below the presets (range 100–599), type `418` — verify the field accepts it and the header subtitle updates to **418** (no friendly label since it is not a preset)
6. In the **Response Headers** section, click **Add header** — a new row appears with a key field (placeholder `Content-Type`) and a value VarField (placeholder `application/json`) plus an **×** remove button
7. Fill in key `X-Custom` and value `hello`; click **Add header** again to add a second row; verify both rows are present with their own left-side input handles
8. Click the **×** button on the second header row — the row is removed and its handle disappears
9. Confirm the **Body** label row has a left-side input handle; when nothing is connected it shows dimmed white text; when connected it turns blue

## Steps — execution

10. Set status to **201**, add header `Content-Type` / `application/json`, connect a JSON body value (e.g. `{"ok":true}`) to the `body` handle
11. Open the Debug panel and send a test request
12. Expand the Response Builder trace row — the output value must be an object: `{ __rb: true, status: 201, headers: { "Content-Type": "application/json" }, body: {"ok":true} }`
13. Verify the final API response (visible in the Debug panel response area) returns HTTP status **201** with the `Content-Type` header and the JSON body
14. Remove the connection from the `body` handle and re-run — execution should return `active: false` (no response body → the node deactivates)
15. Connect the `status` handle to a numeric value node supplying `403` — verify the preset buttons and custom input become disabled (dimmed, unclickable) and the label "using connected value" appears; execution returns status 403

## Expected result
- Six status quick-pick buttons: 200, 201, 400, 401, 403, 500 with their friendly labels
- Custom status input accepts any integer 100–599
- Header rows are addable/removable dynamically; each row has its own left-side override handle
- When `status` handle is connected: quick-pick and custom input are disabled with "using connected value" label
- Executor output: `{ __rb: true, status: <number>, headers: <object>, body: <value> }`
- The workflow's HTTP response reflects the configured status code, headers, and body
- If body edges all return `active: false`: Response Builder also returns `active: false`

## Failure indicators
- Quick-pick buttons do not update the header subtitle
- Custom status input is not reflected in execution output
- Header rows cannot be added or removed
- Connected `status` handle does not disable the quick-pick/custom input
- Execution output does not contain the `__rb: true` marker
- HTTP response status code in Debug panel does not match the configured value

## Severity rationale
The Response Builder is the only way to customize HTTP status codes and headers in a workflow response; incorrect behavior would break all downstream API consumers relying on those values.

## Source reference
`components/canvas/nodes/ResponseBuilderNode.tsx` lines 23-30 (STATUS_PRESETS), lines 138-174 (quick-pick grid + custom input), lines 178-227 (dynamic header rows with add/remove); `lib/nodes/response-builder.ts` lines 50-54 (output shape `{ __rb: true, status, headers, body }`), lines 23-35 (body edge resolution returning `active: false` when no active body).

## Notes
Header values support `{{$vars.VAR_NAME}}` interpolation via `resolveVars` (executor line 46). Headers with an empty `key` are silently skipped. The `__rb: true` marker is how the workflow engine identifies a Response Builder result and sets the HTTP response status/headers accordingly.
