"use client";

import { memo, useRef, useLayoutEffect, useState } from "react";
import { Handle, Position, type NodeProps, useViewport } from "@xyflow/react";
import { Database } from "lucide-react";
import { cn } from "@/lib/utils";
import { VarField } from "@/components/canvas/VarField";
export type { VectorProvider, VectorSearchNodeData } from "@/lib/node-types";
import type { VectorSearchNodeData } from "@/lib/node-types";






const OUTPUT_ROWS = [
  { key: "results", label: "results" },
  { key: "count",   label: "count"   },
] as const;

function VectorSearchNodeComponent({ data, selected }: NodeProps) {
  const { zoom } = useViewport();
  const d           = data as unknown as VectorSearchNodeData;
  const provider    = d.provider     ?? "supabase";
  const supabaseUrl = d.supabaseUrl  ?? "";
  const supabaseKey = d.supabaseKey  ?? "";
  const functionName = d.functionName ?? "match_documents";
  const matchCount  = d.matchCount   ?? 5;
  const pineconeHost = d.pineconeHost ?? "";
  const pineconeKey = d.pineconeKey  ?? "";
  const namespace   = d.namespace    ?? "";
  const topK        = d.topK         ?? 5;
  const timeout     = d.timeout      ?? 15000;
  const onChange    = d.onChange;

  const nodeRef      = useRef<HTMLDivElement>(null);
  const embeddingRef = useRef<HTMLDivElement>(null);
  const refsOutput   = useRef<Map<string, HTMLElement>>(new Map());
  const [tops, setTops] = useState<Record<string, number>>({});

  useLayoutEffect(() => {
    if (!nodeRef.current) return;
    const nodeTop = nodeRef.current.getBoundingClientRect().top;
    const measure = (el: HTMLElement | null | undefined) => {
      if (!el) return 0;
      const r = el.getBoundingClientRect();
      return (r.top + r.height / 2 - nodeTop) / zoom;
    };
    const next: Record<string, number> = {
      embedding: measure(embeddingRef.current),
    };
    refsOutput.current.forEach((el, key) => { next[key] = measure(el); });
    setTops(next);
  }, [provider, zoom]);

  const dot = "!w-2.5 !h-2.5 !border-2 !border-[#1a1a1c] !bg-indigo-400";

  return (
    <div
      ref={nodeRef}
      className={cn(
        "w-80 rounded-2xl shadow-2xl transition-shadow",
        "border bg-[#1a1a1c]",
        selected ? "border-indigo-500/50 shadow-indigo-900/20" : "border-white/[0.08]"
      )}
    >
      <Handle type="target" id="embedding" position={Position.Left}
        style={{ top: tops.embedding ?? 0 }} className={dot} />

      <Handle type="source" id="results" position={Position.Right}
        style={{ top: tops.results ?? 0 }} className={dot} />
      <Handle type="source" id="count" position={Position.Right}
        style={{ top: tops.count ?? 0 }} className={dot} />

      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 bg-[#1c1c2a] border-b border-white/[0.06] rounded-t-2xl">
        <div className="h-8 w-8 rounded-lg bg-indigo-700 flex items-center justify-center shrink-0">
          <Database className="h-4 w-4 text-white" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[13px] font-semibold text-white leading-none">Vector Search</p>
          <p className="text-[11px] text-indigo-300/70 mt-0.5">
            {provider === "supabase" ? "Supabase pgvector" : "Pinecone"}
          </p>
        </div>
        {/* Provider tabs */}
        <div className="flex rounded-md overflow-hidden border border-white/[0.08] shrink-0">
          {(["supabase", "pinecone"] as const).map((p) => (
            <button
              key={p}
              onClick={() => onChange?.({ provider: p })}
              className={cn(
                "px-2 py-1 text-[10px] font-semibold uppercase tracking-wide transition-colors",
                provider === p
                  ? "bg-indigo-600/50 text-indigo-200"
                  : "bg-[#252527] text-white/30 hover:text-white/60"
              )}
            >
              {p === "supabase" ? "PG" : "PC"}
            </button>
          ))}
        </div>
      </div>

      {/* Body */}
      <div className="p-3 space-y-2.5 nodrag">

        {/* Embedding input row — anchors the left handle */}
        <div ref={embeddingRef} className="flex items-center justify-between h-7">
          <span className="text-[10px] text-white/30 uppercase tracking-wider">
            Embedding input
          </span>
          <span className="text-[9px] text-white/20 font-mono">float[ ]</span>
        </div>

        <div className="border-t border-white/[0.06]" />

        {/* ── Supabase pgvector config ──────────────────────────── */}
        {provider === "supabase" && (
          <div className="space-y-2">
            <p className="text-[10px] text-white/30 uppercase tracking-wider">
              Supabase pgvector
            </p>

            <div className="space-y-1">
              <p className="text-[9px] text-white/20 uppercase tracking-wider">URL</p>
              <VarField
                as="input"
                value={supabaseUrl}
                onChange={(v) => onChange?.({ supabaseUrl: v })}
                placeholder="$SUPABASE_URL"
                focusBorderClass="focus:border-indigo-500/40"
                typographyClass="text-[11px] px-2.5 py-1.5 font-mono"
                textColorClass="text-white/80"
              />
            </div>

            <div className="space-y-1">
              <p className="text-[9px] text-white/20 uppercase tracking-wider">Service key</p>
              <VarField
                as="input"
                value={supabaseKey}
                onChange={(v) => onChange?.({ supabaseKey: v })}
                placeholder="$SUPABASE_SERVICE_KEY"
                focusBorderClass="focus:border-indigo-500/40"
                typographyClass="text-[11px] px-2.5 py-1.5 font-mono"
                textColorClass="text-white/80"
              />
            </div>

            <div className="space-y-1">
              <p className="text-[9px] text-white/20 uppercase tracking-wider">RPC function</p>
              <VarField
                as="input"
                value={functionName}
                onChange={(v) => onChange?.({ functionName: v })}
                placeholder="match_documents"
                focusBorderClass="focus:border-indigo-500/40"
                typographyClass="text-[11px] px-2.5 py-1.5 font-mono"
                textColorClass="text-white/80"
              />
              <p className="text-[9px] text-white/15">
                must accept <span className="font-mono">query_embedding</span> + <span className="font-mono">match_count</span>
              </p>
            </div>

            <div className="flex items-center justify-between">
              <p className="text-[9px] text-white/20 uppercase tracking-wider">Top K results</p>
              <input
                type="number"
                aria-label="Top K results"
                value={matchCount}
                onChange={(e) => onChange?.({ matchCount: Math.max(1, Number(e.target.value)) })}
                min={1}
                max={100}
                className="w-16 rounded-lg border border-white/[0.08] bg-[#252527] px-2 py-1 text-[11px] text-white/70 font-mono text-right focus:outline-none focus:border-indigo-500/40 transition-colors"
              />
            </div>
          </div>
        )}

        {/* ── Pinecone config ───────────────────────────────────── */}
        {provider === "pinecone" && (
          <div className="space-y-2">
            <p className="text-[10px] text-white/30 uppercase tracking-wider">
              Pinecone
            </p>

            <div className="space-y-1">
              <p className="text-[9px] text-white/20 uppercase tracking-wider">Index host</p>
              <VarField
                as="input"
                value={pineconeHost}
                onChange={(v) => onChange?.({ pineconeHost: v })}
                placeholder="my-index-abc123.svc.pinecone.io"
                focusBorderClass="focus:border-indigo-500/40"
                typographyClass="text-[11px] px-2.5 py-1.5 font-mono"
                textColorClass="text-white/80"
              />
              <p className="text-[9px] text-white/15">found in your Pinecone dashboard</p>
            </div>

            <div className="space-y-1">
              <p className="text-[9px] text-white/20 uppercase tracking-wider">API key</p>
              <VarField
                as="input"
                value={pineconeKey}
                onChange={(v) => onChange?.({ pineconeKey: v })}
                placeholder="$PINECONE_KEY"
                focusBorderClass="focus:border-indigo-500/40"
                typographyClass="text-[11px] px-2.5 py-1.5 font-mono"
                textColorClass="text-white/80"
              />
            </div>

            <div className="space-y-1">
              <p className="text-[9px] text-white/20 uppercase tracking-wider">
                Namespace <span className="normal-case text-white/15 font-normal">optional</span>
              </p>
              <VarField
                as="input"
                value={namespace}
                onChange={(v) => onChange?.({ namespace: v })}
                placeholder="default"
                focusBorderClass="focus:border-indigo-500/40"
                typographyClass="text-[11px] px-2.5 py-1.5 font-mono"
                textColorClass="text-white/60"
              />
            </div>

            <div className="flex items-center justify-between">
              <p className="text-[9px] text-white/20 uppercase tracking-wider">Top K results</p>
              <input
                type="number"
                aria-label="Top K results"
                value={topK}
                onChange={(e) => onChange?.({ topK: Math.max(1, Number(e.target.value)) })}
                min={1}
                max={10000}
                className="w-16 rounded-lg border border-white/[0.08] bg-[#252527] px-2 py-1 text-[11px] text-white/70 font-mono text-right focus:outline-none focus:border-indigo-500/40 transition-colors"
              />
            </div>
          </div>
        )}

        {/* Request timeout — applies to both providers */}
        <div className="flex items-center justify-between">
          <p className="text-[10px] text-white/30 uppercase tracking-wider">Timeout (s)</p>
          <input
            type="number"
            aria-label="Request timeout (seconds)"
            value={timeout / 1000}
            onChange={(e) => onChange?.({ timeout: Math.max(1, Number(e.target.value)) * 1000 })}
            min={1}
            max={120}
            className="w-16 rounded-lg border border-white/[0.08] bg-[#252527] px-2 py-1 text-[11px] text-white/70 font-mono text-right focus:outline-none focus:border-indigo-500/40 transition-colors"
          />
        </div>

        <div className="border-t border-white/[0.06]" />

        {/* Output rows */}
        <div className="space-y-1">
          <p className="text-[10px] text-white/30 uppercase tracking-wider mb-1.5">Outputs</p>
          {OUTPUT_ROWS.map(({ key, label }) => (
            <div
              key={key}
              ref={(el) => {
                if (el) refsOutput.current.set(key, el);
                else refsOutput.current.delete(key);
              }}
              className="flex items-center justify-end gap-2 h-6"
            >
              <span className="text-[11px] font-mono text-white/40">{label}</span>
            </div>
          ))}
        </div>

      </div>
    </div>
  );
}

export const VectorSearchNode = memo(VectorSearchNodeComponent);
