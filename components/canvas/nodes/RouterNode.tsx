"use client";

import { memo, useRef, useLayoutEffect, useState } from "react";
import { Handle, Position, type NodeProps, useViewport } from "@xyflow/react";
import { Shuffle, Plus, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { VarField } from "@/components/canvas/VarField";

export type { RouterCase, RouterNodeData } from "@/lib/node-types";
import type { RouterNodeData } from "@/lib/node-types";

function RouterNodeComponent({ data, selected }: NodeProps) {
  const { zoom } = useViewport();

  const d          = data as unknown as RouterNodeData;
  const cases      = d.cases      ?? [];
  const hasDefault = d.hasDefault ?? false;
  const onChange   = d.onChange;

  const nodeRef     = useRef<HTMLDivElement>(null);
  const inputRowRef = useRef<HTMLDivElement>(null);
  const dataRowRef  = useRef<HTMLDivElement>(null);
  const outRefs     = useRef<Map<string, HTMLElement>>(new Map());
  const defaultRef  = useRef<HTMLDivElement>(null);

  const [inputTop,   setInputTop]   = useState(0);
  const [dataTop,    setDataTop]    = useState(0);
  const [outTops,    setOutTops]    = useState<Record<string, number>>({});
  const [defaultTop, setDefaultTop] = useState(0);

  const connected = (d.connectedHandles ?? []) as string[];

  const caseIds = cases.map((c) => c.id).join(",");
  useLayoutEffect(() => {
    if (!nodeRef.current) return;
    const nodeTop = nodeRef.current.getBoundingClientRect().top;
    const mid = (el: HTMLElement | null) => {
      if (!el) return 0;
      const r = el.getBoundingClientRect();
      return (r.top + r.height / 2 - nodeTop) / zoom;
    };
    setInputTop(mid(inputRowRef.current));
    setDataTop(mid(dataRowRef.current));
    const tops: Record<string, number> = {};
    cases.forEach((c) => { tops[c.id] = mid(outRefs.current.get(c.id) ?? null); });
    setOutTops(tops);
    setDefaultTop(mid(defaultRef.current));
  }, [caseIds, hasDefault, zoom]); // eslint-disable-line react-hooks/exhaustive-deps

  function addCase() {
    const id = Math.random().toString(36).slice(2, 8);
    onChange?.({ cases: [...cases, { id, label: "", match: "" }] });
  }

  function removeCase(id: string) {
    onChange?.({ cases: cases.filter((c) => c.id !== id) });
  }

  function updateLabel(id: string, label: string) {
    onChange?.({ cases: cases.map((c) => (c.id === id ? { ...c, label } : c)) });
  }

  function updateMatch(id: string, match: string) {
    onChange?.({ cases: cases.map((c) => (c.id === id ? { ...c, match } : c)) });
  }

  const inputDot   = "!w-2.5 !h-2.5 !border-2 !border-[#1a1a1c] !bg-orange-400";
  const dataDot    = "!w-2.5 !h-2.5 !border-2 !border-[#1a1a1c] !bg-sky-400";
  const caseDot    = "!w-2.5 !h-2.5 !border-2 !border-[#1a1a1c] !bg-violet-400";
  const defaultDot = "!w-2.5 !h-2.5 !border-2 !border-[#1a1a1c] !bg-white/30";

  const subtitle =
    cases.length === 0
      ? "route by value"
      : `${cases.length} ${cases.length === 1 ? "case" : "cases"}${hasDefault ? " + default" : ""}`;

  return (
    <div
      ref={nodeRef}
      className={cn(
        "w-72 rounded-2xl shadow-2xl transition-shadow",
        "border bg-[#1a1a1c]",
        selected ? "border-orange-500/50 shadow-orange-900/20" : "border-white/[0.08]"
      )}
    >
      {/* Input target handle */}
      <Handle
        type="target"
        id="input"
        position={Position.Left}
        style={{ top: inputTop }}
        className={inputDot}
      />

      {/* Data passthrough handle */}
      <Handle
        type="target"
        id="data"
        position={Position.Left}
        style={{ top: dataTop }}
        className={dataDot}
      />

      {/* Per-case source handles — positioned against output label rows */}
      {cases.map((c) => (
        <Handle
          key={c.id}
          type="source"
          id={c.id}
          position={Position.Right}
          style={{ top: outTops[c.id] ?? 0 }}
          className={caseDot}
        />
      ))}

      {/* Default source handle */}
      {hasDefault && (
        <Handle
          type="source"
          id="default"
          position={Position.Right}
          style={{ top: defaultTop }}
          className={defaultDot}
        />
      )}

      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 bg-[#212124] border-b border-white/[0.06] rounded-t-2xl">
        <div className="h-8 w-8 rounded-lg bg-orange-600 flex items-center justify-center shrink-0">
          <Shuffle className="h-4 w-4 text-white" />
        </div>
        <div className="min-w-0">
          <p className="text-[13px] font-semibold text-white leading-none">Router</p>
          <p className="text-[11px] text-orange-300/70 mt-0.5 truncate">{subtitle}</p>
        </div>
      </div>

      {/* Body */}
      <div className="p-3 space-y-2 nodrag">

        {/* Input row — handle anchored here */}
        <div ref={inputRowRef} className="flex items-center h-6">
          <span className={cn(
            "text-[10px] uppercase tracking-wider font-semibold",
            connected.includes("input") ? "text-orange-300" : "text-white/30"
          )}>input value</span>
        </div>

        {/* Data passthrough row — handle anchored here */}
        <div ref={dataRowRef} className="flex items-center justify-between h-6">
          <span className={cn(
            "text-[10px] uppercase tracking-wider font-semibold",
            connected.includes("data") ? "text-sky-300" : "text-white/30"
          )}>data</span>
          {connected.includes("data") && (
            <span className="text-[9px] text-sky-400/50">pass-through</span>
          )}
        </div>

        <div className="border-t border-white/[0.06]" />

        {/* Cases config section */}
        <div>
          <p className="text-[10px] text-white/30 uppercase tracking-wider mb-1.5">Cases</p>

          {cases.length === 0 ? (
            <p className="text-[11px] text-white/20 text-center py-2">add a case below</p>
          ) : (
            <div className="space-y-1.5">
              <div className="flex items-center gap-1.5 px-0.5 mb-0.5">
                <p className="flex-1 text-[9px] text-white/20 uppercase tracking-wider">label</p>
                <p className="flex-1 text-[9px] text-white/20 uppercase tracking-wider">match value</p>
                <div className="h-4 w-6 shrink-0" />
              </div>

              {cases.map((c) => (
                <div key={c.id} className="flex items-center gap-1.5">
                  <VarField
                    as="input"
                    value={c.label}
                    onChange={(v) => updateLabel(c.id, v)}
                    placeholder="label"
                    focusBorderClass="focus:border-orange-500/40"
                    typographyClass="text-[12px] px-2.5 py-1.5 font-mono"
                    textColorClass="text-white/90"
                    wrapperClass="flex-1 min-w-0"
                  />
                  <VarField
                    as="input"
                    value={c.match}
                    onChange={(v) => updateMatch(c.id, v)}
                    placeholder="exact value"
                    focusBorderClass="focus:border-orange-500/40"
                    typographyClass="text-[12px] px-2.5 py-1.5 font-mono"
                    textColorClass="text-orange-300/70"
                    wrapperClass="flex-1 min-w-0"
                  />
                  <button
                    onClick={() => removeCase(c.id)}
                    className="h-6 w-6 flex items-center justify-center rounded-md text-white/20 hover:text-red-400 hover:bg-red-500/10 transition-colors shrink-0"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Add case button */}
        <button
          onClick={addCase}
          className="w-full flex items-center justify-center gap-1.5 py-1.5 rounded-lg border border-dashed border-white/[0.12] text-[11px] text-white/30 hover:text-white/60 hover:border-white/25 transition-colors"
        >
          <Plus className="h-3 w-3" />
          Add case
        </button>

        {/* Default toggle */}
        <button
          onClick={() => onChange?.({ hasDefault: !hasDefault })}
          className="flex items-center gap-2 w-full group"
        >
          <div
            className={cn(
              "relative h-4 w-7 rounded-full border transition-colors shrink-0",
              hasDefault
                ? "bg-white/20 border-white/30"
                : "bg-transparent border-white/20 group-hover:border-white/30"
            )}
          >
            <div
              className={cn(
                "absolute h-2.5 w-2.5 rounded-full bg-white/70 transition-all duration-150",
                "top-[2px]",
                hasDefault ? "left-[14px]" : "left-[2px]"
              )}
            />
          </div>
          <span className="text-[11px] text-white/40 group-hover:text-white/60 transition-colors">
            Default fallback
          </span>
        </button>

        <div className="border-t border-white/[0.06]" />

        {/* Output label rows — handles anchored here */}
        {cases.length === 0 && !hasDefault ? (
          <div className="flex items-center justify-end h-5">
            <span className="text-[10px] text-white/15">no outputs yet</span>
          </div>
        ) : (
          <div className="space-y-1">
            {cases.map((c) => (
              <div
                key={c.id}
                ref={(el) => {
                  if (el) outRefs.current.set(c.id, el);
                  else outRefs.current.delete(c.id);
                }}
                className="flex items-center justify-end gap-1.5 h-6"
              >
                <span className="text-[11px] font-mono text-violet-400/70 truncate max-w-[160px]">
                  {c.label || c.match || "(case)"}
                </span>
              </div>
            ))}

            {hasDefault && (
              <div
                ref={defaultRef}
                className="flex items-center justify-end gap-1.5 h-6"
              >
                <span className="text-[11px] font-mono text-white/30">default</span>
              </div>
            )}
          </div>
        )}

      </div>
    </div>
  );
}

export const RouterNode = memo(RouterNodeComponent);
