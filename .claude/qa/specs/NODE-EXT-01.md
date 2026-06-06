---
id: NODE-EXT-01
title: HTTP Request node methods, headers, timeout, body handle
severity: high
source_files:
  - components/canvas/nodes/HttpRequestNode.tsx
  - lib/nodes/http-request.ts
---

## What this tests
Verifies that the HTTP Request node supports all five HTTP methods with correct color coding, shows the body input handle only for POST/PUT/PATCH, sends configurable headers with variable interpolation, respects the timeout setting, and returns body/status/ok output handles.

## Prerequisites
- App is running at http://localhost:3000
- A workflow with an HTTP Request node exists on the canvas
- The Debug panel is accessible
- A reachable test URL is available (e.g. `https://httpbin.org/get` for GET, `https://httpbin.org/post` for POST)

## Steps — canvas configuration

1. Navigate to the canvas containing an HTTP Request node
2. Observe the node header: title **HTTP Request**, subtitle **call any external API or URL**, cyan Globe icon; a method badge (e.g. **GET** in green) appears top-right
3. In the **Method** section, verify five method buttons: **GET** (emerald), **POST** (sky), **PUT** (amber), **PATCH** (violet), **DELETE** (red); each shows a hint below the label (e.g. "read data", "create / send", "replace", "update part", "remove")
4. With **GET** selected, confirm there is **no body** input handle on the left side and no **Body** label row in the node body
5. Click **POST** — a **body** input handle appears on the left side and a **Body** row appears in the node body; header badge updates to **POST** in sky/blue
6. Click **PUT** — body handle remains; header badge turns amber
7. Click **DELETE** — body handle disappears again
8. Click back to **GET**
9. In the **URL** field, enter a test URL; observe the hint "connect url handle to set dynamically"
10. In the **Headers** section, click **Add header** — a key field (placeholder `Content-Type`) and value VarField (placeholder `application/json`) plus × button appear
11. Add header `Accept` / `application/json`; click × to remove it — row disappears
12. In the **Timeout** field, verify default value `10000` ms; change to `5000`; confirm range is 500–30000

## Steps — execution

13. Set method to **GET**, URL to `https://httpbin.org/get`
14. Open the Debug panel and send a test request
15. Expand the HTTP Request trace: `body` output is a JSON object (parsed from response), `status` output is `200`, `ok` output is `true`
16. Set method to **POST**, URL to `https://httpbin.org/post`, connect a JSON body value, add header `Content-Type` / `application/json`
17. Run again — `body` output contains the echoed POST data, `status` = `200`, `ok` = `true`
18. Set URL to an unreachable address (e.g. `https://0.0.0.0/`) and timeout to `500` — after ~500ms the node **throws** and the workflow fails with an error like `HTTP Request to https://0.0.0.0/ timed out after 500 ms` (or `… failed: <reason>` for a non-timeout network error such as DNS failure or connection refused). The query string is stripped from the reported URL so interpolated secrets don't leak. To handle the failure gracefully, wire the node through a Try/Catch node
19. Set URL to a path that returns an HTTP error (e.g. `https://httpbin.org/status/404`) — the request still **resolves** (no throw): `status` = `404`, `ok` = `false`, `body` = the response body. Only network-level failures throw; HTTP error statuses flow through the `ok`/`status` outputs

## Expected result
- Method buttons highlight in their respective colors; header badge updates to match selected method
- Body handle and Body row are present only for POST, PUT, PATCH; absent for GET and DELETE
- URL field accepts variable expressions; `url` handle overrides the static URL when connected
- Header values support `$VAR_NAME` variable interpolation
- Timeout field: integer, min 500, max 30000, default 10000 ms
- On success: `body` = parsed JSON object or raw string, `status` = HTTP status integer, `ok` = boolean
- On an HTTP error status (4xx/5xx): the request still resolves — `status` = the code, `ok` = `false`, `body` = the response body (no throw)
- On a network-level failure (DNS failure, connection refused, or timeout/abort): the node **throws** so the failure is loud and consistent with every other node. The error names the host + path with the query string stripped (no secret leak) and distinguishes timeouts (`timed out after N ms`) from other failures (`failed: <reason>`)

## Failure indicators
- Body input handle visible when GET or DELETE is selected
- Body input handle absent when POST is selected
- Method badge color does not match the selected method
- Timeout field accepts values outside 500–30000 range
- A network-level failure silently returns `status=0` / `ok=false` / empty body instead of throwing (it must fail loudly)
- A thrown error contains the full URL including a secret query-string value (the query string must be stripped)
- An HTTP error status (4xx/5xx) throws instead of resolving with `ok=false`
- Header `$VAR_NAME` expressions are not resolved

## Severity rationale
The HTTP Request node is the primary external API integration point; incorrect method routing or missing body handle would silently send wrong requests to external services.

## Source reference
`components/canvas/nodes/HttpRequestNode.tsx` lines 28-44 (method colors and hints), line 44 (`HAS_BODY` set for POST/PUT/PATCH), lines 115-117 (conditional body handle), lines 244-248 (timeout input, min 500 max 30000); `lib/nodes/http-request.ts` lines 21-24 (body only used for non-GET), lines 31-33 (AbortController timeout), the catch block that re-throws network errors — distinguishing an aborted/timed-out request from other failures — with the query string stripped from the reported URL to avoid leaking interpolated secrets.

## Notes
The `url` input handle overrides the static URL field when connected. Header values (but not keys) support `{{$vars.VAR}}` interpolation. GET and DELETE requests with a connected `body` handle will have the body silently ignored by the executor (line 21: `if (bodySrc && method !== "GET")`). Note the deliberate split between HTTP-level errors and network-level errors: `fetch` only rejects when the request never produced a response (DNS, connection refused, abort/timeout), so those cases throw, while a server that responds with 4xx/5xx resolves normally and is surfaced via `ok=false` and the `status` output.
