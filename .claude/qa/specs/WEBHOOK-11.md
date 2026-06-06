---
id: WEBHOOK-11
title: Webhook node trigger mode surfaces copyable inbound URL
severity: medium
source_files:
  - components/canvas/nodes/WebhookNode.tsx
---

## What this tests
Verifies that the Webhook node's "trigger" mode displays the inbound URL (`/api/webhooks/<slug>`) for the current workflow with a working copy-to-clipboard control — the canvas surface that connects users to the WEBHOOK-01..10 endpoint behavior.

## Prerequisites
- App is running at http://localhost:3000
- A workflow canvas is open at `/workflow/<slug>` with a Webhook node on it

## Steps
1. Select the Webhook node and switch its mode toggle from "action" to "trigger".
2. Observe the "Inbound URL" row.
3. Click the copy icon next to the URL.

## Expected result
- The node shows an "Inbound URL" labelled row containing `${origin}/api/webhooks/<slug>` for the current workflow slug.
- Clicking the copy icon writes that URL to the clipboard and shows confirmation feedback (the Copy icon switches to a Check icon).
- In "action" mode this inbound URL is hidden (the node instead shows outbound URL/method/headers — covered by NODE-EXT-05).

## Failure indicators
- The inbound URL is missing, blank, or points at the wrong slug in trigger mode.
- The copy control does nothing or gives no visual feedback.

## Severity rationale
Trigger mode is how a user discovers and shares the webhook URL; if the URL is wrong or uncopyable the feature is effectively undiscoverable.

## Source reference
`components/canvas/nodes/WebhookNode.tsx` — `useInboundUrl()` derives `${window.location.origin}/api/webhooks/${slug}`; the trigger-mode block renders the "Inbound URL" row; `copyUrl()` writes it to the clipboard with Copy→Check feedback.

## Notes
The slug is parsed from the canvas URL. If a `webhook_token` is configured, the displayed URL is the base path — callers must add the token via header or `?token=` (see WEBHOOK-02/03).
