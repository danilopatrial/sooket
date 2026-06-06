---
id: NODE-XFRM-06
title: Pick node extracts a key from a JSON object
severity: medium
source_files:
  - components/canvas/nodes/PickNode.tsx
  - lib/nodes/pick.ts
---

## What this tests
Verifies that the Pick node extracts a single property from a JSON object by key name (or index from an array), supports a dynamic key via the `key` input handle, disables the static Key field when the handle is connected, and returns `undefined` (not an error) for missing keys.

## Prerequisites
- App is running at http://localhost:3000
- A workflow with a Pick node exists on the canvas
- The Debug panel is accessible

## Steps — canvas configuration

1. Navigate to the canvas containing a Pick node
2. Observe the node header: title **Pick**, lime KeyRound icon; subtitle reads `obj[key]` when the Key field is empty
3. Confirm two left-side input handles: **object** (lime dot) and an unlabeled `key` handle (white/30 dot)
4. Confirm one right-side output handle: **value** (lime dot)
5. In the **Key** field (VarField, placeholder `e.g. email or user.name`), type `email`
6. Verify the header subtitle updates to `obj["email"]` (JSON-quoted key)
7. Connect something to the `key` input handle — the Key VarField becomes **disabled** (grayed out)
8. Disconnect the `key` handle — the field becomes editable again

## Steps — execution (object input)

9. Connect an object `{"name": "Alice", "email": "alice@example.com"}` to the `object` input; set Key to `email`
10. Open the Debug panel and run — `output` = `"alice@example.com"`
11. Change Key to `name`; run — `output` = `"Alice"`
12. Change Key to `missing`; run — `output` = `undefined` (key not found; no error thrown)
13. Change Key to `email`; connect a text node `"name"` to the `key` handle; run — `output` = `"Alice"` (handle overrides static Key field)

## Steps — execution (array input)

14. Connect an array `["zero", "one", "two"]` to the `object` input; set Key to `1`
15. Run — `output` = `"one"` (integer index access)
16. Set Key to `0`; run — `output` = `"zero"`
17. Set Key to `abc` (non-numeric); run — `output` = `undefined` (NaN index → undefined)
18. Set Key to `10` (out of bounds); run — `output` = `undefined`

## Steps — execution (non-object/non-array)

19. Connect a scalar `42` (number) to the `object` input; set any Key; run — `output` = `undefined` (not an error)
20. Connect `null`; run — `output` = `undefined`

## Steps — variable support

21. Set Key to `$MY_VAR` (a customer variable name); run with a matching object — `output` = the object property named by the variable's value

## Steps — error case

22. Disconnect the `object` handle and run — expect error: **Pick node has no object input connected**

## Expected result
- Object input: returns `obj[key]` — single property access (not dot-notation)
- Array input: parses key as integer index; non-numeric key or out-of-bounds index → `undefined`
- Non-object, non-array input: returns `undefined` (no error)
- Missing key: returns `undefined` (no error)
- `key` handle overrides the static Key field when connected
- Static Key field: disabled when `key` handle is connected; shows "using connected value" is not explicitly shown but field is uneditable
- Subtitle: `obj["keyname"]` with the current key JSON-stringified; `obj[key]` when empty

## Failure indicators
- Missing key throws an error instead of returning `undefined`
- Static Key field remains editable when the `key` handle is connected
- Array access with `"1"` returns `undefined` instead of the element at index 1
- Dot-notation key like `user.email` returns a nested value (it should NOT — Pick is a flat accessor)
- Subtitle does not update when the Key field is edited

## Severity rationale
A missing-key throw would halt workflow execution for any optional field access; returning `undefined` gracefully allows downstream Null Check nodes to handle the empty case.

## Source reference
`components/canvas/nodes/PickNode.tsx` lines 39-40 (lime dot vs white/30 key dot), lines 64-66 (subtitle: JSON.stringify of key or "key" placeholder), lines 88-99 (Key VarField disabled when isKeyConnected); `lib/nodes/pick.ts` lines 15-20 (key source: handle vs static resolveVars), lines 24-31 (type dispatch: array → parseInt index, object → bracket access, else → undefined).

## Notes
The Pick node performs flat property access only — it does not support dot-notation paths like `user.email`. For nested key access, use the JSON Parser node (which has explicit dot-notation support via `resolvePath`). The key handle accepts any value; it is coerced to string via `toText()` before use as a property name.
