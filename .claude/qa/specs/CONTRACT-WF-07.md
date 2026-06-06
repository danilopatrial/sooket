---
id: CONTRACT-WF-07
title: PATCH is_active=true deactivates all other workflows
severity: critical
source_files:
  - app/api/workflows/[slug]/route.ts
---

## What this tests
PATCH /api/workflows/[slug] with `is_active: true` sets that workflow active and sets every other workflow's `is_active` to `0`.

## Prerequisites
- App is running at http://localhost:3000
- `curl` and `jq` available in the shell

## Steps
1. Create two workflows and capture their slugs:
   ```
   SLUG_A=$(curl -s -X POST http://localhost:3000/api/workflows | jq -r '.slug')
   SLUG_B=$(curl -s -X POST http://localhost:3000/api/workflows | jq -r '.slug')
   echo "A=$SLUG_A  B=$SLUG_B"
   ```
2. Activate workflow A:
   ```
   curl -s -X PATCH http://localhost:3000/api/workflows/$SLUG_A \
     -H "Content-Type: application/json" \
     -d '{"is_active": true}'
   ```
3. Confirm workflow A is active and workflow B is inactive:
   ```
   curl -s http://localhost:3000/api/workflows/$SLUG_A | jq '.isActive'
   curl -s http://localhost:3000/api/workflows/$SLUG_B | jq '.isActive'
   ```
4. Now activate workflow B:
   ```
   curl -s -X PATCH http://localhost:3000/api/workflows/$SLUG_B \
     -H "Content-Type: application/json" \
     -d '{"is_active": true}'
   ```
5. Confirm workflow B is now active and workflow A is now inactive:
   ```
   curl -s http://localhost:3000/api/workflows/$SLUG_B | jq '.isActive'
   curl -s http://localhost:3000/api/workflows/$SLUG_A | jq '.isActive'
   ```

## Expected result
- Step 2 returns HTTP 200 with body `{"ok":true}`.
- Step 3: `SLUG_A` → `true`, `SLUG_B` → `false`.
- Step 4 returns HTTP 200 with body `{"ok":true}`.
- Step 5: `SLUG_B` → `true`, `SLUG_A` → `false`.

## Failure indicators
- After step 4, both workflows return `isActive: true` — the deactivation sweep did not run.
- After step 4, workflow A still returns `isActive: true`.
- Any PATCH step returns a non-200 status.

## Severity rationale
Only one workflow can be the live API endpoint at a time; if the deactivation sweep fails, multiple workflows are active simultaneously and request routing is undefined.

## Source reference
`app/api/workflows/[slug]/route.ts` lines 79–86 — `if (body.is_active) { db.prepare('UPDATE workflows SET is_active = 0 WHERE slug != ?').run(slug); }` executed before the main UPDATE.

## Notes
Sending `is_active: false` does not trigger the deactivation sweep — it only sets the target workflow inactive.
