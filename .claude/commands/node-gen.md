Generate a complete, pattern-conformant new canvas node for `$ARGUMENTS`.

`$ARGUMENTS` is a short description of the node to build — its name and what it
should do (e.g. "Slugify — convert a string into a URL-safe slug", category
Transform). If the name, category, or behavior is ambiguous, state your
assumptions explicitly before writing any code, then proceed.

A node is only "done" when **all seven** artifacts below exist, every npm test
passes, lint passes, and the QA checklist + spec are written. Do not stop early.

---

## Before writing anything — read the pattern

Pick the **closest existing node** in the same category and read all of its
artifacts end to end. Mirror its structure, naming, spacing, and idioms exactly
— a new node must be indistinguishable in style from its siblings. Read:

1. `components/canvas/nodes/<Sibling>Node.tsx` — UI component pattern
2. `lib/nodes/<sibling>.ts` — executor pattern (if the node has runtime logic)
3. `components/canvas/nodes/registry.ts` — the `NodeDef` interface (lines 60–80)
   and several sibling entries in the target category
4. `lib/node-types.ts` — the `<Sibling>NodeData` interface
5. The matching `case "<type>":` block in `lib/workflow-engine.ts`
6. `__tests__/nodes/<Sibling>Node.test.tsx` — test pattern
7. `lib/workflow-types.ts` — `EvalResult`, `ReqContext` shapes
8. The Next.js guide in `node_modules/next/dist/docs/` if any route/server code
   is touched (this is NOT the Next.js you know)

---

## The seven required artifacts

Each new node MUST produce all of these, kept mutually consistent:

| # | Artifact | Location | Must match |
|---|----------|----------|------------|
| 1 | Data interface | `lib/node-types.ts` | exported `<Name>NodeData` with `onChange?` and optional `connectedHandles?` |
| 2 | Canvas component | `components/canvas/nodes/<Name>Node.tsx` | `"use client"`, `memo`, `NodeProps`, `Handle`/`Position`, dynamic handle-top measuring via `useViewport`/`useLayoutEffect`, header (icon + title + subtitle), `VarField` for value inputs, `cn` for styling |
| 3 | Registry entry | `components/canvas/nodes/registry.ts` | a `NodeDef` with `type`, `component`, `label`, `sub`, `color`, `icon`, `category`, `defaultData`, `primaryInput`, `primaryOutput` (and `getDynamicOutput`/`singleton` if needed) |
| 4 | Executor | `lib/nodes/<name>.ts` | pure function returning `EvalResult`-compatible output keyed by handle (skip only for UI-only/static nodes) |
| 5 | Engine case | `lib/workflow-engine.ts` | a `case "<type>":` block wired to the executor, results keyed by `sourceHandle` |
| 6 | Test | `__tests__/nodes/<Name>Node.test.tsx` | follows the **Node target** rules from `/test` (see below) |
| 7 | QA checklist + spec | `.claude/qa/checklist.md` + `.claude/qa/specs/NODE-<CAT>-<NN>.md` | format below |

**Consistency rule (from AGENTS.md):** `NodeDef.defaultData`, the
`<Name>NodeData` interface, and the executor's `node.data` cast are three
separate definitions — they MUST stay in sync. Every field present in one must
be present in the others with the same name and compatible type. Verify this by
hand before marking the node done.

---

## Execution protocol (same as `/build`)

Produce a **TODO list** with one item per artifact above (plus a final
verification item). Work through it **one item at a time, strictly in order**.
For each item:

1. **Implement** — write the minimum code to satisfy that item only, copying the
   sibling node's structure.
2. **Test edge cases** — empty / null / zero input, boundary values, invalid
   types/malformed data, missing/unconnected handles, repeated evaluation.
3. **Verify** — run the relevant test (`npm test -- <Name>Node`) and confirm it
   passes.
4. **Fix & repeat** — any failure or unhandled edge case blocks progress; fix it
   completely and re-run before moving on. Never carry broken code forward.
5. **Ensure integration** — confirm the node renders on the canvas, registers in
   the sidebar under the right category, and executes through the engine.
6. **Check off** — only after the item is verified clean.

Constraints: no skipping ahead, no placeholder/`TODO`/`...` code, no `any` type
(use proper types or `unknown`), no `as` casts outside test code, errors are
blockers, one-line summary after each item.

