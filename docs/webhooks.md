# Webhooks

Every workflow can also be triggered through a webhook endpoint at
`/api/webhooks/[slug]`. Unlike `POST /api/v1/chat` (which authenticates with an
`sk-wf-*` key and returns `{ reply }`), the webhook endpoint is gated by a
per-workflow **token** and is convenient for inbound events from third-party
services that let you configure a URL and a shared secret.

| | |
|---|---|
| Methods | `POST`, `GET`, `PUT`, `PATCH` (and `OPTIONS` for preflight) |
| Auth | `x-webhook-secret` header **or** `?token=` query parameter |
| Body | JSON parsed as-is; non-JSON wrapped as `{ "body": "<raw>" }`; empty → `{}` |

The token is configured per workflow. If a workflow has a token set, requests
must present the matching value; otherwise the endpoint is open. The token is
verified **before** the active/inactive state is checked, so an unauthenticated
caller can't probe whether a workflow exists or is enabled.

## Examples

Token in a header:

```bash
curl -X POST http://localhost:3000/api/webhooks/my-workflow \
  -H "x-webhook-secret: <webhook-token>" \
  -H "Content-Type: application/json" \
  -d '{"event": "order.created", "orderId": 12345}'
```

Token in the query string (useful when you can only configure a URL):

```bash
curl -X POST "http://localhost:3000/api/webhooks/my-workflow?token=<webhook-token>" \
  -H "Content-Type: application/json" \
  -d '{"event": "payment.received"}'
```

A non-JSON body is delivered to the workflow wrapped as `{ "body": "<raw text>" }`.

## Response

On success:

```json
{ "ok": true, "output": "<workflow output>" }
```

On error:

```json
{ "ok": false, "error": "<message>" }
```

A workflow ending in a **Response Builder** node bypasses this envelope and
returns its own status code, headers, and body.

### Status codes

| Code | Meaning |
|---|---|
| `200` | Success (or a custom status from a Response Builder node) |
| `400` | Failed to read the request body |
| `401` | Invalid or missing webhook token |
| `403` | Workflow is not active |
| `404` | Workflow not found |
| `413` | Request body exceeds `SOOKET_MAX_BODY_BYTES` |
| `500` | Workflow execution error, or no output produced |
| `503` | Server busy — retry shortly |
