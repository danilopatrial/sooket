---
id: CFG-EXEC-06
title: Refresh button reloads the execution list
severity: low
source_files:
  - components/workflow-config/ExecutionsTab.tsx
---

## What this tests
Clicking the "Refresh" button in the Executions tab header re-fetches the current page of executions and shows a spinning `RefreshCw` icon while loading.

## Prerequisites
- App is running at http://localhost:3000
- Navigate to the workflow config Executions tab

## Steps
1. Note the current execution list (or trigger a new execution in another tab)
2. Click the "Refresh" button (`RefreshCw` icon) in the top-right of the "Execution History" section
3. Observe the icon during the fetch
4. Observe the list after the fetch completes

## Expected result
- While refreshing: `RefreshCw` icon has the `animate-spin` CSS class (visible rotation animation); button is disabled
- After refresh: the list updates with the latest executions at the current `offset`; newly completed executions appear if they ran since the last load
- The refresh re-fetches at the same page offset (does not reset to page 1)

## Failure indicators
- Clicking Refresh has no effect (list does not change)
- The `RefreshCw` icon does not spin during the fetch
- The button is not disabled while loading

## Severity rationale
The refresh button is the only way to see new executions without reloading the page; missing it forces a full page reload to check for new runs.

## Source reference
`components/workflow-config/ExecutionsTab.tsx` lines 168–176 — Refresh button: `onClick={() => load(offset)}` (re-fetches current page); `disabled={loading}`; `RefreshCw` with `className={loading ? "animate-spin" : ""}`.