---

## Test coverage (artifact 6 — Node target rules)

Write `__tests__/nodes/<Name>Node.test.tsx` covering:

1. Renders without crashing with `defaultData`
2. Every output handle is present in the DOM (one test per handle id)
3. Every configurable field — each option/toggle/input fires `onChange` with the
   exact correct payload shape
4. Every branch of internal logic — counts, scores, transforms, validations,
   including boundary values
5. Empty / null / missing input — must not crash, must show a sensible empty
   state
6. `onChange` is never called with `undefined` or keys absent from the Data
   interface

Stack: Vitest + @testing-library/react + jsdom. Setup `__tests__/setup.ts`
already mocks `server-only` and imports `jest-dom`. Path alias `@` → project
root. Mock all external deps (network, DB, crypto, heavy modules). Reference
pattern: `__tests__/lib/complexity/heuristics.test.ts` and a sibling node test.

---

## QA checklist + spec (artifact 7)

### Pick the ID

Node specs use `NODE-<CATEGORY>-<NN>`. Categories in use: `INPUT`, `AI`, `REQ`,
`EXT`, `FMT`, `LOGIC`, `TRANSFORM`, `STATIC` (map your node's category to the
matching section in `.claude/qa/checklist.md`, sections 15–22). Scan the
checklist for the highest existing `NN` in that category and use the next one.

### Add the checklist line

Under the correct `## NN. Nodes — <Category>` section in
`.claude/qa/checklist.md`, append:

```
- [ ] [NODE-<CAT>-<NN>] <Node Label> — <one-line behavior summary> — [spec](specs/NODE-<CAT>-<NN>.md)
```

Leave it `[ ]` (pending) — it has not been QA-run yet. Do not touch other lines.

### Write the spec file

Create `.claude/qa/specs/NODE-<CAT>-<NN>.md` matching the exact structure of
existing specs (see `specs/NODE-AI-05.md` and `specs/NODE-LOGIC-01.md`):

```markdown
---
id: NODE-<CAT>-<NN>
title: <plain-text title, no punctuation needed>
severity: low | medium | high
source_files:
  - components/canvas/nodes/<Name>Node.tsx
  - lib/nodes/<name>.ts
---

## What this tests
<1–2 sentences: what behavior this verifies — canvas display + execution output.>

## Prerequisites
- App is running at http://localhost:3000
- A workflow with a <Node Label> node exists on the canvas
- The Debug panel is accessible

## Steps
<Numbered, concrete manual steps. Cover: header (title/subtitle/icon/color),
every input and output handle by name and color, every configurable field, then
execution via the Debug panel asserting each output handle's value.>

## Expected result
- <Bullet per observable: canvas preview values, handle outputs, empty state.>

## Failure indicators
- <Bullet per concrete symptom that means this test failed.>

## Severity rationale
<1 sentence: why this severity — what breaks downstream if the node misbehaves.>

## Source reference
`components/canvas/nodes/<Name>Node.tsx` lines X–Y (...); `lib/nodes/<name>.ts`
lines X–Y (...).

## Notes
<Canvas-only UI elements, debounce values, or surprising behaviors. Optional.>
```

Spec writing rules: derive every handle, field, and branch from the actual
source you just wrote (cite real line numbers). The spec must be runnable by
someone with no prior knowledge of the node.

---

## Final verification (last TODO item)

Before declaring done, run and confirm all pass:

```bash
npm test                 # full suite — your node test + no regressions
npm run lint             # zero errors (typecheck runs in build)
```

If lint reports errors, fix them before continuing. Then sanity-check the
seven-artifact consistency one last time (defaultData ↔ Data interface ↔
executor cast ↔ engine case ↔ test ↔ spec source_files).

---

## Commit (per AGENTS.md)

Stage only the files you created/edited (never `git add -A`) and commit:

```
feat(canvas): add <Node Label> node

<what the node does and why, if non-obvious>
```

---

## Deliverable

When every TODO item is checked off, report:
- The seven artifacts created/edited with their paths
- The QA ID assigned (`NODE-<CAT>-<NN>`) and the checklist section it landed in
- Edge cases caught and fixed during the process
- `npm test` and `npm run lint` results (state plainly that they pass)
- Any assumptions or known limitations made explicit
