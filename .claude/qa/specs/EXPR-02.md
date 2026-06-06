---
id: EXPR-02
title: "{{ $body }} resolves to the full request body"
severity: high
source_files:
  - lib/expr.ts
---

## What this tests
Verifies that `{{ $body }}` inside a node configuration field resolves to the full HTTP request body object, and that `{{ $body.key }}` drills into the body using dot-notation — distinct from `{{ $json }}` which is the upstream node output.

## Prerequisites
- App is running at http://localhost:3000
- A workflow with a Template String or VarField-based node using `{{ $body }}` is set up
- The Debug panel is accessible (used to send custom request bodies)

## Steps — setup

1. Create a workflow where the Input node passes through to a Template String node
2. Set the template to `{{ $body }}`
3. Connect the Template String output to the Output node

## Steps — execution ($body as full object)

4. Open the Debug panel; in the **Body** field enter `{"user": "Alice", "message": "hello"}`
5. Run — the Output should be the full body object `{"user": "Alice", "message": "hello"}` (raw object, not a string, since the entire template is a pure expression)

## Steps — execution ($body path drilling)

6. Change template to `{{ $body.user }}`; run with the same body — Output = `"Alice"`
7. Change template to `{{ $body.message }}`; run — Output = `"hello"`
8. Change template to `{{ $body.missing }}`; run — Output = `{{ $body.missing }}` (verbatim, path not found)

## Steps — mixed expression

9. Change template to `User: {{ $body.user }}, said: {{ $body.message }}`
10. Run with body `{"user": "Bob", "message": "hi"}` — Output = `"User: Bob, said: hi"` (mixed interpolation, each block stringified)

## Steps — $body vs $json distinction

11. Set up a workflow where a Text node emits `"processed"` and is connected upstream to the Template String node; set template to `Upstream: {{ $json }} | Body user: {{ $body.user }}`
12. Run with body `{"user": "Alice"}` — Output = `"Upstream: processed | Body user: Alice"`
13. Verify: `$json` = upstream node value (`"processed"`), `$body` = request body (`{"user":"Alice"}`)

## Expected result
- `{{ $body }}` pure expression: returns the full request body as a raw object
- `{{ $body.key }}` drills into the body object using dot-notation
- `{{ $body }}` in a mixed string: body object serialized via `JSON.stringify`
- Missing path returns `undefined` → pure expression falls back to original `{{ $body.missing }}` literal
- `$body` is always the HTTP request body, independent of any upstream node transformations
- `$body` and `$json` refer to different values when a node has processed the input

## Failure indicators
- `{{ $body }}` resolves to the upstream node output instead of the raw request body
- `{{ $body.user }}` returns `undefined` for a body containing `{"user": "Alice"}`
- Missing path throws instead of returning the literal verbatim
- `$body` and `$json` return the same value when upstream processing has transformed the input

## Severity rationale
`$body` provides access to the original request payload regardless of what upstream nodes have done to it; incorrect resolution causes nodes to read from the wrong data source.

## Source reference
`lib/expr.ts` lines 59-65 (`$body` and `$body.<path>` resolution in `resolveExpr`), lines 88-93 (pure expression raw return), lines 96-102 (mixed interpolation stringify), lines 13-21 (`drillPath`).

## Notes
`$body` is the request body passed to the entire workflow execution — it does not change as data flows through nodes. `$json` changes with each node evaluation and represents what the directly upstream node produced. The `body` parameter is passed as a `Record<string, unknown>` to the expression resolver.
