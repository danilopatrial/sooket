/**
 * Integration tests for the expression language in the workflow engine.
 * Verifies that {{ $node.X }}, {{ $json.X }}, {{ $body.X }} expressions
 * inside node.data strings are resolved before the node executor runs.
 */
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { executeWorkflow } from "@/lib/workflow-engine";
import type { Workflow, WorkflowDbAdapter } from "@/lib/workflow-types";
import { NODE_EXECUTOR_REGISTRY } from "@/lib/nodes/registry";
import type { INodeExecutor } from "@/lib/nodes/types";

// ─── Minimal in-memory adapter ────────────────────────────────────────────────

function makeAdapter(): WorkflowDbAdapter {
  return {
    getCustomerVars:               ()  => [],
    getEncryptedProviderKey:       ()  => null,
    getAccessList:                 ()  => [],
    addAccessListEntry:            ()  => {},
    removeAccessListEntry:         ()  => {},
    getCacheEntry:                 ()  => null,
    setCacheEntry:                 ()  => {},
    evictExpiredCacheEntries:      ()  => {},
    getRateLimitCount: () => 0,
    incrementRateLimitCounter:     ()  => 1,
    evictExpiredRateLimitCounters: ()  => {},
    getSemanticCacheEntries:       ()  => [],
    insertSemanticCacheEntry:      ()  => {},
    evictExpiredSemanticCacheEntries: () => {},
    createExecution:               ()  => 1,
    updateExecution:               ()  => {},
    linkExecutionToRequestLog:     ()  => {},
    getWorkflowById:               ()  => null,
    getWorkflowBySlug:             ()  => null,
    getStaticData:                 ()  => ({}),
    saveStaticData:                ()  => {},
    listCredentials:               ()  => [],
    upsertCredential:              ()  => 1,
    deleteCredential:              ()  => {},
    linkCredential:                ()  => {},
    unlinkCredential:              ()  => {},
    getLinkedCredential:           ()  => null,
  };
}

const REQ_CTX = { method: "POST", url: "http://localhost/api/v1/chat", rawBody: "", ip: "127.0.0.1" };
const SECRET  = "test-secret";
const WF_ID   = 1;

// ─── Source node — returns node.data.value as-is ──────────────────────────────

const sourceNode: INodeExecutor = {
  async execute(node) {
    return { value: (node.data as { value: unknown }).value, inputTokens: 0, outputTokens: 0 };
  },
};

// ─── Consumer node — returns the resolved node.data.testField ─────────────────

const consumerNode: INodeExecutor = {
  async execute(node) {
    const value = (node.data as { testField: unknown }).testField;
    return { value, inputTokens: 0, outputTokens: 0 };
  },
};

// ─── Register / unregister test node types ────────────────────────────────────

beforeEach(() => {
  NODE_EXECUTOR_REGISTRY["__exprSource"]   = { 1: sourceNode };
  NODE_EXECUTOR_REGISTRY["__exprConsumer"] = { 1: consumerNode };
});

afterEach(() => {
  delete NODE_EXECUTOR_REGISTRY["__exprSource"];
  delete NODE_EXECUTOR_REGISTRY["__exprConsumer"];
});

// ─── Workflow builders ────────────────────────────────────────────────────────

function twoNodeWorkflow(
  sourceId: string,
  sourceValue: unknown,
  consumerData: Record<string, unknown>
): Workflow {
  return {
    id: WF_ID,
    is_active: 1,
    nodes: [
      { id: sourceId,   type: "__exprSource",   data: { value: sourceValue } },
      { id: "consumer", type: "__exprConsumer",  data: consumerData },
      { id: "output",   type: "workflowOutput",  data: {} },
    ],
    edges: [
      // source → consumer (consumer's primary input = source)
      { id: "e1", source: sourceId, target: "consumer", sourceHandle: null, targetHandle: null },
      // consumer → output
      { id: "e2", source: "consumer", target: "output" },
    ],
  };
}

