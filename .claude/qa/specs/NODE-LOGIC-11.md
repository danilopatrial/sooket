---
id: NODE-LOGIC-11
title: Content Guardrail node pattern matching, LLM check, block/flag modes
severity: critical
source_files:
  - components/canvas/nodes/ContentGuardrailNode.tsx
  - lib/nodes/content-guardrail.ts
---

## What this tests
Verifies that the Content Guardrail node checks input text against configured keyword patterns (case-insensitive), optionally runs an LLM check via Haiku, routes violations to the `flagged` handle, and either blocks or passes through content depending on the configured action.

## Prerequisites
- App is running at http://localhost:3000
- A workflow with a Content Guardrail node exists on the canvas
- The Debug panel is accessible
- For LLM check tests: an Anthropic provider key is configured

## Steps — canvas configuration

1. Navigate to the canvas containing a Content Guardrail node
2. Observe the node header: title **Content Guardrail**, rose ShieldAlert icon; subtitle shows **0 patterns · block** (defaults)
3. Verify one left-side input handle: **input** (rose, "string")
4. Verify two right-side output handles: **output** (rose, "string") and **flagged** (amber, "reason")
5. In **On Violation**, verify two options: **Block output** (default) and **Flag and pass through**
6. In the **Patterns** section, click **add** — a text input row appears (placeholder `word, phrase, another`) with an × button
7. Enter `badword, toxic content` in the pattern field — this is one pattern row with two comma-separated terms
8. Header subtitle updates to **1 patterns · block** (1 pattern row)
9. Click **add** again; enter `harmful`; subtitle shows **2 patterns · block**
10. Click × on a pattern row — it disappears
11. Locate the **LLM Check** toggle (off by default, rose toggle): click it — a **Rules for LLM** textarea appears with an expand button and hint "Uses workflow's Anthropic key · Haiku model"
12. Enter rules (e.g. `- No competitor mentions\n- Professional tone only`)
13. Header subtitle updates to **1 patterns · LLM · block**
14. Click the expand (Maximize2) button — a TextExpandModal opens for fullscreen editing; close it

## Steps — execution (pattern match, block mode)

15. Set action to **Block output**; add pattern `forbidden`; connect text input `"This contains forbidden content"`
16. Open Debug panel and run; expand trace:
    - `output` = `active: false`
    - `flagged` = `'Pattern match: "forbidden"'`
17. Connect input `"Clean safe content"` and run:
    - `output` = `"Clean safe content"`
    - `flagged` = `active: false`

## Steps — execution (flag and pass mode)

18. Switch action to **Flag and pass through**
19. Connect input `"This contains forbidden content"` and run:
    - `output` = `"This contains forbidden content"` (passes through)
    - `flagged` = `'Pattern match: "forbidden"'` (reason string)
20. Clean input: `output` = input value; `flagged` = `active: false`

## Steps — execution (comma-separated terms)

21. Set pattern to `cat, dog, bird` in one row; connect input `"I have a dog"` — `flagged` fires with `'Pattern match: "dog"'`; matching is case-insensitive

## Steps — execution (LLM check)

22. Enable LLM Check; add rules `- No mentions of competitors`; clear all patterns
23. Connect input mentioning a competitor brand; run — LLM checks the text; if violation detected, `flagged` = `'LLM: {reason}'`
24. Disconnect Anthropic key; run — expect error: **Content Guardrail (LLM mode): no Anthropic API key configured**
25. Configure LLM check but trigger a network error to the Anthropic API — node should **fail open**: content passes through (no violation flagged)

## Expected result
- Pattern rows: comma-separated terms, each matched case-insensitively as an escaped regex against the full input
- First matching pattern/term triggers violation; subsequent patterns not checked
- Block mode: `output` = inactive on violation; `flagged` = violation message
- Flag mode: `output` = original value on violation; `flagged` = violation message
- LLM check: only runs when no pattern violation, useLlm=true, and llmRules non-empty
- LLM uses `claude-haiku-4-5-20251001`, max_tokens 128
- LLM network errors and unparseable JSON responses: fail open (content passes, no violation)
- No violation: `output` = original value; `flagged` = `active: false`

## Failure indicators
- Pattern match is case-sensitive (should be case-insensitive)
- `output` fires and `flagged` is inactive on a pattern match in block mode
- `flagged` is `active: false` in flag mode (should return the violation reason)
- LLM check runs even when a pattern already matched (should short-circuit)
- LLM network failure causes an unhandled exception instead of failing open
- Removing a pattern row does not update the subtitle

## Severity rationale
A content guardrail that fails to block violations allows harmful, policy-violating, or sensitive content to reach downstream nodes and be returned to users — this is critical.

## Source reference
`components/canvas/nodes/ContentGuardrailNode.tsx` lines 96-98 (subtitle: pattern count + LLM flag + action), lines 134-170 (patterns section with add/remove), lines 173-228 (LLM Check toggle and rules textarea with expand); `lib/nodes/content-guardrail.ts` lines 30-47 (pattern matching loop: comma-split, escaped regex, case-insensitive), lines 52-98 (LLM check: only on no-violation, fails open on error), lines 104-113 (violation routing by action), lines 106-108 (block vs flag-and-pass).

## Notes
Pattern terms are escaped as literal strings (`\$&` escaping) before being used as regex — special regex characters in pattern terms are treated literally, not as regex syntax. The LLM check is skipped entirely when `llmRules` is empty (even if `useLlm` is true), preventing unnecessary API calls.
