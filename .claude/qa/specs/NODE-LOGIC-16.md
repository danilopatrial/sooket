---
id: NODE-LOGIC-16
title: Schema Validator node validates input against a JSON Schema
severity: high
source_files:
  - lib/nodes/schema-validator.ts
  - lib/schema-validate.ts
  - components/canvas/nodes/SchemaValidatorNode.tsx
---

## What this tests
Verifies the Schema Validator node: it validates its connected input against a configured JSON Schema (draft-07 subset) and routes to two outputs — `valid` (the input passed through unchanged when it conforms) and `invalid` (`{ valid: false, errors, message }` when it does not). On a failure, `action` controls the `valid` handle: "block" (default) makes it inactive so the request can't proceed (validate-and-reject at the boundary); "pass" lets the original input continue while errors are still emitted on `invalid`.

## Prerequisites
- App is running at http://localhost:3000
- A workflow on the canvas where you can drop a Schema Validator node between an input source and downstream nodes

## Steps — canvas
1. Add a Schema Validator node. Confirm it has one input handle (`input`) and two output handles (`valid`, `invalid`).
2. Enter a JSON Schema, e.g.:
   ```json
   { "type": "object", "required": ["email"],
     "properties": { "email": { "type": "string", "pattern": "^[^@]+@[^@]+$" } } }
   ```
3. Set "On Invalid" to **Block (reject)**.

## Steps — valid input
4. Wire the workflow input to the node's `input` and the `valid` output to an Output node. Run with `{"email":"a@b.com"}`.
5. Confirm the workflow returns the input unchanged via the `valid` path.

## Steps — invalid input, block
6. Wire the `invalid` output to an Output (or Response Builder) node. Run with `{"email":"nope"}` (or `{}`).
7. Confirm the `valid` path is inactive (no output through it) and the `invalid` path carries `{ valid: false, errors: [{ path, message }], message }` — e.g. `path` `$.email`.

## Steps — invalid input, pass
8. Switch "On Invalid" to **Pass input through**. Run with `{"email":"nope"}`.
9. Confirm the original input now flows through the `valid` path AND the errors are still available on the `invalid` path.

## Steps — config errors
10. Clear the schema and run → the node errors with "no JSON Schema configured". Enter malformed JSON (`{not json`) → the node errors with "invalid JSON Schema: ...".

## Expected result
- `valid` output = the unchanged input when it conforms; otherwise inactive (block) or the unchanged input (pass).
- `invalid` output = `{ valid: false, errors, message }` with JSON-path-tracked errors (`$`, `$.field`, `$.list[0]`); inactive when the input conforms.
- Supported keywords: type (incl. integer/null and unions), enum, const, required, properties, additionalProperties, items, min/maxItems, uniqueItems, min/maxLength, pattern, minimum/maximum/exclusive bounds, multipleOf. Unknown keywords are ignored.
- Empty schema → node error "no JSON Schema configured"; malformed schema → "invalid JSON Schema".

## Failure indicators
- A non-conforming input reaches the `valid` path under "block".
- The `invalid` output lacks the per-field path/message (can't tell the caller what failed).
- A valid input is reported invalid (false negative) or vice-versa.
- A malformed/empty schema crashes the run instead of surfacing a clear node error.

## Severity rationale
Contract enforcement at the boundary is a core gateway capability; a validator that lets bad input through (or wrongly rejects good input) defeats its purpose and can corrupt downstream calls — high.

## Source reference
`lib/schema-validate.ts` — `validateValue(value, schema)` (the draft-07 subset validator) + `parseSchema`/`formatErrors`. `lib/nodes/schema-validator.ts` — caches `:valid`/`:invalid` and returns by `sourceHandle`; "block" → inactive `valid`, "pass" → input through; throws on missing/invalid schema. `components/canvas/nodes/SchemaValidatorNode.tsx` — schema textarea + On-Invalid select + the three handles. Registered in `lib/nodes/registry.ts` (`"schema-validator": { 1: ... }`) and `components/canvas/nodes/registry.ts`.

## Notes
The validator is a pragmatic JSON Schema subset implemented in plain TypeScript (no `ajv`/native deps, keeping the npm package portable); `format` and the `allOf`/`anyOf`/`oneOf`/`not` combinators are not implemented. Code-level coverage: `__tests__/lib/schema-validate.test.ts`, `__tests__/lib/nodes/schema-validator.test.ts`, and `__tests__/nodes/SchemaValidatorNode.test.tsx`.
