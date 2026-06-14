---
id: SEC-15
title: Unexpected execution errors are sanitised at the public API boundary
severity: medium
source_files:
  - lib/security/error-sanitize.ts
  - lib/execution-handler.ts
  - app/api/webhooks/[slug]/route.ts
---

## What this tests
Verifies that an *unexpected* workflow execution failure surfaced by the public APIs (`POST /api/v1/chat`, `/api/webhooks/<slug>`) returns a **generic** error body plus a correlation `logId` — never the raw internal error, which can carry an upstream provider's response body (the Anthropic/OpenAI nodes rethrow it verbatim), a stack trace, or a filesystem path. The full error is logged server-side under the same `logId` and remains in the execution record (Logs tab), so an operator can still trace it. Self-authored, safe errors (deadline → 504, depth → 400, no-output → 400) keep their explicit messages.

## Prerequisites
- App is running at http://localhost:3000
- A valid `sk-wf-*` key for an active workflow (and a token-gated webhook for the webhook check)
- A way to force a node runtime error whose message contains distinctive text — e.g. an Anthropic/OpenAI node pointed at a provider that returns an error body, or a Custom Code node that throws a string containing a fake secret/path

## Steps — chat API
1. Configure a workflow whose execution throws with identifiable internal text (e.g. the provider error body includes `"token":"sk-xxx"` or a path like `/srv/app/...`).
2. Call the API:
   ```bash
   curl -si -X POST http://localhost:3000/api/v1/chat \
     -H "Authorization: Bearer sk-wf-<key>" \
     -H "Content-Type: application/json" -d '{"message":"go"}'
   ```
3. Inspect the HTTP status and JSON body.
4. Check the server logs (stderr) for the correlation line.

## Steps — webhook API
5. Repeat against `/api/webhooks/<slug>` for a workflow that throws; confirm the same sanitisation in the `{ ok: false, ... }` body.

## Steps — safe errors are NOT sanitised
6. Trigger a deadline (see ENGINE-09) and a depth abort (see ENGINE-11); confirm those keep their explicit messages ("timed out" → 504, "depth exceeded" → 400) and are not replaced by the generic message.

## Expected result
- Step 3: HTTP **500** with body `{ "error": "Internal error executing the workflow", "logId": "<uuid>" }` — the distinctive internal text (secret/path/upstream body) is **absent** from the response.
- Step 4: a server log line `[exec <uuid>] workflow execution failed: <full raw error>` with the **same** `logId` as the response.
- Step 5: webhook 500 body `{ "ok": false, "error": "Internal error executing the workflow", "logId": "<uuid>" }`, no internal text.
- Step 6: 504/400 responses retain their specific, safe messages (no `logId`, not genericised).

## Failure indicators
- The 500 body contains the raw error text (upstream provider body, stack trace, file path, secret).
- No `logId` is returned, or the logged `logId` does not match the one in the response (operator can't correlate).
- A safe deadline/depth error is replaced by the generic message (over-sanitising loses a useful signal).

## Severity rationale
Leaking internal error detail across the trust boundary aids reconnaissance (paths, dependency/version hints, upstream specifics) and can expose secrets embedded in upstream responses; medium because exploitation requires inducing an error and the endpoint is still Bearer-gated.

## Source reference
`lib/security/error-sanitize.ts` — `sanitizeExecutionError(rawError, logger?)` returns `{ message: GENERIC_EXECUTION_ERROR, logId: randomUUID() }` and logs `[exec <logId>] workflow execution failed: <rawError>`. `lib/execution-handler.ts` — the catch-all 500 branch calls it (after the safe `NO_OUTPUT`/timeout/depth mappings) and returns `{ error: message, logId }`. `app/api/webhooks/[slug]/route.ts` — same sanitisation for its 500 branch (with timeout → 504 and depth → 400 kept explicit).

## Notes
The operator does not lose detail: the full error is persisted in the execution record (surfaced in the workflow Logs tab) and echoed to stderr under the `logId`. The management/debug route (`/api/workflows/<slug>/debug`) is operator-gated and intentionally keeps full detail. Code-level coverage: `__tests__/lib/error-sanitize.test.ts`, plus boundary assertions in `__tests__/api/chat.test.ts` and `__tests__/api/webhooks.test.ts`.
