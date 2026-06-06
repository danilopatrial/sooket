---
id: CFG-ACL-02
title: Add an IP entry to the access list
severity: medium
source_files:
  - components/workflow-config/AccessListTab.tsx
  - app/api/workflows/[slug]/access-list/route.ts
---

## What this tests
Selecting the "ip" rule type, entering an IPv4 or IPv6 address, and clicking "Add entry" creates a new IP-typed access list entry.

## Prerequisites
- App is running at http://localhost:3000
- Navigate to the workflow config Access List tab

## Steps
1. In the "Add Entry" form, click the "ip" tab in the rule type selector
2. Observe the placeholder changes to "192.168.1.1" and the hint reads "IPv4 or IPv6 address"
3. Enter a valid IP (e.g. `192.168.1.100`)
4. Optionally enter a label (e.g. "office")
5. Click "Add entry"
6. Observe the entries list

## Expected result
- Selecting "ip" type: input placeholder changes to "192.168.1.1"; hint text shows "IPv4 or IPv6 address"
- After successful add: toast `"192.168.1.100" added`; entry appears in the IP group with a violet `RuleTypeBadge`
- Entry row shows: the IP value in monospace, optional label in muted text, `Trash2` delete button
- "Add entry" button disabled while `adding` or when value input is empty

## Failure indicators
- The "ip" rule type button has no effect on the placeholder
- Adding an IP does not create an entry in the IP group
- The entry appears under the wrong group type (e.g. Value)
- Toast does not appear after adding

## Severity rationale
IP-based access lists are a common way to restrict API access to known sources; if IP entries cannot be added, the security feature is unusable.

## Source reference
`components/workflow-config/AccessListTab.tsx` lines 19 — IP type meta: `placeholder: "192.168.1.1"`, `hint: "IPv4 or IPv6 address"`, `color: "bg-violet-500/15 text-violet-400 border-violet-500/30"`. Lines 85–105 — `handleAdd()` POSTs `{value, label, rule_type: "ip"}`, toasts on success. Lines 216–243 — grouped display shows IP group first.
