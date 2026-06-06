---
id: NODE-LOGIC-12
title: Custom Code node 5-second VM timeout and sandbox globals
severity: critical
source_files:
  - components/canvas/nodes/CustomCodeNode.tsx
  - lib/nodes/custom-code.ts
---

## What this tests
Verifies that the Custom Code node executes user JavaScript in a Node.js VM context with a 5-second timeout, exposes only the documented sandbox globals, and correctly distinguishes compile/parse errors from runtime errors (timeouts — synchronous or async — are themselves runtime errors).

## Prerequisites
- App is running at http://localhost:3000
- A workflow with a Custom Code node exists on the canvas
- The Debug panel is accessible

## Steps — canvas configuration

1. Navigate to the canvas containing a Custom Code node
2. Observe the node header: title **Custom Code**, orange FileCode2 icon, subtitle **JS · full server access**
3. Observe the orange security warning box: "Executes with full server privileges. Restrict UI access before exposing to untrusted users."
4. Confirm one left-side input handle: **input** (orange, type "any")
5. Confirm one right-side output handle: **output** (orange, type "any")
6. Observe the **Code** textarea (5 rows, monospace font, placeholder `// input is available\nreturn input;`)
7. Click the expand (Maximize2) button — a TextExpandModal opens in **code** mode for fullscreen editing; close it

## Steps — execution (basic pass-through)

8. Connect any input value; enter code `return input;`
9. Open the Debug panel and run — `output` = the connected input value (pass-through)
10. Enter code `return input * 2;` with a numeric input `5` — `output` = `10`

## Steps — execution (sandbox globals)

11. Test each allowed global is accessible:
    - `return JSON.stringify({a: 1});` → `'{"a":1}'`
    - `return Math.max(3, 7);` → `7`
    - `return Number("42");` → `42`
    - `return String(true);` → `"true"`
    - `return Boolean(0);` → `false`
    - `return Array.isArray([]);` → `true`
    - `return Object.keys({a:1,b:2});` → `["a","b"]`
    - `return new Date(0).toISOString();` → `"1970-01-01T00:00:00.000Z"`
    - `return parseInt("42px");` → `42`
    - `return parseFloat("3.14");` → `3.14`

## Steps — execution (blocked globals)

12. Test that Node.js globals are NOT available:
    - `return typeof require;` → `"undefined"` (not a function)
    - `return typeof process;` → `"undefined"`
    - `return typeof fetch;` → `"undefined"`
    - `return typeof Buffer;` → `"undefined"`
    - `return typeof global;` → `"undefined"`

## Steps — console silencing

13. Enter code `console.log("hello"); return "done";` — execution succeeds with `output` = `"done"`; no output in the server logs or response from the console call (console methods are no-ops)

## Steps — timeout (5 seconds)

14. Enter code `while(true) {}` (synchronous infinite loop)
15. Run — after ~5 seconds the node throws a timeout surfaced as a runtime error: **Custom Code runtime error: Custom Code timed out after 5 s**. The synchronous overrun is detected at the vm layer but is reported under the **runtime error** prefix (a timeout is a runtime failure, not a compile/parse error)
16. Enter code `await new Promise(r => setTimeout(r, 6000)); return "late";` (6-second async delay)
17. Run — after ~5 seconds the node throws the **async** timeout, surfaced as a runtime error with the **same message** as the synchronous path: **Custom Code runtime error: Custom Code timed out after 5 s**; `output` is not returned

## Steps — compile error vs runtime error

18. Enter code `function( {` (syntax error) — expect error prefixed with **Custom Code compile/parse error:**
19. Enter code `throw new Error("oops");` — expect error prefixed with **Custom Code runtime error:**
20. Verify the two error prefixes are distinct

## Steps — error cases

21. Disconnect the `input` handle and run — expect error: **Custom Code node has no input connected**
22. Leave the code textarea empty and run — expect error: **Custom Code node: no code provided**

## Expected result
- Sandbox exposes: `input`, `JSON`, `Math`, `Number`, `String`, `Boolean`, `Array`, `Object`, `Date`, `parseInt`, `parseFloat`, `isNaN`, `isFinite`, `Infinity`, `NaN`, `console` (silenced)
- Node.js globals absent: `require`, `process`, `fetch`, `Buffer`, `global`, `__dirname`, etc.
- `console.log/warn/error/info` are no-ops — they do not throw but produce no output
- `return` at top level works; `await` at top level works (code is wrapped in an async IIFE)
- Timeout: ~5 seconds for both paths, both reported under the **runtime error** prefix with the **same message** — **"Custom Code runtime error: Custom Code timed out after 5 s"**:
  - Synchronous overrun (infinite loop before the first `await`) is caught by the vm's `{ timeout: 5000 }` and re-thrown under the runtime-error prefix
  - Async overrun (a long `await`) is caught by the `Promise.race` whose timer rejects at **5500 ms** (500 ms after the vm timeout, so the two never race) and is surfaced under the same prefix and message
  - Reporting both timeouts identically lets callers detect any Custom Code timeout by matching the single "Custom Code runtime error:" prefix
- Compile error prefix: "Custom Code compile/parse error:" (genuine `SyntaxError`s only — never used for timeouts)
- Runtime error prefix: "Custom Code runtime error:" (thrown exceptions and both the synchronous and async timeouts)

## Failure indicators
- `require` or `process` accessible in the sandbox (sandbox escape)
- `console.log` throws an error instead of silently no-op-ing
- Code runs longer than ~6 seconds without timing out
- Syntax errors produce the same "runtime error" prefix as thrown exceptions
- A synchronous infinite loop is mislabeled as a **compile/parse error** (it must report the runtime-error-prefixed timeout message instead)
- Empty code textarea does not throw (should throw "no code provided")

## Severity rationale
Sandbox escape would allow arbitrary server-side code execution by anyone who can reach the Debug panel or the workflow API endpoint, making this critical.

## Source reference
`components/canvas/nodes/CustomCodeNode.tsx` lines 83-88 (security warning), line 117 (code placeholder), line 141 (`mode="code"` in TextExpandModal); `lib/nodes/custom-code.ts` — `node:vm` import; the exported `isScriptTimeoutError` helper (detects `ERR_SCRIPT_EXECUTION_TIMEOUT` / "timed out" messages); the sandbox object with allowed globals + silenced console; the async IIFE wrapper; the vm script with a 5000 ms synchronous timeout; the catch block that routes a synchronous timeout to the runtime-error-prefixed timeout message and genuine `SyntaxError`s to "compile/parse error"; the `Promise.race` whose timer rejects at 5500 ms; and the runtime error path.

## Notes
The Node.js `vm` module provides contextual isolation (the sandbox object is the global scope) but is NOT a fully hardened security sandbox — determined attackers may find escape vectors. The security warning in the UI explicitly states "full server privileges." The 5-second limit is enforced at two levels but reported with a single, identical message: the `vm.Script.runInContext` `{ timeout: 5000 }` catches synchronous overruns (an infinite loop before the first `await`) and a `Promise.race` timer rejecting at 5500 ms catches async hangs, and both are surfaced as "Custom Code runtime error: Custom Code timed out after 5 s". A timeout is a runtime failure (the code parsed and ran), so it is reported under the runtime-error prefix rather than as a separate top-level class; this also lets callers detect any timeout by matching that one prefix. The 5500 ms async reject sits 500 ms after the 5000 ms vm timeout so a synchronous overrun is always reported by the vm path and the two timeouts never race. A thrown `Error` constructed inside user code belongs to the vm context, so the outer `instanceof Error` check fails and its message is stringified (e.g. "Error: boom") in the runtime-error wrapper.
