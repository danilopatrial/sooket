---
id: ENGINE-10
title: Queue-wait timeout gives up with 503 instead of waiting forever
severity: high
source_files:
  - lib/concurrency.ts
  - lib/execution-handler.ts
  - app/api/webhooks/[slug]/route.ts
---

## What this tests
Verifies that when all execution slots are busy and a request sits in the semaphore queue longer than `EXECUTION_QUEUE_TIMEOUT_MS` (default 10000 ms), `acquire()` gives up and resolves `false`, so the caller receives the same `503 { error: "Server busy, try again shortly" }` it gets when the queue is full — rather than holding the connection open indefinitely behind a backlog of slow executions.

## Prerequisites
- App is running at http://localhost:3000
- A valid workflow API key (`sk-wf-...`) for an active workflow that runs slowly (e.g. a Custom Code sleep or a slow HTTP Request) so the active slot stays occupied long enough for a queued request to time out
- Ability to set `EXECUTION_CONCURRENCY`, `EXECUTION_MAX_QUEUE`, and `EXECUTION_QUEUE_TIMEOUT_MS` for the server process

## Steps
1. Start the server so one slow execution holds the slot while a second request must queue and then time out:
   ```
   EXECUTION_CONCURRENCY=1 EXECUTION_MAX_QUEUE=5 EXECUTION_QUEUE_TIMEOUT_MS=1000 npm run dev
   ```
   (The active workflow must take noticeably longer than 1 s — e.g. ~5 s.)
2. Fire a slow request in the background to occupy the single active slot:
   ```bash
   curl -s -o /dev/null -X POST http://localhost:3000/api/v1/chat \
     -H "Authorization: Bearer sk-wf-..." \
     -H "Content-Type: application/json" -d '{"message":"slow"}' &
   ```
3. Immediately fire a second request and time it; it should queue, wait ~1 s, then 503:
   ```bash
   curl -s -o /dev/null -w "%{http_code} %{time_total}s\n" -X POST \
     http://localhost:3000/api/v1/chat \
     -H "Authorization: Bearer sk-wf-..." \
     -H "Content-Type: application/json" -d '{"message":"queued"}'
   ```
4. After the first (background) request completes, send a fresh request and confirm it succeeds (slot freed, queue drained).
5. Restart with `EXECUTION_QUEUE_TIMEOUT_MS=0` and repeat: the queued request should now wait for the slot (no early 503) — the legacy wait-forever behaviour.

## Expected result
- Step 3: HTTP **503** with `{ "error": "Server busy, try again shortly", "activeExecutions": 1, "queueDepth": 0 }`, and `time_total` ≈ 1 s (the configured queue-wait budget) — not ≈ 5 s (the full execution).
- Step 4: a request after the backlog clears returns `200`.
- Step 5: with `EXECUTION_QUEUE_TIMEOUT_MS=0`, the queued request is eventually served once the slot frees (it does not 503 early).
- A waiter that is granted a slot just before its deadline runs normally; it is never settled twice.

## Failure indicators
- A queued request blocks for the entire duration of the slow execution (≈ full run time) instead of timing out at the configured budget.
- A timed-out waiter still consumes a slot when one is later released (a phantom acquisition), or is double-settled.
- `EXECUTION_QUEUE_TIMEOUT_MS=0` causes immediate 503 instead of waiting (the disable value is mis-handled).
- The 503 body is missing `activeExecutions` / `queueDepth`.

## Severity rationale
A backlog of slow executions could otherwise pin every queued caller on an open connection until each slow run finishes, turning a transient spike into a cascade of hung clients; high because it protects caller-facing latency and connection budgets.

## Source reference
`lib/concurrency.ts` — `ExecutionSemaphore.acquire()` arms a `setTimeout(queueTimeoutMs)` per queued entry that splices the entry out and resolves `false` on expiry; `release()` clears the timer when granting a slot so a granted waiter never times out and a timed-out waiter is never granted. The singleton reads `EXECUTION_QUEUE_TIMEOUT_MS` (default 10000; `0` = wait forever). The caller maps the resulting `false` to the existing 503 in `lib/execution-handler.ts` / `app/api/webhooks/[slug]/route.ts`.

## Notes
A `false` from `acquire()` is intentionally indistinguishable to the caller whether it came from a full queue (immediate) or a wait timeout (after the budget) — both mean "shed this request now." Unit coverage with fake timers lives in `__tests__/lib/concurrency.test.ts` ("queue-wait timeout" describe block). See ENGINE-07 / API-09 for the queue-full 503 path this extends.
