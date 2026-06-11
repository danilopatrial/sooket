---
id: SEC-14
title: HTTP Request and Webhook nodes block SSRF to internal targets
severity: critical
source_files:
  - lib/security/ssrf.ts
  - lib/nodes/http-request.ts
  - lib/nodes/webhook.ts
---

## What this tests
Verifies that the outbound-fetch nodes (HTTP Request, and the Webhook node in action mode) refuse to call private/internal targets — cloud metadata (`169.254.169.254`), loopback, and RFC1918 addresses — whether the URL is an IP literal **or** a hostname that resolves to such an address, and only over http/https. The request is rejected before any connection is opened. A self-hosted operator can opt out with `SOOKET_ALLOW_PRIVATE_EGRESS`.

## Prerequisites
- App is running at http://localhost:3000
- A workflow with an HTTP Request node whose output reaches the Output node, runnable via the Debug panel or a live API key
- `SOOKET_ALLOW_PRIVATE_EGRESS` is unset (the secure default)

## Steps — blocked targets
1. Configure the HTTP Request node's URL to each of the following and run; each must **fail** with an error containing `Blocked egress`, and no request should be made:
   - `http://169.254.169.254/latest/meta-data/` (cloud metadata)
   - `http://127.0.0.1:3000/api/admin/backup` (loopback / own admin surface)
   - `http://10.0.0.1/` , `http://192.168.0.1/` , `http://172.16.0.1/` (RFC1918)
   - `http://[::1]/` (IPv6 loopback)
   - `http://localhost:3000/` (loopback hostname)
2. Configure a URL whose **hostname resolves** to a private address (e.g. a domain you control with an A record of `169.254.169.254`, or use a host that maps to `127.0.0.1`). Run; it must also fail with `Blocked egress` (DNS-based SSRF is caught, not just IP literals).
3. Configure a non-http(s) URL, e.g. `file:///etc/passwd` or `gopher://127.0.0.1/`. Run; it must fail (disallowed protocol).

## Steps — allowed targets still work
4. Configure a normal public URL (e.g. `https://api.github.com/`). Run; the request proceeds and returns normally.

## Steps — Webhook (action) node
5. Point a Webhook node (action mode) at `http://127.0.0.1:9000/` and run; the node errors with `Blocked egress` and the background request is **not** sent (no blind SSRF).

## Steps — opt-out for internal egress
6. Restart with `SOOKET_ALLOW_PRIVATE_EGRESS=1`. Repeat step 1 with an internal address you actually run (e.g. `http://10.0.0.x/`); it now proceeds. (Use only on a trusted, non-multi-tenant deployment.)

## Expected result
- All private/reserved IP literals and private-resolving hostnames are rejected with a `Blocked egress to "<host>": ...` error, before any socket is opened.
- Non-http(s) protocols are rejected.
- Public destinations work unchanged.
- The Webhook action node refuses blocked targets and does not fire the request.
- With `SOOKET_ALLOW_PRIVATE_EGRESS` set, the guard is bypassed.

## Failure indicators
- A request to `169.254.169.254` / loopback / RFC1918 succeeds or returns metadata.
- A hostname that resolves to a private IP is fetched (only IP literals are blocked).
- The Webhook node still sends the background request to an internal URL.
- A `file://`/`gopher://` URL is fetched.
- The guard cannot be disabled for legitimate internal egress, OR it is disabled by default (insecure default).

## Severity rationale
SSRF against cloud metadata or internal admin endpoints is a direct path to credential theft and lateral movement; for a tool whose purpose is making outbound calls — and that can take URLs from request bodies under the shared-secret multi-caller mode — unrestricted egress is a critical exposure.

## Source reference
`lib/security/ssrf.ts` — `assertEgressAllowed(url)`: requires http/https, blocks `localhost`, blocks IP literals in private/reserved ranges via `net.BlockList` (IPv4 + IPv6, including IPv4-mapped), resolves hostnames and rejects if **any** address is blocked (fail-closed on resolution failure); `privateEgressAllowed()` reads `SOOKET_ALLOW_PRIVATE_EGRESS`. Wired into `lib/nodes/http-request.ts` (before `fetch`) and `lib/nodes/webhook.ts` (before the fire-and-forget request).

## Notes
This closes the common SSRF vectors but is not a perfect DNS-rebinding defense — a TOCTOU window remains between the resolve-and-check and the socket connect, since `fetch` does not pin to the validated IP. The blocked ranges cover loopback, link-local (incl. metadata), RFC1918, CGNAT, and reserved/multicast for both IP families. Unit coverage: `__tests__/lib/security/ssrf.test.ts`; node wiring: `__tests__/lib/nodes/http-nodes.test.ts`.
