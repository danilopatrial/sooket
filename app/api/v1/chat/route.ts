import { NextResponse } from "next/server";
import { handleExecutionRequest, CORS_HEADERS } from "@/lib/execution-handler";
import { readLimitedText, RequestBodyTooLargeError } from "@/lib/request-limit";

// ─── CORS preflight ────────────────────────────────────────────────────────

export async function OPTIONS() {
  return new Response(null, { status: 204, headers: CORS_HEADERS });
}

// ─── Health check ──────────────────────────────────────────────────────────

export async function GET() {
  const allOk = !!process.env.ENCRYPTION_SECRET;
  return NextResponse.json({ ok: allOk, local: true }, { status: allOk ? 200 : 500 });
}

// ─── Workflow execution ────────────────────────────────────────────────────

export async function POST(request: Request) {
  const authHeader = request.headers.get("Authorization") ?? "";
  const apiKey = authHeader.startsWith("Bearer ") ? authHeader.slice(7).trim() : null;

  let rawBody: string;
  try {
    rawBody = await readLimitedText(request);
  } catch (err) {
    if (err instanceof RequestBodyTooLargeError) {
      return new Response(JSON.stringify({ error: "Request body too large" }), {
        status: 413,
        headers: { "Content-Type": "application/json", ...CORS_HEADERS },
      });
    }
    return new Response(JSON.stringify({ error: "Failed to read request body" }), {
      status: 400,
      headers: { "Content-Type": "application/json", ...CORS_HEADERS },
    });
  }

  const forwarded = request.headers.get("x-forwarded-for");
  const ip =
    (forwarded ? forwarded.split(",")[0].trim() : null) ??
    request.headers.get("x-real-ip") ??
    "";

  const { status, body, corsHeaders } = await handleExecutionRequest({
    apiKey,
    rawBody,
    headers: request.headers,
    ip,
    method: request.method,
    url: request.url,
  });

  // ResponseBuilder nodes return a pre-serialised string body; all others return JSON.
  const isStringBody = typeof body === "string";
  const serialized = isStringBody ? body : JSON.stringify(body);
  // 204/205/304 are "null body statuses": the Fetch API throws
  // "Response with null body status cannot have body" if any body (even "") is
  // passed. Send null for those so a ResponseBuilder status: 204 doesn't 500.
  const NULL_BODY_STATUSES = new Set([101, 103, 204, 205, 304]);
  const responseBody = NULL_BODY_STATUSES.has(status) ? null : serialized;
  return new Response(responseBody, {
    status,
    headers: { "Content-Type": "application/json", ...corsHeaders },
  });
}
