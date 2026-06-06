---
id: NODE-FMT-06
title: DateTime node Now mode current timestamp and Format mode
severity: medium
source_files:
  - components/canvas/nodes/DateTimeNode.tsx
  - lib/nodes/datetime.ts
---

## What this tests
Verifies that the Date/Time node emits the current timestamp in Now mode (no input required), formats an input timestamp in Format mode, and respects the ISO/unix/locale format presets as well as the custom format field.

## Prerequisites
- App is running at http://localhost:3000
- A workflow with a Date/Time node exists on the canvas
- The Debug panel is accessible

## Steps — canvas configuration

1. Navigate to the canvas containing a Date/Time node
2. Observe the node header: title **Date / Time**, violet Clock icon; subtitle reads **current timestamp** (Now mode default)
3. Confirm **no left-side input handle** in Now mode, and one right-side output handle (violet dot)
4. In the **Mode** section, verify two buttons: **now** (violet when selected, sublabel "current time") and **format** (sublabel "parse a date")
5. Click **format** — header subtitle updates to **formats a date value**; a left-side input handle appears
6. Click **now** — input handle disappears again
7. In the **Format** section, verify three preset buttons: **ISO**, **unix**, **locale**
8. Each preset shows a hint example below the format VarField:
   - ISO selected: hint `2025-01-15T12:00:00Z`
   - unix selected: hint `1736942400`
   - locale selected: hint `1/15/2025, 12:00 PM`
9. The VarField below the presets reflects the current format string; clicking a preset button updates it; the field can also be edited directly
10. Type a custom value (e.g. `custom-fmt`) in the VarField — the hint below reads **custom format string**

## Steps — execution (Now mode)

11. Set mode to **now**, format to **ISO**
12. Open the Debug panel and send a test request
13. Expand the Date/Time trace — output is an ISO 8601 string (e.g. `"2025-01-15T12:34:56.789Z"`)
14. Switch format to **unix** and re-run — output is an integer (Unix epoch seconds, e.g. `1736942096`)
15. Switch format to **locale** and re-run — output is a locale-formatted string (e.g. `"1/15/2025, 12:34:56 PM"`)
16. Enter a custom format string (not ISO/unix/locale) and re-run — output falls back to ISO 8601 format

## Steps — execution (Format mode)

17. Set mode to **format**, format to **ISO**
18. Connect a text node with value `"2025-06-15T09:00:00Z"` to the input handle
19. Run — output is `"2025-06-15T09:00:00.000Z"` (re-serialized ISO string of the parsed date)
20. Switch format to **unix** — output is the Unix epoch integer for that date
21. Switch format to **locale** — output is the locale-formatted string for that date
22. Connect an input with an invalid date string (e.g. `"not-a-date"`) — `new Date("not-a-date")` is `Invalid Date`; output will be `"Invalid Date"` (ISO format) or `NaN` (unix)
23. In format mode, disconnect the input handle — expect error: **Date/Time node in format mode has no input connected**

## Expected result
- Now mode: no input handle; output is the current timestamp in the configured format
- Format mode: input handle appears; output is the input date parsed and reformatted
- ISO format: `date.toISOString()` — ISO 8601 string with milliseconds and Z suffix
- unix format: `Math.floor(date.getTime() / 1000)` — integer Unix epoch seconds (no milliseconds)
- locale format: `date.toLocaleString()` — locale-dependent string
- Custom format string: falls back to ISO (no custom format parsing implemented)
- Input handle is present **only** in format mode

## Failure indicators
- Input handle visible in Now mode
- Input handle absent in Format mode
- Header subtitle does not update when mode changes
- Unix output includes milliseconds (should be integer seconds, not milliseconds)
- Format preset hint text does not update when a different preset is clicked
- Now mode output changes when re-run in the same debug session (it should advance — it's live `new Date()`)
- Format mode disconnected input does not throw the expected error

## Severity rationale
Incorrect timestamp formatting causes downstream date-parsing failures; medium because errors are usually obvious (invalid date strings) rather than subtly wrong values.

## Source reference
`components/canvas/nodes/DateTimeNode.tsx` lines 19-23 (FORMAT_PRESETS with hint examples), lines 41-43 (input handle conditional on format mode), lines 53-55 (subtitle by mode), lines 119-121 (hint text below VarField); `lib/nodes/datetime.ts` lines 9-16 (mode branch: now = `new Date()`, format = `new Date(input)`), lines 18-23 (format switch: ISO/unix/locale with ISO fallback for custom strings).

## Notes
The executor does not validate whether the input date string is valid — `new Date("invalid")` produces an `Invalid Date` object, and subsequent formatting will produce `"Invalid Date"` or `NaN` without throwing. Custom format strings beyond the three presets fall back to ISO silently — there is no custom date format syntax supported.