function bodyOnlyWorkflow(consumerData: Record<string, unknown>): Workflow {
  return {
    id: WF_ID,
    is_active: 1,
    nodes: [
      { id: "consumer", type: "__exprConsumer",  data: consumerData },
      { id: "output",   type: "workflowOutput",  data: {} },
    ],
    edges: [
      { id: "e1", source: "consumer", target: "output" },
    ],
  };
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("expression language — $node.<id>", () => {
  it("resolves $node.srcId when source is upstream (not edge-connected)", async () => {
    // Source is NOT connected via an edge to consumer; referenced only by expression.
    const wf: Workflow = {
      id: WF_ID,
      is_active: 1,
      nodes: [
        { id: "src", type: "__exprSource",   data: { value: "upstream-value" } },
        { id: "consumer", type: "__exprConsumer", data: { testField: "{{ $node.src }}" } },
        { id: "output", type: "workflowOutput", data: {} },
      ],
      edges: [
        { id: "e1", source: "consumer", target: "output" },
      ],
    };
    const r = await executeWorkflow(wf, {}, REQ_CTX, new Headers(), SECRET, makeAdapter());
    expect(r.result?.value).toBe("upstream-value");
  });

  it("resolves $node.id.path with dot-path into object value", async () => {
    const wf = twoNodeWorkflow("src", { user: { name: "Alice" } }, { testField: "{{ $node.src.user.name }}" });
    const r = await executeWorkflow(wf, {}, REQ_CTX, new Headers(), SECRET, makeAdapter());
    expect(r.result?.value).toBe("Alice");
  });

  it("returns raw object for pure expression (entire field is {{ expr }})", async () => {
    const wf = twoNodeWorkflow("src", { x: 1, y: 2 }, { testField: "{{ $node.src }}" });
    const r = await executeWorkflow(wf, {}, REQ_CTX, new Headers(), SECRET, makeAdapter());
    expect(r.result?.value).toEqual({ x: 1, y: 2 });
  });

  it("interpolates into a mixed string", async () => {
    const wf = twoNodeWorkflow("src", "World", { testField: "Hello {{ $node.src }}!" });
    const r = await executeWorkflow(wf, {}, REQ_CTX, new Headers(), SECRET, makeAdapter());
    expect(r.result?.value).toBe("Hello World!");
  });

  it("resolves multiple $node refs in one string", async () => {
    const wf: Workflow = {
      id: WF_ID,
      is_active: 1,
      nodes: [
        { id: "a", type: "__exprSource",   data: { value: "foo" } },
        { id: "b", type: "__exprSource",   data: { value: "bar" } },
        { id: "consumer", type: "__exprConsumer", data: { testField: "{{ $node.a }}-{{ $node.b }}" } },
        { id: "output", type: "workflowOutput", data: {} },
      ],
      edges: [
        { id: "e1", source: "consumer", target: "output" },
      ],
    };
    const r = await executeWorkflow(wf, {}, REQ_CTX, new Headers(), SECRET, makeAdapter());
    expect(r.result?.value).toBe("foo-bar");
  });

  it("keeps verbatim when $node.id not found in workflow", async () => {
    const wf = bodyOnlyWorkflow({ testField: "{{ $node.nonexistent }}" });
    const r = await executeWorkflow(wf, {}, REQ_CTX, new Headers(), SECRET, makeAdapter());
    expect(r.result?.value).toBe("{{ $node.nonexistent }}");
  });

  it("resolves $node.id.path — path returns undefined → kept verbatim", async () => {
    const wf = twoNodeWorkflow("src", { a: 1 }, { testField: "{{ $node.src.missing.deep }}" });
    const r = await executeWorkflow(wf, {}, REQ_CTX, new Headers(), SECRET, makeAdapter());
    // undefined → kept verbatim
    expect(r.result?.value).toBe("{{ $node.src.missing.deep }}");
  });

  it("resolves $node.id with hyphens in the node ID", async () => {
    const wf: Workflow = {
      id: WF_ID,
      is_active: 1,
      nodes: [
        { id: "text-node-123", type: "__exprSource",   data: { value: "hyphen-value" } },
        { id: "consumer", type: "__exprConsumer", data: { testField: "{{ $node.text-node-123 }}" } },
        { id: "output", type: "workflowOutput", data: {} },
      ],
      edges: [
        { id: "e1", source: "consumer", target: "output" },
      ],
    };
    const r = await executeWorkflow(wf, {}, REQ_CTX, new Headers(), SECRET, makeAdapter());
    expect(r.result?.value).toBe("hyphen-value");
  });

  it("resolves expression in nested node.data object field", async () => {
    const headerConsumer: INodeExecutor = {
      async execute(node) {
        const headers = (node.data as { headers: Array<{ key: string; value: string }> }).headers;
        return { value: headers[0]?.value, inputTokens: 0, outputTokens: 0 };
      },
    };
    NODE_EXECUTOR_REGISTRY["__headerConsumer"] = { 1: headerConsumer };

    try {
      const wf: Workflow = {
        id: WF_ID,
        is_active: 1,
        nodes: [
          { id: "tok", type: "__exprSource", data: { value: "Bearer abc123" } },
          { id: "consumer", type: "__headerConsumer", data: { headers: [{ key: "Authorization", value: "{{ $node.tok }}" }] } },
          { id: "output", type: "workflowOutput", data: {} },
        ],
        edges: [{ id: "e1", source: "consumer", target: "output" }],
      };
      const r = await executeWorkflow(wf, {}, REQ_CTX, new Headers(), SECRET, makeAdapter());
      expect(r.result?.value).toBe("Bearer abc123");
    } finally {
      delete NODE_EXECUTOR_REGISTRY["__headerConsumer"];
    }
  });
});

describe("expression language — $body", () => {
  it("resolves $body.field from request body", async () => {
    const wf = bodyOnlyWorkflow({ testField: "{{ $body.message }}" });
    const body = { message: "hello from body" };
    const r = await executeWorkflow(wf, body, REQ_CTX, new Headers(), SECRET, makeAdapter());
    expect(r.result?.value).toBe("hello from body");
  });

  it("resolves $body with nested path", async () => {
    const wf = bodyOnlyWorkflow({ testField: "{{ $body.user.email }}" });
    const body = { user: { email: "test@example.com" } };
    const r = await executeWorkflow(wf, body, REQ_CTX, new Headers(), SECRET, makeAdapter());
    expect(r.result?.value).toBe("test@example.com");
  });

  it("keeps verbatim when $body.path does not exist", async () => {
    const wf = bodyOnlyWorkflow({ testField: "{{ $body.missing }}" });
    const r = await executeWorkflow(wf, {}, REQ_CTX, new Headers(), SECRET, makeAdapter());
    expect(r.result?.value).toBe("{{ $body.missing }}");
  });

  it("resolves $body itself as full body object", async () => {
    const wf = bodyOnlyWorkflow({ testField: "{{ $body }}" });
    const body = { foo: "bar" };
    const r = await executeWorkflow(wf, body, REQ_CTX, new Headers(), SECRET, makeAdapter());
    expect(r.result?.value).toEqual({ foo: "bar" });
  });
});

describe("expression language — $json", () => {
  it("resolves $json.field from primary input value", async () => {
    const wf = twoNodeWorkflow("src", { msg: "from-upstream" }, { testField: "{{ $json.msg }}" });
    const r = await executeWorkflow(wf, {}, REQ_CTX, new Headers(), SECRET, makeAdapter());
    expect(r.result?.value).toBe("from-upstream");
  });

  it("resolves $json as full primary input", async () => {
    const wf = twoNodeWorkflow("src", { x: 99 }, { testField: "{{ $json }}" });
    const r = await executeWorkflow(wf, {}, REQ_CTX, new Headers(), SECRET, makeAdapter());
    expect(r.result?.value).toEqual({ x: 99 });
  });

  it("resolves $json.path when primary input is a string (returns undefined → verbatim)", async () => {
    const wf = twoNodeWorkflow("src", "plain-string", { testField: "{{ $json.field }}" });
    const r = await executeWorkflow(wf, {}, REQ_CTX, new Headers(), SECRET, makeAdapter());
    expect(r.result?.value).toBe("{{ $json.field }}");
  });

  it("keeps verbatim when no primary input is connected", async () => {
    const wf = bodyOnlyWorkflow({ testField: "{{ $json.msg }}" });
    const r = await executeWorkflow(wf, { msg: "body-not-json" }, REQ_CTX, new Headers(), SECRET, makeAdapter());
    expect(r.result?.value).toBe("{{ $json.msg }}");
  });
});

describe("expression language — passthrough", () => {
  it("non-string fields in node.data are not altered", async () => {
    const numericConsumer: INodeExecutor = {
      async execute(node) {
        return { value: (node.data as { count: unknown }).count, inputTokens: 0, outputTokens: 0 };
      },
    };
    NODE_EXECUTOR_REGISTRY["__numericConsumer"] = { 1: numericConsumer };

    try {
      const wf: Workflow = {
        id: WF_ID,
        is_active: 1,
        nodes: [
          { id: "consumer", type: "__numericConsumer", data: { count: 42, flag: true } },
          { id: "output", type: "workflowOutput", data: {} },
        ],
        edges: [{ id: "e1", source: "consumer", target: "output" }],
      };
      const r = await executeWorkflow(wf, {}, REQ_CTX, new Headers(), SECRET, makeAdapter());
      expect(r.result?.value).toBe(42);
    } finally {
      delete NODE_EXECUTOR_REGISTRY["__numericConsumer"];
    }
  });

  it("string without {{ }} is returned unchanged", async () => {
    const wf = bodyOnlyWorkflow({ testField: "just a plain string" });
    const r = await executeWorkflow(wf, {}, REQ_CTX, new Headers(), SECRET, makeAdapter());
    expect(r.result?.value).toBe("just a plain string");
  });
});
