---
id: NODE-XFRM-08
title: PII Redact node built-in patterns, custom regex, replacement presets
severity: high
source_files:
  - components/canvas/nodes/PiiRedactNode.tsx
  - lib/nodes/pii-redact.ts
---

## What this tests
Verifies that the PII Redact node detects and replaces PII in its input using built-in recognizers, supports additional custom regex patterns with labels, and lets users choose a replacement string via preset buttons or a custom field.

## Prerequisites
- App is running at http://localhost:3000
- A workflow with a PII Redact node exists on the canvas
- The Debug panel is accessible

## Steps — canvas configuration

1. Navigate to the canvas containing a PII Redact node
2. Observe the node header: title **PII Redact**, rose ShieldCheck icon, subtitle **redact sensitive data, via RegEx**
3. Confirm one left-side input handle (`input`, rose) and one right-side output handle (`output`, rose)
4. In the **Replace With** section, verify three preset buttons: **\<type\>**, **[REDACTED]**, and **\*\*\***
5. Click **[REDACTED]** — the button highlights rose and the VarField below shows `[REDACTED]`
6. Click **\*\*\*** — button highlights, VarField shows `***`
7. Click **\<type\>** — VarField shows empty (this preset means: replace each entity with its detected type name, e.g. `<EMAIL>`)
8. Type a custom value in the VarField (e.g. `HIDDEN`) — none of the preset buttons highlights; custom value is used
9. Click a preset to restore a preset value — VarField updates to the preset value
10. In the **Custom Patterns** section, click **Add pattern** — a row appears with a **label** input (placeholder `e.g. PHONE`, uppercase enforced) and a **regex** input (placeholder `\d{3}-\d{4}`), plus an × remove button
11. Enter label `PHONE` and regex `\d{3}-\d{4}`; click **Add pattern** again for a second row; click × to remove it

## Steps — execution (built-in PII detection)

12. Set replacement to **[REDACTED]**; connect an input containing an email address: `"Contact me at alice@example.com for details"`
13. Open the Debug panel and run — `output` should have the email replaced: `"Contact me at [REDACTED] for details"` (or similar depending on built-in recognizer)
14. Try input containing a phone number, credit card, or other common PII patterns — built-in recognizers handle these
15. Set replacement to **\*\*\*** and run — `output` uses `***` as replacement
16. Set replacement to **\<type\>** (empty) and run — each PII entity is replaced with its type label (e.g. `<EMAIL_ADDRESS>`)

## Steps — execution (custom patterns)

17. Add a custom pattern: label `ORDER`, regex `ORD-\d{6}`; set replacement `[REDACTED]`
18. Connect input `"Your order ORD-123456 is ready"` and run — `output` = `"Your order [REDACTED] is ready"`
19. Add a second custom pattern with an empty label or empty regex — verify it is silently skipped (only patterns with both label and regex are applied)
20. Add a pattern with an invalid regex — verify behavior (either silently skipped or throws per `PatternRecognizer` implementation)

## Steps — disconnected input

21. Disconnect the input handle and run — `output` = `""` (empty string; no error thrown, empty text processed)

## Expected result
- Three replacement presets: `<type>` (empty replacement → entity type label used), `[REDACTED]`, `***`; selecting a preset updates the VarField
- Custom VarField value overrides preset selection
- Built-in recognizers detect common PII types (email, phone, credit card, etc.) and replace them
- Custom patterns: each valid row (both label and regex non-empty) adds a recognizer with confidence score 0.85
- Custom patterns with empty label or empty regex are silently skipped
- Disconnected input: returns empty string, no error
- Output is the redacted string with all detected PII replaced

## Failure indicators
- Preset buttons do not highlight when clicked
- Clicking a preset does not update the VarField
- Email addresses in input are not redacted (built-in recognizers not working)
- Custom pattern with valid label and regex has no effect on the output
- Empty replacement (`<type>`) causes a crash instead of using entity type labels
- Disconnected input throws instead of returning empty string

## Severity rationale
PII leaking through an unredacted response is a compliance/privacy violation; a broken redaction node would silently pass sensitive data to users or downstream systems.

## Source reference
`components/canvas/nodes/PiiRedactNode.tsx` lines 22-26 (PRESETS: `<type>` = `""`, `[REDACTED]`, `***`), lines 82-105 (preset button grid + VarField synchronized), lines 124-151 (custom patterns with label/regex rows); `lib/nodes/pii-redact.ts` lines 19 (`createDefaultRecognizers()`), lines 21-29 (custom patterns as `InlineRecognizer` with score 0.85; skips if label or regex empty), line 33 (`replacement || undefined` — empty string passes `undefined` to use entity type label).

## Notes
The built-in PII recognizers come from `lib/pii/` (a pre-built library; types in `.d.ts`). The exact entity types detected (email, phone, SSN, credit card, etc.) depend on the `createDefaultRecognizers()` implementation. Custom patterns are applied in addition to built-in recognizers, not instead of them. The `<type>` preset stores an empty string; the executor converts it to `undefined` via `replacement || undefined`, signaling the PII library to use its default type-name replacement.
