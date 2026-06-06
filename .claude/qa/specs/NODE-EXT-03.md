---
id: NODE-EXT-03
title: Vector Search node Supabase and Pinecone tabs, top-K, configurable timeout
severity: medium
source_files:
  - components/canvas/nodes/VectorSearchNode.tsx
  - lib/nodes/vector-search.ts
---

## What this tests
Verifies that the Vector Search node exposes Supabase pgvector and Pinecone provider tabs with their respective config fields, enforces a configurable request timeout (default 15 seconds), and returns matched results and a count via its output handles.

## Prerequisites
- App is running at http://localhost:3000
- A workflow with a Vector Search node exists on the canvas
- The Debug panel is accessible
- For live execution: a configured Supabase or Pinecone instance with an existing index

## Steps — canvas configuration

1. Navigate to the canvas containing a Vector Search node
2. Observe the node header: title **Vector Search**, indigo Database icon; subtitle reads **Supabase pgvector**; provider tabs **PG** and **PC** in the top-right
3. With **PG** (Supabase) selected, verify the following fields appear:
   - **URL** (VarField, placeholder `$SUPABASE_URL`)
   - **Service key** (VarField, placeholder `$SUPABASE_SERVICE_KEY`)
   - **RPC function** (VarField, default value `match_documents`, hint: "must accept `query_embedding` + `match_count`")
   - **Top K results** (number input, min 1, max 100, default 5)
4. Click the **PC** tab — subtitle updates to **Pinecone** and the form changes to:
   - **Index host** (VarField, placeholder `my-index-abc123.svc.pinecone.io`, hint "found in your Pinecone dashboard")
   - **API key** (VarField, placeholder `$PINECONE_KEY`)
   - **Namespace** — optional (VarField, placeholder `default`)
   - **Top K results** (number input, min 1, max 10000, default 5)
5. Confirm the **Supabase Top K** range is 1–100 and **Pinecone Top K** range is 1–10000 (Pinecone allows a wider range)
6. Below the provider config (visible in **both** PG and PC tabs), confirm a **Timeout (s)** number input — min 1, max 120, default **15**. The value is shown in seconds but stored internally as milliseconds (`timeout`, default 15000). Enter `30` and confirm it is accepted; enter `0` and confirm it is clamped to the 1-second minimum
7. Confirm one left-side input handle: **Embedding input** (labeled `float[ ]`, indigo dot)
8. Confirm two right-side output handles in the **Outputs** section: **results** and **count**

## Steps — execution (Supabase)

9. Configure the Supabase tab with a valid URL, service key, and RPC function name; set Top K to `3`
10. Connect a float array (e.g. `[0.1, 0.2, 0.3, ...]`) to the `embedding` input handle
11. Open the Debug panel and run a test request
12. Expand the Vector Search trace: `results` output is an array of match objects (length ≤ 3), `count` output is the integer length of that array

## Steps — execution error cases

13. Disconnect the embedding input and run — expect error: **Vector Search has no embedding input connected**
14. Connect a non-array value (e.g. `"hello"`) — expect error about invalid embedding format
15. Connect an empty array `[]` — expect error: **Vector Search: embedding array is empty**
16. Leave Supabase URL empty and run — expect error: **Vector Search (Supabase): supabaseUrl is not configured**
17. To verify the timeout: set **Timeout (s)** to a small value (e.g. `2`), configure a URL that never responds, and run; after ~2 seconds the node should error/abort rather than hang. With the default 15 s, it aborts after ~15 seconds

## Expected result
- Provider tabs **PG** / **PC** switch between Supabase and Pinecone config forms; subtitle updates accordingly
- Supabase Top K: numeric input, min 1, max 100; Pinecone Top K: min 1, max 10000
- `embedding` input accepts: a JavaScript array of numbers, or a JSON-encoded string of a number array
- `results` output: array of match objects from the provider
- `count` output: integer equal to `results.length`
- Configurable AbortController timeout via the **Timeout (s)** field (default 15 s, stored as `timeout` in ms) — long-running requests are cancelled after the configured duration. The executor sanitizes the value, falling back to 15000 ms for missing, zero, negative, or non-finite input
- Missing required fields (URL, key, function name) throw descriptive errors before any HTTP request is made

## Failure indicators
- Supabase fields visible when Pinecone tab is selected (or vice versa)
- Top K field accepts values below 1 or above the respective maximum (100/10000)
- `count` output does not match the length of the `results` array
- Embedding input rejects a valid `[0.1, 0.2, 0.3]` array
- Node hangs indefinitely when the remote endpoint does not respond (timeout not enforced)
- Error messages do not identify which provider caused the failure

## Severity rationale
Misconfigured vector search silently returns empty results, degrading RAG-based workflow quality without any visible error.

## Source reference
`components/canvas/nodes/VectorSearchNode.tsx` lines 9 (VectorProvider type), lines 96-112 (PG/PC provider tabs), lines 177-187 (Supabase Top K, max 100), lines 240-250 (Pinecone Top K, max 10000); `lib/nodes/vector-search.ts` (`timeout` destructured from node data with a 15000 default, sanitized into `safeTimeout` and passed to the AbortController `setTimeout`), lines 52-78 (Supabase fetch to `/rest/v1/rpc/{func}`), lines 80-107 (Pinecone fetch to `https://{host}/query` with `includeMetadata: true`), lines 112-118 (results/count output routing).

## Notes
The Supabase RPC function must accept two parameters: `query_embedding` (float array) and `match_count` (integer). The Pinecone query always sets `includeMetadata: true` and `includeValues: false`. All credential fields support `$VAR_NAME` variable interpolation via `resolveVars`. The namespace field is omitted from the Pinecone query body if empty. The **Timeout (s)** field is shared across both providers and is shown in seconds while stored as milliseconds (`timeout`, default 15000); the UI clamps it to a 1-second minimum and the executor independently falls back to 15000 ms for any missing/zero/negative/non-finite value.
