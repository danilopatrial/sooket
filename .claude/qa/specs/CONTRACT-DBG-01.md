---
id: CONTRACT-DBG-01
title: POST debug with valid body returns ok/output/traces
severity: critical
source_files:
  - app/api/workflows/[slug]/debug/route.ts
---

## What this tests
Verifies that a valid POST to `/api/workflows/[slug]/debug` executes the workflow and returns a response shaped `{ok: true, output, traces}`.

## Prerequisites
- App is running at http://localhost:3000
- At least one workflow exists with a known slug (referred to as `<slug>` below)
- The workflow has at least an input node and an output node connected

## Steps
1. Send a POST request with a simple JSON body to the debug endpoint:
   ```
   curl -s -X POST http://localhost:3000/api/workflows/<slug>/debug \
     -H "Content-Type: application/json" \
     -d '{"message": "hello"}' \
     | python3 -m json.tool
   ```
2. Inspect the top-level `ok` field.
3. Inspect the `output` field.
4. Inspect the `traces` array — note its length and the fields present in each entry.
5. Body-size cap: send a body larger than the limit (default 1 MiB, overridable via
   `SOOKET_MAX_BODY_BYTES`) and confirm the route responds `413` with
   `{ "error": "Request body too large" }` instead of buffering the whole payload:
   ```
   head -c 1100000 /dev/zero | tr '\0' 'x' > /tmp/big.txt
   curl -s -o /dev/null -w "%{http_code}\n" -X POST \
     http://localhost:3000/api/workflows/<slug>/debug \
     -H "Content-Type: application/json" --data-binary @/tmp/big.txt
   ```

## Expected result
- HTTP status code is `200`.
- Response body has `ok: true`.
- Response body contains an `output` field (may be a string, object, or empty string `""` depending on workflow).
- Response body contains a `traces` array where each element has all of these fields:
  - `nodeId` (string)
  - `nodeType` (string)
  - `inputSnapshot`
  - `outputSnapshot`
  - `durationMs`
  - `error` (null on success)
  - `rawValue`
  - `pinned` (boolean)
- Request body size is capped via `readLimitedText` (same as `/api/v1/chat` and the
  webhook route): a body over the limit returns `413 { error: "Request body too large" }`;
  a body that can't be read returns `400 { error: "Failed to read request body" }`;
  malformed JSON within an allowed-size body still returns `400 { error: "Invalid JSON body" }`

## Failure indicators
- HTTP status code is not 200.
- `ok` is `false` or missing.
- `traces` field is absent or not an array.
- Any trace entry is missing one of the documented fields (`nodeId`, `nodeType`, `durationMs`, `pinned`, etc.).
- Response body is not valid JSON.
- An oversized body is buffered fully / executed instead of being rejected with `413` (the body-size cap is not enforced on the debug path).

## Severity rationale
The debug endpoint is the primary way users test workflow changes; a broken response shape would make the entire sandbox unusable.

## Source reference
`app/api/workflows/[slug]/debug/route.ts` line 146 — `return NextResponse.json({ ok: true, output, traces: serializeTraces(traces) });`  
`app/api/workflows/[slug]/debug/route.ts` lines 149–160 — `serializeTraces` defines the exact fields present on each trace entry.

## Notes
If the workflow has no path that reaches an output node, the response will be `{ok: false, error: "No active path reached any output node", traces: [...]}` — this is also a 200 response. For this spec, use a workflow that has a connected output node to ensure `ok: true` is returned.

The debug route reads the body via `readLimitedText(request)` (from `lib/request-limit.ts`), the same byte-capped reader used by `/api/v1/chat` and `/api/webhooks/[slug]`. The limit defaults to 1 MiB (`DEFAULT_MAX_BODY_BYTES`) and is overridable via `SOOKET_MAX_BODY_BYTES`. Oversized bodies are rejected up-front via `Content-Length` and, since that header can be absent or spoofed, also while streaming — so the debug path no longer buffers an unbounded body into memory.
