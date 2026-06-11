import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { hashApiKey, deriveKeyPrefix } from "@/lib/security/api-keys";

type Params = { params: Promise<{ slug: string }> };

const VALID_SCOPES = ["execute"] as const;
type Scope = typeof VALID_SCOPES[number];

function getWorkflowId(slug: string): number | null {
  const db = getDb();
  const row = db.prepare(`SELECT id FROM workflows WHERE slug = ?`).get(slug) as { id: number } | undefined;
  return row?.id ?? null;
}

export async function GET(_req: Request, { params }: Params) {
  const { slug } = await params;
  const workflowId = getWorkflowId(slug);
  if (workflowId === null) return NextResponse.json({ error: "Workflow not found" }, { status: 404 });

  const db = getDb();
  const rows = db.prepare(
    `SELECT id, label, key_prefix, scopes, rate_limit_override, expires_at, last_used_at, is_active, created_at
     FROM workflow_api_keys WHERE workflow_id = ? ORDER BY created_at ASC`
  ).all(workflowId) as Array<{
    id: number; label: string; key_prefix: string | null; scopes: string;
    rate_limit_override: number | null; expires_at: string | null;
    last_used_at: string | null; is_active: number; created_at: string;
  }>;

  const keys = rows.map((r) => ({
    id: r.id,
    label: r.label,
    key_hint: r.key_prefix ?? "",
    scopes: JSON.parse(r.scopes) as Scope[],
    rate_limit_override: r.rate_limit_override,
    expires_at: r.expires_at,
    last_used_at: r.last_used_at,
    is_active: !!r.is_active,
    created_at: r.created_at,
  }));

  return NextResponse.json({ keys });
}

export async function POST(req: Request, { params }: Params) {
  const { slug } = await params;
  const workflowId = getWorkflowId(slug);
  if (workflowId === null) return NextResponse.json({ error: "Workflow not found" }, { status: 404 });

  const body = await req.json() as {
    label?: string;
    scopes?: string[];
    rate_limit_override?: number | null;
    expires_at?: string | null;
  };

  const label = (body.label ?? "").trim().slice(0, 100);
  if (!label) return NextResponse.json({ error: "label is required" }, { status: 400 });

  const rawScopes: Scope[] = Array.isArray(body.scopes)
    ? (body.scopes as string[]).filter((s): s is Scope => VALID_SCOPES.includes(s as Scope))
    : ["execute"];
  if (rawScopes.length === 0) rawScopes.push("execute");
  const scopes = JSON.stringify(rawScopes);

  const rateLimitOverride = body.rate_limit_override != null
    ? Math.max(1, Math.floor(Number(body.rate_limit_override)))
    : null;
  if (body.rate_limit_override != null && (isNaN(rateLimitOverride!) || rateLimitOverride! < 1)) {
    return NextResponse.json({ error: "rate_limit_override must be a positive integer" }, { status: 400 });
  }

  let expiresAt: string | null = null;
  if (body.expires_at) {
    const d = new Date(body.expires_at);
    if (isNaN(d.getTime())) return NextResponse.json({ error: "expires_at must be a valid ISO date" }, { status: 400 });
    if (d <= new Date()) return NextResponse.json({ error: "expires_at must be in the future" }, { status: 400 });
    expiresAt = d.toISOString();
  }

  // The raw key is returned to the caller exactly once, below. Only its hash and
  // a non-secret prefix are persisted, so it can never be retrieved again.
  const key = `sk-wf-${crypto.randomUUID().replace(/-/g, "")}`;
  const db = getDb();

  const { lastInsertRowid } = db.prepare(
    `INSERT INTO workflow_api_keys (workflow_id, key_hash, key_prefix, label, scopes, rate_limit_override, expires_at, is_active)
     VALUES (?, ?, ?, ?, ?, ?, ?, 1)`
  ).run(workflowId, hashApiKey(key), deriveKeyPrefix(key), label, scopes, rateLimitOverride, expiresAt) as { lastInsertRowid: number };

  const created = db.prepare(
    `SELECT id, label, scopes, rate_limit_override, expires_at, is_active, created_at
     FROM workflow_api_keys WHERE id = ?`
  ).get(Number(lastInsertRowid)) as {
    id: number; label: string; scopes: string;
    rate_limit_override: number | null; expires_at: string | null;
    is_active: number; created_at: string;
  };

  return NextResponse.json({
    key: {
      id: created.id,
      label: created.label,
      key,
      key_hint: deriveKeyPrefix(key),
      scopes: JSON.parse(created.scopes) as Scope[],
      rate_limit_override: created.rate_limit_override,
      expires_at: created.expires_at,
      last_used_at: null,
      is_active: true,
      created_at: created.created_at,
    },
  }, { status: 201 });
}
