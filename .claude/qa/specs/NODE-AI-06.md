---
id: NODE-AI-06
title: Complexity node heuristic-only outside 0.25–0.70 embedding band
severity: medium
source_files:
  - components/canvas/nodes/ComplexityNode.tsx
  - lib/nodes/complexity.ts
  - lib/complexity/heuristics.ts
  - lib/complexity/blender.ts
---

## What this tests
Verifies that the Complexity Score node uses heuristic scoring alone when the heuristic score falls outside [0.25, 0.70], and only calls the embedding API (blending heuristic 40% + embedding 60%) when the score is within that ambiguous band.

## Prerequisites
- App is running at http://localhost:3000
- A workflow with a Complexity Score node exists on the canvas

## Steps — canvas live preview

1. Navigate to the canvas containing a Complexity Score node
2. In the **Test Prompt** field, type a very short, simple phrase that produces a low heuristic score (e.g. `Hi` or `Yes`)
3. After the 300 ms debounce, observe:
   - The method indicator reads **(heuristic)** — no loading pulse occurs
   - The score is below 0.25 and the tier badge is **SIMPLE**
4. Clear the field and type a heavily technical, multi-part prompt known to score above 0.70 (e.g. paste several sentences containing words like "algorithm", "recursion", "concurrency", and a numbered list)
5. Observe: method indicator reads **(heuristic)**, no **scoring…** animation fires, score is above 0.70 and tier badge is **COMPLEX**
6. Now type a moderately complex prompt that should land in the 0.25–0.70 band (e.g. `Explain the trade-off between SQL and NoSQL databases`)
7. Observe: the header briefly shows **scoring…** in amber (embedding API call in flight), then the method indicator shows **(embedding)** once the call resolves; the final score reflects the blend

## Steps — execution path

8. Open the Debug panel and wire the Complexity Score `score` and `tier` output handles to the workflow's Output node
9. Send a test request with a simple one-word body (`{"message": "Hi"}`)
10. Expand the Complexity Score trace row — the output should be a low score (< 0.25); no embedding call latency should be visible in the trace timing
11. Send another request with the multi-part technical prompt from step 4
12. Expand the trace — score should be > 0.70 with heuristic-only latency (sub-millisecond)
13. Send a request with the moderate prompt from step 6
14. Expect slightly higher latency (embedding model call) and a blended score

## Expected result
- Heuristic score < 0.25 or > 0.70: method indicator is **(heuristic)**, no **scoring…** pulse, result is immediate
- Heuristic score in [0.25, 0.70]: method indicator is **(embedding)** after a brief **scoring…** animation; final score = `heuristic × 0.4 + embedding × 0.6` (rounded to 4 decimal places)
- Tier thresholds after blending: score < 0.45 → **simple**, 0.45 ≤ score < 0.70 → **medium**, score ≥ 0.70 → **complex**
- If the embedding API call fails, the node falls back to the heuristic score silently (method shows **(heuristic)**)

## Failure indicators
- **scoring…** animation fires for clearly simple or clearly complex prompts (indicates embedding called unnecessarily)
- Method indicator shows **(embedding)** for a score that is clearly outside the ambiguous band
- No **scoring…** animation for a prompt that lands squarely in the 0.25–0.70 band
- Score for a blended result is not close to `heuristic × 0.4 + embedding × 0.6`

## Severity rationale
Unnecessary embedding calls for simple/complex prompts add latency and cost; incorrect blending would produce wrong tier routing.

## Source reference
`components/canvas/nodes/ComplexityNode.tsx` line 84 (short-circuit: `h.score < 0.25 || h.score > 0.70`); `lib/nodes/complexity.ts` line 21 (executor guard: `h.score >= 0.25 && h.score <= 0.70`); `lib/complexity/blender.ts` lines 3-5 (`heuristic * 0.4 + embedding * 0.6`) and lines 7-11 (`scoreToTier` thresholds).

## Notes
The heuristic `tier` field in `HeuristicResult` uses different thresholds (< 0.25 = simple, > 0.70 = complex) than `scoreToTier` in the blender (< 0.45 = simple, < 0.70 = medium). The blender's `scoreToTier` is the authoritative function used for the final output; verify the tier badge matches the blender thresholds, not the heuristic thresholds.
