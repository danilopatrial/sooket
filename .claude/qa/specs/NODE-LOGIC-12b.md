---
id: NODE-LOGIC-12b
title: Custom Code node console silenced, compile vs runtime errors distinct
severity: high
source_files:
  - components/canvas/nodes/CustomCodeNode.tsx
  - lib/nodes/custom-code.ts
---

## What this tests
Verifies that `console` methods inside Custom Code are silenced (no-op, no output, no error), and that compile/parse errors produce a distinctly prefixed error message from runtime errors so downstream debugging is unambiguous.

## Prerequisites
- App is running at http://localhost:3000
- A workflow with a Custom Code node exists on the canvas
- The Debug panel is accessible

## Steps — console silencing

1. Connect any input value to the Custom Code node; enter the following code:
   ```
   console.log("log output");
   console.warn("warn output");
   console.error("error output");
   console.info("info output");
   return "done";
   ```
2. Open the Debug panel and send a test request
3. Verify the node **succeeds**: `output` = `"done"`, no error thrown
4. Verify no console output appears in the browser DevTools console from the server-executed code (these are server-side no-ops, not browser console calls)
5. Verify the execution trace does not include any captured log lines — the messages are discarded entirely

## Steps — compile/parse error

6. Enter code with a syntax error that prevents parsing, e.g.:
   ```
   function( {
   ```
7. Run — expect an error with the prefix **Custom Code compile/parse error:** followed by the parser's error message (e.g. "Unexpected token")
8. Try another parse error:
   ```
   const x = {;
   ```
9. Verify the error prefix is still **Custom Code compile/parse error:**

## Steps — runtime error

10. Enter valid (parseable) code that throws at runtime:
    ```
    throw new Error("deliberate error");
    ```
11. Run — expect an error with the prefix **Custom Code runtime error:** followed by "deliberate error"
12. Enter code that causes a runtime TypeError:
    ```
    return null.property;
    ```
13. Verify the error prefix is **Custom Code runtime error:**

## Steps — timeout is a runtime error

14. Enter an infinite loop:
    ```
    while(true) {}
    ```
15. Run — after ~5 seconds expect error: **Custom Code runtime error: Custom Code timed out after 5 s**
16. Verify the timeout message is wrapped under the "runtime error" prefix (not a separate prefix)

## Steps — distinguishing the two in practice

17. Enter code that throws at parse time AND would throw at runtime if parsed:
    ```
    return undefined.x {
    ```
18. Verify the compile/parse error fires (syntax is checked before execution)

## Expected result
- `console.log`, `console.warn`, `console.error`, `console.info`: all no-ops — do not throw, do not produce visible output, do not appear in execution traces
- Compile/parse error prefix: exactly **"Custom Code compile/parse error: "**
- Runtime error prefix: exactly **"Custom Code runtime error: "** (includes timeout: "Custom Code timed out after 5 s")
- The two prefixes are distinct — a caller can identify which type of failure occurred from the error message alone

## Failure indicators
- `console.log` throws a `TypeError: console.log is not a function` (should be a silent no-op)
- Syntax errors produce the "runtime error" prefix instead of "compile/parse error"
- Thrown exceptions produce the "compile/parse error" prefix
- Timeout produces its own prefix instead of being wrapped under "runtime error"

## Severity rationale
Silenced console is a security and correctness requirement — unsandboxed console calls could leak server-side information; distinct error prefixes are critical for debugging and for any tooling that programmatically interprets execution errors.

## Source reference
`lib/nodes/custom-code.ts` lines 33 (`console` object with four no-op arrow functions), lines 42-46 (compile error: `vm.Script` constructor throws → prefix "Custom Code compile/parse error:"), lines 48-50 (timeout: `Promise.race` with 5s reject), lines 53-57 (runtime error: `Promise.race` rejection → prefix "Custom Code runtime error:").

## Notes
The `console` object in the sandbox has exactly four methods: `log`, `warn`, `error`, `info`. Any other `console` methods (e.g. `console.table`, `console.dir`) would throw `TypeError: console.X is not a function` — only the four listed are present as no-ops.
