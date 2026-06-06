import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { nanoid } from "nanoid";
import { randomBytes } from "node:crypto";

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
  const webhookToken = randomBytes(24).toString("hex");

  const { lastInsertRowid } = db.prepare(
    `INSERT INTO workflows (slug, name, api_key, webhook_token) VALUES (?, ?, ?, ?)`
  ).run(slug, "Untitled Workflow", apiKey, webhookToken) as { lastInsertRowid: number };

  db.prepare(
    `INSERT INTO workflow_api_keys (workflow_id, key, label, scopes, is_active) VALUES (?, ?, ?, ?, 1)`
  ).run(Number(lastInsertRowid), apiKey, "Default Key", '["execute"]');

  return NextResponse.json({ slug });
}
