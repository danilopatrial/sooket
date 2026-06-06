import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { executeWorkflow, type Workflow } from "@/lib/workflow-engine";
import { createSqliteAdapter } from "@/lib/db/workflow-adapter";
import { createSqliteHooks } from "@/lib/db/workflow-hooks";
import { serializeTraces } from "@/lib/serialize-traces";
import type { EvalResult, WorkflowEdge } from "@/lib/workflow-types";
import { findAncestors } from "@/lib/graph";
import { readLimitedText, RequestBodyTooLargeError } from "@/lib/request-limit";

const ENCRYPTION_SECRET = process.env.ENCRYPTION_SECRET!;

interface RouteParams { params: Promise<{ slug: string }> }

export async function POST(request: Request, { params }: RouteParams) {
  const { slug } = await params;
  const db = getDb();

  const workflowRow = db.prepare(
    `SELECT id, nodes, edges, is_active, error_workflow_id, pin_data FROM workflows WHERE slug = ?`
  ).get(slug) as unknown as { id: number; nodes: string; edges: string; is_active: number; error_workflow_id: number | null; pin_data: string | null } | undefined;

  if (!workflowRow) return NextResponse.json({ error: "Workflow not found" }, { status: 404 });

  let parsed: Record<string, unknown> = {};
  let rawBody = "";
  // Cap the body like the live and webhook routes — the debug path runs the same
  // workflow engine and previously read the whole body into memory unbounded.
  try {
    rawBody = await readLimitedText(request);
  } catch (err) {
    if (err instanceof RequestBodyTooLargeError) {
      return NextResponse.json({ error: "Request body too large" }, { status: 413 });
    }
    return NextResponse.json({ error: "Failed to read request body" }, { status: 400 });
  }
  try {
    if (rawBody.trim()) parsed = JSON.parse(rawBody) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  // Caller may supply current canvas state so the sandbox reflects unsaved changes.
  const { __nodes, __edges, __headers: rawHeaders, __query: rawQuery, __startNodeId: rawStartNodeId, ...body } = parsed as {
    __nodes?: unknown;
    __edges?: unknown;
    __headers?: unknown;
    __query?: unknown;
    __startNodeId?: unknown;
    [k: string]: unknown;
  };

  const startNodeId = typeof rawStartNodeId === "string" ? rawStartNodeId : null;

  // Re-derive rawBody without the internal keys so the workflow's "raw" handle
  // sees only the user-supplied payload.
  if (__nodes !== undefined || __edges !== undefined) {
    rawBody = JSON.stringify(body);
  }

  const resolvedEdges: WorkflowEdge[] = Array.isArray(__edges) ? __edges as WorkflowEdge[] : JSON.parse(workflowRow.edges) as WorkflowEdge[];

  const workflow: Workflow = {
    id: workflowRow.id,
    nodes: Array.isArray(__nodes) ? __nodes : JSON.parse(workflowRow.nodes),
    edges: resolvedEdges,
    is_active: workflowRow.is_active,
    errorWorkflowId: workflowRow.error_workflow_id ?? null,
    pinData: workflowRow.pin_data ? (JSON.parse(workflowRow.pin_data) as Record<string, EvalResult>) : undefined,
  };

  // Partial re-execution: pin all ancestor nodes using the last execution's full output cache.
  // Uses executions.execution_data (untruncated EvalResult objects) instead of
  // node_execution_logs.output_snapshot which is capped at 4 KB.
  if (startNodeId) {
    const ancestorIds = findAncestors(startNodeId, resolvedEdges);
    if (ancestorIds.size > 0) {
      const lastExecRow = db.prepare(
        `SELECT execution_data FROM executions
         WHERE workflow_id = ? AND status != 'running'
         ORDER BY id DESC LIMIT 1`
      ).get(workflowRow.id) as { execution_data: string } | undefined;

      if (lastExecRow) {
        try {
          const execData = JSON.parse(lastExecRow.execution_data) as { nodeOutputs?: Record<string, EvalResult> };
          const nodeOutputs = execData.nodeOutputs ?? {};
          const ephemeralPinData: Record<string, EvalResult> = { ...(workflow.pinData ?? {}) };

          for (const nodeId of ancestorIds) {
            // Cache keys are "nodeId:sourceHandle" — pick the primary (first matching) key
            const matchingKey = Object.keys(nodeOutputs).find(
              (k) => k === `${nodeId}:` || k.startsWith(`${nodeId}:`)
            );
            if (matchingKey) {
              ephemeralPinData[nodeId] = nodeOutputs[matchingKey];
            }
          }

          workflow.pinData = ephemeralPinData;
        } catch {
          // Malformed execution_data — ancestors will re-execute from scratch
        }
      }
    }
  }

  // Build Headers from __headers sandbox input
  const sandboxHeaders = new Headers({ "content-type": "application/json" });
  if (rawHeaders && typeof rawHeaders === "object" && !Array.isArray(rawHeaders)) {
    for (const [k, v] of Object.entries(rawHeaders as Record<string, unknown>)) {
      if (typeof v === "string") sandboxHeaders.set(k, v);
    }
  }

  // Build a URL with query params from __query sandbox input
  let sandboxUrl = request.url;
  if (rawQuery && typeof rawQuery === "object" && !Array.isArray(rawQuery)) {
    const u = new URL(request.url);
    for (const [k, v] of Object.entries(rawQuery as Record<string, unknown>)) {
      if (typeof v === "string") u.searchParams.set(k, v);
    }
    sandboxUrl = u.toString();
  }

  const adapter = createSqliteAdapter();
  const hooks = createSqliteHooks(db, workflow.id, null, adapter);

  const { result, traces, error } = await executeWorkflow(
    workflow,
    body,
    { method: "POST", url: sandboxUrl, rawBody, ip: "" },
    sandboxHeaders,
    ENCRYPTION_SECRET,
    adapter,
    hooks
  );

  if (error) {
    return NextResponse.json({ ok: false, error, traces: serializeTraces(traces) });
  }

  if (!result) {
    return NextResponse.json({ ok: false, error: "No active path reached any output node", traces: serializeTraces(traces) });
  }

  const rv = result.value;
  let output: unknown;
  if (rv !== null && typeof rv === "object" && (rv as Record<string, unknown>).__rb === true) {
    const rb = rv as { status: number; headers: Record<string, string>; body: unknown };
    output = { __responseBuilder: true, status: rb.status, headers: rb.headers, body: rb.body };
  } else {
    output = rv === undefined || rv === null ? "" : typeof rv === "object" ? rv : String(rv);
  }

  return NextResponse.json({ ok: true, output, traces: serializeTraces(traces) });
}
