import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { executeWorkflow, type Workflow } from "@/lib/workflow-engine";
import { createSqliteAdapter } from "@/lib/db/workflow-adapter";
import { createSqliteHooks } from "@/lib/db/workflow-hooks";
import { CORS_HEADERS } from "@/lib/execution-handler";
import type { EvalResult } from "@/lib/workflow-types";
import { executionSemaphore } from "@/lib/concurrency";
import { readLimitedText, RequestBodyTooLargeError } from "@/lib/request-limit";

const ENCRYPTION_SECRET = process.env.ENCRYPTION_SECRET!;

interface RouteParams { params: Promise<{ slug: string }> }

interface WorkflowRow {
  id: number;
  nodes: string;
  edges: string;
  is_active: number;
  error_workflow_id: number | null;
  pin_data: string | null;
  webhook_token: string | null;
}

/** Resolve the token from either the `x-webhook-secret` header or `?token=` query param. */
function extractToken(request: Request): string | null {
  const header = request.headers.get("x-webhook-secret");
  if (header) return header;
  const url = new URL(request.url);
  return url.searchParams.get("token");
}

async function handleWebhook(request: Request, slug: string): Promise<Response> {
  const db = getDb();

  const workflowRow = db.prepare(
    `SELECT id, nodes, edges, is_active, error_workflow_id, pin_data, webhook_token
     FROM workflows WHERE slug = ?`
  ).get(slug) as unknown as WorkflowRow | undefined;

  if (!workflowRow) {
    return NextResponse.json({ error: "Workflow not found" }, { status: 404, headers: CORS_HEADERS });
  }

  // Token verification first — prevents leaking active/inactive state to unauthenticated callers.
  if (workflowRow.webhook_token) {
    const provided = extractToken(request);
    if (!provided || provided !== workflowRow.webhook_token) {
      return NextResponse.json({ error: "Invalid or missing webhook token" }, { status: 401, headers: CORS_HEADERS });
    }
  }

  if (!workflowRow.is_active) {
    return NextResponse.json({ error: "Workflow is not active" }, { status: 403, headers: CORS_HEADERS });
  }

  let body: Record<string, unknown> = {};
  let rawBody = "";
  try {
    rawBody = await readLimitedText(request);
    if (rawBody.trim()) {
      try {
        body = JSON.parse(rawBody) as Record<string, unknown>;
      } catch {
        // Non-JSON body — pass raw string as { body: "..." }
        body = { body: rawBody };
      }
    }
  } catch (err) {
    if (err instanceof RequestBodyTooLargeError) {
      return NextResponse.json({ error: "Request body too large" }, { status: 413, headers: CORS_HEADERS });
    }
    return NextResponse.json({ error: "Failed to read request body" }, { status: 400, headers: CORS_HEADERS });
  }

  const workflow: Workflow = {
    id: workflowRow.id,
    nodes: JSON.parse(workflowRow.nodes),
    edges: JSON.parse(workflowRow.edges),
    is_active: workflowRow.is_active,
    errorWorkflowId: workflowRow.error_workflow_id ?? null,
    pinData: workflowRow.pin_data
      ? (JSON.parse(workflowRow.pin_data) as Record<string, EvalResult>)
      : undefined,
  };

  const adapter = createSqliteAdapter();
  const hooks = createSqliteHooks(db, workflow.id, null, adapter);

  const acquired = await executionSemaphore.acquire();
  if (!acquired) {
    return NextResponse.json({ error: "Server busy, try again shortly" }, { status: 503, headers: CORS_HEADERS });
  }

  let result, error;
  try {
    ({ result, error } = await executeWorkflow(
      workflow,
      body,
      { method: request.method, url: request.url, rawBody, ip: "" },
      request.headers,
      ENCRYPTION_SECRET,
      adapter,
      hooks
    ));
  } finally {
    executionSemaphore.release();
  }

  if (error) {
    return NextResponse.json({ ok: false, error }, { status: 500, headers: CORS_HEADERS });
  }

  if (!result) {
    return NextResponse.json({ ok: false, error: "No output produced" }, { status: 500 });
  }

  const rv = result.value;

  // Response Builder node — honour custom status + headers
  if (rv !== null && typeof rv === "object" && (rv as Record<string, unknown>).__rb === true) {
    const rb = rv as { status: number; headers: Record<string, string>; body: unknown };
    const responseHeaders = new Headers({ "Content-Type": "application/json", ...CORS_HEADERS });
    for (const [k, v] of Object.entries(rb.headers ?? {})) {
      responseHeaders.set(k, v);
    }
    return new Response(
      typeof rb.body === "string" ? rb.body : JSON.stringify(rb.body),
      { status: rb.status, headers: responseHeaders }
    );
  }

  const output = rv === undefined || rv === null ? "" : typeof rv === "object" ? rv : String(rv);
  return NextResponse.json({ ok: true, output }, { headers: CORS_HEADERS });
}

export async function OPTIONS() {
  return new Response(null, { status: 204, headers: CORS_HEADERS });
}

export async function POST(request: Request, { params }: RouteParams) {
  const { slug } = await params;
  return handleWebhook(request, slug);
}

export async function GET(request: Request, { params }: RouteParams) {
  const { slug } = await params;
  return handleWebhook(request, slug);
}

export async function PUT(request: Request, { params }: RouteParams) {
  const { slug } = await params;
  return handleWebhook(request, slug);
}

export async function PATCH(request: Request, { params }: RouteParams) {
  const { slug } = await params;
  return handleWebhook(request, slug);
}
