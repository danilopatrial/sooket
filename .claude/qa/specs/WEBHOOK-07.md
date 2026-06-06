---
id: WEBHOOK-07
title: Non-JSON webhook body wrapped as { body }
severity: medium
source_files:
  - app/api/webhooks/[slug]/route.ts
---

## What this tests
Verifies that a non-JSON request body is passed to the workflow wrapped as `{ body: "<raw text>" }`, while a valid JSON body is parsed into an object, and an empty body yields `{}`.

## Prerequisites
- App is running at http://localhost:3000
- An active workflow (`<slug>`, plus token if set) whose output echoes its input (e.g. Input → Output)

## Steps
1. Send a plain-text (non-JSON) body:
   ```bash
   curl -s -X POST http://localhost:3000/api/webhooks/<slug> \
     -H "Content-Type: text/plain" \
     --data-raw 'just a string' | python3 -m json.tool
   ```
2. Send a valid JSON body and confirm it is parsed as an object:
   ```bash
   curl -s -X POST http://localhost:3000/api/webhooks/<slug> \
     -H "Content-Type: application/json" \
     -d '{"a":1}' | python3 -m json.tool
   ```
3. Send an empty body and confirm the workflow receives `{}`.

## Expected result
- Step 1: the workflow input is `{ "body": "just a string" }` (reflected in `output`).
- Step 2: the workflow input is `{ "a": 1 }`.
- Step 3: the workflow input is `{}` (empty body produces an empty object, not an error).

## Failure indicators
- A non-JSON body causes a 400/500 instead of being wrapped as `{ body }`.
- An empty body throws instead of defaulting to `{}`.

## Severity rationale
Many webhook providers send form-encoded or plain-text payloads; mishandling them would break those integrations.

## Source reference
`app/api/webhooks/[slug]/route.ts` lines 57–68 — JSON.parse with a catch that assigns `{ body: rawBody }`; empty/whitespace body leaves `body` as `{}`.

## Notes
This mirrors the AGENTS.md contract: "non-JSON bodies wrapped as `{ body }`."
