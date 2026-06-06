---
id: NODE-FMT-03
title: XML↔JSON node both directions, root element field, pretty print toggle
severity: medium
source_files:
  - components/canvas/nodes/XmlJsonNode.tsx
  - lib/nodes/xml-json.ts
---

## What this tests
Verifies that the XML↔JSON node converts in both directions (XML→JSON and JSON→XML), shows the Root Element field only in json-to-xml mode, and respects the Pretty Print toggle.

## Prerequisites
- App is running at http://localhost:3000
- A workflow with an XML↔JSON node exists on the canvas
- The Debug panel is accessible

## Steps — canvas configuration

1. Navigate to the canvas containing an XML↔JSON node
2. Observe the node header: title **XML ↔ JSON**, orange FileCode2 icon; subtitle shows **xml - json** in monospace (default direction)
3. Confirm one left-side input handle and one right-side output handle (both orange dots, fixed at the top — no dynamic handles)
4. In the **Direction** section, verify two full-width option buttons:
   - **XML - JSON** with sublabel "parse XML, emit JSON" (selected by default, orange highlight)
   - **JSON - XML** with sublabel "serialize JSON to XML"
5. Confirm the **Root Element** field is **absent** while xml-to-json is selected
6. Click **JSON - XML** — the header subtitle updates to **json - xml**; a **Root Element** text input appears with placeholder `root` and default value `root`
7. Change Root Element to `data`
8. Click **XML - JSON** — Root Element field disappears again
9. Locate the **Pretty Print** toggle — a small pill-shaped toggle switch; default is off (gray); click it — it turns orange; click again — it turns gray

## Steps — execution (xml-to-json)

10. Set direction to **XML - JSON**, Pretty Print off
11. Connect an XML string input: `<user><id>1</id><name>Alice</name></user>`
12. Open the Debug panel and send a test request
13. Expand the trace — output is a JSON object (or compact JSON string if Pretty Print is off) representing the XML structure
14. Enable Pretty Print and re-run — output is a formatted/indented JSON string

## Steps — execution (json-to-xml)

15. Set direction to **JSON - XML**, Root Element `data`, Pretty Print off
16. Connect a JSON object input: `{"id": 1, "name": "Alice"}`
17. Run — output is an XML string with `<data>` as the root element wrapping the properties
18. Enable Pretty Print — output is indented XML
19. Change Root Element to `person` and re-run — root element in the output changes to `<person>`

## Steps — error case

20. Disconnect the input handle and run — expect error: **XML↔JSON node has no input connected**

## Expected result
- Default direction: xml-to-json; header subtitle reflects current direction in monospace
- Root Element field: present only in json-to-xml mode, default value `root`
- Pretty Print toggle: off by default; when enabled, output is formatted/indented
- xml-to-json: accepts XML string input, emits JSON object or string
- json-to-xml: accepts JSON object or string, emits XML string with the configured root element
- Both directions pass the prettyPrint flag to the underlying conversion utility

## Failure indicators
- Root Element field visible when xml-to-json is selected
- Root Element field absent when json-to-xml is selected
- Header subtitle does not update when direction changes
- Pretty Print toggle has no effect on output formatting
- Root Element value is not reflected in the json-to-xml output (always uses "root")
- Disconnected input causes unhandled exception instead of the expected error message

## Severity rationale
Wrong direction or root element silently produces malformed output consumed by downstream nodes; medium because this node is typically used in specialized workflows rather than core paths.

## Source reference
`components/canvas/nodes/XmlJsonNode.tsx` lines 19-22 (DIRECTIONS array with labels/sublabels), lines 51-53 (header subtitle), lines 80-91 (conditional Root Element field for json-to-xml), lines 93-110 (Pretty Print toggle); `lib/nodes/xml-json.ts` lines 20-23 (direction branch calling `xmlToJson` or `jsonToXml` with prettyPrint).

## Notes
The actual conversion logic lives in `lib/xml-json.ts` (`xmlToJson` and `jsonToXml`). The node component itself does no conversion — it only configures parameters. If the input to json-to-xml is a string, `r.value` is passed directly; the conversion utility handles string vs object input.
