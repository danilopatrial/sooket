---
id: EDGE-05
title: Concurrent debug requests produce independent, non-corrupted results
severity: high
source_files:
  - lib/workflow-engine.ts
  - app/api/workflows/[slug]/debug/route.ts
---

## What this tests
Two simultaneous debug executions against the same workflow each receive the correct output for their own input — shared mutable state (eval cache, visiting set, trace array) is never shared between requests.

## Prerequisites
- App is running at http://localhost:3000
- A workflow exists whose slug is known (e.g. `echo-wf`)
- The workflow contains an Input node connected directly to an Output node (simple pass-through)
- The workflow's slug and a valid debug URL are available

## Steps
1. Open a terminal.
2. Run two `curl` POST requests concurrently against the debug endpoint, each with a distinct body:
   ```bash
   curl -s -X POST http://localhost:3000/api/workflows/echo-wf/debug \
     -H "Content-Type: application/json" \
     -d '{"message":"REQUEST_A"}' &
   curl -s -X POST http://localhost:3000/api/workflows/echo-wf/debug \
     -H "Content-Type: application/json" \
     -d '{"message":"REQUEST_B"}' &
   wait
   ```
3. Observe both JSON responses printed to the terminal.

## Expected result
- Both requests return `{"ok":true, ...}`.
- The response for the first request contains `"message":"REQUEST_A"` in its `output` field.
- The response for the second request contains `"message":"REQUEST_B"` in its `output` field.
- Neither response contains the other request's payload.
- Both `traces` arrays are independent (correct node IDs, no cross-contamination).

## Failure indicators
- One response shows the wrong payload (e.g. REQUEST_A response contains `REQUEST_B` data).
- Either request returns an error that does not exist when requests are run serially.
- A node trace from one request appears in the other request's `traces` array.
- The server returns a 500 error referencing a race condition or undefined state.

## Severity rationale
State leakage between concurrent executions would corrupt responses for real API callers, making it a data-correctness defect in a production path.

## Source reference
`lib/workflow-engine.ts` lines 409–411 — `executeWorkflow()` allocates a fresh `evalCache` (`new Map()`), `evalVisiting` (`new Set()`), and `nodeTraces` (`[]`) on every invocation; none of these are module-level singletons, so concurrent calls cannot share them.

## Notes
The isolation guarantee relies on all per-request state being stack-local. If a future refactor moves `evalCache` to module scope, this test would catch the regression. The `adapter` and `hooks` instances are also constructed fresh per request in the debug route (lines 116–117).
