---
id: CANVAS-12
title: Undo and redo work for node and edge changes
severity: high
source_files:
  - components/canvas/WorkflowCanvas.tsx
---

## What this tests
Ctrl+Z (or Cmd+Z on Mac) undoes the last canvas change; Ctrl+Shift+Z (or Cmd+Shift+Z) and Ctrl+Y redo it. Shortcuts are suppressed when an input or textarea is focused.

## Prerequisites
- App is running at http://localhost:3000
- Navigate to any workflow canvas at `/workflow/[slug]`
- Click on the canvas background (not an input field) to ensure canvas has focus

## Steps
1. Add a new node by clicking it in the sidebar
2. Press Ctrl+Z (Cmd+Z on Mac) — the node should disappear
3. Press Ctrl+Shift+Z (Cmd+Shift+Z on Mac) — the node should reappear
4. Press Ctrl+Y — the redo should apply again (or no-op if already at latest)
5. Delete an edge (select it, press Delete), then press Ctrl+Z — the edge should reappear
6. Click inside a text input field on a node, then press Ctrl+Z — verify it does NOT trigger canvas undo (browser text undo only)

## Expected result
- Ctrl+Z undoes the most recent node/edge change (restoring previous canvas snapshot)
- Ctrl+Shift+Z and Ctrl+Y both redo the undone change
- Undo/redo step through the in-memory history stack; each structural canvas change (add, delete, move, connect) is a separate snapshot
- When an `<input>`, `<textarea>`, or `contentEditable` element is focused, Ctrl+Z is not intercepted by canvas undo

## Failure indicators
- Ctrl+Z has no effect after adding or deleting a node/edge
- Ctrl+Shift+Z has no effect after undoing
- Undo triggers while typing in a node's input field (steals keypress from browser)
- Canvas crashes or shows a blank state after undo/redo

## Severity rationale
Undo/redo prevents irreversible mistakes on the canvas and is a fundamental editing expectation.

## Source reference
`components/canvas/WorkflowCanvas.tsx` lines 492–522 — `handleKeyDown` checks `e.ctrlKey || e.metaKey`; skips all shortcuts when `typing` (target is INPUT, TEXTAREA, or contentEditable); maps `Ctrl+Z` → `undo()`, `Ctrl+Shift+Z` → `redo()`, `Ctrl+Y` → `redo()`. Lines 328–342 — `undo()` decrements `historyIndexRef` and restores the snapshot via `setNodes`/`setEdges`; `redo()` increments it.
