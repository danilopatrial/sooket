---
id: SEC-12
title: Custom Code node resists the constructor-chain sandbox escape
severity: critical
source_files:
  - lib/nodes/custom-code.ts
---

## What this tests
Verifies that the classic `node:vm` escape — reaching the host realm through an
object's constructor chain, e.g. `({}).constructor.constructor("return process")()`
— does **not** yield the host `process` (or any host global) from inside the
Custom Code node. The node injects no host primordials/functions and clones
`input` into the context, so every constructor chain stays context-local.

## Prerequisites
- App is running at http://localhost:3000
- A workflow with a Custom Code node reachable via the Debug panel

## Steps — constructor-chain escape is closed
1. Set the Custom Code node to each snippet and run it via Debug. Each must
   **error** (a "Custom Code runtime error: ... process is not defined") rather
   than return a number/object from the host process:
   ```js
   return input.constructor.constructor("return process")().pid;
   ```
   ```js
   return [].constructor.constructor("return process")().pid;
   ```
   ```js
   return ({}).constructor.constructor("return process")().pid;
   ```
   ```js
   return console.log.constructor.constructor("return process")().pid;
   ```
2. Confirm a direct probe is also empty:
   ```js
   return typeof globalThis.process;   // → "undefined"
   ```

## Steps — host functions are absent
3. Confirm host timers are not exposed (they would re-open the escape and leak
   deferred callbacks onto the host event loop):
   ```js
   return [typeof setTimeout, typeof clearTimeout].join(",");   // → "undefined,undefined"
   ```

## Steps — legitimate code still works
4. Intrinsics and input remain usable:
   ```js
   return [typeof JSON, typeof Math, typeof Promise, typeof Map].join(",");
   // → "object,object,function,function"
   ```
   ```js
   const x = await Promise.resolve(input.n + 1); return x * 2;   // async via Promise, no timers
   ```
   ```js
   return input.a.b;   // nested input cloned into the context
   ```

## Expected result
- Every constructor-chain escape snippet throws a runtime error referencing
  `process is not defined`; none returns a host pid or process object.
- `typeof process`, `typeof require`, `typeof Buffer`, `typeof global`,
  `typeof fetch`, `typeof setTimeout` are all `"undefined"` inside the node.
- Context-local intrinsics (`JSON`, `Math`, `Date`, `Map`, `Set`, `Promise`,
  `RegExp`, `parseInt`, …) and `await Promise.resolve(...)` still work, and
  `input` (including nested values) is readable.

## Failure indicators
- Any constructor-chain snippet returns a number (host `process.pid`) or an
  object — the host realm is reachable (full RCE).
- `typeof process` / `typeof require` returns something other than `"undefined"`.
- A host `setTimeout` is present (re-opens the escape and the deferred-callback
  hazard).
- Legitimate intrinsic/`input` code stops working (over-restriction regression).

## Severity rationale
The pre-hardening sandbox allowed a one-line escape to the host `process` —
arbitrary server-side code execution with access to env secrets and the
database. Keeping that vector closed is critical, especially under the
shared-secret multi-caller mode where workflow-edit is not the same trust level
as host shell.

## Source reference
`lib/nodes/custom-code.ts` — `Object.create(null)` context with no injected host
primordials/functions; `input` embedded as a JSON literal and rebuilt via the
context's own `JSON.parse`; silenced context-local `console`; host
`setTimeout`/`clearTimeout` removed. The vm's `{ timeout }` plus the host-side
`Promise.race` deadline still bound runtime.

## Notes
node:vm is **not** a guaranteed security boundary (a V8 bug could still permit an
escape); this is defense-in-depth that removes the well-known, trivial vector and
the host-realm leak. The canvas still labels the node "full server access" as a
conservative warning. Unit coverage lives in
`__tests__/lib/nodes/custom-code.test.ts` ("custom-code sandbox hardening"). See
SEC-05 for the broader "no Node.js globals/filesystem" checks.
