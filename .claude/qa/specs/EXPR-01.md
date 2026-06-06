---
id: EXPR-01
title: "{{ $json }} resolves to the primary upstream input"
severity: high
source_files:
  - lib/expr.ts
---

## What this tests
Verifies that `{{ $json }}` inside a node's configuration field resolves to the primary upstream input value at execution time, and that it returns the raw value (not stringified) when the entire field is a single expression.

## Prerequisites
- App is running at http://localhost:3000
- A workflow exists with at least two nodes where the downstream node uses `{{ $json }}` in a VarField
- Suitable test nodes: Template String (template field), If node (Compare To field), or any VarField that supports expressions
- The Debug panel is accessible

## Steps — setup

1. Create a workflow with:
   - A Text node outputting `"hello world"`
   - A Template String node with template `{{ $json }}` connected downstream
   - The Template String output connected to the Output node
2. Open the Debug panel

## Steps — execution (pure expression — raw value)

3. Run a test request
4. Observe the Output: should be `"hello world"` (the string from the Text node)
5. Change the Text node to output a JSON object `{"key": "value"}` and update Template String to `{{ $json }}`
6. Run — Output should be the object `{"key": "value"}` (not the string `'{"key":"value"}'`), demonstrating that a pure `{{ $json }}` expression returns the raw upstream value without stringification

## Steps — execution (mixed expression — stringified)

7. Set Template String template to `Result: {{ $json }}`
8. With upstream value `{"key": "value"}`, run — Output should be `'Result: {"key":"value"}'` (object stringified via JSON.stringify in a mixed context)
9. With upstream value `42`, run — Output = `"Result: 42"` (number coerced to string)

## Steps — path drilling

10. Set template to `{{ $json.key }}` with upstream object `{"key": "found it"}`
11. Run — Output = `"found it"` (pure expression drilling into the upstream object by key)
12. Set template to `{{ $json.nested.value }}` with upstream `{"nested": {"value": 99}}`
13. Run — Output = `99` (raw number)
14. Set template to `{{ $json.missing }}` with upstream `{"key": "value"}`
15. Run — Output = `{{ $json.missing }}` kept verbatim (unresolvable path returns `undefined` → pure expression falls back to original text)

## Expected result
- `{{ $json }}` in a pure expression (entire field is this one block): returns the raw upstream value as-is (object, array, number, boolean, or string)
- `{{ $json }}` in a mixed string: upstream value stringified (objects via `JSON.stringify`, primitives via `String()`)
- `{{ $json.path }}` drills into the upstream value using dot-notation path segments
- Unresolvable path returns `undefined` → pure expression keeps the original `{{ $json.missing }}` literal; mixed expression keeps the block verbatim
- `$json` always refers to the primary upstream connected input, not the request body

## Failure indicators
- `{{ $json }}` in a pure expression returns a stringified version of an object (should be raw object)
- `{{ $json.key }}` on a flat string input returns a value instead of `undefined`
- Unresolvable path throws instead of returning the literal verbatim
- `{{ $json }}` resolves to the request body instead of the upstream node's output

## Severity rationale
`$json` is the most common expression used to pass upstream node output through VarField configurations; incorrect resolution silently passes wrong data to LLM prompts, If conditions, or template strings.

## Source reference
`lib/expr.ts` lines 52-57 (`$json` and `$json.<path>` resolution in `resolveExpr`), lines 88-93 (pure expression: raw value returned if not undefined), lines 96-102 (mixed interpolation: stringify per block), lines 13-21 (`drillPath` for nested path traversal).

## Notes
`{{ $json }}` resolves to the `primaryInput` parameter passed to `resolveExpressions`. In the workflow engine, this is the value produced by the primary upstream connected node. The expression `{{ $json }}` is distinct from `{{ $body }}` (the raw HTTP request body) — they refer to different values when the upstream node transforms the input before passing it along.
