---
id: NODE-INPUT-02
title: headers output handle returns request headers as an object
severity: high
source_files:
  - lib/nodes/workflow-input.ts
  - components/canvas/nodes/InputNode.tsx
---

## What this tests
The `headers` output handle of the `workflowInput` node returns all incoming request headers as a flat key-value object.

## Prerequisites
- App is running at http://localhost:3000
- Navigate to any workflow canvas at `/workflow/[slug]`
- Connect the `workflowInput` node's `headers` output handle to a downstream node (e.g. Output node)
- Open the Debug panel

## Steps
1. In the Debug panel Sandbox tab, add a custom header (e.g. `X-Custom-Header: test-value`) via the Headers KV editor
2. Click Run
3. Inspect the execution trace for the node connected to the `headers` handle

## Expected result
- The value received from the `headers` output is a plain JS object with lowercased header names as keys
- Example: `{"content-type": "application/json", "x-custom-header": "test-value"}`
- Standard request headers (Content-Type, etc.) are included
- Custom sandbox headers set via the Debug panel's KV editor are present

## Failure indicators
- The `headers` output is `null` or `undefined`
- The output is a Headers object (not a plain JS object)
- Custom headers added in the sandbox are missing from the output

## Severity rationale
Header access is required for Auth Validator nodes and any workflow that inspects tokens or custom request metadata.

## Source reference
`lib/nodes/workflow-input.ts` lines 6–9 — when `sourceHandle === "headers"`: iterates `ctx.reqHeaders.forEach((v, k) => { obj[k] = v; })` and returns the resulting plain object. `components/canvas/nodes/InputNode.tsx` line 11 — `{id: "headers", label: "headers", desc: "request headers"}`.
