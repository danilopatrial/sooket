---
id: CFG-KEY-09
title: Expired badge appears on keys past their expiry date
severity: medium
source_files:
  - components/workflow-config/ApiKeysTab.tsx
---

## What this tests
An API key whose `expires_at` timestamp is in the past renders an "EXPIRED" badge next to its label, and the expiry date in the metadata row is highlighted in destructive red.

## Prerequisites
- App is running at http://localhost:3000
- Navigate to the workflow config API Keys tab
- At least one API key exists with a past expiry date (create one with a datetime-local in the past, or manipulate the DB directly for testing)

## Steps
1. Locate a key row whose expiry date has passed
2. Observe the key label area
3. Observe the metadata row below the label

## Expected result
- An "EXPIRED" badge appears next to the key label: `px-1.5 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wider border bg-destructive/15 text-destructive border-destructive/30`
- The metadata row shows the expiry date in `text-destructive` color (red)
- Keys without an `expires_at` or with a future expiry show neither badge nor red date

## Failure indicators
- An expired key shows no "EXPIRED" badge
- The expiry date in the metadata row is not red for expired keys
- A key with a future expiry incorrectly shows the "EXPIRED" badge

## Severity rationale
Visual indication of expiry prevents users from debugging failed API calls caused by expired keys without realizing the key has expired.

## Source reference
`components/workflow-config/ApiKeysTab.tsx` lines 196–197 — `isExpired()`: `!!key.expires_at && new Date(key.expires_at) <= new Date()`. Lines 298–302 — `{isExpired(key) && <span className="...bg-destructive/15 text-destructive...">Expired</span>}`. Lines 353–357 — metadata row shows expiry date with `className={isExpired(key) ? "text-destructive" : ""}`.
