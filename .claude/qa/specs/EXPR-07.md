---
id: EXPR-07
title: Mixed string with unresolvable block leaves block literal
severity: medium
source_files:
  - lib/expr.ts
---

## What this tests
Verifies that in a mixed string (a string containing `{{ }}` blocks alongside other text), any block that resolves to `undefined` or `null` is kept verbatim — the original `{{ expr }}` text is preserved in the output, not replaced with an empty string or causing an error.

## Prerequisites
- App is running at http://localhost:3000
- A workflow with a Template String or VarField-using node exists
- The Debug panel is accessible

## Steps — unresolvable $node reference in mixed string

1. Create a workflow with a Template String node; set template to:
   `Hello {{ $node.nonexistent }} world`
   where `nonexistent` is not a valid node ID
2. Run — output should be `"Hello {{ $node.nonexistent }} world"` (block kept verbatim, not replaced with empty string)

## Steps — unresolvable path in mixed string

3. Set template to `Value: {{ $json.missing.path }}`; connect upstream node outputting `{"key": "val"}`
4. Run — output = `"Value: {{ $json.missing.path }}"` (path doesn't exist → undefined → block kept as literal)

## Steps — null resolving to verbatim

5. Set template to `Before {{ $node.someNode }} after`; ensure `someNode` has executed but its output is `null`
6. Run — since `resolveExpr` returns `null` for a null-valued node, and the replacement code checks `if (val === undefined || val === null) return match` — output keeps the block literal

## Steps — contrast with resolvable block

7. Set template to `Hello {{ $json }} world` with upstream string `"Alice"`
8. Run — output = `"Hello Alice world"` (resolved → substituted)
9. Change to `Hello {{ $json.missing }} world` (missing key → undefined)
10. Run — output = `"Hello {{ $json.missing }} world"` (kept literal)

## Steps — mixed string with multiple blocks, some resolvable

11. Set template to `{{ $json.name }} is {{ $json.age }} years old`; upstream `{"name": "Bob"}`
12. Run — output = `"Bob is {{ $json.age }} years old"` (first block resolves, second is kept literal — each block evaluated independently)

## Steps — pure expression with unresolvable reference

13. Set template to exactly `{{ $node.nonexistent }}` (pure expression, no other text)
14. Run — output = `"{{ $node.nonexistent }}"` (the original full string, returned because val is undefined → falls back to `text`)
15. Note: in pure mode, the fallback is the whole original text string, not just the block content

## Expected result
- Mixed string with unresolvable block: block kept verbatim as `{{ expr }}`
- `undefined` or `null` resolution → `return match` (the original `{{ expr }}` text)
- Each block evaluated independently; resolvable blocks are replaced, unresolvable ones kept
- Pure expression with undefined resolution: entire original text returned unchanged
- No empty string substitution, no error thrown for missing references

## Failure indicators
- Unresolvable `{{ $node.missing }}` in a mixed string is replaced with an empty string
- Unresolvable reference throws an error
- All blocks after an unresolvable one are also not replaced (blocks should be independent)
- Pure `{{ $node.missing }}` returns empty string instead of the original text

## Severity rationale
Silent empty-string substitution for unresolvable blocks would corrupt LLM prompts with invisible gaps; keeping the literal allows users to identify misconfigured node references in the output.

## Source reference
`lib/expr.ts` line 99 (mixed branch: `if (val === undefined || val === null) return match` — keeps block verbatim), lines 91-93 (pure branch: `return val !== undefined ? val : text` — returns original text on undefined), lines 96-102 (mixed `replace` callback: each block replaced independently).

## Notes
The verbatim-preservation behavior applies to both `undefined` AND `null` in mixed strings (line 99: `val === undefined || val === null`). In the pure expression branch, only `undefined` triggers the fallback; a `null` value from a resolved expression would return `null` itself (not the original text).
