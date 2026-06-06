import type { INodeExecutor, NodeContext } from "./types";
import type { WorkflowNode, EvalResult } from "@/lib/workflow-types";
import { resolveVars } from "./utils";

class VectorSearchNode implements INodeExecutor {
  async execute(node: WorkflowNode, sourceHandle: string | null | undefined, ctx: NodeContext) {
    const embeddingSrc = ctx.inputFor("embedding");
    if (!embeddingSrc) throw new Error("Vector Search has no embedding input connected");

    const embeddingResult = await ctx.evalInput(embeddingSrc);
    if (embeddingResult.active === false) return { value: undefined, active: false, inputTokens: 0, outputTokens: 0 };

    const rawEmbedding = embeddingResult.value;
    let embedding: number[];
    if (Array.isArray(rawEmbedding)) {
      embedding = rawEmbedding.map(Number);
    } else if (typeof rawEmbedding === "string") {
      try {
        const parsed = JSON.parse(rawEmbedding);
        if (!Array.isArray(parsed)) throw new Error("Parsed embedding is not an array");
        embedding = parsed.map(Number);
      } catch {
        throw new Error("Vector Search: embedding input is not a valid float array or JSON array string");
      }
    } else {
      throw new Error("Vector Search: embedding input must be an array of floats");
    }
    if (embedding.length === 0) throw new Error("Vector Search: embedding array is empty");

    const {
      provider     = "supabase",
      supabaseUrl  = "",
      supabaseKey  = "",
      functionName = "match_documents",
      matchCount   = 5,
      pineconeHost = "",
      pineconeKey  = "",
      namespace    = "",
      topK         = 5,
      timeout      = 15000,
    } = (node.data as unknown) as {
      provider?: string; supabaseUrl?: string; supabaseKey?: string;
      functionName?: string; matchCount?: number;
      pineconeHost?: string; pineconeKey?: string; namespace?: string; topK?: number;
      timeout?: number;
    };

    // Fall back to the 15 s default for missing, zero, negative, or non-finite values.
    const safeTimeout = Number.isFinite(timeout) && timeout > 0 ? Math.floor(timeout) : 15000;

    let results: unknown[] = [];

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), safeTimeout);

    try {
      if (provider === "supabase") {
        const url  = resolveVars(supabaseUrl,  ctx.vars).replace(/\/$/, "");
        const key  = resolveVars(supabaseKey,  ctx.vars);
        const func = resolveVars(functionName, ctx.vars);
        const k    = Math.max(1, matchCount);

        if (!url)  throw new Error("Vector Search (Supabase): supabaseUrl is not configured");
        if (!key)  throw new Error("Vector Search (Supabase): supabaseKey is not configured");
        if (!func) throw new Error("Vector Search (Supabase): functionName is not configured");

        const res = await fetch(`${url}/rest/v1/rpc/${func}`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            apikey:          key,
            Authorization:  `Bearer ${key}`,
          },
          body: JSON.stringify({ query_embedding: embedding, match_count: k }),
          signal: controller.signal,
        });

        if (!res.ok) {
          const errText = await res.text();
          throw new Error(`Vector Search (Supabase) error ${res.status}: ${errText}`);
        }
        results = (await res.json()) as unknown[];
        if (!Array.isArray(results)) results = [];

      } else {
        const host   = resolveVars(pineconeHost, ctx.vars).replace(/\/$/, "");
        const apiKey = resolveVars(pineconeKey,  ctx.vars);
        const ns     = resolveVars(namespace,    ctx.vars);
        const k      = Math.max(1, topK);

        if (!host)   throw new Error("Vector Search (Pinecone): indexHost is not configured");
        if (!apiKey) throw new Error("Vector Search (Pinecone): apiKey is not configured");

        const searchBody: Record<string, unknown> = {
          vector: embedding, topK: k, includeMetadata: true, includeValues: false,
        };
        if (ns) searchBody.namespace = ns;

        const res = await fetch(`https://${host}/query`, {
          method: "POST",
          headers: { "Content-Type": "application/json", "Api-Key": apiKey },
          body: JSON.stringify(searchBody),
          signal: controller.signal,
        });

        if (!res.ok) {
          const errText = await res.text();
          throw new Error(`Vector Search (Pinecone) error ${res.status}: ${errText}`);
        }
        const json = await res.json() as { matches?: unknown[] };
        results = Array.isArray(json.matches) ? json.matches : [];
      }
    } finally {
      clearTimeout(timer);
    }

    const resultsResult: EvalResult = { value: results,        inputTokens: 0, outputTokens: 0 };
    const countResult:   EvalResult = { value: results.length, inputTokens: 0, outputTokens: 0 };
    ctx.cache.set(`${ctx.nodeId}:results`, resultsResult);
    ctx.cache.set(`${ctx.nodeId}:count`,   countResult);

    if (sourceHandle === "count") return countResult;
    return resultsResult;
  }
}

export const execute = new VectorSearchNode();
