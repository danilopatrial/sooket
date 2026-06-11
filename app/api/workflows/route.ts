import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { nanoid } from "nanoid";
import { randomBytes } from "node:crypto";
import { hashApiKey, deriveKeyPrefix } from "@/lib/security/api-keys";

export async function GET() {
  const db = getDb();
  const rows = db.prepare(
    `SELECT id, slug, name FROM workflows ORDER BY name ASC`
  ).all() as Array<{ id: number; slug: string; name: string }>;
  return NextResponse.json(rows);
}

export async function POST() {
  const db = getDb();
  const slug = nanoid(10);
  const apiKey = `sk-wf-${crypto.randomUUID().replace(/-/g, "")}`;
  const apiKeyHash = hashApiKey(apiKey);
  const webhookToken = randomBytes(24).toString("hex");

  // Persist only the hash. workflows.api_key is a vestigial mirror that nothing
  // authenticates against; storing the hash keeps its NOT NULL/UNIQUE shape
  // without leaving a second plaintext copy of the key at rest.
  const { lastInsertRowid } = db.prepare(
    `INSERT INTO workflows (slug, name, api_key, webhook_token) VALUES (?, ?, ?, ?)`
  ).run(slug, "Untitled Workflow", apiKeyHash, webhookToken) as { lastInsertRowid: number };

  db.prepare(
    `INSERT INTO workflow_api_keys (workflow_id, key_hash, key_prefix, label, scopes, is_active) VALUES (?, ?, ?, ?, ?, 1)`
  ).run(Number(lastInsertRowid), apiKeyHash, deriveKeyPrefix(apiKey), "Default Key", '["execute"]');

  return NextResponse.json({ slug });
}
