"use client";

import { memo, useRef, useLayoutEffect, useState } from "react";
import { Handle, Position, type NodeProps, useViewport } from "@xyflow/react";
import { ListPlus } from "lucide-react";
import { cn } from "@/lib/utils";
export type { ListManagerAction, ListManagerEntryType, ListManagerNodeData } from "@/lib/node-types";
import type { ListManagerEntryType, ListManagerNodeData } from "@/lib/node-types";







const ENTRY_TYPE_META: Record<ListManagerEntryType, { label: string; active: string }> = {
  value:  { label: "Value",  active: "bg-sky-600/30 text-sky-300" },
  ip:     { label: "IP",     active: "bg-violet-600/30 text-violet-300" },
  cidr:   { label: "CIDR",   active: "bg-amber-600/30 text-amber-300" },
  header: { label: "Header", active: "bg-emerald-600/30 text-emerald-300" },
};

function ListManagerNodeComponent({ data, selected }: NodeProps) {
  const { zoom } = useViewport();
  const d = data as unknown as ListManagerNodeData;
  const action = d.action ?? "add";
  const entryType = d.entryType ?? "value";
  const onChange = d.onChange;
  const connected = d.connectedHandles ?? [];

  const nodeRef      = useRef<HTMLDivElement>(null);
  const valueInRef   = useRef<HTMLDivElement>(null);
  const actionInRef  = useRef<HTMLDivElement>(null);
  const valueOutRef  = useRef<HTMLDivElement>(null);
  const successRef   = useRef<HTMLDivElement>(null);
  const errorRef     = useRef<HTMLDivElement>(null);
  const [tops, setTops] = useState({ valueIn: 0, actionIn: 0, valueOut: 0, success: 0, error: 0 });

  useLayoutEffect(() => {
    if (!nodeRef.current) return;
    const nodeTop = nodeRef.current.getBoundingClientRect().top;
    const mid = (ref: React.RefObject<HTMLElement | null>) => {
      if (!ref.current) return 0;
      const r = ref.current.getBoundingClientRect();
      return (r.top + r.height / 2 - nodeTop) / zoom;
    };
    setTops({
      valueIn:  mid(valueInRef),
      actionIn: mid(actionInRef),
      valueOut: mid(valueOutRef),
      success:  mid(successRef),
      error:    mid(errorRef),
    });
  }, [action, entryType, zoom]);

  const isAdd = action === "add";

  const valueInDot  = "!w-2.5 !h-2.5 !border-2 !border-[#1a1a1c] !bg-amber-400";
  const actionInDot = "!w-2.5 !h-2.5 !border-2 !border-[#1a1a1c] !bg-white/30";
  const valueOutDot = "!w-2.5 !h-2.5 !border-2 !border-[#1a1a1c] !bg-amber-400";
  const successDot  = "!w-2.5 !h-2.5 !border-2 !border-[#1a1a1c] !bg-emerald-400";
  const errorDot    = "!w-2.5 !h-2.5 !border-2 !border-[#1a1a1c] !bg-rose-400";

  return (
    <div
      ref={nodeRef}
      className={cn(
        "w-72 rounded-2xl shadow-2xl border bg-[#1a1a1c] transition-shadow",
        selected ? "border-violet-500/50 shadow-violet-900/20" : "border-white/[0.08]"
      )}
    >
      <Handle type="target" id="value"   position={Position.Left}  style={{ top: tops.valueIn  }} className={valueInDot}  />
      <Handle type="target" id="action"  position={Position.Left}  style={{ top: tops.actionIn }} className={actionInDot} />
      <Handle type="source" id="value"   position={Position.Right} style={{ top: tops.valueOut }} className={valueOutDot} />
      <Handle type="source" id="success" position={Position.Right} style={{ top: tops.success  }} className={successDot}  />
      <Handle type="source" id="error"   position={Position.Right} style={{ top: tops.error    }} className={errorDot}    />

      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 bg-[#212124] border-b border-white/[0.06] rounded-t-2xl">
        <div className="h-8 w-8 rounded-lg bg-violet-600 flex items-center justify-center shrink-0">
          <ListPlus className="h-4 w-4 text-white" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[13px] font-semibold text-white leading-none">List Manager</p>
          <p className="text-[11px] text-violet-300/70 mt-0.5">modify access list at runtime</p>
        </div>
        <span className={cn(
          "text-[10px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wider shrink-0",
          isAdd ? "bg-emerald-500/20 text-emerald-400" : "bg-rose-500/20 text-rose-400"
        )}>
          {isAdd ? "add" : "remove"}
        </span>
      </div>

      {/* Body */}
      <div className="px-3 py-2.5 space-y-2.5 nodrag">

        {/* Action toggle */}
        <div className="space-y-1">
          <p className="text-[10px] text-white/30 uppercase tracking-wider">Action</p>
          <div className="flex rounded-lg border border-white/[0.08] overflow-hidden text-[11px]">
            {(["add", "remove"] as const).map((a) => (
              <button
                key={a}
                type="button"
                onClick={() => onChange?.({ action: a })}
                className={cn(
                  "flex-1 py-1.5 font-medium transition-colors capitalize",
                  action === a
                    ? a === "add"
                      ? "bg-emerald-600/30 text-emerald-300"
                      : "bg-rose-600/30 text-rose-300"
                    : "text-white/30 hover:text-white/60"
                )}
              >
                {a}
              </button>
            ))}
          </div>
        </div>

        {/* Entry type selector */}
        <div className="space-y-1">
          <p className="text-[10px] text-white/30 uppercase tracking-wider">Entry Type</p>
          <div className="grid grid-cols-4 rounded-lg border border-white/[0.08] overflow-hidden text-[10px]">
            {(["value", "ip", "cidr", "header"] as const).map((t) => {
              const meta = ENTRY_TYPE_META[t];
              return (
                <button
                  key={t}
                  type="button"
                  onClick={() => onChange?.({ entryType: t })}
                  className={cn(
                    "py-1.5 font-medium transition-colors",
                    entryType === t ? meta.active : "text-white/30 hover:text-white/60"
                  )}
                >
                  {meta.label}
                </button>
              );
            })}
          </div>
        </div>

        <div className="border-t border-white/[0.06]" />

        {/* Input rows */}
        <div ref={valueInRef} className="flex items-center h-6">
          <span className={cn(
            "text-[10px] uppercase tracking-wider font-semibold",
            connected.includes("value") ? "text-amber-300" : "text-white/30"
          )}>value</span>
        </div>
        <div ref={actionInRef} className="flex items-center h-6">
          <span className={cn(
            "text-[10px] uppercase tracking-wider font-semibold",
            connected.includes("action") ? "text-white/70" : "text-white/30"
          )}>action</span>
          {connected.includes("action") && (
            <span className="ml-2 text-[9px] text-white/20">overrides toggle</span>
          )}
        </div>

        <div className="border-t border-white/[0.06]" />

        {/* Output rows */}
        <div ref={valueOutRef} className="flex items-center justify-between h-6">
          <span className="text-[10px] uppercase tracking-wider font-semibold text-white/30">value</span>
          <span className="text-[9px] text-amber-400/50">pass-through</span>
        </div>
        <div ref={successRef} className="flex items-center justify-between h-6">
          <span className="text-[10px] uppercase tracking-wider font-semibold text-white/30">success</span>
          <span className="text-[9px] text-emerald-400/50">boolean</span>
        </div>
        <div ref={errorRef} className="flex items-center justify-between h-6">
          <span className="text-[10px] uppercase tracking-wider font-semibold text-white/30">error</span>
          <span className="text-[9px] text-rose-400/50">string</span>
        </div>

      </div>
    </div>
  );
}

export const ListManagerNode = memo(ListManagerNodeComponent);
