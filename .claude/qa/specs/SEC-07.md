---
id: SEC-07
title: Access List node enforces blocklist and blocked requests don't reach downstream nodes
severity: critical
source_files:
  - app/api/workflows/[slug]/access-list/route.ts
  - lib/nodes/access-list.ts
---

## What this tests
Verifies that when the Access List node blocks a request (blacklist mode — value in list, or whitelist mode — value not in list), the blocked input does NOT propagate to downstream nodes on the `pass` handle — only the `block` handle fires.

## Prerequisites
- App is running at http://localhost:3000
- A workflow exists with an Access List node in blacklist mode
- Several downstream nodes are connected to both `pass` and `block` handles
- The Debug panel is accessible

## Steps — add a blocklist entry

1. Add an entry to the access list via the API or Config tab:
   ```bash
   curl -s -X POST http://localhost:3000/api/workflows/<slug>/access-list \
     -H "Content-Type: application/json" \
     -d '{"value": "banned-user", "rule_type": "value"}'
   ```
2. Verify 201 with the created entry

## Steps — verify blocked request does not reach pass handle

3. Set the Access List node to **blacklist** mode; connect:
   - `pass` → expensive downstream node (e.g. Anthropic node) → Output A
   - `block` → simple Text node (`"blocked"`) → Output B
4. Send a request with body `{"user": "banned-user"}` and connect the `user` field to the Access List `input` handle
5. Run — verify:
   - Output B = `"blocked"` (block handle fired)
   - The Anthropic node did NOT execute (no LLM call, no trace entry for it)
   - `pass` handle = `active: false`

## Steps — allowed request reaches pass handle

6. Send a request with body `{"user": "allowed-user"}` (not in the blocklist)
7. Run — verify:
   - `pass` handle fires (input reaches downstream nodes)
   - `block` handle = `active: false`

## Steps — IP-based blocking

8. Add an entry with `rule_type: "ip"` and the client IP value
9. Run a request from that IP — `block` fires; downstream nodes not reached via `pass`

## Steps — access list management API

10. Verify the management API:
    - `GET /api/workflows/<slug>/access-list` returns entries array
    - `POST` with duplicate value returns 409 `{ "error": "Entry already exists" }`
    - `POST` without `value` returns 400 `{ "error": "value is required" }`
    - `DELETE ?id=<id>` removes entry; subsequent requests from that value are allowed

## Expected result
- Blocked requests: only `block` handle is active; `pass` = `active: false`; downstream nodes on `pass` do not execute
- Allowed requests: only `pass` handle is active; `block` = `active: false`
- Comparison is case-insensitive (both input and list values lowercased before comparison)
- `block` output emits the original input value (for logging/error-handling downstream)

## Failure indicators
- Blocked request reaches a node connected to `pass` (downstream node executes)
- Both `pass` and `block` active simultaneously
- Duplicate entry returns 200 instead of 409
- Case-sensitive blocking misses entries that differ only in case

## Severity rationale
An access list bypass allows blocked IPs or values to reach protected downstream nodes (LLMs, databases, external APIs), defeating the entire access control layer.

## Source reference
`lib/nodes/access-list.ts` lines 13-14 (case-insensitive comparison), lines 21-26 (pass/block mutually exclusive), lines 28-34 (per-handle routing); `app/api/workflows/[slug]/access-list/route.ts` lines 45-58 (UNIQUE constraint → 409 on duplicate), line 37 (400 on missing value).
