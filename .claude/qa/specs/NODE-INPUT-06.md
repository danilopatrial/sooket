---
id: NODE-INPUT-06
title: ip output handle returns client IP from request context
severity: low
source_files:
  - lib/nodes/workflow-input.ts
  - components/canvas/nodes/InputNode.tsx
  - app/api/v1/chat/route.ts
---

## What this tests
The `ip` output handle of the `workflowInput` node returns the client's IP address, extracted from `x-forwarded-for` or `x-real-ip` request headers.

## Prerequisites
- App is running at http://localhost:3000
- Navigate to any workflow canvas at `/workflow/[slug]`
- Connect the `workflowInput` node's `ip` output handle to a downstream node

## Steps
1. Make a request to the workflow via `POST /api/v1/chat` from a known IP (or use the debug panel, which originates from localhost)
2. Inspect the output of the node receiving the `ip` handle

## Expected result
- For debug panel requests (localhost): the IP value may be `null` or `"127.0.0.1"` depending on proxy headers
- For real API requests: the value is the first entry from the `x-forwarded-for` header (trimmed), or the `x-real-ip` header value, or `null` if neither is present
- The value is a string (IP address) or `null`

## Failure indicators
- The `ip` output always returns `null` even for real external requests where `x-forwarded-for` is set
- The value is not a string

## Severity rationale
IP output is used by Access List nodes for IP/CIDR-based filtering; if missing or wrong, IP-based access control cannot function.

## Source reference
`lib/nodes/workflow-input.ts` lines 24–26 — when `sourceHandle === "ip"`: `return { value: ctx.reqCtx.ip, ... }`. `app/api/v1/chat/route.ts` lines 116–118 — `ip` is extracted from `x-forwarded-for` (first entry) or `x-real-ip` header; `null` if neither present. `components/canvas/nodes/InputNode.tsx` line 15 — `{id: "ip", label: "ip", desc: "client IP"}`.
