---
id: EXPR-04
title: "{{ $node.<id>.<path.to.key> }} drills into nested node output"
severity: high
source_files:
  - lib/expr.ts
---

## What this tests
Verifies that `{{ $node.<id>.<path.to.key> }}` uses dot-notation to traverse nested objects in a referenced upstream node's output, and that each path segment is resolved independently with null/undefined handling at each level.

## Prerequisites
- App is running at http://localhost:3000
- A workflow exists where a downstream node uses `$node.<id>.<path>` in a VarField
- The upstream node's ID is known
- The Debug panel is accessible

## Steps — setup

1. Create a workflow with:
   - **Node A** producing a nested object: `{"user": {"name": "Alice", "score": 42}, "tags": ["a", "b"]}`
   - **Node B** (Template String): uses `$node` path expressions in its template
   - Output node connected to Node B

## Steps — single-level path drilling

2. Set Node B template to `{{ $node.A.user }}`
3. Run — Output = `{"name":"Alice","score":42}` (stringified in mixed context; raw object in pure)
4. Set template to `{{ $node.A.user.name }}`; run — Output = `"Alice"`
5. Set template to `{{ $node.A.user.score }}`; run — Output = `42` (raw number in pure expression)

## Steps — multi-level path drilling

6. Set template to `{{ $node.A.user.name }}`; run — confirms two-level drilling
7. Add a third level: use Node A output `{"a": {"b": {"c": "deep"}}}` and template `{{ $node.A.a.b.c }}`; run — Output = `"deep"`

## Steps — array index via path

8. Set template to `{{ $node.A.tags.0 }}`; run with `tags: ["a", "b"]` — Output: verify array indexing behavior (arrays are objects in JavaScript; key `"0"` accesses index 0); may return `"a"` if the engine supports numeric string keys, or `undefined`

## Steps — path through null/undefined mid-path

9. Use Node A output `{"user": null}`; set template to `{{ $node.A.user.name }}`; run — Output = `{{ $node.A.user.name }}` kept verbatim (path through null returns undefined → kept as literal)
10. Use Node A output `{"user": {}}` (no `name` key); template `{{ $node.A.user.name }}`; run — Output = `{{ $node.A.user.name }}` (missing key → undefined → verbatim)

## Steps — contrast with $json path drilling

11. Wire Node A directly to Node B (via edge); set Node B template to `{{ $json.user.name }}`; run — Output = `"Alice"` (same result via $json instead of $node)
12. Verify the path syntax is identical between `$json.path` and `$node.<id>.path`

## Expected result
- `{{ $node.<id>.<path> }}` drills into the upstream node's cached output using dot-notation
- Path segments split on `.` and traversed sequentially by `drillPath`
- Null or undefined at any mid-path segment returns `undefined` → expression kept verbatim (not a thrown error)
- Missing leaf key returns `undefined` → verbatim
- Pure expression of a nested value returns the raw value (object, number, etc.)
- Mixed expression stringifies the resolved value

## Failure indicators
- Path drilling through a valid nested object returns `undefined`
- Null mid-path throws instead of returning `undefined`
- Three-level deep path `a.b.c` is not supported (only two levels work)
- Raw nested object in a pure expression is stringified instead of returned as-is

## Severity rationale
Deep path drilling is essential for extracting structured data from LLM/API responses; broken traversal silently passes `undefined` or literal text to downstream nodes.

## Source reference
`lib/expr.ts` lines 38-48 (`$node.<id>` resolution with path extraction and `drillPath` call), lines 13-21 (`drillPath`: returns `undefined` when null/undefined encountered mid-path, not an error), lines 88-93 (pure expression returns raw value), line 99 (mixed: undefined → kept verbatim).

## Notes
The path string after the node ID is split on `.` by `pathStr.split(".")` — every `.` is a path separator. There is no escaping mechanism for keys containing dots. Array elements can potentially be accessed with numeric string keys (e.g. `.0`, `.1`) if the array treats them as object properties, but this is not a documented feature.
