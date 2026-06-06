"use client";

import { memo, useRef, useLayoutEffect, useState } from "react";
import { Handle, Position, type NodeProps, useViewport } from "@xyflow/react";
import { Bug } from "lucide-react";
import { cn } from "@/lib/utils";

export type { TryCatchNodeData } from "@/lib/node-types";
import type { TryCatchNodeData } from "@/lib/node-types";

type Tops = { tryInput: number; result: number; error: number };

function TryCatchNodeComponent({ data, selected }: NodeProps) {
  const { zoom } = useViewport();
  const d         = data as unknown as TryCatchNodeData;
  const connected = d.connectedHandles ?? [];

  const nodeRef      = useRef<HTMLDivElement>(null);
  const tryRowRef    = useRef<HTMLDivElement>(null);
  const resultRowRef = useRef<HTMLDivElement>(null);
  const errorRowRef  = useRef<HTMLDivElement>(null);

  const [tops, setTops] = useState<Tops>({ tryInput: 56, result: 56, error: 80 });

  useLayoutEffect(() => {
    if (!nodeRef.current) return;
    const nodeTop = nodeRef.current.getBoundingClientRect().top;
    const mid = (ref: React.RefObject<HTMLDivElement | null>) => {
      if (!ref.current) return 0;
      const r = ref.current.getBoundingClientRect();
      return (r.top + r.height / 2 - nodeTop) / zoom;
    };
    setTops({
      tryInput: mid(tryRowRef),
      result:   mid(resultRowRef),
      error:    mid(errorRowRef),
    });
  }, [zoom]);

  const mainHandle = "!w-2.5 !h-2.5 !border-2 !border-[#1a1a1c] !bg-orange-400";
  const errHandle  = "!w-2.5 !h-2.5 !border-2 !border-[#1a1a1c] !bg-rose-400";

  return (
    <div
      ref={nodeRef}
      className={cn(
        "w-52 rounded-2xl shadow-2xl transition-shadow",
        "border bg-[#1a1a1c]",
        selected ? "border-orange-500/50 shadow-orange-900/20" : "border-white/[0.08]"
      )}
    >
      <Handle
        type="target"
        id="try"
        position={Position.Left}
        style={{ top: tops.tryInput }}
        className={mainHandle}
      />
      <Handle
        type="source"
        id="result"
        position={Position.Right}
        style={{ top: tops.result }}
        className={mainHandle}
      />
      <Handle
        type="source"
        id="error"
        position={Position.Right}
        style={{ top: tops.error }}
        className={errHandle}
      />

      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 bg-[#212124] border-b border-white/[0.06] rounded-t-2xl">
        <div className="h-8 w-8 rounded-lg bg-orange-700 flex items-center justify-center shrink-0">
          <Bug className="h-4 w-4 text-white" />
        </div>
        <div className="min-w-0">
          <p className="text-[13px] font-semibold text-white leading-none">Try / Catch</p>
          <p className="text-[11px] text-orange-300/70 mt-0.5 font-mono truncate">
            wrap upstream chain
          </p>
        </div>
      </div>

      {/* Body */}
      <div className="px-4 py-3 space-y-2.5 nodrag">

        {/* try input row */}
        <div ref={tryRowRef} className="flex items-center gap-2 h-6">
          <span className={cn(
            "text-[10px] uppercase tracking-wider font-semibold",
            connected.includes("try") ? "text-orange-300" : "text-white/30"
          )}>
            try
          </span>
          <span className="text-[9px] text-white/15 font-mono ml-auto">upstream chain</span>
        </div>

        <div className="border-t border-white/[0.06]" />

        {/* result output row */}
        <div ref={resultRowRef} className="flex items-center justify-end gap-2 h-6">
          <span className="text-[9px] text-white/20 font-mono">value</span>
          <span className="text-[10px] uppercase tracking-wider font-semibold text-orange-300/70">
            result
          </span>
        </div>

        {/* error output row */}
        <div ref={errorRowRef} className="flex items-center justify-end gap-2 h-6">
          <span className="text-[9px] text-white/20 font-mono">string</span>
          <span className="text-[10px] uppercase tracking-wider font-semibold text-rose-300/70">
            error
          </span>
        </div>

      </div>
    </div>
  );
}

export const TryCatchNode = memo(TryCatchNodeComponent);
