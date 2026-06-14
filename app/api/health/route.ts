import { NextResponse } from "next/server";
import { version } from "@/package.json";
import { getDb } from "@/lib/db";
import { probeDatabaseReady, type DbCheckResult } from "@/lib/db/health";

const startTime = Date.now();

/**
 * Whether the caller asked for readiness mode via `?ready=1`.
 *
 * Readiness is opt-in on the same path so it stays inside `isPublicPath()`
 * (which matches `/api/health` exactly — a separate sub-path would not be
 * exempt). Any present, truthy value enables it; `ready=0` / `ready=false`
 * stays on the liveness path. Defensive against a missing/odd request object so
 * the default liveness behavior never regresses.
 */
function readinessRequested(request?: Request): boolean {
  if (!request?.url) return false;
  try {
    const value = new URL(request.url).searchParams.get("ready");
    if (value === null) return false;
    return value !== "0" && value !== "false";
  } catch {
    return false;
  }
}

/** Run the DB readiness probe, treating a failure to even open the DB as an error. */
function probeDb(): DbCheckResult {
  try {
    return probeDatabaseReady(getDb());
  } catch {
    return "error";
  }
}

export async function GET(request?: Request) {
  const base = {
    version,
    uptime: Math.floor((Date.now() - startTime) / 1000),
    timestamp: new Date().toISOString(),
  };

  // Liveness (default): unchanged shape, never touches the DB.
  if (!readinessRequested(request)) {
    return NextResponse.json({ status: "ok", ...base }, { status: 200 });
  }

  // Readiness: probe the DB and surface per-check status. Any failed check →
  // 503 so orchestrators can key off the HTTP status code.
  const db = probeDb();
  const healthy = db === "ok";
  return NextResponse.json(
    { status: healthy ? "ok" : "error", ...base, checks: { db } },
    { status: healthy ? 200 : 503 }
  );
}
