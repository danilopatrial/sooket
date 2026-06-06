"use client";

import { memo, useRef, useLayoutEffect, useState } from "react";
import { Handle, Position, type NodeProps, useViewport } from "@xyflow/react";
import { Braces, Plus, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { VarField } from "@/components/canvas/VarField";
export type { ResponseHeader, ResponseBuilderNodeData } from "@/lib/node-types";
import type { ResponseBuilderNodeData } from "@/lib/node-types";






// Common status codes with a developer label and a friendly description
const STATUS_PRESETS = [
  { code: 200, dev: "200", friendly: "OK"          },
  { code: 201, dev: "201", friendly: "Created"     },
  { code: 400, dev: "400", friendly: "Bad Input"   },
  { code: 401, dev: "401", friendly: "Needs Login" },
  { code: 403, dev: "403", friendly: "Forbidden"   },
  { code: 500, dev: "500", friendly: "Error"       },
] as const;

function ResponseBuilderNodeComponent({ data, selected }: NodeProps) {
  const { zoom } = useViewport();
  const d        = data as unknown as ResponseBuilderNodeData;
  const status   = d.status  ?? 200;
  const headers  = d.headers ?? [];
  const onChange = d.onChange;
  const connected = new Set(d.connectedHandles ?? []);

  const nodeRef       = useRef<HTMLDivElement>(null);
  const statusRowRef  = useRef<HTMLDivElement>(null);
  const bodyRowRef    = useRef<HTMLDivElement>(null);
  const replyRowRef   = useRef<HTMLDivElement>(null);
  const headerRowRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  const [tops, setTops] = useState({ status: 0, body: 0, reply: 0 });
  const [headerTops, setHeaderTops] = useState<Record<string, number>>({});

  const headerIds = headers.map((h) => h.id).join(",");

  useLayoutEffect(() => {
    if (!nodeRef.current) return;
    const nodeTop = nodeRef.current.getBoundingClientRect().top;
    const mid = (ref: React.RefObject<HTMLElement | null>) => {
      if (!ref.current) return 0;
      const r = ref.current.getBoundingClientRect();
      return (r.top + r.height / 2 - nodeTop) / zoom;
    };
    setTops({ status: mid(statusRowRef), body: mid(bodyRowRef), reply: mid(replyRowRef) });

    const newHeaderTops: Record<string, number> = {};
    headerRowRefs.current.forEach((el, id) => {
      const r = el.getBoundingClientRect();
      newHeaderTops[id] = (r.top + r.height / 2 - nodeTop) / zoom;
    });
    setHeaderTops(newHeaderTops);
  }, [zoom, headerIds]);

  function addHeader() {
    const id = Math.random().toString(36).slice(2, 8);
    onChange?.({ headers: [...headers, { id, key: "", value: "" }] });
  }
  function removeHeader(id: string) {
    onChange?.({ headers: headers.filter((h) => h.id !== id) });
  }
  function updateHeader(id: string, field: "key" | "value", val: string) {
    onChange?.({ headers: headers.map((h) => (h.id === id ? { ...h, [field]: val } : h)) });
  }

  // Friendly status label for the header subtitle
  const preset = STATUS_PRESETS.find((p) => p.code === status);
  const statusLabel = preset ? `${preset.dev} · ${preset.friendly}` : String(status);

  const isStatusConnected = connected.has("status");
  const isBodyConnected   = connected.has("body");

  const dot    = "!w-2.5 !h-2.5 !border-2 !border-[#1a1a1c] !bg-blue-400";
  const dotOut = "!w-2.5 !h-2.5 !border-2 !border-[#1a1a1c] !bg-blue-400";

  return (
    <div
      ref={nodeRef}
      className={cn(
        "w-80 rounded-2xl shadow-2xl transition-shadow",
        "border bg-[#1a1a1c]",
        selected ? "border-blue-500/50 shadow-blue-900/20" : "border-white/[0.08]"
      )}
    >
      {/* Input handles */}
      <Handle type="target" id="status" position={Position.Left} style={{ top: tops.status }} className={dot} />
      <Handle type="target" id="body"   position={Position.Left} style={{ top: tops.body   }} className={dot} />
      {headers.map((h) => (
        <Handle
          key={h.id}
          type="target"
          id={`header-${h.id}`}
          position={Position.Left}
          style={{ top: headerTops[h.id] ?? 0 }}
          className={dot}
        />
      ))}

      {/* Output handle */}
      <Handle type="source" id="reply"  position={Position.Right} style={{ top: tops.reply }} className={dotOut} />

      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 bg-[#171c24] border-b border-white/[0.06] rounded-t-2xl">
        <div className="h-8 w-8 rounded-lg bg-blue-700 flex items-center justify-center shrink-0">
          <Braces className="h-4 w-4 text-white" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[13px] font-semibold text-white leading-none">Response Builder</p>
          <p className="text-[11px] text-blue-300/70 mt-0.5">{statusLabel}</p>
        </div>
      </div>

      {/* Body */}
      <div className="p-3 space-y-3 nodrag">

        {/* Status code */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <p className="text-[10px] text-white/30 uppercase tracking-wider">
              Status Code
            </p>
          </div>

          {/* Quick-pick presets */}
          <div className="grid grid-cols-3 gap-1 mb-2">
            {STATUS_PRESETS.map((p) => (
              <button
                key={p.code}
                onClick={() => onChange?.({ status: p.code })}
                disabled={isStatusConnected}
                className={cn(
                  "rounded-lg border py-1.5 px-1 text-center transition-colors disabled:opacity-30 disabled:pointer-events-none",
                  status === p.code
                    ? "bg-blue-600/30 border-blue-500/50"
                    : "bg-[#252527] border-white/[0.08] hover:border-white/20"
                )}
              >
                <p className="text-[11px] font-mono font-bold text-white/80 leading-none">{p.dev}</p>
                <p className="text-[9px] text-white/35 mt-0.5 leading-none">{p.friendly}</p>
              </button>
            ))}
          </div>

          {/* Custom code input */}
          <div ref={statusRowRef} className="flex items-center gap-2">
            <input
              type="number"
              value={status}
              onChange={(e) => onChange?.({ status: Number(e.target.value) })}
              disabled={isStatusConnected}
              min={100}
              max={599}
              className={cn(
                "w-20 rounded-lg border border-white/[0.08] bg-[#252527] px-2 py-1.5 text-[11px] font-mono text-white/70 focus:outline-none focus:border-blue-500/40 transition-colors",
                isStatusConnected && "opacity-30 pointer-events-none"
              )}
            />
            <span className="text-[10px] text-white/20">
              {isStatusConnected ? "using connected value" : "or type any code"}
            </span>
          </div>
        </div>

        {/* Response headers */}
        <div className="space-y-1.5">
          <p className="text-[10px] text-white/30 uppercase tracking-wider">
            Response Headers
          </p>
          {headers.map((h) => {
            const isHeaderConnected = connected.has(`header-${h.id}`);
            return (
              <div
                key={h.id}
                ref={(el) => {
                  if (el) headerRowRefs.current.set(h.id, el);
                  else headerRowRefs.current.delete(h.id);
                }}
                className="flex items-center gap-1.5"
              >
                <input
                  type="text"
                  value={h.key}
                  onChange={(e) => updateHeader(h.id, "key", e.target.value)}
                  placeholder="Content-Type"
                  className="w-28 min-w-0 rounded-lg border border-white/[0.08] bg-[#252527] px-2 py-1.5 text-[11px] text-white/80 font-mono focus:outline-none focus:border-blue-500/40 transition-colors placeholder-white/20"
                />
                <VarField
                  as="input"
                  value={h.value}
                  onChange={(v) => updateHeader(h.id, "value", v)}
                  placeholder={isHeaderConnected ? "using connected value" : "application/json"}
                  focusBorderClass="focus:border-blue-500/40"
                  typographyClass="text-[11px] px-2 py-1.5 font-mono"
                  textColorClass="text-white/60"
                  wrapperClass="flex-1 min-w-0"
                  disabled={isHeaderConnected}
                />
                <button
                  onClick={() => removeHeader(h.id)}
                  className="h-6 w-6 flex items-center justify-center rounded-md text-white/20 hover:text-red-400 hover:bg-red-500/10 transition-colors shrink-0"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            );
          })}
          <button
            onClick={addHeader}
            className="w-full flex items-center justify-center gap-1.5 py-1.5 rounded-lg border border-dashed border-white/[0.12] text-[11px] text-white/30 hover:text-white/60 hover:border-white/25 transition-colors"
          >
            <Plus className="h-3 w-3" />
            Add header
          </button>
        </div>

        <div className="border-t border-white/[0.06]" />

        {/* Body input row */}
        <div ref={bodyRowRef} className="flex items-center justify-between h-7">
          <span className={cn(
            "text-[10px] uppercase tracking-wider font-semibold",
            isBodyConnected ? "text-blue-300" : "text-white/30"
          )}>
            Body
          </span>
        </div>

        <div className="border-t border-white/[0.06]" />

        {/* Reply output row */}
        <div ref={replyRowRef} className="flex items-center justify-end h-6">
          <span className="text-[11px] font-mono text-blue-300/50">reply</span>
        </div>

      </div>
    </div>
  );
}

export const ResponseBuilderNode = memo(ResponseBuilderNodeComponent);
