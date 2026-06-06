"use client";

import { memo, useRef, useLayoutEffect, useState } from "react";
import { Handle, Position, type NodeProps, useViewport } from "@xyflow/react";
import { Globe, Plus, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { VarField } from "@/components/canvas/VarField";
export type { HttpHeader, HttpMethod, HttpRequestNodeData } from "@/lib/node-types";
import type { HttpMethod, HttpRequestNodeData } from "@/lib/node-types";








const METHODS: HttpMethod[] = ["GET", "POST", "PUT", "PATCH", "DELETE"];

const METHOD_COLOR: Record<HttpMethod, string> = {
  GET:    "bg-emerald-600/30 border-emerald-500/50 text-emerald-300",
  POST:   "bg-sky-600/30    border-sky-500/50    text-sky-300",
  PUT:    "bg-amber-600/30  border-amber-500/50  text-amber-300",
  PATCH:  "bg-violet-600/30 border-violet-500/50 text-violet-300",
  DELETE: "bg-red-600/30    border-red-500/50    text-red-300",
};

const METHOD_HINT: Record<HttpMethod, string> = {
  GET:    "read data",
  POST:   "create / send",
  PUT:    "replace",
  PATCH:  "update part",
  DELETE: "remove",
};

const HAS_BODY: Set<HttpMethod> = new Set(["POST", "PUT", "PATCH"]);

const OUTPUT_ROWS = [
  { key: "res-body", label: "body",   },
  { key: "status",   label: "status", },
  { key: "ok",       label: "ok",     },
] as const;

function HttpRequestNodeComponent({ data, selected }: NodeProps) {
  const { zoom } = useViewport();
  const d        = data as unknown as HttpRequestNodeData;
  const method   = d.method  ?? "GET";
  const url      = d.url     ?? "";
  const headers  = d.headers ?? [];
  const timeout  = d.timeout ?? 10000;
  const onChange = d.onChange;

  const nodeRef         = useRef<HTMLDivElement>(null);
  const urlRowRef       = useRef<HTMLDivElement>(null);
  const bodyInputRowRef = useRef<HTMLDivElement>(null);
  const refsOutput      = useRef<Map<string, HTMLElement>>(new Map());
  const [tops, setTops] = useState<Record<string, number>>({});

  const hasBody = HAS_BODY.has(method);
  const headerIds = headers.map((h) => h.id).join(",");

  useLayoutEffect(() => {
    if (!nodeRef.current) return;
    const nodeTop = nodeRef.current.getBoundingClientRect().top;

    const measure = (el: HTMLElement | null | undefined) => {
      if (!el) return 0;
      const r = el.getBoundingClientRect();
      return (r.top + r.height / 2 - nodeTop) / zoom;
    };

    const next: Record<string, number> = {
      url:  measure(urlRowRef.current),
      body: hasBody ? measure(bodyInputRowRef.current) : 0,
    };

    refsOutput.current.forEach((el, key) => { next[key] = measure(el); });

    setTops(next);
  }, [method, headerIds, zoom, hasBody]);

  function addHeader() {
    const id = Math.random().toString(36).slice(2, 8);
    onChange?.({ headers: [...headers, { id, key: "", value: "" }] });
  }

  function removeHeader(id: string) {
    onChange?.({ headers: headers.filter((h) => h.id !== id) });
  }

  function updateHeader(id: string, field: "key" | "value", val: string) {
    onChange?.({ headers: headers.map((h) => h.id === id ? { ...h, [field]: val } : h) });
  }

  const dot = "!w-2.5 !h-2.5 !border-2 !border-[#1a1a1c] !bg-cyan-400";

  return (
    <div
      ref={nodeRef}
      className={cn(
        "w-80 rounded-2xl shadow-2xl transition-shadow",
        "border bg-[#1a1a1c]",
        selected ? "border-cyan-500/50 shadow-cyan-900/20" : "border-white/[0.08]"
      )}
    >
      <Handle type="target" id="url"  position={Position.Left} style={{ top: tops.url  ?? 0 }} className={dot} />
      {hasBody && (
        <Handle type="target" id="body" position={Position.Left} style={{ top: tops.body ?? 0 }} className={dot} />
      )}

      <Handle type="source" id="res-body" position={Position.Right} style={{ top: tops["res-body"] ?? 0 }} className={dot} />
      <Handle type="source" id="status"   position={Position.Right} style={{ top: tops.status   ?? 0 }} className={dot} />
      <Handle type="source" id="ok"       position={Position.Right} style={{ top: tops.ok       ?? 0 }} className={dot} />

      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 bg-[#212124] border-b border-white/[0.06] rounded-t-2xl">
        <div className="h-8 w-8 rounded-lg bg-cyan-700 flex items-center justify-center shrink-0">
          <Globe className="h-4 w-4 text-white" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[13px] font-semibold text-white leading-none">HTTP Request</p>
          <p className="text-[11px] text-cyan-300/70 mt-0.5">call any external API or URL</p>
        </div>
        <span className={cn("text-[10px] font-mono font-bold px-1.5 py-0.5 rounded border", METHOD_COLOR[method])}>
          {method}
        </span>
      </div>

      {/* Body */}
      <div className="p-3 space-y-3 nodrag">

        {/* Method picker */}
        <div>
          <p className="text-[10px] text-white/30 uppercase tracking-wider mb-1.5">
            Method <span className="normal-case text-white/20 font-normal"></span>
          </p>
          <div className="flex gap-1">
            {METHODS.map((m) => (
              <button
                key={m}
                onClick={() => onChange?.({ method: m })}
                className={cn(
                  "flex-1 rounded-md border transition-colors",
                  method === m ? METHOD_COLOR[m] : "bg-[#252527] border-white/[0.08] text-white/30 hover:text-white/60"
                )}
              >
                <p className="text-[9px] font-mono font-bold py-1 leading-none">{m}</p>
                <p className="text-[8px] text-white/30 pb-1 leading-none">{METHOD_HINT[m]}</p>
              </button>
            ))}
          </div>
        </div>

        {/* URL row */}
        <div ref={urlRowRef}>
          <p className="text-[10px] text-white/30 uppercase tracking-wider mb-1">
            URL <span className="normal-case text-white/20 font-normal"></span>
          </p>
          <VarField
            as="input"
            value={url}
            onChange={(v) => onChange?.({ url: v })}
            placeholder="https://api.example.com/endpoint"
            focusBorderClass="focus:border-cyan-500/40"
            typographyClass="text-[11px] px-2.5 py-1.5 font-mono"
            textColorClass="text-white/80"
          />
          <p className="text-[9px] text-white/20 mt-0.5">connect url handle to set dynamically</p>
        </div>

        {/* Body input row (POST/PUT/PATCH only) */}
        {hasBody && (
          <div ref={bodyInputRowRef} className="flex items-center justify-between">
            <div>
              <span className="text-[10px] text-white/30 uppercase tracking-wider">Body</span>
              <span className="text-[10px] text-white/20 normal-case font-normal"></span>
            </div>
          </div>
        )}

        {/* Headers */}
        <div className="space-y-1.5">
          <p className="text-[10px] text-white/30 uppercase tracking-wider">
            Headers <span className="normal-case text-white/20 font-normal"></span>
          </p>
          {headers.map((h) => (
            <div key={h.id} className="flex items-center gap-1.5">
              <input
                type="text"
                value={h.key}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => updateHeader(h.id, "key", e.target.value)}
                placeholder="Content-Type"
                className="w-24 min-w-0 rounded-lg border border-white/[0.08] bg-[#252527] px-2 py-1.5 text-[11px] text-white/80 font-mono focus:outline-none focus:border-cyan-500/40 transition-colors placeholder-white/20"
              />
              <VarField
                as="input"
                value={h.value}
                onChange={(v) => updateHeader(h.id, "value", v)}
                placeholder="application/json"
                focusBorderClass="focus:border-cyan-500/40"
                typographyClass="text-[11px] px-2 py-1.5 font-mono"
                textColorClass="text-white/60"
                wrapperClass="flex-1 min-w-0"
              />
              <button
                onClick={() => removeHeader(h.id)}
                className="h-6 w-6 flex items-center justify-center rounded-md text-white/20 hover:text-red-400 hover:bg-red-500/10 transition-colors shrink-0"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          ))}
          <button
            onClick={addHeader}
            className="w-full flex items-center justify-center gap-1.5 py-1.5 rounded-lg border border-dashed border-white/[0.12] text-[11px] text-white/30 hover:text-white/60 hover:border-white/25 transition-colors"
          >
            <Plus className="h-3 w-3" />
            Add header
          </button>
        </div>

        {/* Timeout */}
        <div className="flex items-center justify-between">
          <div>
            <span className="text-[10px] text-white/30 uppercase tracking-wider">Timeout</span>
            <span className="text-[10px] text-white/20 normal-case font-normal"></span>
          </div>
          <div className="flex items-center gap-1.5">
            <input
              type="number"
              value={timeout}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                onChange?.({ timeout: Number(e.target.value) })
              }
              min={500}
              max={30000}
              className="w-20 rounded-lg border border-white/[0.08] bg-[#252527] px-2 py-1 text-[11px] text-white/70 font-mono text-right focus:outline-none focus:border-cyan-500/40 transition-colors"
            />
            <span className="text-[10px] text-white/20 font-mono">ms</span>
          </div>
        </div>

        <div className="border-t border-white/[0.06]" />

        {/* Output rows */}
        <div className="space-y-1">
          <p className="text-[10px] text-white/30 uppercase tracking-wider mb-1.5">
            Response <span className="normal-case text-white/20 font-normal"></span>
          </p>
          {OUTPUT_ROWS.map(({ key, label}) => (
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

export const HttpRequestNode = memo(HttpRequestNodeComponent);
