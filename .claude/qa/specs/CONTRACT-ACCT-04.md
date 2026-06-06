---
id: CONTRACT-ACCT-04
title: POST /api/complexity with valid prompt returns embeddingScore and X-Layer header
severity: low
source_files:
  - app/api/complexity/route.ts
---

## What this tests
A POST to `/api/complexity` with a non-empty prompt string returns `{embeddingScore}` and the `X-Layer: embedding` response header.

## Prerequisites
- App is running at http://localhost:3000

## Steps
1. Send a POST request with a non-empty prompt:
   ```
   curl -s -i -X POST http://localhost:3000/api/complexity \
     -H "Content-Type: application/json" \
     -d '{"prompt":"What is the capital of France?"}'
   ```

## Expected result
- HTTP status: `200`
- Response header `X-Layer: embedding` is present
- Response body is JSON with a single field `embeddingScore` whose value is a number (typically between 0 and 1):
  ```json
  {"embeddingScore": 0.42}
  ```

## Failure indicators
- HTTP status is not 200
- `X-Layer` header is absent from the response
- Response body is missing `embeddingScore`
- `embeddingScore` is `null` (indicates the embedding call failed internally)
- Response contains an `error` field

## Severity rationale
This is an internal canvas-preview route; a broken embedding scorer degrades the Complexity node UI preview but does not affect workflow execution.

## Source reference
`app/api/complexity/route.ts` lines 17–19 — after a successful `scoreEmbedding(prompt)` call the handler returns `NextResponse.json({ embeddingScore }, { headers: { "X-Layer": "embedding" } })`.

## Notes
The prompt is capped at `MAX_PROMPT_CHARS` (32 000 characters) before scoring — the
practical upper bound for a single LLM prompt. This was raised from the previous
8 000-char cap, which silently truncated a long system prompt to roughly its first
~2 000 tokens and produced a preview score that did not match the full-prompt score
the executor computes. Any realistic prompt now scores identically in the preview and
the executor; only prompts longer than 32 000 characters are still truncated. If the
underlying `scoreEmbedding` call throws, the handler returns `{embeddingScore: null}`
without the `X-Layer` header — that error path is not part of this test.
