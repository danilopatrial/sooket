---
id: EXPR-08
title: Path drilling through null/undefined mid-path returns undefined gracefully
severity: medium
source_files:
  - lib/expr.ts
---

## What this tests
Verifies that path drilling in `{{ $json.a.b.c }}`, `{{ $node.<id>.a.b.c }}`, or `{{ $body.a.b.c }}` returns `undefined` gracefully (no error thrown) when any intermediate segment of the path is null, undefined, or a non-object type — and that the expression system handles this by keeping the block verbatim in mixed strings.

## Prerequisites
- App is running at http://localhost:3000
- A workflow with a Template String node or similar VarField-based node exists
- The Debug panel is accessible

## Steps — null at mid-path

1. Set upstream node to output `{"user": null}`
2. In Template String, set template to `{{ $json.user.name }}`
3. Run — output = `{{ $json.user.name }}` (kept verbatim; `null.name` does not throw)
4. Mixed template: `Name: {{ $json.user.name }}`; run — `"Name: {{ $json.user.name }}"` (block kept)

## Steps — undefined at mid-path

5. Set upstream to `{"user": {}}` (user object has no `profile` key)
6. Template = `{{ $json.user.profile.avatar }}`; run — output = `{{ $json.user.profile.avatar }}` (undefined.avatar does not throw)

## Steps — non-object at mid-path

7. Set upstream to `{"count": 42}` (count is a number, not an object)
8. Template = `{{ $json.count.toFixed }}`; run — output = `{{ $json.count.toFixed }}` (non-object mid-path → `undefined`, no error)
9. Set upstream to `{"tags": "flat string"}` (tags is a string, not an array/object)
10. Template = `{{ $json.tags.0 }}`; run — output = `{{ $json.tags.0 }}` (string treated as non-object → undefined)

## Steps — array with missing index

11. Set upstream to `{"items": []}` (empty array)
12. Template = `{{ $json.items.0 }}`; run — output = `{{ $json.items.0 }}` (index 0 doesn't exist → undefined)
13. Set upstream to `{"items": ["first"]}`; template = `{{ $json.items.0 }}`; run — output = `"first"` (arrays are objects, key `"0"` resolves)

## Steps — deeply nested with gap

14. Set upstream to `{"a": {"b": null}}`
15. Template = `{{ $json.a.b.c.d }}`; run — output = `{{ $json.a.b.c.d }}` (null at `b`, no throw for `.c.d`)
16. Change to `{"a": {"b": {"c": "found"}}}`; template = `{{ $json.a.b.c }}`; run — output = `"found"` (full path resolves)

## Steps — first segment undefined

17. Set upstream to `{}` (empty object)
18. Template = `{{ $json.missing }}`; run — output = `{{ $json.missing }}` (first key missing → undefined)

## Expected result
- `drillPath` stops and returns `undefined` at any segment where the current value is `null`, `undefined`, or a non-object (including numbers, strings, booleans)
- No TypeError is thrown for null/undefined property access at any depth
- In mixed strings: `undefined` mid-path result → block kept verbatim
- In pure expressions: `undefined` result → original text returned unchanged
- The behavior applies equally to `$json.path`, `$body.path`, and `$node.<id>.path`

## Failure indicators
- `{{ $json.user.name }}` with `user: null` throws a `TypeError: Cannot read properties of null`
- `{{ $json.count.toFixed }}` with `count: 42` throws instead of returning `undefined`
- Any mid-path failure results in an empty string instead of the verbatim block
- Multi-level path stops at the first `undefined` but doesn't check subsequent levels

## Severity rationale
Workflows that process API responses must handle missing or null fields gracefully; a thrown error would crash the entire workflow rather than letting downstream Null Check nodes handle the missing value.

## Source reference
`lib/expr.ts` lines 13-21 (`drillPath`: checks `cur === null || cur === undefined` and `typeof cur !== "object"` at each step, returning `undefined` immediately rather than throwing), lines 48 and 56 and 64 (all three expression types call `drillPath` for path segments), line 99 (mixed: `undefined` → verbatim), line 92 (pure: `undefined` → original text).

## Notes
The `drillPath` function is shared by all three expression types (`$json`, `$body`, `$node`). The null/non-object guard runs before each property access, so paths of any depth are safe. A path through a primitive value (number, string, boolean) returns `undefined` at that segment — the path does not attempt to access properties of primitives.
