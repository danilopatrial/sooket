---
id: CONTRACT-ACCT-05
title: POST /api/complexity with empty prompt returns embeddingScore 0
severity: low
source_files:
  - app/api/complexity/route.ts
---

## What this tests
A POST to `/api/complexity` with an empty or whitespace-only prompt short-circuits without calling the embedder and returns `{embeddingScore: 0}`.

## Prerequisites
- App is running at http://localhost:3000

## Steps
1. Send a POST request with an empty prompt string:
   ```
   curl -s -i -X POST http://localhost:3000/api/complexity \
     -H "Content-Type: application/json" \
     -d '{"prompt":""}'
   ```
2. Repeat with a whitespace-only prompt:
   ```
   curl -s -i -X POST http://localhost:3000/api/complexity \
     -H "Content-Type: application/json" \
     -d '{"prompt":"   "}'
   ```

## Expected result
- HTTP status: `200`
- Response body is:
  ```json
  {"embeddingScore": 0}
  ```
- The `X-Layer` response header is **absent** (the embedding path is not reached)

## Failure indicators
- HTTP status is not 200
- `embeddingScore` is `null` instead of `0`
- `X-Layer: embedding` header is present (indicates the embedder was called when it should not have been)
- Response contains an `error` field

## Severity rationale
This is a canvas-preview-only route; incorrect handling of empty prompts affects only the Complexity node UI preview, not workflow execution.

## Source reference
`app/api/complexity/route.ts` lines 13–15 — `if (!prompt.trim()) { return NextResponse.json({ embeddingScore: 0 }); }` — the handler returns `0` without calling `scoreEmbedding`.

## Notes
The checklist description for this item reads "returns `{embeddingScore: null}`" — that description is **incorrect**. The source returns `0` for empty input and `null` only when the embedding call throws an exception (a separate error path not covered by this spec). Verify in source: `app/api/complexity/route.ts`.
