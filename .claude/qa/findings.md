# QA Findings

All failures, warnings, and blockers found during the execution loop are recorded here.
Passing items are not recorded — check `checklist.md` for full status.

---

## CONTRACT-WF-03 — GET /api/workflows/[slug] returns extra fields `errorWorkflowId` and `webhookToken`

- **Status**: fixed
- **Fixed**: 2026-06-05 — Removed `webhookToken` from the `GET /api/workflows/[slug]` response (no frontend consumer; it is a gating secret that should not be exposed). Kept `errorWorkflowId`, which the General config tab's error-workflow picker reads from this endpoint (CFG-GEN-04) — removing it would regress that verified feature — and updated the CONTRACT-WF-03 spec to document `errorWorkflowId` as part of the contract and to forbid `webhookToken`. Verified live: response keys are exactly `errorWorkflowId, id, isActive, name, nodes, slug`. Added a contract regression test.
- **Severity**: low
- **Date**: 2026-06-05

### What was observed
`GET /api/workflows/[slug]` returns HTTP 200 with keys: `errorWorkflowId`, `id`, `isActive`, `name`, `nodes`, `slug`, `webhookToken`. The spec expects exactly `id`, `name`, `slug`, `nodes`, `isActive`.

### Expected
Only five keys: `id`, `name`, `slug`, `nodes`, `isActive`.

### Notes
All required fields present with correct types (`nodes` is array, `isActive` is boolean, no `edges`). Extra fields: `errorWorkflowId` (added for error workflow picker) and `webhookToken` (exposed for webhook configuration). Neither is a sensitive credential. The failure indicators only flag missing required fields, wrong types, or `edges` being present.

---

## CONTRACT-WF-01 — GET /api/workflows returns `id` in addition to `slug` and `name`

