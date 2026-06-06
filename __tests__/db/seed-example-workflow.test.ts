import { describe, it, expect } from "vitest";
import { DatabaseSync } from "node:sqlite";

import { EXAMPLE_WORKFLOW } from "@/lib/db/seed/example-workflow";
import { NODE_EXECUTOR_REGISTRY } from "@/lib/nodes/registry";
import { runMigrations } from "@/lib/db/run-migrations";
import { ALL_MIGRATIONS } from "@/lib/db/migrations";

// Node types handled directly by the engine rather than the executor registry.
const ENGINE_NODE_TYPES = new Set(["workflowInput", "workflowOutput"]);

describe("EXAMPLE_WORKFLOW structure", () => {
  it("has exactly one workflowInput node", () => {
    const inputs = EXAMPLE_WORKFLOW.nodes.filter((n) => n.type === "workflowInput");
    expect(inputs).toHaveLength(1);
  });

  it("uses node types that are either engine-special or in the executor registry", () => {
    for (const node of EXAMPLE_WORKFLOW.nodes) {
      const known = ENGINE_NODE_TYPES.has(node.type) || node.type in NODE_EXECUTOR_REGISTRY;
      expect(known, `unknown node type "${node.type}"`).toBe(true);
    }
  });

  it("only has edges that reference existing nodes", () => {
    const ids = new Set(EXAMPLE_WORKFLOW.nodes.map((n) => n.id));
    for (const edge of EXAMPLE_WORKFLOW.edges) {
      expect(ids.has(edge.source), `edge ${edge.id} source`).toBe(true);
      expect(ids.has(edge.target), `edge ${edge.id} target`).toBe(true);
    }
  });

  it("has unique node and edge ids", () => {
    const nodeIds = EXAMPLE_WORKFLOW.nodes.map((n) => n.id);
    const edgeIds = EXAMPLE_WORKFLOW.edges.map((e) => e.id);
    expect(new Set(nodeIds).size).toBe(nodeIds.length);
    expect(new Set(edgeIds).size).toBe(edgeIds.length);
  });
});

describe("013-seed-example-workflow migration", () => {
  it("seeds one inactive workflow with a default key and preset", () => {
    const db = new DatabaseSync(":memory:");
    runMigrations(db, ALL_MIGRATIONS);

    const wf = db.prepare(
      `SELECT id, name, is_active FROM workflows WHERE slug = ?`
    ).get(EXAMPLE_WORKFLOW.slug) as { id: number; name: string; is_active: number } | undefined;

    expect(wf).toBeDefined();
    expect(wf!.name).toBe(EXAMPLE_WORKFLOW.name);
    expect(wf!.is_active).toBe(0);

    const keyCount = db.prepare(
      `SELECT COUNT(*) AS c FROM workflow_api_keys WHERE workflow_id = ?`
    ).get(wf!.id) as { c: number };
    expect(keyCount.c).toBe(1);

    const presetCount = db.prepare(
      `SELECT COUNT(*) AS c FROM workflow_test_presets WHERE workflow_id = ?`
    ).get(wf!.id) as { c: number };
    expect(presetCount.c).toBe(1);

    db.close();
  });

  it("is a no-op when re-run (does not duplicate the example)", () => {
    const db = new DatabaseSync(":memory:");
    runMigrations(db, ALL_MIGRATIONS);
    // Re-running should be tracked as already-applied and insert nothing more.
    runMigrations(db, ALL_MIGRATIONS);

    const count = db.prepare(
      `SELECT COUNT(*) AS c FROM workflows WHERE slug = ?`
    ).get(EXAMPLE_WORKFLOW.slug) as { c: number };
    expect(count.c).toBe(1);

    db.close();
  });
});
