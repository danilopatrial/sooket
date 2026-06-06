---
id: SEC-09
title: No encryption secrets or provider keys in client-side JS bundles
severity: critical
source_files:
  - next.config.ts
---

## What this tests
Verifies that `ENCRYPTION_SECRET` and any provider API keys are not embedded in the Next.js client-side JavaScript bundles served to browsers — these values must remain server-only.

## Prerequisites
- A production build is available: `npm run build` has been run
- OR the development server is running and browser DevTools are accessible

## Steps — build and inspect bundles

1. Run a production build:
   ```bash
   npm run build
   ```
2. List the generated client bundles:
   ```bash
   find .next/static/chunks -name "*.js" | head -20
   ```
3. Search for the encryption secret value in all client bundles:
   ```bash
   grep -r "$ENCRYPTION_SECRET_VALUE" .next/static/
   ```
   Replace `$ENCRYPTION_SECRET_VALUE` with the actual value from your `.env.local`
4. Verify: no matches found

## Steps — check for NEXT_PUBLIC exposure

5. Verify `next.config.ts` does NOT have a `env:` block exposing `ENCRYPTION_SECRET` or any provider key
6. Verify no source file uses `NEXT_PUBLIC_ENCRYPTION_SECRET` or `NEXT_PUBLIC_*` for any sensitive variable
7. Search across the codebase:
   ```bash
   grep -r "NEXT_PUBLIC_ENCRYPTION" /home/apollo/Sooket/app/ /home/apollo/Sooket/lib/
   ```
   Expected: no matches

## Steps — verify server-only imports

8. Confirm `lib/crypto.ts` and all provider key access use `server-only` guard or are only imported in server-side code (API routes, lib files — not in `"use client"` components)
9. Check `next.config.ts` `serverExternalPackages` — `node:sqlite` is listed, preventing SQLite from being bundled client-side

## Steps — browser network inspection

10. Open the app in a browser; open DevTools → Network tab
11. Filter by JS files; download each chunk and search for any known API key values
12. Verify no chunk contains: the ENCRYPTION_SECRET, any `sk-ant-*` Anthropic key, any provider key from the database

## Expected result
- `ENCRYPTION_SECRET` not present in any `.next/static/` file
- No `NEXT_PUBLIC_*` variables exist for sensitive values
- `next.config.ts` has no `env:` block exposing server-only secrets
- `serverExternalPackages` includes `node:sqlite` (prevents DB library from being bundled client-side)

## Failure indicators
- Any encryption secret or API key value appears in `.next/static/chunks/` JavaScript files
- A `NEXT_PUBLIC_ENCRYPTION_SECRET` variable is defined anywhere
- `node:sqlite` is not in `serverExternalPackages` (could cause DB code to be bundled for client)

## Severity rationale
Client-side bundle exposure of secrets would make them readable by any user who opens browser DevTools, completely bypassing all access controls.

## Source reference
`next.config.ts` lines 3-11 (`serverExternalPackages: ["@huggingface/transformers", "onnxruntime-node", "node:sqlite"]` — server-only packages; no `env:` block; no `NEXT_PUBLIC_*` secrets).

## Notes
Next.js automatically makes environment variables without the `NEXT_PUBLIC_` prefix server-only. The risk is accidental exposure via `NEXT_PUBLIC_` prefix, `next.config.ts` `env:` block, or importing a server-side module in a `"use client"` component. The `serverExternalPackages` config prevents large server-only packages from being included in client bundles.
