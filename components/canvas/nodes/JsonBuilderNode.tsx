"use client";

import { memo, useRef, useLayoutEffect, useState } from "react";
import { Handle, Position, type NodeProps, useViewport } from "@xyflow/react";
import { Plus, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { VarField } from "@/components/canvas/VarField";
export type { JsonBuilderField, JsonBuilderNodeData } from "@/lib/node-types";
import type { JsonBuilderNodeData } from "@/lib/node-types";






function JsonBuilderNodeComponent({ data, selected }: NodeProps) {
  const { zoom } = useViewport();

  const d        = data as unknown as JsonBuilderNodeData;
  const fields   = d.fields  ?? [];
  const onChange = d.onChange;

  const nodeRef      = useRef<HTMLDivElement>(null);
  const rowRefs      = useRef<Map<string, HTMLElement>>(new Map());
  const outputRowRef = useRef<HTMLDivElement>(null);
  const [handleTops, setHandleTops] = useState<Record<string, number>>({});
  const [outputTop, setOutputTop]   = useState(0);

  const fieldIds = fields.map((f) => f.id).join(",");
  useLayoutEffect(() => {
    if (!nodeRef.current) return;
    const nodeTop = nodeRef.current.getBoundingClientRect().top;
    const mid = (el: HTMLElement | null) => {
      if (!el) return 0;
      const r = el.getBoundingClientRect();
      return (r.top + r.height / 2 - nodeTop) / zoom;
    };
    const tops: Record<string, number> = {};
    fields.forEach((f) => {
      tops[f.id] = mid(rowRefs.current.get(f.id) ?? null);
    });
    setHandleTops(tops);
    setOutputTop(mid(outputRowRef.current));
  }, [fieldIds, zoom]); // eslint-disable-line react-hooks/exhaustive-deps

  function addField() {
    const id = Math.random().toString(36).slice(2, 8);
    onChange?.({ fields: [...fields, { id, key: "", fallback: "" }] });
  }

  function removeField(id: string) {
    if (d.onRemoveField) {
      d.onRemoveField(id);
    } else {
      onChange?.({ fields: fields.filter((f) => f.id !== id) });
    }
  }

  function updateKey(id: string, key: string) {
    onChange?.({ fields: fields.map((f) => (f.id === id ? { ...f, key } : f)) });
  }

  function updateFallback(id: string, fallback: string) {
    onChange?.({ fields: fields.map((f) => (f.id === id ? { ...f, fallback } : f)) });
  }

  const dot = "!w-2.5 !h-2.5 !border-2 !border-[#1a1a1c] !bg-amber-400";

  return (
    <div
      ref={nodeRef}
      className={cn(
        "w-80 rounded-2xl shadow-2xl transition-shadow",
        "border bg-[#1a1a1c]",
        selected ? "border-amber-500/50 shadow-amber-900/20" : "border-white/[0.08]"
      )}
    >
      {fields.map((f) => (
        <Handle
          key={f.id}
          type="target"
          id={f.id}
          position={Position.Left}
          style={{ top: handleTops[f.id] ?? 0 }}
          className={dot}
        />
      ))}

      <Handle
        type="source"
        id="output"
        position={Position.Right}
        style={{ top: outputTop }}
        className={dot}
      />

      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 bg-[#212124] border-b border-white/[0.06] rounded-t-2xl">
        <div className="h-8 w-8 rounded-lg bg-amber-600 flex items-center justify-center text-white font-bold text-xs shrink-0 font-mono">
          {"{}"}
        </div>
        <div className="min-w-0">
          <p className="text-[13px] font-semibold text-white leading-none">JSON Builder</p>
          <p className="text-[11px] text-amber-300/70 mt-0.5 truncate">
            {fields.length === 0
              ? "construct a JSON object from inputs"
              : `${fields.length} ${fields.length === 1 ? "field" : "fields"} assembled`}
          </p>
        </div>
      </div>

      {/* Body */}
      <div className="p-3 space-y-2 nodrag">
        <div>
          <p className="text-[10px] text-white/30 uppercase tracking-wider mb-1.5">
            Fields
          </p>

          {fields.length === 0 ? (
            <p className="text-[11px] text-white/20 text-center py-2">
              add a field below to build an object
            </p>
          ) : (
            <div className="space-y-1">
              <div className="flex items-center gap-1.5 px-0.5 mb-0.5">
                <p className="flex-1 text-[9px] text-white/20 uppercase tracking-wider">key name</p>
                <p className="flex-1 text-[9px] text-white/20 uppercase tracking-wider">if disconnected</p>
                <div className="h-4 w-6 shrink-0" />
              </div>

              {fields.map((f) => (
                <div
                  key={f.id}
                  ref={(el) => {
                    if (el) rowRefs.current.set(f.id, el);
                    else rowRefs.current.delete(f.id);
                  }}
                  className="flex items-center gap-1.5"
                >
                  <VarField
                    as="input"
                    value={f.key}
                    onChange={(v) => updateKey(f.id, v)}
                    placeholder="e.g. userId"
                    focusBorderClass="focus:border-amber-500/40"
                    typographyClass="text-[12px] px-2.5 py-1.5 font-mono"
                    textColorClass="text-white/90"
                    wrapperClass="flex-1 min-w-0"
                  />
                  <VarField
                    as="input"
                    value={f.fallback ?? ""}
                    onChange={(v) => updateFallback(f.id, v)}
                    placeholder="fallback"
                    focusBorderClass="focus:border-amber-500/40"
                    typographyClass="text-[12px] px-2.5 py-1.5 font-mono"
                    textColorClass="text-white/50"
                    wrapperClass="flex-1 min-w-0"
                  />
                  <button
                    onClick={() => removeField(f.id)}
                    className="h-6 w-6 flex items-center justify-center rounded-md text-white/20 hover:text-red-400 hover:bg-red-500/10 transition-colors shrink-0"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        <button
          onClick={addField}
          className="w-full flex items-center justify-center gap-1.5 py-1.5 rounded-lg border border-dashed border-white/[0.12] text-[11px] text-white/30 hover:text-white/60 hover:border-white/25 transition-colors"
        >
          <Plus className="h-3 w-3" />
          Add field
        </button>

        <div className="border-t border-white/[0.06]" />

        <div ref={outputRowRef} className="flex items-center justify-end gap-2 h-6">
          <span className="text-[11px] font-mono text-amber-300/50">output</span>
        </div>
      </div>
    </div>
  );
}

export const JsonBuilderNode = memo(JsonBuilderNodeComponent);
