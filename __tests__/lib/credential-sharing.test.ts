// @vitest-environment node
/**
 * Tests for credential sharing — shared credentials table + node-level linking.
 *
 * Adapter tests use a real in-memory SQLite so SQL behaviour (upsert, cascade,
 * index) is exercised without hitting the file system.
 *
 * The engine-resolution test uses a stub adapter to verify that
 * getEncryptedProviderKey is never called when getLinkedCredential returns a
 * non-null value.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { DatabaseSync } from "node:sqlite";
import { migrateCredentials } from "@/lib/db/index";
import { executeWorkflow } from "@/lib/workflow-engine";
import type { Workflow, WorkflowDbAdapter } from "@/lib/workflow-types";
import { NODE_EXECUTOR_REGISTRY } from "@/lib/nodes/registry";
import type { INodeExecutor } from "@/lib/nodes/types";

// ─── In-memory DB setup ───────────────────────────────────────────────────────

let db: DatabaseSync;

vi.mock("@/lib/db", async (importOriginal) => {
  const actual = await importOriginal() as typeof import("@/lib/db");
  return {
    ...actual,
    getDb: () => db,
  };
});

function setupDb(): DatabaseSync {
  const d = new DatabaseSync(":memory:");
  d.exec(`
    PRAGMA foreign_keys = ON;
    CREATE TABLE IF NOT EXISTS workflows (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      slug TEXT NOT NULL UNIQUE,
      api_key TEXT NOT NULL UNIQUE,
      name TEXT NOT NULL DEFAULT 'Test',
      nodes TEXT NOT NULL DEFAULT '[]',
      edges TEXT NOT NULL DEFAULT '[]',
      is_active INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);
  migrateCredentials(d);
  return d;
}

beforeEach(() => {
  db = setupDb();
});

// ─── Adapter import (must come after mock) ────────────────────────────────────

const { createSqliteAdapter } = await import("@/lib/db/workflow-adapter");

// ─── Helpers ──────────────────────────────────────────────────────────────────

function insertWorkflow(id: number): void {
  db.prepare(
    `INSERT INTO workflows (id, slug, api_key) VALUES (?, ?, ?)`
  ).run(id, `wf-${id}`, `key-${id}`);
}

// ─── listCredentials ──────────────────────────────────────────────────────────

describe("listCredentials()", () => {
  it("returns empty array when no credentials exist", () => {
    const adapter = createSqliteAdapter();
    expect(adapter.listCredentials()).toEqual([]);
  });

  it("returns inserted credentials without encrypted_data", () => {
    db.prepare(`INSERT INTO credentials (name, type, encrypted_data) VALUES (?, ?, ?)`).run("My Key", "anthropic", "enc-secret");
    const adapter = createSqliteAdapter();
    const list = adapter.listCredentials();
    expect(list).toHaveLength(1);
    expect(list[0]).toMatchObject({ name: "My Key", type: "anthropic" });
    expect(list[0]).not.toHaveProperty("encrypted_data");
    expect(list[0]).not.toHaveProperty("encryptedData");
  });

  it("returns multiple credentials in insertion order", () => {
    db.prepare(`INSERT INTO credentials (name, type, encrypted_data) VALUES (?, ?, ?)`).run("A", "openai", "enc-a");
    db.prepare(`INSERT INTO credentials (name, type, encrypted_data) VALUES (?, ?, ?)`).run("B", "anthropic", "enc-b");
    const adapter = createSqliteAdapter();
    const list = adapter.listCredentials();
    expect(list).toHaveLength(2);
    expect(list[0].name).toBe("A");
    expect(list[1].name).toBe("B");
  });

  it("each entry has id, name, type, createdAt fields", () => {
    db.prepare(`INSERT INTO credentials (name, type, encrypted_data) VALUES (?, ?, ?)`).run("X", "openai", "enc-x");
    const adapter = createSqliteAdapter();
    const entry = adapter.listCredentials()[0];
    expect(entry).toHaveProperty("id");
    expect(typeof entry.id).toBe("number");
    expect(entry).toHaveProperty("createdAt");
    expect(typeof entry.createdAt).toBe("string");
  });
});

// ─── upsertCredential ─────────────────────────────────────────────────────────

describe("upsertCredential()", () => {
  it("inserts a new credential and returns its id", () => {
    const adapter = createSqliteAdapter();
    const id = adapter.upsertCredential("Prod Key", "anthropic", "enc-data");
    expect(typeof id).toBe("number");
    expect(id).toBeGreaterThan(0);
  });

  it("returned id matches the row in the table", () => {
    const adapter = createSqliteAdapter();
    const id = adapter.upsertCredential("K", "openai", "enc-val");
    const row = db.prepare(`SELECT id FROM credentials WHERE id = ?`).get(id) as { id: number } | undefined;
    expect(row?.id).toBe(id);
  });

  it("on name+type conflict, updates encrypted_data and returns same id", () => {
    const adapter = createSqliteAdapter();
    const id1 = adapter.upsertCredential("My Key", "anthropic", "enc-v1");
    const id2 = adapter.upsertCredential("My Key", "anthropic", "enc-v2");
    expect(id1).toBe(id2);

    const row = db.prepare(`SELECT encrypted_data FROM credentials WHERE id = ?`).get(id1) as { encrypted_data: string };
    expect(row.encrypted_data).toBe("enc-v2");
  });

  it("same name with different type creates a separate row", () => {
    const adapter = createSqliteAdapter();
    const id1 = adapter.upsertCredential("Key", "anthropic", "enc-a");
    const id2 = adapter.upsertCredential("Key", "openai", "enc-b");
    expect(id1).not.toBe(id2);
    expect(adapter.listCredentials()).toHaveLength(2);
  });

  it("stores non-empty encrypted_data string verbatim", () => {
    const adapter = createSqliteAdapter();
    const enc = "aabbccddeeff00112233445566778899aabbccdd";
    adapter.upsertCredential("Hex Key", "custom", enc);
    const row = db.prepare(`SELECT encrypted_data FROM credentials WHERE name = 'Hex Key'`).get() as { encrypted_data: string };
    expect(row.encrypted_data).toBe(enc);
  });
});

// ─── linkCredential + getLinkedCredential round-trip ─────────────────────────

describe("linkCredential() + getLinkedCredential() round-trip", () => {
  it("returns null before any link is created", () => {
    insertWorkflow(1);
    const adapter = createSqliteAdapter();
    expect(adapter.getLinkedCredential(1, "node-abc")).toBeNull();
  });

  it("returns encrypted_data after linking", () => {
    insertWorkflow(1);
    const adapter = createSqliteAdapter();
    const credId = adapter.upsertCredential("Shared Key", "anthropic", "enc-payload");
    adapter.linkCredential(1, "node-abc", credId);
    expect(adapter.getLinkedCredential(1, "node-abc")).toBe("enc-payload");
  });

  it("returns null for a different node_id on the same workflow", () => {
    insertWorkflow(1);
    const adapter = createSqliteAdapter();
    const credId = adapter.upsertCredential("Shared Key", "anthropic", "enc-payload");
    adapter.linkCredential(1, "node-abc", credId);
    expect(adapter.getLinkedCredential(1, "node-xyz")).toBeNull();
  });

  it("returns null for a different workflow_id on the same node_id", () => {
    insertWorkflow(1);
    insertWorkflow(2);
    const adapter = createSqliteAdapter();
    const credId = adapter.upsertCredential("Shared Key", "anthropic", "enc-payload");
    adapter.linkCredential(1, "node-abc", credId);
    expect(adapter.getLinkedCredential(2, "node-abc")).toBeNull();
  });

  it("re-linking a node updates to the new credential", () => {
    insertWorkflow(1);
    const adapter = createSqliteAdapter();
    const id1 = adapter.upsertCredential("Key 1", "anthropic", "enc-1");
    const id2 = adapter.upsertCredential("Key 2", "anthropic", "enc-2");
    adapter.linkCredential(1, "node-abc", id1);
    adapter.linkCredential(1, "node-abc", id2);
    expect(adapter.getLinkedCredential(1, "node-abc")).toBe("enc-2");
  });

  it("multiple nodes in the same workflow link independently", () => {
    insertWorkflow(1);
    const adapter = createSqliteAdapter();
    const id1 = adapter.upsertCredential("K1", "anthropic", "enc-k1");
    const id2 = adapter.upsertCredential("K2", "openai", "enc-k2");
    adapter.linkCredential(1, "nodeA", id1);
    adapter.linkCredential(1, "nodeB", id2);
    expect(adapter.getLinkedCredential(1, "nodeA")).toBe("enc-k1");
    expect(adapter.getLinkedCredential(1, "nodeB")).toBe("enc-k2");
  });
});

// ─── unlinkCredential ─────────────────────────────────────────────────────────

describe("unlinkCredential()", () => {
  it("getLinkedCredential returns null after unlinking", () => {
    insertWorkflow(1);
    const adapter = createSqliteAdapter();
    const credId = adapter.upsertCredential("Key", "anthropic", "enc-data");
    adapter.linkCredential(1, "node-abc", credId);
    adapter.unlinkCredential(1, "node-abc");
    expect(adapter.getLinkedCredential(1, "node-abc")).toBeNull();
  });

  it("unlinking is idempotent — calling twice does not throw", () => {
    insertWorkflow(1);
    const adapter = createSqliteAdapter();
    const credId = adapter.upsertCredential("Key", "anthropic", "enc-data");
    adapter.linkCredential(1, "node-abc", credId);
    adapter.unlinkCredential(1, "node-abc");
    expect(() => adapter.unlinkCredential(1, "node-abc")).not.toThrow();
  });

  it("unlinking a non-existent link does not throw", () => {
    insertWorkflow(1);
    const adapter = createSqliteAdapter();
    expect(() => adapter.unlinkCredential(1, "ghost-node")).not.toThrow();
  });

  it("only unlinks the specified node, not others on the same workflow", () => {
    insertWorkflow(1);
    const adapter = createSqliteAdapter();
    const id1 = adapter.upsertCredential("K1", "anthropic", "enc-1");
    const id2 = adapter.upsertCredential("K2", "anthropic", "enc-2");
    adapter.linkCredential(1, "nodeA", id1);
    adapter.linkCredential(1, "nodeB", id2);
    adapter.unlinkCredential(1, "nodeA");
    expect(adapter.getLinkedCredential(1, "nodeA")).toBeNull();
    expect(adapter.getLinkedCredential(1, "nodeB")).toBe("enc-2");
  });
});

// ─── deleteCredential ─────────────────────────────────────────────────────────

describe("deleteCredential()", () => {
  it("removes the credential from listCredentials", () => {
    const adapter = createSqliteAdapter();
    const id = adapter.upsertCredential("Del Key", "anthropic", "enc-del");
    adapter.deleteCredential(id);
    expect(adapter.listCredentials()).toHaveLength(0);
  });

  it("deleting a non-existent id does not throw", () => {
    const adapter = createSqliteAdapter();
    expect(() => adapter.deleteCredential(9999)).not.toThrow();
  });

  it("deleting a credential cascades to workflow_credentials", () => {
    insertWorkflow(1);
    const adapter = createSqliteAdapter();
    const credId = adapter.upsertCredential("Cascade Key", "anthropic", "enc-cascade");
    adapter.linkCredential(1, "node-x", credId);
    adapter.deleteCredential(credId);
    expect(adapter.getLinkedCredential(1, "node-x")).toBeNull();
  });
});

// ─── Engine resolution: linked credential takes priority ─────────────────────

describe("engine resolution — getLinkedCredential takes priority over getEncryptedProviderKey", () => {
  const testNode: INodeExecutor = {
    async execute(_node, _handle, ctx) {
      const key = await ctx.getProviderKey("anthropic");
      return { value: key, inputTokens: 0, outputTokens: 0 };
    },
  };

  beforeEach(() => {
    NODE_EXECUTOR_REGISTRY["__testCred"] = { 1: testNode };
  });

  afterEach(() => {
    delete NODE_EXECUTOR_REGISTRY["__testCred"];
  });

  function makeWorkflow(): Workflow {
    return {
      id: 1,
      is_active: 1,
      nodes: [
        { id: "cred-node", type: "__testCred", data: {} },
        { id: "out", type: "workflowOutput", data: {} },
      ],
      edges: [{ id: "e1", source: "cred-node", target: "out" }],
    };
  }

  const reqCtx = { method: "POST", url: "http://localhost", rawBody: "", ip: "127.0.0.1" };

  it("calls getEncryptedProviderKey when getLinkedCredential returns null", async () => {
    const getLinkedCredential = vi.fn(() => null as string | null);
    const getEncryptedProviderKey = vi.fn(() => null as string | null);
    const adapter: WorkflowDbAdapter = {
      getCustomerVars:               ()    => [],
      getEncryptedProviderKey,
      getLinkedCredential,
      getAccessList:                 ()    => [],
      addAccessListEntry:            ()    => {},
      removeAccessListEntry:         ()    => {},
      getCacheEntry:                 ()    => null,
      setCacheEntry:                 ()    => {},
      evictExpiredCacheEntries:      ()    => {},
      incrementRateLimitCounter:     ()    => 1,
      evictExpiredRateLimitCounters: ()    => {},
      getSemanticCacheEntries:       ()    => [],
      insertSemanticCacheEntry:      ()    => {},
      evictExpiredSemanticCacheEntries: () => {},
      createExecution:               ()    => 1,
      updateExecution:               ()    => {},
      linkExecutionToRequestLog:     ()    => {},
      getWorkflowById:               ()    => null,
      getWorkflowBySlug:             ()    => null,
      getStaticData:                 ()    => ({}),
      saveStaticData:                ()    => {},
      listCredentials:               ()    => [],
      upsertCredential:              ()    => 1,
      deleteCredential:              ()    => {},
      linkCredential:                ()    => {},
      unlinkCredential:              ()    => {},
    };

    await executeWorkflow(makeWorkflow(), {}, reqCtx, new Headers(), "secret", adapter);
    expect(getLinkedCredential).toHaveBeenCalled();
    expect(getEncryptedProviderKey).toHaveBeenCalled();
  });

  it("does NOT call getEncryptedProviderKey when getLinkedCredential returns a value", async () => {
    // Return a real AES-GCM ciphertext so decryptValue does not throw.
    // We stub the decrypt path by returning a short hex string that we later
    // just check is non-null (we don't care about the plaintext in this test).
    // To avoid real crypto failures, stub decryptValue via the nodes/utils mock.
    const linkedEncrypted = "linked-enc-value";
    const getLinkedCredential = vi.fn(() => linkedEncrypted as string | null);
    const getEncryptedProviderKey = vi.fn(() => null as string | null);

    const adapter: WorkflowDbAdapter = {
      getCustomerVars:               ()    => [],
      getEncryptedProviderKey,
      getLinkedCredential,
      getAccessList:                 ()    => [],
      addAccessListEntry:            ()    => {},
      removeAccessListEntry:         ()    => {},
      getCacheEntry:                 ()    => null,
      setCacheEntry:                 ()    => {},
      evictExpiredCacheEntries:      ()    => {},
      incrementRateLimitCounter:     ()    => 1,
      evictExpiredRateLimitCounters: ()    => {},
      getSemanticCacheEntries:       ()    => [],
      insertSemanticCacheEntry:      ()    => {},
      evictExpiredSemanticCacheEntries: () => {},
      createExecution:               ()    => 1,
      updateExecution:               ()    => {},
      linkExecutionToRequestLog:     ()    => {},
      getWorkflowById:               ()    => null,
      getWorkflowBySlug:             ()    => null,
      getStaticData:                 ()    => ({}),
      saveStaticData:                ()    => {},
      listCredentials:               ()    => [],
      upsertCredential:              ()    => 1,
      deleteCredential:              ()    => {},
      linkCredential:                ()    => {},
      unlinkCredential:              ()    => {},
    };

    // decryptValue will fail on the fake string — override it for this test only
    // by making the node not fail. We spy on the adapter instead to check the
    // dispatch order, then verify the engine surfaced an error (decrypt failed)
    // but getEncryptedProviderKey was never reached.
    const { error } = await executeWorkflow(makeWorkflow(), {}, reqCtx, new Headers(), "secret", adapter);

    // getLinkedCredential was called for the node
    expect(getLinkedCredential).toHaveBeenCalledWith(1, "cred-node");
    // getEncryptedProviderKey must NOT have been called — linked took priority
    expect(getEncryptedProviderKey).not.toHaveBeenCalled();
    // The engine will surface a decrypt error since linkedEncrypted is not valid
    // ciphertext — but that is fine; the routing test only cares about call order.
    expect(error).toBeDefined();
  });

  it("returns null when both getLinkedCredential and getEncryptedProviderKey return null", async () => {
    const adapter: WorkflowDbAdapter = {
      getCustomerVars:               ()    => [],
      getEncryptedProviderKey:       ()    => null,
      getLinkedCredential:           ()    => null,
      getAccessList:                 ()    => [],
      addAccessListEntry:            ()    => {},
      removeAccessListEntry:         ()    => {},
      getCacheEntry:                 ()    => null,
      setCacheEntry:                 ()    => {},
      evictExpiredCacheEntries:      ()    => {},
      incrementRateLimitCounter:     ()    => 1,
      evictExpiredRateLimitCounters: ()    => {},
      getSemanticCacheEntries:       ()    => [],
      insertSemanticCacheEntry:      ()    => {},
      evictExpiredSemanticCacheEntries: () => {},
      createExecution:               ()    => 1,
      updateExecution:               ()    => {},
      linkExecutionToRequestLog:     ()    => {},
      getWorkflowById:               ()    => null,
      getWorkflowBySlug:             ()    => null,
      getStaticData:                 ()    => ({}),
      saveStaticData:                ()    => {},
      listCredentials:               ()    => [],
      upsertCredential:              ()    => 1,
      deleteCredential:              ()    => {},
      linkCredential:                ()    => {},
      unlinkCredential:              ()    => {},
    };

    const { result } = await executeWorkflow(makeWorkflow(), {}, reqCtx, new Headers(), "secret", adapter);
    expect(result?.value).toBeNull();
  });
});
