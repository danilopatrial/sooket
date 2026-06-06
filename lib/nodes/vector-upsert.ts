import type { INodeExecutor, NodeContext } from "./types";
import type { WorkflowNode, EvalResult } from "@/lib/workflow-types";
import { resolveVars } from "./utils";

class VectorUpsertNode implements INodeExecutor {
  async execute(node: WorkflowNode, sourceHandle: string | null | undefined, ctx: NodeContext) {
    const embeddingSrc = ctx.inputFor("embedding");
    if (!embeddingSrc) throw new Error("Vector Upsert has no embedding input connected");

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
        throw new Error("Vector Upsert: embedding input is not a valid float array or JSON array string");
      }
    } else {
      throw new Error("Vector Upsert: embedding input must be an array of floats");
    }
    if (embedding.length === 0) throw new Error("Vector Upsert: embedding array is empty");

    const contentSrc  = ctx.inputFor("content");
    const metadataSrc = ctx.inputFor("metadata");
    const idSrc       = ctx.inputFor("id");

    let contentVal:  unknown = undefined;
    let metadataVal: unknown = undefined;
    let idVal:       unknown = undefined;

    if (contentSrc) {
      const r = await ctx.evalInput(contentSrc);
      if (r.active !== false) contentVal = r.value;
    }
    if (metadataSrc) {
      const r = await ctx.evalInput(metadataSrc);
      if (r.active !== false) {
        if (typeof r.value === "string") {
          try { metadataVal = JSON.parse(r.value); } catch { metadataVal = { raw: r.value }; }
        } else {
          metadataVal = r.value;
        }
      }
    }
    if (idSrc) {
      const r = await ctx.evalInput(idSrc);
      if (r.active !== false) idVal = r.value;
    }

    const {
      provider        = "supabase",
      supabaseUrl     = "",
      supabaseKey     = "",
      tableName       = "documents",
      embeddingColumn = "embedding",
      contentColumn   = "content",
      metadataColumn  = "metadata",
      upsert          = false,
      pineconeHost    = "",
      pineconeKey     = "",
      namespace       = "",
      timeout         = 15000,
    } = (node.data as unknown) as {
      provider?: string; supabaseUrl?: string; supabaseKey?: string;
      tableName?: string; embeddingColumn?: string; contentColumn?: string; metadataColumn?: string;
      upsert?: boolean; pineconeHost?: string; pineconeKey?: string; namespace?: string;
      timeout?: number;
    };

    // Fall back to the 15 s default for missing, zero, negative, or non-finite values.
    const safeTimeout = Number.isFinite(timeout) && timeout > 0 ? Math.floor(timeout) : 15000;

    let storedId: unknown = undefined;
    let success = false;

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), safeTimeout);

    try {
      if (provider === "supabase") {
        const url   = resolveVars(supabaseUrl,     ctx.vars).replace(/\/$/, "");
        const key   = resolveVars(supabaseKey,     ctx.vars);
        const table = resolveVars(tableName,       ctx.vars);
        const eCol  = resolveVars(embeddingColumn, ctx.vars);
        const cCol  = resolveVars(contentColumn,   ctx.vars);
        const mCol  = resolveVars(metadataColumn,  ctx.vars);

        if (!url)   throw new Error("Vector Upsert (Supabase): supabaseUrl is not configured");
        if (!key)   throw new Error("Vector Upsert (Supabase): supabaseKey is not configured");
        if (!table) throw new Error("Vector Upsert (Supabase): tableName is not configured");

        const row: Record<string, unknown> = { [eCol]: embedding };
        if (contentVal  !== undefined) row[cCol] = contentVal;
        if (metadataVal !== undefined) row[mCol] = metadataVal;
        if (idVal       !== undefined) row["id"] = idVal;

        const prefer = upsert
          ? "resolution=merge-duplicates,return=representation"
          : "return=representation";

        const res = await fetch(`${url}/rest/v1/${table}`, {
          method: "POST",
          headers: {
            "Content-Type":  "application/json",
            apikey:           key,
            Authorization:   `Bearer ${key}`,
            Prefer:           prefer,
          },
          body: JSON.stringify(row),
          signal: controller.signal,
        });

        if (!res.ok) {
          const errText = await res.text();
          throw new Error(`Vector Upsert (Supabase) error ${res.status}: ${errText}`);
        }

        const inserted = await res.json() as unknown[];
        if (Array.isArray(inserted) && inserted.length > 0) {
          storedId = (inserted[0] as Record<string, unknown>).id ?? undefined;
        }
        success = true;

      } else {
        const host   = resolveVars(pineconeHost, ctx.vars).replace(/\/$/, "");
        const apiKey = resolveVars(pineconeKey,  ctx.vars);
        const ns     = resolveVars(namespace,    ctx.vars);

        if (!host)   throw new Error("Vector Upsert (Pinecone): indexHost is not configured");
        if (!apiKey) throw new Error("Vector Upsert (Pinecone): apiKey is not configured");

        const vectorId = idVal !== undefined ? String(idVal) : crypto.randomUUID();

        const metaObj: Record<string, unknown> =
          metadataVal !== null && typeof metadataVal === "object" && !Array.isArray(metadataVal)
            ? { ...(metadataVal as Record<string, unknown>) }
            : {};
        if (contentVal !== undefined) metaObj["content"] = String(contentVal);

        const reqBody: Record<string, unknown> = {
          vectors: [{ id: vectorId, values: embedding, metadata: metaObj }],
        };
        if (ns) reqBody.namespace = ns;

        const res = await fetch(`https://${host}/vectors/upsert`, {
          method: "POST",
          headers: { "Content-Type": "application/json", "Api-Key": apiKey },
          body: JSON.stringify(reqBody),
          signal: controller.signal,
        });

        if (!res.ok) {
          const errText = await res.text();
          throw new Error(`Vector Upsert (Pinecone) error ${res.status}: ${errText}`);
        }

        storedId = vectorId;
        success  = true;
      }
    } finally {
      clearTimeout(timer);
    }

    const idResult:      EvalResult = { value: storedId, inputTokens: 0, outputTokens: 0 };
    const successResult: EvalResult = { value: success,  inputTokens: 0, outputTokens: 0 };
    ctx.cache.set(`${ctx.nodeId}:id`,      idResult);
    ctx.cache.set(`${ctx.nodeId}:success`, successResult);

    if (sourceHandle === "success") return successResult;
    return idResult;
  }
}

export const execute = new VectorUpsertNode();
