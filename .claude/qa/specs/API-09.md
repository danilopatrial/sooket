---
id: API-09
title: Concurrency limit exceeded returns 503
severity: high
source_files:
  - app/api/v1/chat/route.ts
---

## What this tests
Verifies that `POST /api/v1/chat` returns 503 with `{ "error": "Server busy, try again shortly" }` when the execution semaphore has no available slots and the queue is full — and that the response includes active execution count and queue depth.

## Steps — trigger the 503

1. (Recommended) Start the app with `EXECUTION_CONCURRENCY=1 EXECUTION_MAX_QUEUE=0` to make the limit easy to trigger
2. Send a slow request in the background (e.g. workflow with a 10-second HTTP Request):
   ```bash
   curl -s -X POST http://localhost:3000/api/v1/chat \
     -H "Authorization: Bearer sk-wf-<key>" \
     -H "Content-Type: application/json" \
     -d '{}' &
   ```
3. While that is running, immediately send a second request:
   ```bash
   curl -si -X POST http://localhost:3000/api/v1/chat \
     -H "Authorization: Bearer sk-wf-<key>" \
     -H "Content-Type: application/json" \
     -d '{}'
   ```
4. Verify HTTP status **503** and body:
   ```json
   {
     "error": "Server busy, try again shortly",
     "activeExecutions": 1,
     "queueDepth": 0
   }
   ```

## Steps — verify response fields

5. Confirm three fields in the 503 body:
   - `error`: exactly `"Server busy, try again shortly"`
   - `activeExecutions`: integer reflecting current running count
   - `queueDepth`: integer reflecting current queue length

## Steps — slot released after execution

6. Wait for the first (background) request to complete
7. Send a new request — it should succeed (semaphore slot released in `finally`)

## Steps — CORS on 503

8. Verify the 503 response includes all three CORS headers

## Expected result
- 503 when `executionSemaphore.acquire()` returns `false` (all slots AND queue full)
- Body includes `activeExecutions` and `queueDepth` for observability
- CORS headers present on 503

## Failure indicators
- 503 returned when slots are available (premature rejection)
- 503 missing `activeExecutions` or `queueDepth` fields
- After 503, the semaphore is not properly managed (subsequent requests always 503)

## Severity rationale
The 503 must include observability fields so callers can implement retry-after logic; missing them makes backoff tuning impossible.

## Source reference
`app/api/v1/chat/route.ts` lines 121-126 (`if (!acquired) return corsJson({ error: "Server busy, try again shortly", activeExecutions: executionSemaphore.activeCount, queueDepth: executionSemaphore.queueDepth }, 503)`).

## Notes
This spec tests the same mechanism as ENGINE-07 but from the HTTP API perspective rather than the semaphore internals. The 503 is returned immediately (no queuing) when both active slots and queue are exhausted.
