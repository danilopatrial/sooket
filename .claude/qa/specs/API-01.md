---
id: API-01
title: Valid request with active workflow and valid key returns correct response
severity: critical
source_files:
  - app/api/v1/chat/route.ts
---

## What this tests
Verifies the happy-path execution of `POST /api/v1/chat`: a valid `sk-wf-*` API key tied to an active workflow processes the request body, executes the workflow, and returns the result in `{ reply: ... }` format.

## Prerequisites
- App is running at http://localhost:3000
- An active workflow exists with a valid API key (`sk-wf-*`) and at least an Input → Output node chain
- `ENCRYPTION_SECRET` is set in the environment

## Steps

1. Send a POST request:
   ```bash
   curl -s -X POST http://localhost:3000/api/v1/chat \
     -H "Authorization: Bearer sk-wf-<valid-key>" \
     -H "Content-Type: application/json" \
     -d '{"message": "hello"}'
   ```

2. Verify HTTP status code is **200**

3. Verify the response body shape:
   ```json
   { "reply": "<workflow output value>" }
   ```
   For a passthrough workflow (Input → Output), `reply` = `{"message": "hello"}` (the request body echoed back)

4. Verify CORS headers are present on the response:
   - `Access-Control-Allow-Origin: *` (or the configured `CORS_ORIGIN`)
   - `Access-Control-Allow-Methods: POST, GET, OPTIONS`
   - `Access-Control-Allow-Headers: Authorization, Content-Type`

5. Verify `Content-Type: application/json` is present in the response headers

6. Check that `workflow_api_keys.last_used_at` was updated asynchronously (query the DB after a brief delay)

## Steps — response value types

7. With a workflow outputting a plain string `"hello"`: response = `{ "reply": "hello" }`
8. With a workflow outputting a JSON object: response = `{ "reply": {"key": "val"} }` (object included directly in `reply`)
9. With a workflow outputting a number `42`: response = `{ "reply": "42" }` (stringified for non-object non-string values)
10. With a null/undefined output (no active path): response = 400 `{ "error": "No active path reached any output node" }`

## Steps — ResponseBuilder result

11. A workflow with a Response Builder node (status 201, header `X-Custom: yes`, body `{"ok":true}`):
    - HTTP status = **201**
    - Response header `X-Custom: yes` present
    - Body = `{"ok":true}` (raw, not wrapped in `{ reply: ... }`)
    - `Content-Type: application/json` auto-added since body is valid JSON

## Expected result
- 200 response with `{ "reply": <value> }` for normal workflow output
- CORS headers present on all responses
- `Content-Type: application/json` always set
- ResponseBuilder (`__rb: true`) result: custom status + headers + raw body (bypasses the `reply` wrapper)
- `last_used_at` updated asynchronously via `setImmediate` (non-blocking)
- IP extracted from `x-forwarded-for` (first address) or `x-real-ip` header

## Failure indicators
- Response missing CORS headers
- Normal workflow output returned as raw value instead of `{ "reply": value }`
- HTTP status is always 200 even when ResponseBuilder sets a different code
- Request fails (5xx) for a valid key, active workflow, and well-formed JSON body

## Severity rationale
This is the primary API endpoint; a broken happy path means the entire platform is non-functional for all API consumers.

## Source reference
`app/api/v1/chat/route.ts` lines 21-26 (`corsJson` helper), lines 40-42 (token extraction from Authorization header), lines 46-58 (key + workflow lookup), lines 99-105 (workflow object construction), lines 151-178 (ResponseBuilder vs normal output handling, `{ reply }` wrapper).
