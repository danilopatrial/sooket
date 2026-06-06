---
id: EXPR-05
title: "$VAR_NAME resolves a customer variable in VarField inputs"
severity: high
source_files:
  - lib/nodes/utils.ts
---

## What this tests
Verifies that `$VAR_NAME` syntax (uppercase, no braces) in any VarField or node config string resolves to the corresponding customer variable's decrypted value at execution time.

## Prerequisites
- App is running at http://localhost:3000
- At least one customer variable is configured (e.g. `API_KEY` = `"secret123"`) in the workflow's Variables tab
- A workflow with a node that uses `$VAR_NAME` syntax in a VarField exists
- The Debug panel is accessible

## Steps — configure a customer variable

1. Open the workflow settings (gear icon → **Variables** tab)
2. Add a variable named `GREETING` with value `Hello from vars`
3. Save the workflow

## Steps — using $VAR_NAME in a VarField

4. Navigate to the canvas; add a Template String node
5. In the **Template** field, type `$GREETING`
6. Run a Debug request — output should be `"Hello from vars"` (variable resolved at execution time)
7. Type `Prefix: $GREETING suffix` — output = `"Prefix: Hello from vars suffix"` (inline substitution)
8. Type `$NONEXISTENT` — output = `"$NONEXISTENT"` (unknown variable kept as-is)
9. Type `$greeting` (lowercase) — output = `"$greeting"` (not resolved; pattern requires UPPERCASE)

## Steps — variable syntax constraints

10. Verify the pattern: `$` followed by an uppercase letter, then any uppercase letters, digits, or underscores (`$[A-Z][A-Z0-9_]*`)
11. `$MY_VAR` — resolves
12. `$MY-VAR` — does NOT resolve (hyphen not allowed; keeps literal `$MY-VAR`)
13. `$1VAR` — does NOT resolve (must start with uppercase letter, not digit)
14. `$MY_VAR2` — resolves (digits allowed after first letter)

## Steps — other nodes that support variable resolution

15. Verify `$VAR_NAME` works in:
    - HTTP Request node URL field
    - Auth Validator node Secret field
    - Regex Replace node Pattern and Replace fields
    - Content Guardrail pattern rows
    - Cache node (if values contain `$` references)
16. In each case: the `$VAR_NAME` in the static field is replaced with the variable value before execution

## Expected result
- `$VAR_NAME` (uppercase, starting with letter) in any VarField or supported string field is replaced with the customer variable's value
- Unknown variables (`$NONEXISTENT`) are kept as-is (literal string preserved)
- Lowercase or mixed-case patterns (`$myVar`) are not resolved
- Variables starting with a digit (`$1VAR`) are not resolved
- Variable values are resolved server-side at execution time (not visible in the canvas UI)

## Failure indicators
- `$GREETING` appears literally in the output instead of being replaced
- Lowercase `$greeting` is resolved (should not be — pattern requires uppercase)
- Unknown variable `$NONEXISTENT` throws instead of being kept as-is
- Variable resolution works in Template String but not in other VarField-based nodes (should work across all nodes that call `resolveVars`)

## Severity rationale
Customer variables are the primary secure storage mechanism for secrets and configuration; broken resolution silently exposes `$VAR_NAME` literals to users or LLM context.

## Source reference
`lib/nodes/utils.ts` lines 19-22 (`resolveVars`: regex `/\$([A-Z][A-Z0-9_]*)/g`, replaces matched names with `vars.get(name) ?? \`$\${name}\``).

## Notes
The checklist item EXPR-05 lists the syntax as `{{ $vars.VAR_NAME }}`, but this is NOT the actual syntax in the codebase. The `{{ }}` expression system in `lib/expr.ts` does not handle `$vars`. The actual syntax is `$VAR_NAME` (no braces) and is processed by `resolveVars` from `lib/nodes/utils.ts`. This function is called by most node executors (Template String, Regex Replace, Auth Validator, HTTP Request, etc.) but not by all nodes. To confirm which nodes call it: search for `resolveVars` in `lib/nodes/`.
