import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";

export async function POST() {
  const db = getDb();

  const existing = db.prepare(`SELECT value FROM settings WHERE key = 'api_key'`).get() as unknown as { value: string } | undefined;
  if (existing?.value) {
    return NextResponse.json({ api_key: existing.value });
  }

  const apiKey = `sk-mw-${crypto.randomUUID().replace(/-/g, "")}`;
  db.prepare(`INSERT OR REPLACE INTO settings (key, value) VALUES ('api_key', ?)`).run(apiKey);

  return NextResponse.json({ api_key: apiKey });
}
