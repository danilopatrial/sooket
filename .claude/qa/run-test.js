// API-01: Valid request with active workflow returns { reply: ... }
const BASE = 'http://localhost:3000';

async function post(path, body = {}) {
  const r = await fetch(`${BASE}${path}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  return r.json();
}
async function patch(path, body) {
  const r = await fetch(`${BASE}${path}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  return r.json();
}
async function del(path) { return fetch(`${BASE}${path}`, { method: 'DELETE' }); }

function ccNodes(code) {
  return [
    { id: 'inp', type: 'text', data: { text: 'x' }, position: { x: 0, y: 0 } },
    { id: 'cc', type: 'custom-code', data: { code }, position: { x: 120, y: 0 } },
    { id: 'out', type: 'workflowOutput', data: {}, position: { x: 240, y: 0 } },
  ];
}
function ccEdges() {
  return [
    { id: 'e1', source: 'inp', target: 'cc', targetHandle: 'input' },
    { id: 'e2', source: 'cc', target: 'out', sourceHandle: 'output' },
  ];
}

let slug;
(async () => {
  // Setup: create + activate a temporary workflow
  const created = await post('/api/workflows', { name: 'QA-API-01' });
  slug = created.slug;
  console.log('created:', slug);

  await patch(`/api/workflows/${slug}`, {
    nodes: ccNodes('return "hello world";'),
    edges: ccEdges(),
    is_active: true,
  });

  const keyResp = await post(`/api/workflows/${slug}/api-keys`, { label: 'qa-api01', scopes: ['execute'] });
  const apiKey = keyResp.key.key;
  const keyId = keyResp.key.id;
  const headers = { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` };

  // ── Test 1: HTTP 200 + { reply: "..." } for string output ─────────────────
  console.log('--- Test 1: string output → { reply: "hello world" } ---');
  const res1 = await fetch(`${BASE}/api/v1/chat`, { method: 'POST', headers, body: JSON.stringify({ message: 'hi' }) });
  const body1 = await res1.json();
  console.log('status 200:', res1.status === 200);
  console.log('reply = "hello world":', body1.reply === 'hello world');
  console.log('CORS Allow-Origin = *:', res1.headers.get('access-control-allow-origin') === '*');
  console.log('CORS Allow-Methods includes POST:', res1.headers.get('access-control-allow-methods')?.includes('POST'));
  console.log('Content-Type application/json:', res1.headers.get('content-type')?.includes('application/json'));

  // ── Test 2: Object output wrapped in reply ─────────────────────────────────
  console.log('--- Test 2: object output → { reply: {...} } ---');
  await patch(`/api/workflows/${slug}`, {
    nodes: ccNodes('return { key: "val", num: 42 };'),
    edges: ccEdges(),
  });
  const res2 = await fetch(`${BASE}/api/v1/chat`, { method: 'POST', headers, body: JSON.stringify({ message: 'hi' }) });
  const body2 = await res2.json();
  console.log('status 200:', res2.status === 200);
  console.log('reply is object:', typeof body2.reply === 'object' && body2.reply !== null);
  console.log('reply.key = "val":', body2.reply?.key === 'val');
  console.log('reply.num = 42:', body2.reply?.num === 42);

  // ── Test 3: Number output stringified ──────────────────────────────────────
  console.log('--- Test 3: number output → { reply: "42" } ---');
  await patch(`/api/workflows/${slug}`, {
    nodes: ccNodes('return 42;'),
    edges: ccEdges(),
  });
  const res3 = await fetch(`${BASE}/api/v1/chat`, { method: 'POST', headers, body: JSON.stringify({ message: 'hi' }) });
  const body3 = await res3.json();
  console.log('status 200:', res3.status === 200);
  console.log('reply = "42" (stringified number):', body3.reply === '42');

  // ── Test 4: No active path → 400 ──────────────────────────────────────────
  console.log('--- Test 4: no active path → 400 ---');
  await patch(`/api/workflows/${slug}`, {
    nodes: [
      { id: 'inp', type: 'text', data: { text: 'x' }, position: { x: 0, y: 0 } },
      { id: 'cc', type: 'custom-code', data: { code: 'throw new Error("oops");' }, position: { x: 120, y: 0 } },
      { id: 'side', type: 'text', data: { text: 'side' }, position: { x: 120, y: 80 } },
      { id: 'out', type: 'workflowOutput', data: {}, position: { x: 240, y: 0 } },
    ],
    edges: [
      { id: 'e1', source: 'inp', target: 'cc', targetHandle: 'input' },
      { id: 'e2', source: 'cc', target: 'side', connectionType: 'error' },
      { id: 'e3', source: 'cc', target: 'out', sourceHandle: 'output' }, // inactive path
    ],
  });
  const res4 = await fetch(`${BASE}/api/v1/chat`, { method: 'POST', headers, body: JSON.stringify({ message: 'hi' }) });
  const body4 = await res4.json();
  console.log('status 400:', res4.status === 400);
  console.log('error contains "No active path":', typeof body4.error === 'string' && body4.error.includes('No active path'));

  // ── Test 5: ResponseBuilder → custom status + headers + raw body ───────────
  console.log('--- Test 5: ResponseBuilder → 201 + X-Custom header + raw body ---');
  // Body must come from an edge to targetHandle "body"; node.data.body is not read by executor
  await patch(`/api/workflows/${slug}`, {
    nodes: [
      { id: 'inp', type: 'text', data: { text: 'x' }, position: { x: 0, y: 0 } },
      { id: 'cc', type: 'custom-code', data: { code: 'return { ok: true };' }, position: { x: 120, y: 0 } },
      { id: 'rb', type: 'response-builder', data: { status: 201, headers: [{ id: 'h1', key: 'X-Custom', value: 'yes' }] }, position: { x: 240, y: 0 } },
      { id: 'out', type: 'workflowOutput', data: {}, position: { x: 360, y: 0 } },
    ],
    edges: [
      { id: 'e1', source: 'inp', target: 'cc', targetHandle: 'input' },
      { id: 'e2', source: 'cc', target: 'rb', sourceHandle: 'output', targetHandle: 'body' },
      { id: 'e3', source: 'rb', target: 'out', sourceHandle: 'output' },
    ],
  });
  const res5 = await fetch(`${BASE}/api/v1/chat`, { method: 'POST', headers, body: JSON.stringify({ message: 'hi' }) });
  const text5 = await res5.text();
  let body5;
  try { body5 = JSON.parse(text5); } catch { body5 = text5; }
  console.log('status 201:', res5.status === 201);
  console.log('X-Custom header = "yes":', res5.headers.get('x-custom') === 'yes');
  console.log('body not wrapped in reply (no .reply key):', body5 !== null && typeof body5 === 'object' && body5.reply === undefined);
  console.log('body.ok = true:', body5?.ok === true);

  // ── Test 6: last_used_at updated after request ─────────────────────────────
  console.log('--- Test 6: last_used_at updated ---');
  await patch(`/api/workflows/${slug}`, { nodes: ccNodes('return "ping";'), edges: ccEdges() });
  await fetch(`${BASE}/api/v1/chat`, { method: 'POST', headers, body: JSON.stringify({ message: 'ping' }) });
  await new Promise(r => setTimeout(r, 400));
  const keysResp = await fetch(`${BASE}/api/workflows/${slug}/api-keys`).then(r => r.json());
  const thisKey = keysResp.keys?.find(k => k.id === keyId);
  console.log('last_used_at is set:', thisKey?.last_used_at !== null && thisKey?.last_used_at !== undefined);

  // Cleanup: deactivate first, then delete (active workflows cannot be deleted)
  await patch(`/api/workflows/${slug}`, { is_active: false });
  await del(`/api/workflows/${slug}`);
  console.log('--- DONE ---');
})().catch(async e => {
  console.error('ERROR:', e.message);
  // Attempt cleanup on error
  if (slug) {
    try {
      await patch(`/api/workflows/${slug}`, { is_active: false });
      await del(`/api/workflows/${slug}`);
      console.log('Cleanup succeeded after error');
    } catch { console.log('Cleanup failed'); }
  }
  process.exit(1);
});