- **Status**: fixed
- **Fixed**: 2026-06-05 — Implementation is correct: `id` is intentionally part of the contract (the General config tab's error-workflow picker reads it from this endpoint to populate the dropdown and PATCH a numeric `errorWorkflowId` — see CFG-GEN-04), and no sensitive fields (`api_key`/`nodes`/`edges`) are exposed. Removing `id` would regress CFG-GEN-04. Updated the CONTRACT-WF-01 spec to document `id` as part of the contract, and added a regression test asserting each element is exactly `{id, slug, name}` with no sensitive fields. Verified live: `GET /api/workflows` returns elements with only `id, name, slug`, sorted by name.
- **Severity**: low
- **Date**: 2026-06-05

### What was observed
`GET /api/workflows` returns HTTP 200 with a JSON array ordered by name ASC. Each element has `id`, `slug`, and `name`. The spec states only `slug` and `name` should be present.

### Expected
Elements contain only `slug` and `name` — `SELECT id, slug, name` now returns three fields.

### Failure indicator triggered
Not a sensitive-field failure (the spec failure indicator lists `api_key`, `nodes`, `edges`). `id` is non-sensitive.

### Notes
The `id` field was intentionally added as part of the CFG-GEN-04 fix so the error workflow picker can populate the dropdown. All other contract requirements pass: HTTP 200, array type, both `slug` and `name` present, alphabetical sort by name.

---

## UX-03 — Destructive actions require explicit confirmation

- **Status**: fixed
- **Fixed**: 2026-06-05 — Added a two-step inline confirmation to the Variables tab delete (`components/workflow-config/VariablesTab.tsx`): the trash icon now arms a "Delete?" / Yes / No control (with a "Deleting…" state) instead of firing DELETE on first click, matching the dashboard and API-keys patterns. Verified live: trash click shows the confirm, sends no DELETE, and No restores the row. Added regression tests. (The legacy `components/canvas/WorkflowConfig.tsx` panel noted in the original report is dead code — not imported/rendered anywhere — so it was left untouched.)
- **Severity**: high
- **Date**: 2026-06-05

### What was observed
The Variables tab delete button (`components/workflow-config/VariablesTab.tsx:167`) fires `handleDelete(v.name)` directly on click with no intermediate confirmation step. The DELETE request is sent immediately.

All other destructive actions tested have proper two-step confirmation:
- Dashboard workflow delete: inline "Delete?" + Yes/No ✓
- API Keys delete: inline Confirm/Cancel ✓
- General tab workflow delete: `confirmDelete` state + "Yes, delete permanently" ✓
- Import workflow: `pendingImport` Dialog modal ✓

### Expected
Some form of confirmation (inline or modal) before the DELETE request is sent for variable deletion.

### Failure indicator triggered
Step 18: "Verify some form of confirmation (inline or modal) before the DELETE request is sent" — not met for the Variables tab.

### Steps to reproduce
1. Navigate to Config → Variables tab for any workflow with a variable
2. Click the Trash icon next to a variable
3. Observe: variable is immediately deleted with no confirmation dialog

### Screenshot
N/A

### Notes
The listed spec failure indicators focus on workflow and API key deletion (both pass). Variable deletion is lower-stakes but still irreversible without a DB backup. `WorkflowConfig.tsx:231` (older variables panel) has the same issue.

---

## CFG-KEY-07 — Per-key stats panel: bar chart not rendered when all values are zero

- **Status**: fixed
- **Fixed**: 2026-06-04 — Removed the all-zero short-circuit in `KeyDashboardPanel.tsx` so the daily-requests section always renders the 30-bar SVG `BarChart` (which already handles zero-request days as empty bars), satisfying the spec's "always 30 entries" requirement.
- **Severity**: medium
- **Date**: 2026-06-04

### What was observed
The stats panel opens correctly, shows 4 stat cards (Requests: 0, Tokens used: 0, Avg latency: —, Peak day: 0), and the header with label/key_hint. However, the "Daily requests" section shows "No requests in the last 30 days" text instead of an SVG bar chart when all 30 daily values are 0.

### Expected
An SVG bar chart with 30 bars should render even when all request counts are 0 (always 30 entries).

### Failure indicator triggered
"The bar chart is missing" when key has no usage history — but this is intentional behavior per source code (line 264-265: `daily.every(d => d.requests === 0)` shows text instead of SVG).

### Steps to reproduce
1. Navigate to API Keys tab on a workflow with an unused key
2. Click the BarChart2 icon on the key row
3. Observe the Daily requests section shows empty state text instead of SVG bars

### Screenshot
`/tmp/qa-CFG-KEY-07-01-stats-panel.png`

### Notes
Intentional UX decision in `KeyDashboardPanel.tsx` line 264. The API returns 30 daily entries correctly (`daily.length === 30`). The empty state is good UX but deviates from the spec's "always 30 bars" requirement. Stat cards, header, and close button all work correctly.

---

## CFG-GEN-04 — Assign an error workflow — UI control not implemented

- **Status**: fixed
- **Fixed**: 2026-06-04 — Added an "Error Workflow" picker to GeneralTab that PATCHes `{errorWorkflowId}`; surfaced workflow `id` in `GET /api/workflows` and `errorWorkflowId` in `GET /api/workflows/[slug]` so the control can populate and persist.
- **Severity**: medium
- **Date**: 2026-06-04

### What was observed
No UI control exists in `GeneralTab.tsx` or any other config tab component for assigning an error workflow. Searching all files under `components/workflow-config/` for "errorWorkflow", "error_workflow", or "Error Workflow" returns zero results.

### Expected
A UI control to select and save an error workflow assignment (PATCH `{errorWorkflowId}`) should be visible in the General config tab.

### Failure indicator triggered
"No UI control for error workflow assignment exists in the General tab"

### Steps to reproduce
1. Navigate to `/workflow/3v7MOhFbXR/config`
2. Observe the General tab — no "Error Workflow" section present

### Screenshot
N/A — feature is entirely absent from the UI

### Notes
The API and engine both support `error_workflow_id` (PATCH handler line 76 in `app/api/workflows/[slug]/route.ts`; engine reads and invokes it on failure). This is a frontend gap only. The spec itself notes this test is expected to fail — backend-ready, needs a frontend control.

---

## CANVAS-15 — Disabled node is visually dimmed and passes through input unchanged

- **Status**: fixed
- **Fixed**: 2026-06-04 — Extracted `serializeTraces()` into `lib/serialize-traces.ts` and added `disabled: t.disabled ?? false` so the debug API trace response carries the engine's `disabled` flag; verified the disabled node's trace row now reports `disabled: true`.
- **Severity**: high
- **Date**: 2026-06-04

### What was observed
Visual behavior and execution pass-through both work correctly: the Text node renders at `opacity: 0.4` after disabling, the context menu switches to "Enable node", and a connected disabled node passes through its upstream input unchanged (`durationMs: 0`, `inputSnapshot: "null"`, `outputSnapshot: "null"`). However, the debug API trace response does **not** include `disabled: true` — the `serializeTraces()` function in `app/api/workflows/[slug]/debug/route.ts` (lines 150–159) maps `pinned: t.pinned ?? false` but omits `disabled`. The engine correctly pushes `disabled: true` into the internal `NodeTrace` array at line 281 of `workflow-engine.ts`, but it is stripped before the HTTP response.

### Expected
- Node at `opacity: 0.4` ✓
- Context menu toggles to "Enable node" ✓
- Pass-through: output equals upstream input, not node logic ✓
- Trace row shows `disabled: true` ✗

### Failure indicator triggered
"The execution trace does not mark the node as `disabled: true`" — the field is present internally in `NodeTrace` but omitted from the serialized API response.

### Steps to reproduce
1. POST `/api/workflows/3v7MOhFbXR/debug` with `__nodes` including `"disabled": true` on a node and `__edges` connecting it
2. Inspect the trace in the response — `disabled` field is absent

### Screenshot
`/tmp/qa-CANVAS-15-after-disable.png`, `/tmp/qa-CANVAS-15-context-menu-2.png`

### Notes
Fix: add `disabled: t.disabled ?? false` to the `serializeTraces()` return object in `app/api/workflows/[slug]/debug/route.ts` line 158.

---

## CANVAS-11 — Minimap renders and is interactive

- **Status**: fixed
- **Fixed**: 2026-06-05 — Imported `MiniMap` from `@xyflow/react` and rendered it inside `<ReactFlow>` (bottom-right, `pannable`/`zoomable`, dark-themed) in `WorkflowCanvas.tsx`; the `.react-flow__minimap` now appears with node shapes and dragging it pans the main viewport.
- **Severity**: low
- **Date**: 2026-06-04

### What was observed
No minimap widget is present on the canvas. The `.react-flow__minimap` element is absent from the DOM.

### Expected
A minimap widget visible on the canvas (typically bottom-right); clicking it pans the viewport.

### Failure indicator triggered
"No minimap widget is visible anywhere on the canvas"

### Steps to reproduce
1. Navigate to `/workflow/3v7MOhFbXR`
2. Inspect DOM for `.react-flow__minimap` — not found

### Notes
Confirmed by source review: `<MiniMap>` is not imported from `@xyflow/react` and is not rendered in `WorkflowCanvas.tsx`. This is a known missing feature, not a runtime error.

---

## CANVAS-08 — Auto-insert node into existing edge by dragging onto it

- **Status**: fixed
- **Fixed**: 2026-06-05 — In `WorkflowCanvas.tsx`, changed the split "out" edge's `targetHandle` from `edge.targetHandle ?? undefined` to `?? null` in both the `onDrop` and `onNodeDragStop` paths. When the original edge targets a handle-less node (e.g. Output, handle id null), `undefined` made React Flow search for handle id "input" and reject the edge; `null` connects to the default handle. Verified via synthetic drop: original edge removed, both split edges render (source→cache→output), no "Couldn't create edge" warning.
- **Severity**: medium
- **Date**: 2026-06-04

### What was observed
When a Cache node is dropped onto an existing edge (text-1 → output-1), the node is added to the canvas and the "in" split edge is created (text-1 → cache via VALUE handle). However, the original edge is **not removed** and the "out" split edge (cache → output-1) **fails to be created**. React Flow emits: `Couldn't create edge for target handle id: "input", edge id: e-split-...-out`. Net result: 4 nodes, 2 edges (original + in), with Cache disconnected from Output.

### Expected
- Original edge removed
- Two new edges created: source → cache (via primaryInput "value"), cache (via primaryOutput "output") → target
- Net result: text-1 → cache → output-1

### Failure indicator triggered
"The new node is added but the original edge is not split (leaving a disconnected node)"

### Steps to reproduce
1. Navigate to `/workflow/3v7MOhFbXR`
2. Create an edge from text-1's output handle to output-1's input handle
3. Drag a Cache node from the Logic sidebar and drop it onto the edge (between the two nodes)
4. Observe: Cache appears, "in" edge is created, but "out" edge is missing and original edge persists

### Screenshot
`/tmp/qa-CANVAS-08-result.png`

### Notes
Root cause: `WorkflowCanvas.tsx` line 463 — `targetHandle: edge.targetHandle ?? undefined` converts null to undefined. React Flow then defaults to searching for handle id "input" on the workflowOutput node, which has no specific handle ID (its handle is `data-handleid=null`). The match fails and the edge is rejected. Fix: change `edge.targetHandle ?? undefined` to `edge.targetHandle ?? null`.

---


## DEBUG-11 — Debug panel drag-to-resize: close-on-minimum does not fire

- **Status**: fixed
- **Fixed**: 2026-06-05 — Added a `heightRef` in `DebugPanel.tsx` kept in sync with the `height` state (and updated inside `onMouseMove`), and changed `onMouseUp` to test `heightRef.current <= MIN_HEIGHT` instead of the stale `height` captured in the mousedown closure. Verified end-to-end: dragging to 120px and releasing now closes the panel, and reopening restores the 380px default.
- **Severity**: low
- **Date**: 2026-06-04

### What was observed
The drag handle exists with `cursor-ns-resize` and the correct violet hover styling. Dragging up correctly increases height (380 → 530px confirmed). Dragging down correctly clamps at 120px (`MIN_HEIGHT`). However, releasing the handle at minimum height does **not** close the panel — it stays open at 120px.

### Expected
Releasing at or below 120px should call `onClose()` and reset height to 380px.

### Failure indicator triggered
"Releasing at minimum height does not close the panel" — the panel remained open at 120px and had to be closed manually with the toolbar toggle.

### Steps to reproduce
1. Navigate to `/workflow/3v7MOhFbXR` and open the Debug panel (default 380px)
2. Drag the handle downward until the panel reaches minimum height (120px)
3. Release the mouse — panel stays open at 120px; `onClose()` is never called

### Screenshot
`/tmp/qa-DEBUG-11-03-after-drag-down.png`

### Notes
Root cause: stale closure in `DebugPanel.tsx` `onHandleMouseDown`. The `onMouseUp` inner function captures `height` from the render scope at the time of mousedown (e.g. 380px or 530px), so `height <= MIN_HEIGHT` always evaluates the starting height, never the post-drag height of 120px. Fix: track current height in a `useRef` and read from it in `onMouseUp` instead of using the state variable.

---

## DASH-05 — Empty state renders when no workflows exist

- **Status**: fixed
- **Fixed**: 2026-06-05 — No source defect; the empty-state branch in `WorkflowList.tsx` was already correct. The blocker was a verification gap (couldn't safely empty the live DB). Resolved by adding a deterministic regression test (`__tests__/components/WorkflowList.test.tsx`) that renders the real component with `workflows={[]}` and asserts both empty-state lines + absence of rows, and by confirming `app/(main)/workflow/page.tsx` passes the DB rows straight through (empty DB → [] → empty state) with `NewWorkflowButton` always rendered in the header. No seed data was touched.
- **Severity**: medium
- **Date**: 2026-06-04

### What was observed
Cannot execute this test without deleting all workflows from the database. The QA Harness workflow (`3v7MOhFbXR`) and other seed workflows are required by downstream tests and cannot be safely deleted. Puppeteer request interception does not work for SSR data — `WorkflowList` is a `"use client"` component that receives the workflow list as server-rendered props, so mocking the API at the browser layer has no effect.

### Expected
The list area shows "No workflows yet." and "Create your first workflow to get started." when no workflows exist.

### Failure indicator triggered
Test precondition could not be met — test was not executed.

### Steps to reproduce
1. Attempt to mock empty API response via Puppeteer request interception — fails because data is SSR-rendered
2. Attempt to delete all workflows to create empty state — blocked to preserve QA Harness seed data

### Screenshot
N/A

### Notes
Source code review confirms the empty-state branch is implemented correctly at `components/workflow/WorkflowList.tsx:44-51`. The branch `if (workflows.length === 0)` renders the expected centered column with the correct text. The logic is sound but cannot be verified end-to-end without a fresh database or a way to inject empty server props.

---

## NODE-LOGIC-12 — Custom Code node: `setTimeout` not available in sandbox; async timeout path untestable

- **Status**: fixed
- **Fixed**: 2026-06-05 — Added `setTimeout`/`clearTimeout` to the VM sandbox in `lib/nodes/custom-code.ts`. User async-delay code now runs instead of throwing `ReferenceError`, and the previously-unreachable 5500 ms `Promise.race` async-timeout guard now fires. Verified via debug API: `typeof setTimeout` → "function", short delay returns its value, `await new Promise(r => setTimeout(r, 6000))` → "Custom Code runtime error: Custom Code timed out after 5 s" at ~5.6 s, sync timeout still distinct, and blocked globals (`process`) remain undefined. Added regression tests.
- **Severity**: low
- **Date**: 2026-06-05

### What was observed
The spec for NODE-LOGIC-12 instructs testing the async timeout path with:
```js
await new Promise(r => setTimeout(r, 6000)); return "late";
```
Running this code in the sandbox immediately throws `Custom Code runtime error: ReferenceError: setTimeout is not defined` (returns in <100ms) rather than timing out after ~5.5 seconds.

Checking `lib/nodes/custom-code.ts`, `setTimeout` is not included in the sandbox globals object. The 5500 ms `Promise.race` timer (async timeout guard) exists in the host-side code but can never be triggered by user code because no async-delay mechanism is available in the sandboxed context.

### Expected (per spec)
`await new Promise(r => setTimeout(r, 6000)); return "late";` should hang for ~5 seconds then throw `Custom Code runtime error: Custom Code timed out after 5 s`.

### Actual
`Custom Code runtime error: ReferenceError: setTimeout is not defined` — returns immediately.

### Impact
- The async timeout path (`Promise.race` at 5500 ms) is dead code from the user's perspective — it can never fire with the current sandbox globals.
- Users cannot write async code with time delays (e.g., retry loops, polling). If `setTimeout` were intentionally excluded for security, the async timeout guard is unnecessary.
- Synchronous timeout works correctly (infinite loop → `Custom Code timed out (synchronous execution exceeded 5 s)` after ~5s). Only the async path is affected.

### Steps to reproduce
POST `/api/workflows/3v7MOhFbXR/debug` with `custom-code` node, code `await new Promise(r => setTimeout(r, 6000)); return "late";` — observe immediate error rather than 5-second timeout.

### Notes
Likely intentional: `setTimeout` was not added to the sandbox globals in `lib/nodes/custom-code.ts`. However, the spec expected it to be available. If the intent is to disallow async delays (avoiding hung executions in ways that bypass the sync timeout), the async `Promise.race` guard is not needed. If `setTimeout` should be available, it needs to be added to the sandbox object.

---

## NODE-LOGIC-15 — Sub-Workflow node: `ctx.inputFor(null)` never matches named `input` handle

- **Status**: fixed
- **Fixed**: 2026-06-05 — Changed `ctx.inputFor(null)` to `ctx.inputFor("input")` in `lib/nodes/sub-workflow.ts`. When users draw an edge from any node to the sub-workflow's `input` handle in the canvas, React Flow records `targetHandle: "input"`. `inputFor(null)` only matches edges where `!e.targetHandle` (falsy), so it never finds the edge — making the node always throw "Sub-Workflow node has no input connected" when wired up via the UI.
- **Severity**: high
- **Date**: 2026-06-05

### What was observed
When connecting a text node to the sub-workflow node's `input` handle via the canvas (edge stored with `targetHandle: "input"`), the debug endpoint returns `ok: false, error: "Sub-Workflow node has no input connected"`. The executor `ctx.inputFor(null)` requires `!e.targetHandle` but the edge has `targetHandle: "input"` (truthy) — so the match fails.

### Expected
Input connected via the `input` handle should be found by the executor.

### Failure indicator triggered
"String/array input is passed unwrapped to the sub-workflow (should be wrapped)" — actually the node never runs at all.

### Steps to reproduce
```bash
curl -X POST http://localhost:3000/api/workflows/3v7MOhFbXR/debug \
  -d '{"__nodes":[...sub-workflow node...],"__edges":[{"source":"txt","target":"sw","targetHandle":"input"}]}'
# → ok:false, error: "Sub-Workflow node has no input connected"
```

### Notes
Root cause: `lib/nodes/sub-workflow.ts` line 6 — `ctx.inputFor(null)` matches edges with falsy `targetHandle`, but canvas-drawn edges to the `input` handle always have `targetHandle: "input"`. Fix: change to `ctx.inputFor("input")`.

---

## NODE-XFRM-05 — Array Length canvas output handle ID mismatch with spec

- **Status**: spec inaccuracy (implementation correct)
- **Severity**: info
- **Date**: 2026-06-05

### What was observed
`ArrayLengthNode.tsx` line 24 declares the output handle as `id="output"`, and `registry.ts` registers it as `primaryOutput: "output"`. The spec step 3 refers to this handle as **"count"** (which is only a visible text label in the node body at line 44, not the React Flow handle ID).

### Expected (per spec)
Output handle labelled **"count"** — implied to be the handle ID.

### Actual
Handle ID is `"output"`. `"count"` is a `<span>` label in the body row, not the handle ID. A `[data-handleid="count"]` selector finds no element.

### Impact
No runtime impact — the engine doesn't validate sourceHandle IDs for single-output nodes, so edges with either `sourceHandle: "count"` or `sourceHandle: "output"` will deliver the value. However, edge definitions that use `sourceHandle: "count"` based on the spec will silently misstate the actual handle.

### Notes
All execution behaviors (array, string, object, other types, no-input error) pass. Only the spec's handle ID claim is inaccurate.

---

## NODE-LOGIC-12b — Spec inconsistency: sync-timeout error prefix

- **Status**: superseded (resolved 2026-06-06 — see the later NODE-LOGIC-12b entry)
- **Severity**: info
- **Date**: 2026-06-05

> **Update 2026-06-06**: This entry declared NODE-LOGIC-12 authoritative and kept the distinct sync-timeout message. That call was reversed. The contradiction was instead resolved by reconciling *toward* 12b: a timeout is a runtime failure and now reports under the single `Custom Code runtime error:` prefix on both the sync and async paths. NODE-LOGIC-12's spec text was edited to match. The analysis below is retained for history but no longer reflects current behavior.


### What was observed
NODE-LOGIC-12b step 15 states: `while(true) {}` should produce `"Custom Code runtime error: Custom Code timed out after 5 s"`. However, the actual implementation produces the distinct message `"Custom Code timed out (synchronous execution exceeded 5 s)"` — which is NOT wrapped under the "runtime error" prefix.

NODE-LOGIC-12b's failure indicator explicitly says: "Timeout produces its own prefix instead of being wrapped under 'runtime error'" — meaning the actual correct behavior would be flagged as a failure by this spec.

### Expected (per NODE-LOGIC-12, the authoritative spec)
Sync overrun → `"Custom Code timed out (synchronous execution exceeded 5 s)"` — distinct from both compile/parse and runtime prefixes.

### Actual
Matches NODE-LOGIC-12's expectation. The async "runtime error" timeout path is via `Promise.race` at 5500 ms (and cannot be triggered — see finding above). These are two intentionally distinct errors.

### Notes
The two specs directly contradict each other. NODE-LOGIC-12 is authoritative — it provides the detailed rationale (500 ms gap between sync and async timeouts). NODE-LOGIC-12b step 15 is simply inaccurate. All other NODE-LOGIC-12b checks pass.


---

## EXPR-01 — Template String crashes when pure {{ $json }} resolves to non-string

- **Status**: fixed
- **Fixed**: 2026-06-05 — Added early return in `lib/nodes/template-string.ts` `execute()`: when `typeof template !== "string"` (i.e. `resolveNodeData` resolved a pure expression to a raw object/number/boolean), the executor returns the value directly instead of passing it to `resolveVars()` which expects a string.
- **Severity**: high
- **Date**: 2026-06-05

### What was observed
When a Template String node's `template` field contains a pure `{{ $json }}` expression and the upstream node outputs a non-string value (object, number, boolean), execution fails with `TypeError: text.includes is not a function`. The crash occurs in `resolveVars()` inside the TemplateString executor, which calls `text.includes("$")` where `text` is the non-string resolved value.

Affected cases:
- `{{ $json }}` with object upstream → crash
- `{{ $json }}` with number upstream → crash
- `{{ $json.nested.value }}` (path resolves to number) → crash

Working cases:
- `{{ $json }}` with string upstream → works (string passes through `resolveVars` correctly)
- `Result: {{ $json }}` mixed expression with any type → works (mixed context stringifies via `JSON.stringify`/`String()` before reaching `resolveVars`)
- `{{ $json.key }}` path to string value → works
- `{{ $body.field }}` → works

### Expected (per spec)
`{{ $json }}` in a pure expression should return the raw upstream value as-is — object, array, number, or boolean — without stringification.

### Failure indicator triggered
"`{{ $json }}` in a pure expression returns a stringified version of an object" — actually it crashes rather than stringifying.

### Steps to reproduce
```
POST /api/workflows/.../debug with:
  nodes: text "x" → custom-code (returns {key:"value"}) → template-string (template="{{ $json }}") → output
  edges: cc→tmpl with no targetHandle (primary input)
→ ok:false, error: "TypeError: text.includes is not a function"
```

### Notes
Root cause: `lib/nodes/template-string.ts` line 10 — `resolveNodeData` resolves a pure `{{ expr }}` to a non-string raw value and stores it in `node.data.template`. The executor then calls `resolveVars(template, vars)` which calls `text.includes("$")`, crashing on non-strings. Fix: guard at top of `execute()` — if `typeof template !== "string"`, return the value directly.

---

## ENGINE-01 — $json didn't resolve error object for error-path primary input

- **Status**: fixed
- **Fixed**: 2026-06-05 — Updated `lib/workflow-engine.ts` primary-input resolution: when `primarySrc.connectionType === "error"`, read `primaryInputValue` from the `__error__` cache key instead of the inactive main cache entry. This makes `{{ $json.error }}` etc. resolve correctly in template-string and other expression-bearing nodes placed on the error path.
- **Severity**: high
- **Date**: 2026-06-05

### What was observed
`{{ $json.error }}` in a Template String node connected via an error-typed edge (no `targetHandle`) output the literal string `{{ $json.error }}` rather than the error message. The upstream throwing node's main cache entry held `{ active: false, value: undefined }`, so `primaryInputValue` was undefined and the expression resolved to nothing.

### Expected (per spec step 7)
Downstream nodes on the error path should be able to extract the error message via `{{ $json.error }}`.

### Failure indicator triggered
Template String outputs `{{ $json.error }}` verbatim instead of the error message string.

### Root cause
`runNode` lines 128–134 in `workflow-engine.ts`: `primaryInputValue = cache.get(pk)?.value` always reads from the main cache key (`nodeId:sourceHandle`). When source threw and had an error edge, main cache = `{ active: false, value: undefined }`, and the error value was only in `nodeId:sourceHandle:__error__`. Fix: branch on `primarySrc.connectionType === "error"` and read from the error key.


---

## ENGINE-06 — Source workflow execution orphaned as "running" when error workflow fires

- **Status**: fixed
- **Fixed**: 2026-06-05 — `triggerErrorWorkflow` in `lib/workflow-engine.ts` now runs the error workflow with empty `{}` hooks instead of forwarding the source's hooks (and the unused `hooks` param was dropped). The source's hooks close over a single shared `executionId`; forwarding them let the error workflow's `onWorkflowStart` clobber that id so the source's `onWorkflowEnd` finalized the wrong row. Verified live via debug→executions API: a throwing source with an assigned error workflow now produces exactly one `failed` row and zero orphaned `running` rows. Added a regression test (`__tests__/lib/workflow-engine-error-workflow.test.ts`).
- **Severity**: medium
- **Date**: 2026-06-05

### What was observed
When a source workflow fails and its `errorWorkflowId` triggers an error workflow, two execution records are created in the `executions` table — both attributed to the source workflow's ID. The earlier record (the source's own execution) is left permanently in `status: 'running'` and is never updated to `failed`. Only the second record (created by the error workflow's `onWorkflowStart` call) gets finalized, first with the error workflow's result, then overwritten by the source's `onWorkflowEnd`.

Confirmed via API:
```json
[
  { "id": 801, "status": "failed",   "startedAt": "2026-06-05T16:05:20.817Z" },
  { "id": 800, "status": "running",  "startedAt": "2026-06-05T16:05:20.814Z" }
]
```

### Expected
The source workflow's own execution record should be finalized with `status: 'failed'` after `onWorkflowEnd` is called in the `executeWorkflow` finally block. The error workflow should not interfere with the source's execution tracking.

### Failure indicator triggered
Stale `status: 'running'` execution row persists after the workflow has finished.

### Steps to reproduce
1. Create a source workflow with an `errorWorkflowId` set pointing to a valid error workflow
2. Trigger the source workflow to throw an uncaught exception (via debug endpoint)
3. Query `GET /api/workflows/[src-slug]/executions` — observe the earlier of the two records stuck at `status: 'running'`

### Notes
Root cause: `createSqliteHooks` creates a closure with a single shared `executionId` variable. When `triggerErrorWorkflow` calls `executeWorkflow(errorWf, ..., hooks)` with the same hooks object, the error workflow's `onWorkflowStart` overwrites `executionId` in the closure. The source's subsequent `onWorkflowEnd` then updates the error workflow's execution row, not the source's own row, leaving the source row orphaned.

Fix: `triggerErrorWorkflow` should create fresh hooks (or empty `{}` hooks) for the error workflow execution so each workflow run has its own isolated closure. The call at `lib/workflow-engine.ts` line 392 should pass `{}` instead of `hooks`.

---

## API-01 — Object output is double-encoded in `reply` field

- **Status**: fixed
- **Fixed**: 2026-06-05 — In `lib/execution-handler.ts` the normal-output branch now embeds an object value directly (`typeof rv === "object" ? rv`) instead of `JSON.stringify(rv)`. The chat route already serializes the whole `{ reply }` body once via `JSON.stringify(body)`, so the prior pre-stringify produced a double-encoded string. Verified live: `POST /api/v1/chat` with an object output now returns `{"reply":{"key":"val","num":42}}`. Added regression tests for object (embedded directly) and number (stringified) outputs.
- **Severity**: medium
- **Date**: 2026-06-05

### What was observed
When a workflow's output node receives an object value, the `/api/v1/chat` response wraps a JSON-encoded string in `reply` rather than embedding the object directly:

```json
{ "reply": "{\"key\":\"val\",\"num\":42}" }
```

All other API-01 checks pass:
- Test 1 (string output): ✓ `{ reply: "hello world" }`, HTTP 200, CORS headers, Content-Type
- Test 3 (number output): ✓ `{ reply: "42" }` (stringified)
- Test 4 (no active path): ✓ HTTP 400 `{ error: "No active path reached any output node" }`
- Test 5 (ResponseBuilder): ✓ HTTP 201, `X-Custom: yes` header, raw body not wrapped in reply
- Test 6 (last_used_at): ✓ updated asynchronously

### Expected (per spec step 8)
```json
{ "reply": {"key": "val", "num": 42} }
```
The spec states: "object included directly in `reply`"

### Root cause
`lib/execution-handler.ts` lines 214–217:
```typescript
const reply =
  rv === undefined || rv === null ? "" :
  typeof rv === "object" ? JSON.stringify(rv) :  // ← should be `rv` directly
  String(rv);
return { status: 200, body: { reply }, corsHeaders: CORS_HEADERS };
```
`JSON.stringify(rv)` is called before embedding in `{ reply }`, and then `JSON.stringify(body)` is called again in the chat route — resulting in double-encoding.

### Fix
Change line 216 from `typeof rv === "object" ? JSON.stringify(rv) :` to `typeof rv === "object" ? rv :` so objects are embedded directly in the `reply` field.

---

## EDGE-01 — Disconnected Output node returns HTTP 500 instead of 400

- **Status**: fixed
- **Fixed**: 2026-06-05 — Exported a `NO_OUTPUT_CONNECTED_ERROR` sentinel from `lib/workflow-engine.ts` and updated `lib/execution-handler.ts` to return HTTP 400 (not 500) when the engine reports that error, since a disconnected output is a workflow misconfiguration (client error), not a runtime failure. The exact message `"No output node is connected"` is preserved (per the spec), so the engine's error field is kept rather than dropped. Verified live: a disconnected Input→Output workflow now returns HTTP 400 with `{"error":"No output node is connected"}`. Added regression tests (400 for this case, 500 still for genuine runtime errors).
- **Severity**: high
- **Date**: 2026-06-05

### What was observed
Minimal Input → Output workflow executes correctly: `{"message":"hello"}` returns `{"reply":{"message":"hello"}}` (HTTP 200). Nested body is also returned verbatim. However, when the edge to the Output node is removed, the response is HTTP **500** instead of the expected HTTP **400**.

```json
{ "error": "No output node is connected" }
HTTP: 500
```

### Expected
`{ "error": "No output node is connected" }` with HTTP **400** — client error (no active path reached output).

### Failure indicator triggered
"Disconnected Output produces a 500 instead of 400"

### Steps to reproduce
1. Create a workflow with only Input + Output nodes, activate it, get an API key
2. PATCH the workflow to `edges: []` (disconnect Output)
3. POST to `/api/v1/chat` with valid key
4. Observe HTTP 500

### Root cause
`lib/workflow-engine.ts:415` returns `{ result: null, error: "No output node is connected" }`. In `lib/execution-handler.ts`, the check at line 180 fires first:
```typescript
if (error) return fail({ error }, 500);   // ← catches "No output node is connected"
if (!result) return fail({ error: "No active path reached any output node" }, 400);  // never reached
```
The "no connected output" case sets both `error` and `result: null`, so the 500 branch wins. Fix: change `workflow-engine.ts:415` to return only `{ result: null }` (no `error` field) so the 400 branch at line 181 handles it — or handle this specific error in the execution handler with a 400 status.

### Screenshot
N/A

### Notes
Tests 1 and 2 (connected minimal workflow) pass cleanly. Only the disconnected-output path is broken.

---

## CONTRACT-VER-03 — Restore snapshots the version being restored instead of the current state

- **Status**: fixed
- **Fixed**: 2026-06-06 — In `app/api/workflows/[slug]/versions/route.ts` the POST restore now snapshots the workflow's current (pre-restore) `nodes`/`edges` instead of the version being restored. The `wf` lookup was widened to `SELECT id, nodes, edges` and the snapshot INSERT runs `wf.nodes, wf.edges`, so restoring is reversible via the versions list. Verified live: restoring a 3-node version onto a 2-node live workflow bumps the count by exactly 1 and the newest snapshot holds the pre-restore 2-node state (`['txt','out']`), not the restored 3-node state.
- **Severity**: medium
- **Date**: 2026-06-05

### What was observed
After `POST /api/workflows/[slug]/versions` restores a version, the newest entry in the versions list contains the nodes/edges from the restored version — not the pre-restore current state.

Test: current workflow had 3 nodes (txt, out, extra). Restored oldest version (2 nodes). After restore, the newest version entry had 2 nodes, not 3.

### Expected
The newest version after restore should contain the pre-restore state (3 nodes) so the restore itself is reversible.

### Root cause
`app/api/workflows/[slug]/versions/route.ts` line 67 inserts `version.nodes, version.edges` (the version being restored) instead of the current workflow's nodes/edges:
```typescript
// Snapshot the restored state before applying it  ← misleading comment
db.prepare(`INSERT INTO workflow_versions ...`).run(wf.id, version.nodes, version.edges);
```

Should be:
```typescript
const current = db.prepare(`SELECT nodes, edges FROM workflows WHERE id = ?`).get(wf.id);
db.prepare(`INSERT INTO workflow_versions ...`).run(wf.id, current.nodes, current.edges);
```

### Impact
Restoring a version cannot be undone via the History panel — the pre-restore state is never preserved. The count does increase by 1 (a snapshot IS created), but it duplicates the restored version instead of preserving the overwritten state.

---

## API-13 — ResponseBuilder with status 204 causes Next.js 500

- **Status**: fixed
- **Fixed**: 2026-06-05 — `app/api/v1/chat/route.ts` now sends a `null` body for Fetch "null body statuses" (101/103/204/205/304) instead of `""`/serialized, which previously threw `Response with null body status cannot have body` and surfaced as a generic 500. Verified live: a ResponseBuilder(204, no body) now returns HTTP 204 with an empty body and CORS headers. Added regression tests (`__tests__/api/chat-route.test.ts`) covering 204/304 (null body) and normal 200 object/string bodies.
- **Severity**: low
- **Date**: 2026-06-05

### What was observed
When a Response Builder node is configured with `status: 204` and no body edge connected, `POST /api/v1/chat` returns HTTP 500 with no body and no CORS headers (a raw Next.js internal error), instead of 204 with empty body.

All other Response Builder scenarios pass:
- ✓ status=201 + custom header + JSON body → 201, X-Custom-Header, auto Content-Type: application/json, CORS headers
- ✓ string body → Content-Type: text/plain; charset=utf-8 auto-detected
- ✓ explicit Content-Type header in RB overrides auto-detection
- ✓ no body edge with status=200 → 200 OK, empty response body, CORS headers present
- ✓ status=404 → HTTP 404 with CORS headers
- ✓ status=500 (custom) → HTTP 500 with CORS headers + custom headers (distinct from workflow-error 500)

### Expected (per spec step 12-13)
No-body ResponseBuilder → response body is empty `""`, no Content-Type auto-added.

### Root cause
`app/api/v1/chat/route.ts` constructs `new Response("", { status: 204, headers: {...} })`. The Fetch API spec designates 204 as a "null body status" — passing a non-null body (even `""`) throws `TypeError: Response with null body status cannot have body`. Next.js catches the unhandled TypeError and returns a generic 500.

### Steps to reproduce
```bash
# Set up a workflow with ResponseBuilder(status=204, no body edge) and call /api/v1/chat
# → HTTP 500 with no CORS headers, no body
```

### Fix
In `app/api/v1/chat/route.ts`, change:
```typescript
return new Response(isStringBody ? body : JSON.stringify(body), { status, ... })
```
to:
```typescript
return new Response((isStringBody && body) ? body : isStringBody ? null : JSON.stringify(body), { status, ... })
```
This passes `null` for empty-string bodies (which satisfies the null-body-status constraint) while still sending content when the body is a non-empty string.

---

## NODE-LOGIC-12b — Custom Code timeout not wrapped under "runtime error" prefix

- **Status**: fixed
- **Fixed**: 2026-06-06 — Reconciled toward 12b. `lib/nodes/custom-code.ts` now rethrows the synchronous vm timeout under the runtime-error prefix with the same message as the async path (`Custom Code runtime error: Custom Code timed out after 5 s`), collapsing the former three-way error taxonomy to two user-meaningful classes (compile/parse vs runtime). NODE-LOGIC-12's spec text was updated to agree (steps 14–15, Expected result, Notes), resolving the long-standing contradiction with 12b. A timeout is a runtime failure (the code parsed and ran), and a single prefix lets callers detect any timeout programmatically.
- **Severity**: high
- **Date**: 2026-06-06

### What was observed
Console silencing and the compile/parse-vs-runtime prefix distinction all behave correctly:
- `console.log/warn/error/info` → no-op, node returns `"done"`, no trace log lines
- `function( {` → `Custom Code compile/parse error: Function statements require a function name`
- `const x = {;` → `Custom Code compile/parse error: Unexpected token ';'`
- `throw new Error("deliberate error")` → `Custom Code runtime error: Error: deliberate error`
- `return null.property` → `Custom Code runtime error: TypeError: Cannot read properties of null (reading 'property')`
- `return undefined.x {` → `Custom Code compile/parse error: Unexpected token '{'` (parse checked before runtime)

However, the timeout case fails. Running `while(true) {}` returns (after ~5.1 s):
```
Error: Custom Code timed out (synchronous execution exceeded 5 s)
```
This is its **own** prefix — it is NOT wrapped under the `Custom Code runtime error:` prefix, and the message text differs from the expected `Custom Code timed out after 5 s`.

### Expected
Per spec steps 14–16 and the Expected result section: a `while(true){}` infinite loop should yield
`Custom Code runtime error: Custom Code timed out after 5 s` — the timeout wrapped under the runtime-error prefix, not a separate prefix.

### Failure indicator triggered
"Timeout produces its own prefix instead of being wrapped under 'runtime error'."

### Steps to reproduce
1. Build a workflow: Text node → Custom Code node → Output node.
2. Set the Custom Code body to `while(true) {}`.
3. POST to `/api/workflows/vKuroqe70F/debug` with `__nodes`/`__edges` overriding the node graph.
4. Observe the error string after ~5 s.

### Root cause
`lib/nodes/custom-code.ts:71-73`: `vm.Script`'s synchronous `{ timeout: 5000 }` fires for a synchronous infinite loop. That path is caught by `isScriptTimeoutError` and rethrown as `"Custom Code timed out (synchronous execution exceeded 5 s)"` — a distinct, unprefixed message. Only the *async* overrun path (`Promise.race` at lines 80-88) produces `Custom Code runtime error: Custom Code timed out after 5 s`. The spec's prescribed test (`while(true){}`) is synchronous, so it never reaches the wrapped path.

### Screenshot
N/A (API test)

### Notes
This may be an intentional refinement (synchronous vs async timeout distinction added after the spec was written), but as written the spec's expected behavior is not met: a caller relying on the `Custom Code runtime error:` prefix to detect timeouts will miss synchronous-loop timeouts. Either the spec should be updated to document the two distinct timeout messages, or the synchronous timeout should be re-wrapped under the runtime-error prefix for consistency.
