---
id: CFG-KEY-03
title: Set expiry date when creating an API key
severity: medium
source_files:
  - components/workflow-config/ApiKeysTab.tsx
  - app/api/workflows/[slug]/api-keys/route.ts
---

## What this tests
The "Create New Key" form includes an optional "Expires" datetime-local input; when set, the expiry is converted to ISO 8601 and sent with the POST request, resulting in a key that becomes invalid after that date.

## Prerequisites
- App is running at http://localhost:3000
- Navigate to the workflow config API Keys tab

## Steps
1. In the "Create New Key" form, enter a label (e.g. "temp-key")
2. Click the "Expires (optional)" datetime-local input
3. Select a date and time in the future (e.g. one day from now)
4. Click "Create key"
5. Observe the created key in the list — verify an expiry date is shown
6. Repeat with a past date — verify the key shows an "Expired" badge immediately

## Expected result
- The "Expires (optional)" field accepts a datetime via the browser's native `datetime-local` picker; `min` is set to the current time (past dates cannot be selected through the picker UI)
- When provided: the POST body includes `expires_at` as an ISO 8601 string (`new Date(expiresAt).toISOString()`)
- The created key row displays the expiry information
- A key whose `expires_at` has passed shows an "Expired" badge (via `isExpired()` check: `new Date(key.expires_at) <= new Date()`)
- After creation, the "Expires" field is cleared

## Failure indicators
- The "Expires" field is absent from the creation form
- Setting an expiry date does not result in `expires_at` being stored (key shows no expiry)
- A key with a past expiry date does not show an "Expired" badge

## Severity rationale
Expiry dates allow time-limited API access (e.g. trial periods, partner integrations); misconfigured expiry could leave keys valid longer than intended.

## Source reference
`components/workflow-config/ApiKeysTab.tsx` lines 113 — `expiresAt` state; line 238–246 — `datetime-local` input with `min` set to current time; line 142 — `if (expiresAt) body.expires_at = new Date(expiresAt).toISOString()`. Lines 196–197 — `isExpired()` checks `expires_at <= new Date()`.
