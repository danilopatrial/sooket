/**
 * Seed content for the "API Guard (example)" workflow shipped on first run
 * (see migration 013-seed-example-workflow). It demonstrates the core use case:
 * putting rate limiting and PII redaction in front of an upstream API without
 * touching that API's code —
 *
 *   Input → Rate Limiter → PII Redact → HTTP Request → Output
 *
 * Node `type` values, `data` shapes, and the edge handle ids match the canvas
 * registry (`components/canvas/nodes/registry.ts`) and the node components, so
 * the workflow renders fully connected when opened. The HTTP node points at a
 * placeholder upstream and the workflow ships inactive — point it at a real URL
 * and toggle it active to run it live.
 */

interface SeedNode {
  id: string;
  type: string;
  position: { x: number; y: number };
  data: Record<string, unknown>;
  deletable?: boolean;
}

interface SeedEdge {
  id: string;
  source: string;
  target: string;
  sourceHandle?: string;
  /** Omitted for the Output node, whose React Flow handle has no id. */
  targetHandle?: string;
}

const nodes: SeedNode[] = [
  {
    id: "__input",
    type: "workflowInput",
    position: { x: 0, y: 80 },
    data: {},
    deletable: false,
  },
  {
    id: "rate-limiter-1",
    type: "rate-limiter",
    position: { x: 320, y: 80 },
    data: { keySource: "ip", windowSeconds: 60, limit: 100, action: "block", delayMs: 1000 },
  },
  {
    id: "pii-redact-1",
    type: "pii-redact",
    position: { x: 672, y: 80 },
    data: { replacement: "[REDACTED]", customPatterns: [] },
  },
  {
    id: "http-request-1",
    type: "http-request",
    position: { x: 1072, y: 80 },
    data: { method: "POST", url: "https://api.example.com/echo", headers: [], timeout: 10000 },
  },
  {
    id: "workflowOutput-1",
    type: "workflowOutput",
    position: { x: 1504, y: 80 },
    data: {},
  },
];

const edges: SeedEdge[] = [
  {
    id: "edge-input-ratelimiter",
    source: "__input",
    sourceHandle: "body",
    target: "rate-limiter-1",
    targetHandle: "input",
  },
  {
    id: "edge-ratelimiter-piiredact",
    source: "rate-limiter-1",
    sourceHandle: "output",
    target: "pii-redact-1",
    targetHandle: "input",
  },
  {
    id: "edge-piiredact-httprequest",
    source: "pii-redact-1",
    sourceHandle: "output",
    target: "http-request-1",
    targetHandle: "body",
  },
  {
    // Output node's handle has no id, so no targetHandle.
    id: "edge-httprequest-output",
    source: "http-request-1",
    sourceHandle: "res-body",
    target: "workflowOutput-1",
  },
];

export const EXAMPLE_WORKFLOW = {
  slug: "example-api-guard",
  name: "API Guard (example)",
  nodes,
  edges,
  preset: {
    name: "Sample request",
    body: '{\n  "email": "ada@example.com",\n  "note": "call me at 555-123-4567"\n}',
  },
} as const;
