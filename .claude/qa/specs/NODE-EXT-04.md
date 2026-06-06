---
id: NODE-EXT-04
title: Vector Upsert node Supabase and Pinecone tabs, auto UUID for Pinecone
severity: medium
source_files:
  - components/canvas/nodes/VectorUpsertNode.tsx
  - lib/nodes/vector-upsert.ts
---

## What this tests
Verifies that the Vector Upsert node stores embeddings in Supabase pgvector or Pinecone, auto-generates a UUID for Pinecone when no `id` input is connected, and returns the stored record ID and a success boolean.

## Prerequisites
- App is running at http://localhost:3000
- A workflow with a Vector Upsert node exists on the canvas
- The Debug panel is accessible
- For live execution: a configured Supabase table or Pinecone index

## Steps — canvas configuration

1. Navigate to the canvas containing a Vector Upsert node
2. Observe the node header: title **Vector Upsert**, violet DatabaseZap icon; subtitle **Supabase pgvector**; provider tabs **PG** and **PC** in the top-right
3. Verify the **Inputs** section lists four input handles: **embedding** (`float[]`), **content** (`string`), **metadata** (`object`), **id** (`string`)
4. Verify the **Outputs** section lists two output handles: **id** and **success**
5. With **PG** (Supabase) selected, verify the following config fields:
   - **URL** (placeholder `$SUPABASE_URL`)
   - **Service key** (placeholder `$SUPABASE_SERVICE_KEY`)
   - **Table** (placeholder `documents`, default `documents`)
   - **Column mapping** — three inputs labeled **embed** (default `embedding`), **text** (default `content`), **meta** (default `metadata`)
   - **Upsert mode** checkbox — label "Upsert mode (on conflict update)", unchecked by default
6. Click the **PC** tab — subtitle updates to **Pinecone**; form changes to show:
   - **Index host** (placeholder `my-index-abc123.svc.pinecone.io`)
   - **API key** (placeholder `$PINECONE_KEY`)
   - **Namespace** — optional (placeholder `default`)
   - Note: "If `id` input is unconnected, a UUID is auto-generated per request."
7. Confirm the four input handles are present in both provider views, and that a **Timeout (s)** number input (min 1, max 120, default **15**) appears below the provider config in both views — shown in seconds but stored as `timeout` in milliseconds (default 15000). Enter `0` and confirm it clamps to the 1-second minimum

## Steps — execution (Pinecone, UUID auto-generation)

8. Switch to **PC**, configure a valid Pinecone host and API key; leave the `id` input disconnected
9. Connect a float array embedding and optional content/metadata
10. Open the Debug panel and run a test request
11. Expand the Vector Upsert trace: `id` output is a UUID string (format `xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx`), `success` output is `true`
12. Connect a text node with value `"my-custom-id"` to the `id` input and re-run — `id` output is now `"my-custom-id"` (not a UUID)

## Steps — execution (Supabase, upsert mode)

13. Switch to **PG**, configure URL, key, and table; enable **Upsert mode** checkbox
14. Run a test request twice with the same embedding — both should succeed; second upsert should not produce a duplicate-key error
15. Disable upsert mode and run again with a conflicting ID — expect a provider error (409 or similar)

## Steps — error cases

16. Disconnect the `embedding` input and run — expect error: **Vector Upsert has no embedding input connected**
17. Leave Pinecone host empty — expect error: **Vector Upsert (Pinecone): indexHost is not configured**
18. Leave Supabase URL empty — expect error: **Vector Upsert (Supabase): supabaseUrl is not configured**

## Expected result
- Four input handles always visible regardless of provider: embedding, content, metadata, id
- Supabase: inserts a row into the configured table using configurable column names; returns the `id` from the inserted row
- Pinecone: upserts to `/vectors/upsert`; if `id` input is disconnected, `crypto.randomUUID()` is used and returned as the `id` output
- `success` output: `true` on successful upsert, throws on failure (no silent failure)
- Upsert mode (Supabase): sends `Prefer: resolution=merge-duplicates,return=representation` header
- Configurable AbortController timeout applies to both providers via the **Timeout (s)** field (default 15 s, stored as `timeout` in ms); the executor sanitizes the value, falling back to 15000 ms for missing, zero, negative, or non-finite input

## Failure indicators
- `id` output is `undefined` after a successful Pinecone upsert with no `id` input connected (should be a UUID)
- `id` output is a UUID even when a custom `id` is connected
- Upsert mode checkbox has no effect (duplicate inserts still fail without it)
- Column mapping changes are not reflected in the Supabase row structure
- Four input handles not all visible

## Severity rationale
Silent ID generation failure would store orphaned vectors with unpredictable IDs, making retrieval impossible; misconfigured column mapping would silently store data in wrong columns.

## Source reference
`components/canvas/nodes/VectorUpsertNode.tsx` lines 29-39 (INPUT_ROWS and OUTPUT_ROWS), lines 233-243 (upsert checkbox), lines 296-298 (Pinecone auto-UUID hint text), the shared **Timeout (s)** number input below the provider config; `lib/nodes/vector-upsert.ts` (`timeout` destructured from node data with a 15000 default, sanitized into `safeTimeout` and passed to the AbortController `setTimeout`), line 134 (`crypto.randomUUID()` when `idVal` is undefined), lines 99-101 (Supabase upsert Prefer header), lines 166-172 (id/success output routing).

## Notes
Content is stored in Pinecone metadata under the key `"content"` (line 140). Metadata for Pinecone must be a plain object; string values are JSON-parsed, arrays and other non-objects are stored as an empty metadata object with content appended. The **Timeout (s)** field is shared across both providers and is shown in seconds while stored as milliseconds (`timeout`, default 15000); the UI clamps it to a 1-second minimum and the executor independently falls back to 15000 ms for any missing/zero/negative/non-finite value.
