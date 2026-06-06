Write tests for `$ARGUMENTS`.

Identify what `$ARGUMENTS` refers to:
- If it names a canvas node (found in `components/canvas/nodes/`), treat it as a **Node target**
- If it names a lib/utility file (found in `lib/`), treat it as a **Lib target**
- If it names an API route (found in `app/api/`), treat it as a **Route target**
- Otherwise infer from the path or name

---

## Node target

Read:
- The node component in `components/canvas/nodes/` (match by name)
- `components/canvas/nodes/registry.ts` for `defaultData` and the type string
- The corresponding executor in `lib/nodes/` if one exists

Write `__tests__/nodes/[filename].test.tsx` covering:
1. Renders without crashing with `defaultData`
2. Every output handle is present in the DOM (one test per handle id)
3. Every configurable field — each option, toggle, or input triggers `onChange` with the exact correct payload shape
4. Every branch of internal logic — counts, scores, transforms, validations — including boundary values
5. Empty / null / missing input — must not crash, must show a sensible empty state
6. `onChange` is never called with `undefined` or keys absent from the Data interface

---

## Lib target

Read the source file completely. Derive every exported function, its parameter types, return types, and all internal branches.

Write `__tests__/lib/[filepath].test.ts` covering:
1. Happy path for every exported function
2. Every branch / conditional path
3. Boundary and edge values (empty string, 0, null, large input, etc.)
4. Error paths — thrown errors, rejected promises, invalid input
5. Any side effects (DB calls, crypto, network) must be mocked

---

## Route target

Read the route handler in `app/api/`. Identify every HTTP method, auth check, DB interaction, and response shape.

Write `__tests__/api/[filepath].test.ts` covering:
1. Happy path for every supported method — correct status code and response body
2. Every error branch — missing fields, bad auth, DB failure — correct status and error message
3. Edge cases in request parsing (missing body, wrong content-type, extra fields)
4. Mock the DB singleton (`lib/db/index.ts`) and any crypto/external calls

---

## Shared rules (all targets)

Stack: Vitest + @testing-library/react (for components) + jsdom
Setup: `__tests__/setup.ts` already exists — mocks `server-only`, imports `jest-dom`
Path alias: `@` → project root
Reference pattern: `__tests__/lib/complexity/heuristics.test.ts`

Run `npm test -- <filename>` after writing. Fix every failure. Stop only when all tests pass.
