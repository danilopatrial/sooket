import { NextResponse } from "next/server";
import { createSqliteAdapter } from "@/lib/db/workflow-adapter";
import { encrypt } from "@/lib/crypto";

const SECRET = process.env.ENCRYPTION_SECRET!;

export async function GET() {
  const adapter = createSqliteAdapter();
  return NextResponse.json(adapter.listCredentials());
}

export async function POST(request: Request) {
  const body = await request.json() as { name?: string; type?: string; key?: string };
  const { name, type, key } = body;
  if (!name || !type || !key) {
    return NextResponse.json({ error: "Missing name, type, or key" }, { status: 400 });
  }

  const encryptedData = await encrypt(key.trim(), SECRET);
  const adapter = createSqliteAdapter();
  const id = adapter.upsertCredential(name.trim(), type.trim(), encryptedData);
  return NextResponse.json({ id });
}

export async function DELETE(request: Request) {
  const { searchParams } = new URL(request.url);
  const raw = searchParams.get("id");
  if (!raw) return NextResponse.json({ error: "Missing id" }, { status: 400 });

  const id = Number(raw);
  if (!Number.isInteger(id) || id <= 0) {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  }

  const adapter = createSqliteAdapter();
  adapter.deleteCredential(id);
  return NextResponse.json({ ok: true });
}
