---
id: NODE-LOGIC-09
title: Semantic Cache node embedding deduplication and similarity threshold
severity: high
source_files:
  - components/canvas/nodes/SemanticCacheNode.tsx
  - lib/nodes/semantic-cache.ts
---

## What this tests
Verifies that the Semantic Cache node embeds the key text and compares it against stored embeddings using cosine similarity, returns a cached value when similarity meets the threshold, and provides a configurable similarity threshold slider.

## Prerequisites
- App is running at http://localhost:3000
- A workflow with a Semantic Cache node exists on the canvas
- The Debug panel is accessible

## Steps — canvas configuration

1. Navigate to the canvas containing a Semantic Cache node
2. Observe the node header: title **Semantic Cache**, violet BrainCircuit icon; subtitle shows formatted TTL (default: **1h TTL**)
3. Verify two left-side input handles: **key** (violet, type "text") and **value** (violet, type "lazy")
4. Verify two right-side output handles: **output** (violet, type "value") and **hit** (amber, type "bool")
5. In the **TTL (seconds)** field, verify default `3600`; test the same formatted display as the Cache node (≥3600 → hours, ≥60 → minutes, <60 → seconds)
6. Locate the **Similarity threshold** slider: range 0–1, step 0.01, default `0.85`; the label reads **Similarity threshold — 0.85**
7. Drag the slider to `0.50` — label updates to **Similarity threshold — 0.50**; end labels show **loose** (left) and **strict** (right)
8. Drag to `1.00` (strict) — only exact embedding matches will hit; drag to `0.00` (loose) — any entry hits
9. Reset to `0.85`

## Steps — execution (semantic hit)

10. Connect a text node `"What is the capital of France?"` to the `key` handle; connect a value-producing node to `value`
11. Open the Debug panel and send a first request — `hit` = `false` (miss); the value node executes and the result is stored with its embedding
12. Send a second request with the semantically similar key `"What's the capital city of France?"` — `hit` = `true` (the embedding similarity exceeds the 0.85 threshold); the `value` upstream node does NOT execute
13. Send a request with a semantically different key `"What is the weather today?"` — `hit` = `false`; value node executes and result stored

## Steps — threshold sensitivity

14. Lower threshold to `0.50` and send a vaguely related query — it may now hit a cached entry that would not have matched at 0.85
15. Set threshold to `0.99` (very strict) and send the same near-duplicate query — may now miss if similarity falls just below 0.99

## Steps — error cases

16. Disconnect the `key` handle and run — expect error: **Semantic Cache node has no key input connected**
17. Disconnect the `value` handle (keep key connected) — expect error: **Semantic Cache node has no value input connected**

## Expected result
- Slider range 0–1, step 0.01, default 0.85; label shows current value to 2 decimal places
- End labels: "loose" (0) and "strict" (1)
- Key must be text — it is embedded using `Xenova/all-MiniLM-L6-v2` (server-side)
- Hit condition: `cosineSimilarity(queryEmbedding, storedEmbedding) >= threshold`
- Cache hit: value input lazy-evaluated (skipped); `hit` = `true`; returns best-matching cached value
- Cache miss: value input evaluated; embedding + value stored with TTL; `hit` = `false`
- Expired entries evicted asynchronously (non-blocking) on miss
- Threshold clamped to [0, 1] at execution time

## Failure indicators
- Slider does not update the label in real time
- Threshold changes have no effect on hit/miss behavior
- Value input executes on a semantic cache hit
- Semantically identical queries never produce a hit at threshold 0.85
- `hit` output is not boolean (must be `true` or `false`)
- End labels "loose"/"strict" are absent from the slider

## Severity rationale
Semantic caching is used to avoid expensive LLM calls for similar queries; a broken threshold means every similar query re-invokes the LLM, directly increasing cost.

## Source reference
`components/canvas/nodes/SemanticCacheNode.tsx` lines 130-150 (similarity threshold slider with label, loose/strict end labels); `lib/nodes/semantic-cache.ts` lines 6-15 (`cosineSimilarity` function), lines 32-33 (`embedText` call for query), lines 40-50 (cosine similarity loop finding best match), lines 52-58 (hit path when `bestScore >= safeThreshold`), lines 60-81 (miss path: evaluate value, store embedding).

## Notes
The embedding model is `Xenova/all-MiniLM-L6-v2` (loaded server-side via `lib/complexity/embedder.ts`). The key input type hint is "text" — non-string values are coerced with `toText()` before embedding. Expired entries are evicted using `setImmediate` (asynchronous, non-blocking) so the miss response is not delayed by cleanup. The semantic cache uses a separate SQLite table (`semantic_cache`) from the regular cache (`node_cache`).

**Threshold default & typical values:** the default similarity threshold is `0.85`
(set in `registry.ts` `defaultData`, with matching fallbacks in `semantic-cache.ts`
and `SemanticCacheNode.tsx`). 0.85 is the conventional practical cutoff for
near-duplicate detection — semantically equivalent questions phrased differently
("What's the weather?" vs "How's the weather today?") typically score 0.85–0.90, so a
tighter default would miss them. Typical useful values fall in the **0.80–0.95** range:
lower (≈0.80) catches looser paraphrases at the risk of false hits; higher (≈0.95)
demands near-exact wording. Values above ~0.95 behave almost like an exact-match cache.
