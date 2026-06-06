---
id: API-13
title: Response Builder result custom status and headers in HTTP response
severity: high
source_files:
  - app/api/v1/chat/route.ts
---

## What this tests
Verifies that when a workflow's Output node receives a Response Builder result (`__rb: true`), the HTTP response uses the custom status code, custom headers, and serialized body — bypassing the default `{ reply: value }` wrapper.

## Steps — setup

1. Create a workflow with a Response Builder node configured with:
   - Status: **201**
   - Response Header: `X-Custom-Header: my-value`
   - Body connected to a value node emitting `{"created": true}`
2. Connect the Response Builder's `reply` output to the Output node

## Steps — execute and verify

3. Send a request to the workflow via `POST /api/v1/chat`:
   ```bash
   curl -si -X POST http://localhost:3000/api/v1/chat \
     -H "Authorization: Bearer sk-wf-<key>" \
     -H "Content-Type: application/json" \
     -d '{"message": "test"}'
   ```
4. Verify HTTP status **201** (not 200)
5. Verify `X-Custom-Header: my-value` is present in the response headers
6. Verify `Content-Type: application/json` is auto-added (body is valid JSON)
7. Verify response body is `{"created":true}` — **not** wrapped in `{ "reply": ... }`
8. Verify CORS headers are also present (`Access-Control-Allow-Origin: *`)

## Steps — auto Content-Type detection

9. Change the Response Builder body to emit a plain string `"hello world"` (not valid JSON)
10. Run — `Content-Type: text/plain; charset=utf-8` is auto-applied
11. Set the Response Builder to emit a JSON body **and** explicitly set `Content-Type: text/plain` as a custom header — verify the explicit header wins (auto-detection skipped when `Content-Type` is user-supplied)

## Steps — null/undefined body

12. Disconnect the Response Builder body handle (body = null/undefined)
13. Run — response body is an empty string `""` (no content); `Content-Type` is not auto-added (no body to detect)

## Steps — status code range

14. Set status to **404**; run — HTTP response is 404
15. Set status to **500**; run — HTTP response is 500 (custom status, not the default workflow error 500)

## Expected result
- Response Builder detected by `rv.__rb === true`
- HTTP status = `rb.status` (from the Response Builder node configuration)
- Custom headers = `rb.headers` (merged after CORS headers, before user headers)
- Body serialization: `null`/`undefined` → `""`, string → as-is, other → `JSON.stringify(rb.body)`
- Auto `Content-Type`: `application/json` if body parses as JSON; `text/plain; charset=utf-8` otherwise; skipped if body is empty or user provided `Content-Type`
- Response is NOT wrapped in `{ "reply": ... }`
- CORS headers always present

## Failure indicators
- Response Builder returns `{ "reply": {...} }` wrapper instead of raw body
- HTTP status is 200 regardless of the Response Builder status setting
- Custom headers absent from response
- Auto `Content-Type: application/json` not applied when body is valid JSON
- CORS headers missing from the Response Builder response

## Severity rationale
Response Builder is the only way to control HTTP status codes and custom headers; incorrect passthrough means all custom status codes and headers are silently ignored.

## Source reference
`app/api/v1/chat/route.ts` lines 151-178 (ResponseBuilder detection: `rv.__rb === true`, body serialization, auto Content-Type detection via `JSON.parse`, response construction: `{ ...CORS_HEADERS, ...(autoContentType ? ...), ...userHeaders }`).

## Notes
The user-provided `Content-Type` in `rb.headers` overrides the auto-detected one because the spread order is `...CORS_HEADERS, ...(autoContentType ? ...), ...userHeaders` — user headers come last. Auto Content-Type is only set when `bodyStr` is non-empty AND no `Content-Type` key appears in `rb.headers` (case-insensitive key check via `Object.keys(userHeaders).some(k => k.toLowerCase() === "content-type")`).
