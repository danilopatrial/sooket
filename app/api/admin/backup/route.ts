import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { safeEqual } from "@/lib/security/auth";
import fs from "fs";
import path from "path";

const DATA_DIR = process.env.SOOKET_DATA_DIR ?? path.join(process.cwd(), "data");
const DB_PATH = path.join(DATA_DIR, "sooket.db");

export async function GET(request: Request) {
  const db = getDb();

  // Require the instance-level management key (sk-mw-*).
  const mgmtKey = (
    db.prepare(`SELECT value FROM settings WHERE key = 'api_key'`).get() as
      unknown as { value: string } | undefined
  )?.value;

  if (!mgmtKey) {
    return NextResponse.json(
      { error: "No management key configured. Generate one via POST /api/account/api-key first." },
      { status: 401 }
    );
  }

  const authHeader = request.headers.get("Authorization") ?? "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7).trim() : null;

  if (!token || !safeEqual(token, mgmtKey)) {
    return NextResponse.json({ error: "Invalid or missing management key" }, { status: 401 });
  }

  if (!fs.existsSync(DB_PATH)) {
    return NextResponse.json({ error: "Database file not found" }, { status: 404 });
  }

  const dbBuffer = fs.readFileSync(DB_PATH);
  const filename = `sooket-${new Date().toISOString().slice(0, 10)}.db`;

  return new Response(dbBuffer, {
    status: 200,
    headers: {
      "Content-Type": "application/octet-stream",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Content-Length": String(dbBuffer.byteLength),
    },
  });
}
