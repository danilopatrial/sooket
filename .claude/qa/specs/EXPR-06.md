---
id: EXPR-06
title: Pure expression returns raw value not stringified
severity: high
source_files:
  - lib/expr.ts
---

## What this tests
Verifies that when an entire VarField value is a single `{{ expr }}` block (a "pure expression"), the resolved value is returned as its raw type (object, array, number, boolean) rather than being converted to a string — and that a mixed string with surrounding text always stringifies each block.

## Prerequisites
- App is running at http://localhost:3000
- A workflow exists where a downstream node receives the output of a VarField-based expression
- The Debug panel is accessible

## Steps — setup

1. Create a workflow:
   - **Node A** (Custom Code or JSON Builder) producing various typed outputs
   - **Node B** (If node) where the **Compare To** field or a Template String's template is set to a pure expression
   - Output node showing the result

## Steps — pure expression with object value

2. Set Node A to output `{"key": "value", "count": 5}`
3. Set Node B Template field to exactly `{{ $json }}` (nothing before or after the braces, whitespace allowed)
4. Open Debug panel; run — `output` = the raw object `{"key": "value", "count": 5}` (NOT the string `'{"key":"value","count":5}'`)
5. Confirm by connecting the output to a JSON Parser node — it should parse the object without needing to parse JSON again

## Steps — pure expression with number value

6. Set Node A to output the number `42`
7. Template = `{{ $json }}`; run — `output` = `42` (integer, not the string `"42"`)
8. Connect to a Math node's `a` handle — `42` is accepted directly without Type Cast

## Steps — pure expression with boolean value

9. Set Node A to output `true`
10. Template = `{{ $json }}`; run — `output` = `true` (boolean, not `"true"`)
11. Connect to an If node with `isTruthy` operator — evaluates as truthy without conversion

## Steps — pure expression with array value

12. Set Node A to output `[1, 2, 3]`
13. Template = `{{ $json }}`; run — `output` = `[1, 2, 3]` (array, not `"[1,2,3]"`)
14. Connect to Array Length node — returns `3` without needing JSON.parse

## Steps — mixed expression always stringifies

15. With Node A outputting `{"key": "value"}`, set template to `Prefix: {{ $json }}`
16. Run — `output` = `"Prefix: {"key":"value"}"` (object stringified via `JSON.stringify` in mixed context)
17. With Node A outputting `42`, template `Value is {{ $json }}`; run — `output` = `"Value is 42"` (number coerced to string)

## Steps — pure vs mixed boundary

18. Set template to `{{ $json }} ` (pure expression with a trailing space) — this is now a MIXED string (has non-expression characters)
19. Run with object input — output is a string with JSON-stringified object followed by a space: `'{"key":"value"} '`
20. Confirm that even a single trailing space or character makes the expression mixed

## Steps — whitespace in pure expression

21. Set template to `{{  $json  }}` (extra whitespace inside braces) — this should still be detected as pure (PURE_EXPR_RE allows surrounding whitespace inside braces)
22. Run with object input — raw object returned (not stringified)

## Expected result
- Pure expression (entire string matches `/^\{\{\s*([^{}]+?)\s*\}\}$/`): resolved value returned as-is (raw type preserved)
- Mixed expression (any non-expression characters outside the braces): each `{{ }}` block stringified; objects via `JSON.stringify`, primitives via `String()`
- A single trailing/leading character outside braces makes the expression mixed
- Whitespace inside `{{ }}` is trimmed before resolution
- `undefined` resolved in a pure expression: returns the original text (e.g. `{{ $node.missing }}`) unchanged

## Failure indicators
- Pure `{{ $json }}` with object input returns a JSON string instead of the raw object
- Pure `{{ $json }}` with number `42` returns `"42"` (string) instead of `42` (number)
- Mixed string returns the raw object instead of its JSON-stringified form
- Trailing space in `{{ $json }} ` causes the raw object to be returned (should return stringified)

## Severity rationale
Raw type preservation allows expressions to pass typed data (numbers, objects) directly between nodes without requiring Type Cast or JSON parsing; losing this causes silent type coercion errors in downstream comparisons.

## Source reference
`lib/expr.ts` lines 9 (`PURE_EXPR_RE = /^\{\{\s*([^{}]+?)\s*\}\}$/`), lines 88-93 (pure expression branch: `return val !== undefined ? val : text`), lines 96-102 (mixed branch: `JSON.stringify` for objects, `String(val)` for primitives).

## Notes
The pure expression detection uses `PURE_EXPR_RE` which requires the ENTIRE string to match — a single space, character, or another `{{ }}` block outside the first block makes it mixed. Multiple `{{ }}` blocks in a string always result in a mixed string, even if both resolve to values.
