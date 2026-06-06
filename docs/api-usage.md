# API usage

Once a workflow is built and **active**, callers invoke it over HTTP. The graph
executes synchronously in the request path and the **Output** node's result is
returned in the same response.

## Execute a workflow — `POST /api/v1/chat`

| | |
|---|---|
| Method | `POST` (also `OPTIONS` for CORS preflight) |
| Auth | `Authorization: Bearer sk-wf-...` (a per-workflow API key) |
| Content-Type | `application/json` |
| Body | Any JSON object — passed to the workflow as its input |

The Bearer key both authenticates the request **and** selects which workflow
runs (each `sk-wf-*` key belongs to exactly one workflow).

```bash
curl -X POST http://localhost:3000/api/v1/chat \
  -H "Authorization: Bearer sk-wf-xxxxxxxxxxxx" \
  -H "Content-Type: application/json" \
  -d '{"email": "ada@example.com", "note": "call me at 555-123-4567"}'
```

### Response

On success the Output node's value is wrapped in a `reply` field:

```json
{ "reply": "<workflow output>" }
```

`reply` can be a string, number (stringified), or object, depending on what the
Output node produces. A workflow that ends in a **Response Builder** node instead
controls the full HTTP response — custom status code, headers, and body — so the
envelope above does not apply in that case.

### Health check — `GET /api/v1/chat`

```json
{ "ok": true, "local": true }
```

Returns `ok: false` with status 500 if `ENCRYPTION_SECRET` is not set. No auth
required.

### Status codes

| Code | Meaning |
|---|---|
| `200` | Success (or a custom status from a Response Builder node) |
| `400` | Invalid JSON body, or no Output node was reached |
| `401` | Missing `Authorization` header, or invalid / expired / inactive key |
| `403` | Key lacks the `execute` scope, or the workflow is not active |
| `413` | Request body exceeds `SOOKET_MAX_BODY_BYTES` |
| `429` | Per-key rate limit exceeded (only when a key sets one) |
| `500` | Workflow execution error |
| `503` | Server busy — execution concurrency limit reached, retry shortly |

## Managing workflow keys (`sk-wf-*`)

The easiest path is the workflow's settings panel in the canvas UI, which lists
keys and lets you create new ones. There is also a REST API.

### List keys — `GET /api/workflows/[slug]/api-keys`

Returns each key with a masked `key_hint` (the full secret is never shown again
after creation).

### Create a key — `POST /api/workflows/[slug]/api-keys`

```json
{
  "label": "Production key",
  "scopes": ["execute"],
  "rate_limit_override": 1000,
  "expires_at": "2026-12-31T23:59:59Z"
}
```

| Field | Required | Notes |
|---|---|---|
| `label` | Yes | Non-empty, trimmed to 100 chars |
| `scopes` | No | Defaults to `["execute"]`; `execute` is currently the only valid scope |
| `rate_limit_override` | No | Positive integer; requests per fixed 1-minute window |
| `expires_at` | No | ISO date string; must be in the future |

Response (`201 Created`) — the full `key` is returned **exactly once**:

```json
{
  "key": {
    "id": 42,
    "label": "Production key",
    "key": "sk-wf-a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4",
    "key_hint": "sk-wf-a1b2...c3d4",
    "scopes": ["execute"],
    "rate_limit_override": 1000,
    "expires_at": "2026-12-31T23:59:59.000Z",
    "last_used_at": null,
    "is_active": true,
    "created_at": "2026-06-06T12:34:56.789Z"
  }
}
```

Update or delete a specific key via `PATCH`/`DELETE` on
`/api/workflows/[slug]/api-keys/[id]`. The last active key on a workflow cannot
be deleted.

## Instance management key (`sk-mw-*`)

A single instance-level key gates the management-only endpoints (e.g. the
database backup download). Generate or retrieve it with:

```bash
curl -X POST http://localhost:3000/api/account/api-key
# -> { "api_key": "sk-mw-..." }
```

Calling it again returns the existing key rather than rotating it. Use it as a
Bearer token on management routes such as the backup download:

```bash
curl http://localhost:3000/api/admin/backup \
  -H "Authorization: Bearer sk-mw-..." -o sooket-backup.db
```

Treat the `sk-mw-*` key like a password.
