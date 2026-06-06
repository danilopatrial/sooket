# Configuration

Sooket is configured entirely through environment variables. For local
development they live in `.env.local` (auto-created on first run); for Docker or
production, set them in the environment. A documented template is in
[`.env.example`](../.env.example).

## Environment variables

| Variable | Required | Default | Purpose |
|---|---|---|---|
| `ENCRYPTION_SECRET` | **Yes** | _(auto-generated into `.env.local`)_ | AES-GCM key used to encrypt provider keys, credentials, and customer variables at rest. The app refuses to boot without it. |
| `ENCRYPTION_SALT` | No | `"sooket-salt"` | PBKDF2 salt for key derivation. Set it to a deployment-unique value. |
| `SOOKET_DATA_DIR` | No | `./data` | Directory for the SQLite database file (`sooket.db`). |
| `SOOKET_HOST` | No | `127.0.0.1` | Network interface the server binds to. |
| `SOOKET_MAX_BODY_BYTES` | No | `1048576` (1 MiB) | Max request body size for `/api/v1/chat` and the webhook API. Oversized requests get HTTP 413. |
| `CORS_ORIGIN` | No | `*` | Value sent in `Access-Control-Allow-Origin` on the execution routes. Pin it to a specific origin if you expose those routes. |

> **Stability matters.** `ENCRYPTION_SECRET` and `ENCRYPTION_SALT` must stay the
> same for the life of your data. Changing either one makes all existing
> ciphertext (stored provider keys, credentials, variables) undecryptable.

Generate a strong secret with:

```bash
openssl rand -hex 32
```

## Data storage

Sooket uses a local SQLite database via Node's built-in `node:sqlite`. The file
is created automatically at `$SOOKET_DATA_DIR/sooket.db` (default
`./data/sooket.db`) on first use, and the schema is applied through ordered
migrations on startup. The database runs in WAL mode, which allows the optional
standalone execution server (`npm run execution-server`) to share the same file
concurrently with the Next.js process.

Back up the database file at any time:

```bash
npm run backup        # copies sooket.db to a timestamped .bak in the data dir
```

## A note on security

Sooket's **management API** — the canvas and every `/api/workflows`,
`/api/credentials`, `/api/provider-keys`, and `/api/variables` route — is
**unauthenticated by design** and binds to `127.0.0.1` only. Anyone who can reach
the port can read or modify every workflow and exfiltrate provider keys.

Do **not** simply widen `SOOKET_HOST` to expose Sooket over a network. Put it
behind a reverse proxy that adds authentication and TLS. The execution routes
(`/api/v1/chat`, `/api/webhooks/[slug]`) are separately gated by per-workflow
keys/tokens. See the **Security** section of the [README](../README.md#security)
for the full rationale.
