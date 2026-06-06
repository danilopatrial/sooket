---
id: CONTRACT-ACCT-06
title: GET /api/binary/[valid-id] returns binary data with Content-Type and Content-Length
severity: medium
source_files:
  - app/api/binary/[id]/route.ts
  - lib/binary-data.ts
---

## What this tests
A GET to `/api/binary/[id]` for a valid binary reference returns the raw binary body with the correct `Content-Type` and `Content-Length` headers.

## Prerequisites
- App is running at http://localhost:3000
- A workflow exists with an HTTP Request node configured to fetch a binary resource (e.g. an image URL)
- The workflow has a valid API key (`sk-wf-*`) and is active
- The workflow slug and API key are known

## Steps
1. Execute the workflow so the HTTP Request node fetches a binary response and stores it in the binary data service. Capture the binary reference ID from the response. For example, if the workflow returns a binary ref object like `{"__binary": true, "id": "<uuid>", "mimeType": "image/png", "size": 1234}`, note the `id`:
   ```
   curl -s -X POST http://localhost:3000/api/v1/chat \
     -H "Authorization: Bearer sk-wf-<key>" \
     -H "Content-Type: application/json" \
     -d '{}' | jq .
   ```
2. Use the captured `id` to fetch the binary resource:
   ```
   curl -s -i http://localhost:3000/api/binary/<uuid>
   ```

## Expected result
- HTTP status: `200`
- `Content-Type` header matches the MIME type of the original binary response (e.g. `image/png`)
- `Content-Length` header matches the byte size of the stored binary data
- Response body is raw binary data (non-empty)

## Failure indicators
- HTTP status is not 200
- `Content-Type` header is absent or is `application/json` instead of the correct MIME type
- `Content-Length` header is absent or does not match the actual body size
- Response body is empty

## Severity rationale
Binary passthrough is needed for workflows that proxy image or file downloads; an incorrect `Content-Type` or `Content-Length` breaks downstream consumers.

## Source reference
`app/api/binary/[id]/route.ts` lines 12–17 — the GET handler returns `new Response(new Uint8Array(buf), { headers: { "Content-Type": ref.mimeType, "Content-Length": String(ref.size) } })`.

## Notes
Binary data is stored in memory (default backend) with a 1-hour TTL (`expiresAt: Date.now() + 3_600_000`). The binary ref ID is a UUID generated at write time by `crypto.randomUUID()`. If the server restarts between the workflow execution and the GET request, the binary data will be gone and a 404 will be returned instead.
