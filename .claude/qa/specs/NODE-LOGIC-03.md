---
id: NODE-LOGIC-03
title: Try/Catch node catches errors and routes to Error output
severity: high
source_files:
  - components/canvas/nodes/TryCatchNode.tsx
  - lib/nodes/try-catch.ts
---

## What this tests
Verifies that the Try/Catch node evaluates its upstream chain and, on success, passes the value through the `result` handle while keeping `error` inactive; on failure, routes the error message string to the `error` handle while keeping `result` inactive.

## Prerequisites
- App is running at http://localhost:3000
- A workflow with a Try/Catch node exists on the canvas
- The Debug panel is accessible
- A node that can be made to throw (e.g. an HTTP Request node pointed at an invalid URL, or an Anthropic node with no API key) is available for the error case

## Steps — canvas configuration

1. Navigate to the canvas containing a Try/Catch node
2. Observe the node header: title **Try / Catch**, orange Bug icon, subtitle **wrap upstream chain**
3. Confirm the node has no configurable fields — body contains only labeled rows
4. Verify one left-side input handle: **try** (orange dot), labeled "try" with hint "upstream chain"
5. Verify two right-side output handles: **result** (orange dot, labeled "result" with "value" type) and **error** (rose dot, labeled "error" with "string" type)

## Steps — execution (success path)

6. Connect a node that succeeds (e.g. a Text node emitting `"hello"`) to the `try` handle
7. Open the Debug panel and send a test request
8. Expand the Try/Catch trace:
   - `result` handle output: `"hello"` (the upstream value)
   - `error` handle: `active: false`
9. Confirm downstream nodes connected to `result` receive the value; downstream nodes connected to `error` are skipped

## Steps — execution (error path)

10. Connect a node that throws to the `try` handle (e.g. an HTTP Request node with a bad URL, or configure an Anthropic node with a missing provider key)
11. Run a test request
12. Expand the Try/Catch trace:
    - `result` handle: `active: false`
    - `error` handle: a non-empty error message string (e.g. `"No Anthropic API key configured for this workflow"`)
13. Confirm downstream nodes on `result` are skipped; nodes on `error` receive the error string

## Steps — error case

14. Disconnect the `try` handle entirely and run — expect error: **Try/Catch node has no try input connected**

## Expected result
- No configurable fields — the node is purely structural
- Success: `result` = upstream value; `error` = `active: false`
- Failure: `result` = `active: false`; `error` = error message string
- Upstream `active: false` (deactivated chain): both handles return `active: false` (not an error)
- `try` input disconnected: throws an error (does not silently pass through)

## Failure indicators
- Both `result` and `error` fire simultaneously
- `error` handle fires when upstream succeeds
- `result` handle fires when upstream throws
- Error message in `error` handle is `undefined` instead of a string
- Upstream `active: false` causes the error handle to fire (should propagate inactive, not treat as error)

## Severity rationale
The Try/Catch node is the only way to handle upstream errors gracefully; a misrouted error leaves the workflow with no fallback path.

## Source reference
`components/canvas/nodes/TryCatchNode.tsx` lines 53-73 (handles: `try` input, `result` and `error` outputs); `lib/nodes/try-catch.ts` lines 12-17 (try/catch around `evalInput`), lines 19-26 (error path: result inactive, error gets message), lines 28-41 (success path: result gets value, error inactive).

## Notes
The Try/Catch node wraps the evaluation of its *entire* upstream chain — not just the directly connected node, but all nodes that the connected node depends on. If any node in that chain throws, the catch fires. A node returning `active: false` is not treated as an error — both handles return inactive in that case.
