"use client";

import { memo, useRef, useLayoutEffect, useState } from "react";
import { Handle, Position, type NodeProps, useViewport } from "@xyflow/react";
import { DatabaseZap } from "lucide-react";
import { cn } from "@/lib/utils";
import { VarField } from "@/components/canvas/VarField";
export type { VectorProvider, VectorUpsertNodeData } from "@/lib/node-types";
import type { VectorUpsertNodeData } from "@/lib/node-types";






const INPUT_ROWS = [
  { key: "embedding", label: "embedding", type: "float[]" },
  { key: "content",   label: "content",   type: "string"  },
  { key: "metadata",  label: "metadata",  type: "object"  },
  { key: "id",        label: "id",        type: "string"  },
] as const;

const OUTPUT_ROWS = [
  { key: "id",      label: "id"      },
  { key: "success", label: "success" },
] as const;

function VectorUpsertNodeComponent({ data, selected }: NodeProps) {
  const { zoom } = useViewport();
  const d = data as unknown as VectorUpsertNodeData;

  const provider        = d.provider        ?? "supabase";
  const supabaseUrl     = d.supabaseUrl     ?? "";
  const supabaseKey     = d.supabaseKey     ?? "";
  const tableName       = d.tableName       ?? "documents";
  const embeddingColumn = d.embeddingColumn ?? "embedding";
  const contentColumn   = d.contentColumn   ?? "content";
  const metadataColumn  = d.metadataColumn  ?? "metadata";
  const upsert          = d.upsert          ?? false;
  const pineconeHost    = d.pineconeHost    ?? "";
  const pineconeKey     = d.pineconeKey     ?? "";
  const namespace       = d.namespace       ?? "";
  const timeout         = d.timeout         ?? 15000;
  const onChange        = d.onChange;

  const nodeRef    = useRef<HTMLDivElement>(null);
  const refsInput  = useRef<Map<string, HTMLElement>>(new Map());
  const refsOutput = useRef<Map<string, HTMLElement>>(new Map());
  const [tops, setTops] = useState<Record<string, number>>({});

  useLayoutEffect(() => {
    if (!nodeRef.current) return;
    const nodeTop = nodeRef.current.getBoundingClientRect().top;
    const measure = (el: HTMLElement | null | undefined) => {
      if (!el) return 0;
      const r = el.getBoundingClientRect();
      return (r.top + r.height / 2 - nodeTop) / zoom;
    };
    const next: Record<string, number> = {};
    refsInput.current.forEach((el, key)  => { next[`in:${key}`]  = measure(el); });
    refsOutput.current.forEach((el, key) => { next[`out:${key}`] = measure(el); });
    setTops(next);
  }, [provider, zoom]);

  const dot = "!w-2.5 !h-2.5 !border-2 !border-[#1a1a1c] !bg-violet-400";

  return (
    <div
      ref={nodeRef}
      className={cn(
        "w-80 rounded-2xl shadow-2xl transition-shadow",
        "border bg-[#1a1a1c]",
        selected ? "border-violet-500/50 shadow-violet-900/20" : "border-white/[0.08]"
      )}
    >
      {/* Input handles */}
      {INPUT_ROWS.map(({ key }) => (
        <Handle
          key={key}
          type="target"
          id={key}
          position={Position.Left}
          style={{ top: tops[`in:${key}`] ?? 0 }}
          className={dot}
        />
      ))}

      {/* Output handles */}
      {OUTPUT_ROWS.map(({ key }) => (
        <Handle
          key={key}
          type="source"
          id={key}
          position={Position.Right}
          style={{ top: tops[`out:${key}`] ?? 0 }}
          className={dot}
        />
      ))}

      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 bg-[#1c1c2a] border-b border-white/[0.06] rounded-t-2xl">
        <div className="h-8 w-8 rounded-lg bg-violet-700 flex items-center justify-center shrink-0">
          <DatabaseZap className="h-4 w-4 text-white" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[13px] font-semibold text-white leading-none">Vector Upsert</p>
          <p className="text-[11px] text-violet-300/70 mt-0.5">
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
                  ? "bg-violet-600/50 text-violet-200"
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

        {/* Input rows */}
        <div className="space-y-1">
          <p className="text-[10px] text-white/30 uppercase tracking-wider mb-1.5">Inputs</p>
          {INPUT_ROWS.map(({ key, label, type }) => (
            <div
              key={key}
              ref={(el) => {
                if (el) refsInput.current.set(key, el);
                else    refsInput.current.delete(key);
              }}
              className="flex items-center justify-between h-6"
            >
              <span className="text-[11px] font-mono text-white/40">{label}</span>
              <span className="text-[9px] text-white/20 font-mono">{type}</span>
            </div>
          ))}
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
                focusBorderClass="focus:border-violet-500/40"
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
                focusBorderClass="focus:border-violet-500/40"
                typographyClass="text-[11px] px-2.5 py-1.5 font-mono"
                textColorClass="text-white/80"
              />
            </div>

            <div className="space-y-1">
              <p className="text-[9px] text-white/20 uppercase tracking-wider">Table</p>
              <VarField
                as="input"
                value={tableName}
                onChange={(v) => onChange?.({ tableName: v })}
                placeholder="documents"
                focusBorderClass="focus:border-violet-500/40"
                typographyClass="text-[11px] px-2.5 py-1.5 font-mono"
                textColorClass="text-white/80"
              />
            </div>

            {/* Column mapping */}
            <p className="text-[9px] text-white/20 uppercase tracking-wider">Column mapping</p>
            <div className="grid grid-cols-3 gap-1">
              {(
                [
                  { label: "embed", value: embeddingColumn, field: "embeddingColumn" },
                  { label: "text",  value: contentColumn,   field: "contentColumn"   },
                  { label: "meta",  value: metadataColumn,  field: "metadataColumn"  },
                ] as const
              ).map(({ label, value, field }) => (
                <div key={field} className="space-y-0.5">
                  <p className="text-[8px] text-white/20 uppercase tracking-wider">{label}</p>
                  <input
                    type="text"
                    value={value}
                    onChange={(e) => onChange?.({ [field]: e.target.value })}
                    className="w-full rounded-lg border border-white/[0.08] bg-[#252527] px-1.5 py-1 text-[10px] text-white/70 font-mono focus:outline-none focus:border-violet-500/40 transition-colors"
                  />
                </div>
              ))}
            </div>

            {/* Upsert toggle */}
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={upsert}
                onChange={(e) => onChange?.({ upsert: e.target.checked })}
                className="w-3 h-3 rounded accent-violet-500"
              />
              <span className="text-[10px] text-white/40">Upsert mode</span>
              <span className="text-[9px] text-white/20">(on conflict update)</span>
            </label>
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
                focusBorderClass="focus:border-violet-500/40"
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
                focusBorderClass="focus:border-violet-500/40"
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
                focusBorderClass="focus:border-violet-500/40"
                typographyClass="text-[11px] px-2.5 py-1.5 font-mono"
                textColorClass="text-white/60"
              />
            </div>

            <p className="text-[9px] text-white/20">
              If <span className="font-mono text-white/30">id</span> input is unconnected, a UUID is auto-generated per request.
            </p>
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
            className="w-16 rounded-lg border border-white/[0.08] bg-[#252527] px-2 py-1 text-[11px] text-white/70 font-mono text-right focus:outline-none focus:border-violet-500/40 transition-colors"
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
                else    refsOutput.current.delete(key);
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

export const VectorUpsertNode = memo(VectorUpsertNodeComponent);
