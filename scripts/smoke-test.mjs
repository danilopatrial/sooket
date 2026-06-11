#!/usr/bin/env node
/**
 * Headless provisioning smoke test.
 *
 * Exercises the full control-plane contract against a running Sooket instance
 * using only HTTP + Bearer tokens (no browser, no cookies):
 *
 *   1. GET  /api/health                          → ok + version
 *   2. POST /api/account/api-key                 → sk-mw-* management key
 *   3. POST /api/workflows                       → new workflow slug
 *   4. PATCH /api/workflows/[slug]               → minimal graph, activate
 *   5. POST /api/workflows/[slug]/api-keys       → sk-wf-* execution key
 *   6. POST /api/v1/chat                         → execute, expect the output
 *   7. GET  /api/admin/backup                    → SQLite snapshot bytes
 *   8. cleanup: deactivate + delete the workflow
 *
 * Usage:
 *   SOOKET_URL=http://127.0.0.1:3000 [SOOKET_AUTH_TOKEN=...] node scripts/smoke-test.mjs
 *
 * SOOKET_AUTH_TOKEN must match the instance's token when its shared-secret
 * gate is enabled; leave it unset against an open instance. Exits non-zero on
 * the first failed step. The hosted control plane runs this against every
 * freshly provisioned instance as its provisioning contract test.
 */

const BASE_URL = (process.env.SOOKET_URL ?? "http://127.0.0.1:3000").replace(/\/+$/, "");
const AUTH_TOKEN = process.env.SOOKET_AUTH_TOKEN?.trim() || null;
const HEALTH_TIMEOUT_MS = Number(process.env.SMOKE_HEALTH_TIMEOUT_MS ?? 60_000);

const SMOKE_VALUE = `smoke-ok-${Date.now()}`;

let step = 0;
function log(message) {
  step += 1;
  console.log(`[smoke ${step}] ${message}`);
}

function fail(message, detail) {
  console.error(`\n✖ Smoke test failed: ${message}`);
  if (detail !== undefined) console.error(detail);
  process.exit(1);
}

/** Fetch a management-surface route (gated by SOOKET_AUTH_TOKEN when set). */
async function mgmt(path, options = {}, bearer = AUTH_TOKEN) {
  const headers = { "Content-Type": "application/json", ...options.headers };
  if (bearer) headers["Authorization"] = `Bearer ${bearer}`;
  return fetch(`${BASE_URL}${path}`, { ...options, headers });
}

async function expectJson(res, path) {
  if (!res.ok) fail(`${path} returned HTTP ${res.status}`, await res.text());
  return res.json();
}

// ── 1. Health ────────────────────────────────────────────────────────────────

log(`waiting for ${BASE_URL}/api/health (timeout ${HEALTH_TIMEOUT_MS}ms)`);
const deadline = Date.now() + HEALTH_TIMEOUT_MS;
let health = null;
while (Date.now() < deadline) {
  try {
    const res = await fetch(`${BASE_URL}/api/health`);
    if (res.ok) {
      health = await res.json();
      break;
    }
  } catch {
    // server not up yet — keep polling
  }
  await new Promise((r) => setTimeout(r, 1000));
}
if (!health || health.status !== "ok") fail("instance never became healthy", health);
log(`healthy — sooket v${health.version ?? "unknown"}, uptime ${health.uptime}s`);

// ── 2. Management key ────────────────────────────────────────────────────────

const mgmtKeyRes = await mgmt("/api/account/api-key", { method: "POST" });
const { api_key: managementKey } = await expectJson(mgmtKeyRes, "/api/account/api-key");
if (!managementKey?.startsWith("sk-mw-")) fail("management key has unexpected format", managementKey);
log("management key minted (sk-mw-…)");

// ── 3–4. Create + configure a minimal workflow ───────────────────────────────

const createRes = await mgmt("/api/workflows", { method: "POST" });
const { slug } = await expectJson(createRes, "/api/workflows");
if (!slug) fail("workflow creation returned no slug");
log(`workflow created: ${slug}`);

const patchRes = await mgmt(`/api/workflows/${slug}`, {
  method: "PATCH",
  body: JSON.stringify({
    name: "Provisioning Smoke Test",
    nodes: [
      { id: "t1", type: "text", position: { x: 0, y: 0 }, data: { text: SMOKE_VALUE } },
      { id: "out", type: "workflowOutput", position: { x: 240, y: 0 }, data: {} },
    ],
    edges: [{ id: "e1", source: "t1", target: "out" }],
    is_active: true,
  }),
});
await expectJson(patchRes, `/api/workflows/${slug} (PATCH)`);
log("workflow graph saved and activated");

// ── 5. Execution key ─────────────────────────────────────────────────────────

const keyRes = await mgmt(`/api/workflows/${slug}/api-keys`, {
  method: "POST",
  body: JSON.stringify({ label: "smoke-test" }),
});
const keyBody = await expectJson(keyRes, `/api/workflows/${slug}/api-keys`);
const executionKey = keyBody.key?.key;
if (!executionKey?.startsWith("sk-wf-")) fail("execution key has unexpected format", keyBody);
log("execution key minted (sk-wf-…)");

// ── 6. Execute via the public surface ────────────────────────────────────────

const chatRes = await fetch(`${BASE_URL}/api/v1/chat`, {
  method: "POST",
  headers: { "Content-Type": "application/json", Authorization: `Bearer ${executionKey}` },
  body: JSON.stringify({ input: "ping" }),
});
const chatBody = await expectJson(chatRes, "/api/v1/chat");
if (chatBody.reply !== SMOKE_VALUE) fail("execution returned unexpected reply", chatBody);
log("workflow executed end-to-end via /api/v1/chat");

// ── 7. Backup (own sk-mw auth, exempt from the proxy gate) ───────────────────

const backupRes = await fetch(`${BASE_URL}/api/admin/backup`, {
  headers: { Authorization: `Bearer ${managementKey}` },
});
if (!backupRes.ok) fail(`/api/admin/backup returned HTTP ${backupRes.status}`, await backupRes.text());
const backupBytes = Buffer.from(await backupRes.arrayBuffer());
if (!backupBytes.subarray(0, 15).toString("utf8").startsWith("SQLite format 3")) {
  fail("backup payload is not a SQLite database", backupBytes.subarray(0, 32));
}
log(`backup downloaded (${backupBytes.byteLength} bytes, valid SQLite header)`);

// ── 8. Cleanup ───────────────────────────────────────────────────────────────

await expectJson(
  await mgmt(`/api/workflows/${slug}`, { method: "PATCH", body: JSON.stringify({ is_active: false }) }),
  `/api/workflows/${slug} (deactivate)`
);
await expectJson(
  await mgmt(`/api/workflows/${slug}`, { method: "DELETE" }),
  `/api/workflows/${slug} (DELETE)`
);
log("smoke workflow deleted");

console.log("\n✔ All smoke-test steps passed.");
