import { DatabaseSync } from "node:sqlite";
import type { WorkflowHooks, WorkflowExecutionResult, WorkflowDbAdapter } from "@/lib/workflow-types";

export function createSqliteHooks(
  db: DatabaseSync,
  workflowId: number,
  apiKeyId: number | null,
  adapter: WorkflowDbAdapter
): WorkflowHooks {
  let executionId = 0;
  let startedAt = "";
  let finalCacheSnapshot: Record<string, import("@/lib/workflow-types").EvalResult> = {};

  return {
    onWorkflowStart(_workflow, _body): void {
      try {
        startedAt = new Date().toISOString();
        executionId = adapter.createExecution(workflowId, startedAt);
      } catch { /* non-critical */ }
    },

    onNodeEnd(trace, cacheSnapshot): void {
      finalCacheSnapshot = cacheSnapshot;
      if (!executionId) return;
      try {
        adapter.updateExecution(executionId, {
          nodeOutputs: cacheSnapshot,
          lastCompletedNodeId: trace.nodeId,
          startedAt,
          status: "running",
        });
      } catch { /* non-critical */ }
    },

    getExecutionId(): string | undefined {
      return executionId ? String(executionId) : undefined;
    },

    onWorkflowEnd(result: WorkflowExecutionResult, latencyMs: number): void {
      if (executionId) {
        try {
          adapter.updateExecution(executionId, {
            nodeOutputs: finalCacheSnapshot,
            lastCompletedNodeId: "",
            startedAt,
            status: result.error ? "failed" : "completed",
            error: result.error,
          });
        } catch { /* non-critical */ }
      }

      setImmediate(() => {
        try {
          const logStmt = apiKeyId != null
            ? db.prepare(
                `INSERT INTO request_logs (workflow_id, api_key_id, model, input_tokens, output_tokens, latency_ms) VALUES (?, ?, ?, ?, ?, ?)`
              )
            : db.prepare(
                `INSERT INTO request_logs (workflow_id, model, input_tokens, output_tokens, latency_ms) VALUES (?, ?, ?, ?, ?)`
              );

          const nodeStmt = db.prepare(
            `INSERT INTO node_execution_logs (request_log_id, node_id, node_type, input_snapshot, output_snapshot, duration_ms, error) VALUES (?, ?, ?, ?, ?, ?, ?)`
          );

          db.exec("BEGIN");
          try {
            const logArgs = apiKeyId != null
              ? [workflowId, apiKeyId, result.result?.model ?? null, result.result?.inputTokens ?? 0, result.result?.outputTokens ?? 0, latencyMs]
              : [workflowId, result.result?.model ?? null, result.result?.inputTokens ?? 0, result.result?.outputTokens ?? 0, latencyMs];

            const { lastInsertRowid } = logStmt.run(...logArgs);
            const requestLogId = Number(lastInsertRowid);

            for (const t of result.traces) {
              nodeStmt.run(requestLogId, t.nodeId, t.nodeType, t.inputSnapshot, t.outputSnapshot, t.durationMs, t.error ?? null);
            }

            if (executionId) {
              adapter.linkExecutionToRequestLog(executionId, requestLogId);
            }

            db.exec("COMMIT");
          } catch (e) {
            db.exec("ROLLBACK");
            throw e;
          }
        } catch { /* non-critical */ }
      });
    },
  };
}
