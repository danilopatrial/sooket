---
id: LIMIT-04
title: Body cap boundary and SOOKET_MAX_BODY_BYTES override
severity: low
source_files:
  - lib/request-limit.ts
---

## What this tests
Verifies the exact boundary of the body-size cap (a body of exactly `limit` bytes is allowed; `limit + 1` is rejected) and that `SOOKET_MAX_BODY_BYTES` overrides the 1 MiB default (with invalid values falling back to the default).

## Prerequisites
- App is running at http://localhost:3000
- An endpoint that uses `readLimitedText` (e.g. `/api/v1/chat` with a valid key, or `/api/webhooks/<slug>`)
- Ability to set `SOOKET_MAX_BODY_BYTES` for the server process

## Steps
1. Start the server with a small explicit cap, e.g. `SOOKET_MAX_BODY_BYTES=1000 npm run dev`.
2. Send a body of exactly 1000 bytes and confirm it is **accepted** (not 413):
   ```bash
   head -c 1000 /dev/zero | tr '\0' 'x' > /tmp/exact.txt
   curl -s -o /dev/null -w "%{http_code}\n" -X POST \
     http://localhost:3000/api/webhooks/<slug> --data-binary @/tmp/exact.txt
   ```
3. Send a body of 1001 bytes and confirm it is **rejected** with `413`.
4. Restart with an invalid value, e.g. `SOOKET_MAX_BODY_BYTES=abc`, and confirm the cap reverts to the 1 MiB default (a 1001-byte body is now accepted).

## Expected result
- Exactly-`limit` bytes → accepted (not 413).
- `limit + 1` bytes → `413 Request body too large`.
- A missing/empty/non-numeric/non-positive `SOOKET_MAX_BODY_BYTES` falls back to `DEFAULT_MAX_BODY_BYTES` (1 MiB).

## Failure indicators
- A body of exactly `limit` bytes is rejected (off-by-one).
- An invalid override is treated as `0`/throws instead of falling back to the default.

## Severity rationale
Boundary correctness and config robustness; low because the default already protects memory and only the exact edge differs.

## Source reference
`lib/request-limit.ts` — `maxBodyBytes()` (lines 21–27) resolves/validates the override; `readLimitedText` allows `received <= limit` and throws at `received > limit` (line 81); the doc comment states "exactly `limit` bytes is allowed; `limit + 1` is not."

## Notes
Byte counting is on UTF-8 bytes (not characters), so multi-byte input counts by encoded length. The `Content-Length` fast path rejects early; the streaming counter is authoritative when the header is absent or spoofed.
