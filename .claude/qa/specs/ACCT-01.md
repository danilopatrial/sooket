---
id: ACCT-01
title: Account page loads with instance info
severity: medium
source_files:
  - app/(main)/account/page.tsx
---

## What this tests
Navigating to `/account` renders two cards: an Instance card (mode badge "Local", workflow count) and an API Keys & Provider Keys info card.

## Prerequisites
- App is running at http://localhost:3000
- Navigate to `http://localhost:3000/account`

## Steps
1. Navigate to `http://localhost:3000/account`
2. Observe the page heading and cards
3. Verify the Instance card shows Mode and Workflows fields
4. Verify the workflow count matches the actual number of workflows

## Expected result
- Page heading: "Account" (`text-2xl font-semibold`) with subtitle "Local instance"
- A `Card` component ("Instance") shows:
  - `CardTitle`: "Instance"
  - `CardDescription`: "Running locally — no user accounts (optional shared-secret gate)"
  - Row "Mode" → `Badge variant="secondary"` reading "Local"
  - Row "Workflows" → `Badge variant="secondary"` with the count of all workflows in the DB
  - If a management API key exists: row "API key" showing first 12 chars + `••••••••`
- A second `Card` ("API Keys & Provider Keys") explains where to find per-workflow keys

## Failure indicators
- The page shows a 404 or blank
- The workflow count is incorrect (doesn't match actual count)
- The "Local" badge is absent or shows wrong text
- The page crashes with an error

## Severity rationale
The Account page is the instance overview; if it fails to load, operators lose visibility into their local deployment state.

## Source reference
`app/(main)/account/page.tsx` lines 9–10 — queries `SELECT COUNT(*) as count FROM workflows` and `SELECT value FROM settings WHERE key = 'api_key'`. Lines 21–44 — Instance card with Mode "Local" badge, workflow count badge, optional masked API key. Lines 46–54 — second card describing API key location.
