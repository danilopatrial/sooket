---
id: NODE-EXT-02
title: HTTP Request node binary response stored as external reference
severity: medium
source_files:
  - components/canvas/nodes/HttpRequestNode.tsx
  - lib/nodes/http-request.ts
---

## What this tests
Verifies that when the HTTP Request node receives a response with a non-text/non-JSON Content-Type, it stores the binary data externally (not inline in the node output) and returns a binary reference identifier rather than embedding the raw bytes in the execution trace.

## Prerequisites
- App is running at http://localhost:3000
- A workflow with an HTTP Request node exists on the canvas
- The Debug panel is accessible
- A URL that returns a binary response is available (e.g. `https://httpbin.org/image/png` for PNG, or any image/PDF URL)

## Steps

1. Navigate to the canvas and configure the HTTP Request node with method **GET** and URL `https://httpbin.org/image/png` (or another URL returning `Content-Type: image/png`)
2. Open the Debug panel and send a test request
3. Expand the HTTP Request node trace row — the `body` output must **not** contain raw binary data or a large base64 string embedded in the JSON trace
4. The `body` output should be a binary reference object — either:
   - A string ID (returned by `ctx.binaryData.write`) pointing to an externally stored file, or
   - A small object `{ _binary: true, base64: "...", mimeType: "image/png" }` if the binaryData store is unavailable
5. Verify `status` = `200` and `ok` = `true` in the trace
6. If the body is a binary reference ID (string), navigate to `http://localhost:3000/api/binary/<id>` — it should return the binary file with the correct `Content-Type: image/png` header
7. Test with a URL that has a `Content-Disposition: attachment; filename="report.pdf"` header — verify the stored file name is `report.pdf`
8. Test with a URL where the filename comes from the URL path (e.g. `.../logo.svg`) — verify the file name is `logo.svg`
9. Test with a text/plain or application/json response (e.g. `https://httpbin.org/json`) — verify the `body` output is a plain string or JSON object, **not** a binary reference

## Expected result
- Non-text responses (Content-Type not in: `text/*`, `application/json`, `application/ld+json`, empty): body output is a binary reference, not inline bytes
- Text/JSON responses: body output is parsed JSON object or raw string
- Binary file name resolved from `Content-Disposition: filename=` header first; falls back to URL path segment
- MIME type stored with the binary data matches the `Content-Type` header (first part before `;`)
- `status` and `ok` handles return correct values regardless of response type

## Failure indicators
- Binary response body appears as a large base64 string directly in the execution trace JSON
- `body` output is `undefined` or empty for a successful binary response
- Text response returns a binary reference instead of the parsed content
- `Content-Type: image/png` response treated as text and corrupted during string conversion
- Binary reference ID does not resolve at `/api/binary/<id>`

## Severity rationale
Embedding binary data inline in traces would bloat execution logs and break downstream nodes that expect structured data; returning a reference keeps payloads manageable.

## Source reference
`lib/nodes/http-request.ts` lines 49-57 (isText detection logic), lines 63-87 (binary branch: Buffer read, filename resolution from Content-Disposition then URL path, `ctx.binaryData.write` call or fallback `{ _binary: true, base64, mimeType }` object).

## Notes
The text/binary decision is made on `Content-Type` only — the actual byte content is not inspected. An empty `Content-Type` header is treated as text. The fallback `{ _binary: true, base64, mimeType }` object is returned when the execution context does not have a `binaryData` store available (e.g. in certain test environments); in normal operation `ctx.binaryData.write` is called and returns an opaque reference ID.
