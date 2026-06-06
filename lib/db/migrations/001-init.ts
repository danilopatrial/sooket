import type { DatabaseSync } from "node:sqlite";
import type { Migration } from "../run-migrations";

export const migration: Migration = {
  name: "001-init",
  run(db: DatabaseSync) {
    db.exec(`
      PRAGMA journal_mode = WAL;
      PRAGMA foreign_keys = ON;

      CREATE TABLE IF NOT EXISTS workflows (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        slug TEXT NOT NULL UNIQUE,
        name TEXT NOT NULL DEFAULT 'Untitled Workflow',
        nodes TEXT NOT NULL DEFAULT '[]',
        edges TEXT NOT NULL DEFAULT '[]',
        is_active INTEGER NOT NULL DEFAULT 0,
        api_key TEXT NOT NULL UNIQUE,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now'))
      );

      CREATE TABLE IF NOT EXISTS workflow_provider_keys (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        workflow_id INTEGER NOT NULL REFERENCES workflows(id) ON DELETE CASCADE,
        provider TEXT NOT NULL,
        encrypted_key TEXT NOT NULL,
        UNIQUE(workflow_id, provider)
      );

      CREATE TABLE IF NOT EXISTS provider_keys (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        provider TEXT NOT NULL UNIQUE,
        encrypted_key TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS customer_variables (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        workflow_id INTEGER NOT NULL REFERENCES workflows(id) ON DELETE CASCADE,
        name TEXT NOT NULL,
        encrypted_value TEXT NOT NULL,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        UNIQUE(workflow_id, name)
      );

      CREATE TABLE IF NOT EXISTS request_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        workflow_id INTEGER REFERENCES workflows(id),
        model TEXT,
        input_tokens INTEGER,
        output_tokens INTEGER,
        latency_ms INTEGER,
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
      );

      CREATE TABLE IF NOT EXISTS settings (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS workflow_access_lists (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        workflow_id INTEGER NOT NULL REFERENCES workflows(id) ON DELETE CASCADE,
        value TEXT NOT NULL,
        label TEXT NOT NULL DEFAULT '',
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        UNIQUE(workflow_id, value)
      );

      CREATE INDEX IF NOT EXISTS idx_workflow_access_lists_workflow_id
        ON workflow_access_lists (workflow_id);

      CREATE TABLE IF NOT EXISTS node_execution_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        request_log_id INTEGER REFERENCES request_logs(id) ON DELETE CASCADE,
        node_id TEXT NOT NULL,
        node_type TEXT NOT NULL,
        input_snapshot TEXT,
        output_snapshot TEXT,
        duration_ms INTEGER,
        error TEXT,
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
      );

      CREATE TABLE IF NOT EXISTS node_cache (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL,
        expires_at INTEGER NOT NULL
      );

      CREATE TABLE IF NOT EXISTS semantic_cache (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        workflow_id INTEGER NOT NULL,
        embedding TEXT NOT NULL,
        value TEXT NOT NULL,
        expires_at INTEGER NOT NULL
      );

      CREATE INDEX IF NOT EXISTS idx_semantic_cache_workflow_expires
        ON semantic_cache (workflow_id, expires_at);

      CREATE TABLE IF NOT EXISTS rate_limit_counters (
        key TEXT NOT NULL,
        window_start INTEGER NOT NULL,
        count INTEGER NOT NULL DEFAULT 1,
        PRIMARY KEY (key, window_start)
      );

      CREATE TABLE IF NOT EXISTS workflow_test_presets (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        workflow_id INTEGER NOT NULL REFERENCES workflows(id) ON DELETE CASCADE,
        name TEXT NOT NULL,
        body TEXT NOT NULL,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        UNIQUE(workflow_id, name)
      );

      CREATE TABLE IF NOT EXISTS workflow_api_keys (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        workflow_id INTEGER NOT NULL REFERENCES workflows(id) ON DELETE CASCADE,
        key TEXT NOT NULL UNIQUE,
        label TEXT NOT NULL DEFAULT '',
        scopes TEXT NOT NULL DEFAULT '["execute"]',
        rate_limit_override INTEGER,
        expires_at TEXT,
        last_used_at TEXT,
        is_active INTEGER NOT NULL DEFAULT 1,
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
      );

      CREATE INDEX IF NOT EXISTS idx_workflow_api_keys_key
        ON workflow_api_keys (key);

      CREATE INDEX IF NOT EXISTS idx_workflow_api_keys_workflow
        ON workflow_api_keys (workflow_id);

      CREATE TABLE IF NOT EXISTS executions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        workflow_id INTEGER NOT NULL REFERENCES workflows(id) ON DELETE CASCADE,
        request_log_id INTEGER REFERENCES request_logs(id) ON DELETE SET NULL,
        status TEXT NOT NULL DEFAULT 'running',
        execution_data TEXT NOT NULL DEFAULT '{}',
        started_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now')),
        completed_at TEXT
      );

      CREATE INDEX IF NOT EXISTS idx_executions_workflow_id ON executions (workflow_id);
      CREATE INDEX IF NOT EXISTS idx_executions_status ON executions (status);
    `);
  },
};
