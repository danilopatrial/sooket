---
id: NODE-LOGIC-07
title: Language Detect node routes by ISO 639-3 code, optional default
severity: medium
source_files:
  - components/canvas/nodes/LanguageDetectNode.tsx
  - lib/nodes/language-detect.ts
---

## What this tests
Verifies that the Language Detect node detects the language of its input text using franc-min, routes the input through the matching language handle (or default), and always emits the detected ISO 639-3 code and confidence score on dedicated output handles.

## Prerequisites
- App is running at http://localhost:3000
- A workflow with a Language Detect node exists on the canvas
- The Debug panel is accessible

## Steps — canvas configuration

1. Navigate to the canvas containing a Language Detect node
2. Observe the node header: title **Language Detect**, sky Languages icon; subtitle reads **detect language** when no routes are defined
3. Confirm one left-side input handle: **input text** (sky dot)
4. Confirm always-present right-side output handles at the bottom: **lang** (violet dot) and **confidence** (amber dot)
5. Confirm the **Default fallback** toggle is **on by default** (unlike the Router node); a **default** handle (white/30 dot) is present
6. In the **Routes** section, click **Add language** — a row appears with a 3-character text input (placeholder `e.g. eng, spa`, maxLength 3) and a language name display area
7. Type `eng` — the display area shows **English** in cyan; header subtitle updates to **1 language + default**
8. Type `spa` in the code field of a second route — displays **Spanish**
9. Type `xyz` (unknown code) — display shows **unknown** in cyan
10. Leave one route code empty — display shows nothing
11. Input is automatically lowercased and trimmed (entering `ENG` normalizes to `eng`)
12. Click × on a route — the row and its output handle disappear
13. Toggle the **Default fallback** off — the `default` handle disappears; subtitle updates to **1 language** (no "+ default")

## Steps — execution

14. Configure routes for `eng` and `fra`; keep Default on
15. Connect an English text input (e.g. `"Hello, how are you today?"`) to `input`
16. Open the Debug panel and run
17. Expand the trace:
    - `lang` handle: `"eng"` (ISO 639-3 code for English)
    - `confidence` handle: a float between 0 and 1 (e.g. `0.857`)
    - `eng` route handle: passes the original input value through; `fra` and `default` are inactive
18. Change input to French text (`"Bonjour, comment allez-vous?"`); run:
    - `lang`: `"fra"`, `fra` handle passes through; `eng` and `default` inactive
19. Change input to text in a language not in the routes (e.g. Japanese: `"こんにちは"`); run:
    - `lang`: `"jpn"` (or similar), `confidence`: a float; `default` handle passes through (no route matched); route handles inactive
20. Change input to a very short ambiguous string (e.g. `"ok"`); run:
    - If `lang` is `"und"` (undetermined): `default` fires; route handles inactive

## Expected result
- `lang` output always returns the detected ISO 639-3 code string (e.g. `"eng"`, `"fra"`, `"und"`)
- `confidence` output always returns a float 0–1
- Matching route handle passes the original input value through; all other route handles are inactive
- No matching route + default enabled: `default` handle passes input through
- `"und"` (undetermined) never matches any route; always falls to default
- Default is **on** by default (unlike Router node)
- Language codes normalized to lowercase on input
- Known codes resolve to display names in the UI; unknown codes show "unknown"

## Failure indicators
- `lang` handle returns `undefined` instead of the detected code
- `confidence` handle is absent or always returns 0
- Both a route handle and the `default` handle fire simultaneously
- `"und"` triggers a route instead of the default
- Default toggle is off by default (should be on)
- Route code input accepts more than 3 characters
- Toggling default off does not remove the `default` handle

## Severity rationale
Incorrect language routing silently sends content to the wrong downstream model or pipeline; medium because the detection is probabilistic rather than deterministic.

## Source reference
`components/canvas/nodes/LanguageDetectNode.tsx` lines 9-35 (LANG_NAMES map), line 54 (`hasDefault ?? true` — default on), line 98 (lang normalized to lowercase/trim), lines 195-196 (ISO 639-3 column header), line 205 (maxLength 3); `lib/nodes/language-detect.ts` lines 4 (`francAll` from franc-min), lines 26-27 (detected code and confidence from top score), lines 30-31 (`lang`/`confidence` handles return immediately), lines 35-40 (route matching: `detected !== "und"` guard, then `default` fallback).

## Notes
The franc-min library (`francAll`) returns scores as an array of `[langCode, score]` tuples sorted by confidence. `scores[0]` is the best guess. `"und"` means the language could not be determined (too short or ambiguous text). The node always emits `lang` and `confidence` regardless of which route fires — they are informational outputs, not routing outputs.
