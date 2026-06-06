---
id: ENGINE-07
title: Concurrency 503 returned when execution slots and queue are full
severity: high
source_files:
  - lib/concurrency.ts
  - app/api/v1/chat/route.ts
---

## What this tests
Verifies that the `ExecutionSemaphore` limits concurrent workflow executions to `EXECUTION_CONCURRENCY` (default 10) active slots plus a queue of up to `EXECUTION_MAX_QUEUE` (default 50) waiting requests, returning 503 with `{ error: "Server busy, try again shortly" }` when both the active slots and the queue are full.

## Prerequisites
- App is running at http://localhost:3000 with default concurrency settings
- A valid workflow API key is available
- A tool capable of sending many concurrent HTTP requests is available (e.g. `curl` with `&` backgrounding, `ab`, or `wrk`)
- Optional: start the app with `EXECUTION_CONCURRENCY=1 EXECUTION_MAX_QUEUE=0` to make the limit easy to trigger with just 2 concurrent requests

## Steps — verifying the 503 response shape

1. (Recommended setup) Restart the app with environment variables:
   ```
   EXECUTION_CONCURRENCY=1 EXECUTION_MAX_QUEUE=0
   ```
   This sets max concurrent = 1, max queue = 0; the second concurrent request immediately gets 503.

2. Start a slow workflow execution (e.g. a workflow with a 10s Custom Code sleep or an HTTP Request with a long timeout) in the background:
   ```bash
   curl -s -X POST http://localhost:3000/api/v1/chat \
     -H "Authorization: Bearer sk-wf-..." \
     -H "Content-Type: application/json" \
     -d '{"message":"start"}' &
   ```

3. While the first request is still running, send a second request:
   ```bash
   curl -s -X POST http://localhost:3000/api/v1/chat \
     -H "Authorization: Bearer sk-wf-..." \
     -H "Content-Type: application/json" \
     -d '{"message":"overflow"}'
   ```

4. Verify the second request returns HTTP **503** with body:
   ```json
   {
     "error": "Server busy, try again shortly",
     "activeExecutions": 1,
     "queueDepth": 0
   }
   ```

## Steps — verifying response fields

5. Confirm the 503 response contains exactly these fields:
   - `error`: string `"Server busy, try again shortly"`
   - `activeExecutions`: integer — the current `running` count
   - `queueDepth`: integer — the current queue length (how many are waiting)

## Steps — queued requests (with non-zero maxQueue)

6. Restart with `EXECUTION_CONCURRENCY=1 EXECUTION_MAX_QUEUE=2` (1 active slot, 2 queue slots)
7. Fire 4 concurrent requests:
   - Request 1: acquires the active slot (running = 1)
   - Requests 2 and 3: enter the queue (queueDepth = 2)
   - Request 4: queue full → immediately returns 503 with `activeExecutions: 1, queueDepth: 2`
8. When Request 1 completes, Request 2 dequeues and begins executing

## Steps — semaphore released after execution

9. After the 503-triggering request, wait for the active execution to complete
10. Send a new request — it should succeed (semaphore released in `finally` block; slot available again)

## Expected result
- `acquire()` returns `true` when `running < max` (immediate slot)
- `acquire()` queues the request when `running >= max` and `queue.length < maxQueue`
- `acquire()` returns `false` when both `running >= max` and `queue.length >= maxQueue`
- 503 response: `{ error: "Server busy, try again shortly", activeExecutions: N, queueDepth: M }`
- Semaphore is always released in the `finally` block after execution (no slot leaks)
- Default limits: max 10 concurrent, max 50 queued (overridable via env vars)

## Failure indicators
- 503 not returned when all slots AND queue are full
- 503 returned when slots are full but queue still has capacity (requests should queue, not 503)
- 503 response missing `activeExecutions` or `queueDepth` fields
- Slot not released after execution completes (subsequent requests always 503)
- Active count does not reflect the actual number of running executions

## Severity rationale
Without concurrency limiting, a sudden traffic spike would exhaust server resources; a broken semaphore that doesn't release slots would cause permanent 503 responses after normal load.

## Source reference
`lib/concurrency.ts` lines 20-34 (`acquire`: immediate/queue/reject logic), lines 36-41 (`release`: decrement + dequeue), lines 44-47 (`executionSemaphore` singleton with env-configurable limits); `app/api/v1/chat/route.ts` lines 121-126 (503 response when `!acquired`), line 145 (`release()` in `finally`).

## Notes
The default limits are controlled by environment variables: `EXECUTION_CONCURRENCY` (default 10) and `EXECUTION_MAX_QUEUE` (default 50). Setting `EXECUTION_MAX_QUEUE=0` makes it easy to test 503 with just `EXECUTION_CONCURRENCY + 1` concurrent requests. The semaphore is a singleton (`executionSemaphore`) shared across all API requests to the same process.
