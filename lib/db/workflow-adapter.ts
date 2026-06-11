import { DatabaseSync } from "node:sqlite";
import { getDb } from "@/lib/db";
import type { WorkflowDbAdapter, IRunExecutionData } from "@/lib/workflow-types";

export function createSqliteAdapter(db?: DatabaseSync): WorkflowDbAdapter {
  const resolvedDb = db ?? getDb();

  return {
    getCustomerVars(workflowId) {
      const rows = resolvedDb.prepare(
        `SELECT name, encrypted_value FROM customer_variables WHERE workflow_id = ?`
      ).all(workflowId) as Array<{ name: string; encrypted_value: string }>;
      return rows.map((r) => ({ name: r.name, encryptedValue: r.encrypted_value }));
    },

    getEncryptedProviderKey(workflowId, provider) {
      const row = resolvedDb.prepare(
        `SELECT encrypted_key FROM workflow_provider_keys WHERE workflow_id = ? AND provider = ?`
      ).get(workflowId, provider) as { encrypted_key: string } | undefined;
      return row?.encrypted_key ?? null;
    },

    getAccessList(workflowId) {
      const rows = resolvedDb.prepare(
        `SELECT value FROM workflow_access_lists WHERE workflow_id = ?`
      ).all(workflowId) as Array<{ value: string }>;
      return rows.map((r) => r.value);
    },

    addAccessListEntry(workflowId, value, ruleType) {
      resolvedDb.prepare(
        `INSERT INTO workflow_access_lists (workflow_id, value, label, rule_type) VALUES (?, ?, '', ?)
         ON CONFLICT(workflow_id, value) DO NOTHING`
      ).run(workflowId, value, ruleType);
    },

    removeAccessListEntry(workflowId, value) {
      resolvedDb.prepare(
        `DELETE FROM workflow_access_lists WHERE workflow_id = ? AND value = ?`
      ).run(workflowId, value);
    },

    getCacheEntry(key, now) {
      const row = resolvedDb.prepare(
        `SELECT value FROM node_cache WHERE key = ? AND expires_at > ?`
      ).get(key, now) as { value: string } | undefined;
      return row?.value ?? null;
    },

    setCacheEntry(key, value, expiresAt) {
      resolvedDb.prepare(
        `INSERT INTO node_cache (key, value, expires_at) VALUES (?, ?, ?)
         ON CONFLICT(key) DO UPDATE SET value = excluded.value, expires_at = excluded.expires_at`
      ).run(key, value, expiresAt);
    },

    evictExpiredCacheEntries(now) {
      resolvedDb.prepare(`DELETE FROM node_cache WHERE expires_at <= ?`).run(now);
    },

    getRateLimitCount(key, windowStart) {
      const row = resolvedDb.prepare(
        `SELECT count FROM rate_limit_counters WHERE key = ? AND window_start = ?`
      ).get(key, windowStart) as { count: number } | undefined;
      return row?.count ?? 0;
    },

    incrementRateLimitCounter(key, windowStart) {
      const row = resolvedDb.prepare(
        `INSERT INTO rate_limit_counters (key, window_start, count) VALUES (?, ?, 1)
         ON CONFLICT(key, window_start) DO UPDATE SET count = count + 1
         RETURNING count`
      ).get(key, windowStart) as { count: number };
      return row.count;
    },

    evictExpiredRateLimitCounters(windowStart) {
      resolvedDb.prepare(`DELETE FROM rate_limit_counters WHERE window_start < ?`).run(windowStart);
    },

    getSemanticCacheEntries(workflowId, now) {
      return resolvedDb.prepare(
        `SELECT id, embedding, value FROM semantic_cache WHERE workflow_id = ? AND expires_at > ?`
      ).all(workflowId, now) as Array<{ id: number; embedding: string; value: string }>;
    },

    insertSemanticCacheEntry(workflowId, embedding, value, expiresAt) {
      resolvedDb.prepare(
        `INSERT INTO semantic_cache (workflow_id, embedding, value, expires_at) VALUES (?, ?, ?, ?)`
      ).run(workflowId, embedding, value, expiresAt);
    },

    evictExpiredSemanticCacheEntries(now) {
      resolvedDb.prepare(`DELETE FROM semantic_cache WHERE expires_at <= ?`).run(now);
    },

    createExecution(workflowId, startedAt) {
      const { lastInsertRowid } = resolvedDb.prepare(
        `INSERT INTO executions (workflow_id, status, execution_data, started_at) VALUES (?, 'running', '{}', ?)`
      ).run(workflowId, startedAt);
      return Number(lastInsertRowid);
    },

    updateExecution(executionId, data: IRunExecutionData) {
      resolvedDb.prepare(
        `UPDATE executions
         SET status = ?,
             execution_data = ?,
             updated_at = datetime('now'),
             completed_at = CASE WHEN ? IN ('completed','failed') THEN datetime('now') ELSE NULL END
         WHERE id = ?`
      ).run(data.status, JSON.stringify(data), data.status, executionId);
    },

    linkExecutionToRequestLog(executionId, requestLogId) {
      resolvedDb.prepare(
        `UPDATE executions SET request_log_id = ? WHERE id = ?`
      ).run(requestLogId, executionId);
    },

    getStaticData(workflowId) {
      const row = resolvedDb.prepare(
        `SELECT static_data FROM workflows WHERE id = ?`
      ).get(workflowId) as { static_data: string | null } | undefined;
      if (!row?.static_data) return {};
      try {
        return JSON.parse(row.static_data) as Record<string, unknown>;
      } catch {
        return {};
      }
    },

    saveStaticData(workflowId, data) {
      resolvedDb.prepare(
        `UPDATE workflows SET static_data = ?, updated_at = datetime('now') WHERE id = ?`
      ).run(JSON.stringify(data), workflowId);
    },

    getWorkflowById(id) {
      const row = resolvedDb.prepare(
        `SELECT id, nodes, edges, is_active, error_workflow_id, static_data FROM workflows WHERE id = ?`
      ).get(id) as { id: number; nodes: string; edges: string; is_active: number; error_workflow_id: number | null; static_data: string | null } | undefined;
      if (!row) return null;
      return {
        id: row.id,
        nodes: JSON.parse(row.nodes),
        edges: JSON.parse(row.edges),
        is_active: row.is_active,
        errorWorkflowId: row.error_workflow_id,
        staticData: row.static_data ? (JSON.parse(row.static_data) as Record<string, unknown>) : undefined,
      };
    },

    getWorkflowBySlug(slug) {
      const row = resolvedDb.prepare(
        `SELECT id, nodes, edges, is_active, error_workflow_id, static_data FROM workflows WHERE slug = ?`
      ).get(slug) as { id: number; nodes: string; edges: string; is_active: number; error_workflow_id: number | null; static_data: string | null } | undefined;
      if (!row) return null;
      return {
        id: row.id,
        nodes: JSON.parse(row.nodes),
        edges: JSON.parse(row.edges),
        is_active: row.is_active,
        errorWorkflowId: row.error_workflow_id,
        staticData: row.static_data ? (JSON.parse(row.static_data) as Record<string, unknown>) : undefined,
      };
    },

    listCredentials() {
      const rows = resolvedDb.prepare(
        `SELECT id, name, type, created_at FROM credentials ORDER BY id`
      ).all() as Array<{ id: number; name: string; type: string; created_at: string }>;
      return rows.map((r) => ({ id: r.id, name: r.name, type: r.type, createdAt: r.created_at }));
    },

    upsertCredential(name, type, encryptedData) {
      const row = resolvedDb.prepare(
        `INSERT INTO credentials (name, type, encrypted_data)
         VALUES (?, ?, ?)
         ON CONFLICT(name, type) DO UPDATE SET encrypted_data = excluded.encrypted_data
         RETURNING id`
      ).get(name, type, encryptedData) as { id: number };
      return row.id;
    },

    deleteCredential(id) {
      resolvedDb.prepare(`DELETE FROM credentials WHERE id = ?`).run(id);
    },

    linkCredential(workflowId, nodeId, credentialId) {
      resolvedDb.prepare(
        `INSERT INTO workflow_credentials (workflow_id, node_id, credential_id)
         VALUES (?, ?, ?)
         ON CONFLICT(workflow_id, node_id) DO UPDATE SET credential_id = excluded.credential_id`
      ).run(workflowId, nodeId, credentialId);
    },

    unlinkCredential(workflowId, nodeId) {
      resolvedDb.prepare(
        `DELETE FROM workflow_credentials WHERE workflow_id = ? AND node_id = ?`
      ).run(workflowId, nodeId);
    },

    getLinkedCredential(workflowId, nodeId) {
      const row = resolvedDb.prepare(
        `SELECT c.encrypted_data
         FROM workflow_credentials wc
         JOIN credentials c ON c.id = wc.credential_id
         WHERE wc.workflow_id = ? AND wc.node_id = ?`
      ).get(workflowId, nodeId) as { encrypted_data: string } | undefined;
      return row?.encrypted_data ?? null;
    },
  };
}
