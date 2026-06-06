import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { encrypt } from "@/lib/crypto";

const SECRET = process.env.ENCRYPTION_SECRET!;

export async function POST(request: Request) {
  const db = getDb();
  const { provider, key } = await request.json();
  if (!provider || !key) {
    return NextResponse.json({ error: "Missing provider or key" }, { status: 400 });
  }

  const encryptedKey = await encrypt(key.trim(), SECRET);

  db.prepare(`
    INSERT INTO provider_keys (provider, encrypted_key)
    VALUES (?, ?)
    ON CONFLICT(provider) DO UPDATE SET encrypted_key = excluded.encrypted_key
  `).run(provider, encryptedKey);

  return NextResponse.json({ ok: true });
}

export async function DELETE(request: Request) {
  const db = getDb();
  const { searchParams } = new URL(request.url);
  const provider = searchParams.get("provider");
  if (!provider) return NextResponse.json({ error: "Missing provider" }, { status: 400 });

  db.prepare(`DELETE FROM provider_keys WHERE provider = ?`).run(provider);

  return NextResponse.json({ ok: true });
}
