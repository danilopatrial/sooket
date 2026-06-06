---
id: SEC-05
title: Custom Code node sandboxed cannot access Node.js globals or filesystem
severity: critical
source_files:
  - lib/nodes/custom-code.ts
---

## What this tests
Verifies that code executed in the Custom Code node cannot access Node.js process globals, the filesystem, or network APIs — only the explicitly allowlisted sandbox objects.

## Prerequisites
- App is running at http://localhost:3000
- A workflow with a Custom Code node is accessible via the Debug panel

## Steps — blocked Node.js globals

1. For each of the following, set the Custom Code node's code to the snippet and run via Debug panel; expect `output` to be `undefined` (typeof returns "undefined") — NOT a string like "function" or "object":

   ```js
   return typeof require;
   ```
   Expected: `"undefined"`

   ```js
   return typeof process;
   ```
   Expected: `"undefined"`

   ```js
   return typeof Buffer;
   ```
   Expected: `"undefined"`

   ```js
   return typeof global;
   ```
   Expected: `"undefined"`

   ```js
   return typeof __dirname;
   ```
   Expected: `"undefined"`

   ```js
   return typeof fetch;
   ```
   Expected: `"undefined"` (no network access)

## Steps — blocked filesystem access

2. Attempt to read a file:
   ```js
   const fs = require('fs');
   return fs.readFileSync('/etc/passwd', 'utf8');
   ```
   Expected: throws **"Custom Code compile/parse error: ..."** or **"Custom Code runtime error: ..."** (require is undefined)

## Steps — allowed globals work

3. Verify each allowlisted global is accessible:
   ```js
   return JSON.stringify({a:1});   // → '{"a":1}'
   return Math.sqrt(4);            // → 2
   return Number("42");            // → 42
   return Array.isArray([]);        // → true
   return Object.keys({a:1});      // → ["a"]
   return new Date(0).toISOString(); // → "1970-01-01T00:00:00.000Z"
   return parseInt("10px");        // → 10
   return parseFloat("3.14");      // → 3.14
   return isNaN(NaN);              // → true
   return isFinite(1);             // → true
   ```

## Steps — console silenced (not blocked, not leaking)

4. ```js
   console.log("should not appear");
   return "ok";
   ```
   Expected: output = `"ok"`, no error, no server-side console output

## Expected result
- `require`, `process`, `Buffer`, `global`, `__dirname`, `fetch`, `module`, `exports` all return `undefined` (not accessible)
- Attempting `require('fs')` fails with a runtime/compile error, not a file read
- Allowlisted globals (`JSON`, `Math`, `Number`, `String`, `Boolean`, `Array`, `Object`, `Date`, `parseInt`, `parseFloat`, `isNaN`, `isFinite`, `Infinity`, `NaN`) all work correctly
- `console.log/warn/error/info` execute without error but produce no output

## Failure indicators
- `typeof require` returns `"function"` (sandbox escape)
- `typeof process` returns `"object"` (Node.js process accessible)
- `fs.readFileSync` succeeds and returns file contents
- `fetch(...)` succeeds and makes a network request

## Severity rationale
A sandbox escape in the Custom Code node would allow arbitrary server-side code execution, including reading secrets from the environment and accessing the database.

## Source reference
`lib/nodes/custom-code.ts` lines 16-34 (sandbox object: explicitly lists `input, JSON, Math, Number, String, Boolean, Array, Object, Date, parseInt, parseFloat, isNaN, isFinite, Infinity, NaN, console`; no `require`, `process`, `Buffer`, `global`, or `fetch`), line 36 (`vm.createContext(sandbox)` — sets sandbox as the global scope).
