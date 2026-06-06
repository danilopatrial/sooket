"use client";

import { memo, useRef, useLayoutEffect, useState } from "react";
import { Handle, Position, type NodeProps, useViewport } from "@xyflow/react";
import { FileCode2, Maximize2, TriangleAlert } from "lucide-react";
import { cn } from "@/lib/utils";
import { TextExpandModal } from "@/components/canvas/TextExpandModal";

export type { CustomCodeNodeData } from "@/lib/node-types";
import type { CustomCodeNodeData } from "@/lib/node-types";

type Tops = { input: number; output: number };

function CustomCodeNodeComponent({ data, selected }: NodeProps) {
  const { zoom } = useViewport();
  const d        = data as unknown as CustomCodeNodeData;
  const code     = d.code ?? "";
  const onChange = d.onChange;
  const connected = d.connectedHandles ?? [];

  const nodeRef      = useRef<HTMLDivElement>(null);
  const inputRowRef  = useRef<HTMLDivElement>(null);
  const outputRowRef = useRef<HTMLDivElement>(null);

  const [tops, setTops] = useState<Tops>({ input: 56, output: 180 });
  const [codeExpanded, setCodeExpanded] = useState(false);

  useLayoutEffect(() => {
    if (!nodeRef.current) return;
    const nodeTop = nodeRef.current.getBoundingClientRect().top;
    const mid = (ref: React.RefObject<HTMLDivElement | null>) => {
      if (!ref.current) return 0;
      const r = ref.current.getBoundingClientRect();
      return (r.top + r.height / 2 - nodeTop) / zoom;
    };
    setTops({
      input:  mid(inputRowRef),
      output: mid(outputRowRef),
    });
  }, [zoom, code]);

  const mainHandle = "!w-2.5 !h-2.5 !border-2 !border-[#1a1a1c] !bg-orange-400";

  return (
    <div
      ref={nodeRef}
      className={cn(
        "w-64 rounded-2xl shadow-2xl transition-shadow",
        "border bg-[#1a1a1c]",
        selected ? "border-orange-500/50 shadow-orange-900/20" : "border-white/[0.08]"
      )}
    >
      <Handle
        type="target"
        id="input"
        position={Position.Left}
        style={{ top: tops.input }}
        className={mainHandle}
      />
      <Handle
        type="source"
        id="output"
        position={Position.Right}
        style={{ top: tops.output }}
        className={mainHandle}
      />

      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 bg-[#212124] border-b border-white/[0.06] rounded-t-2xl">
        <div className="h-8 w-8 rounded-lg bg-orange-700 flex items-center justify-center shrink-0">
          <FileCode2 className="h-4 w-4 text-white" />
        </div>
        <div className="min-w-0">
          <p className="text-[13px] font-semibold text-white leading-none">Custom Code</p>
          <p className="text-[11px] text-orange-300/70 mt-0.5 truncate">JS · full server access</p>
        </div>
      </div>

      {/* Security warning */}
      <div className="mx-3 mt-2 flex items-start gap-1.5 rounded-md bg-orange-500/10 border border-orange-500/25 px-2.5 py-1.5">
        <TriangleAlert className="h-3 w-3 text-orange-400 mt-0.5 shrink-0" />
        <p className="text-[10px] text-orange-300/70 leading-snug">
          Executes with full server privileges. Restrict UI access before exposing to untrusted users.
        </p>
      </div>

      {/* Body */}
      <div className="px-4 py-3 space-y-2 nodrag">

        {/* input row */}
        <div ref={inputRowRef} className="flex items-center gap-2 h-6">
          <span className={cn(
            "text-[10px] uppercase tracking-wider font-semibold",
            connected.includes("input") ? "text-orange-300" : "text-white/30"
          )}>
            input
          </span>
          <span className="text-[9px] text-white/15 font-mono ml-auto">any</span>
        </div>

        <div className="border-t border-white/[0.06]" />

        {/* code editor */}
        <div className="space-y-1">
          <label className="text-[10px] uppercase tracking-wider font-semibold text-white/30">
            Code
          </label>
          <div className="relative">
            <textarea
              rows={5}
              spellCheck={false}
              value={code}
              onChange={(e) => onChange?.({ code: e.target.value })}
              placeholder={"// input is available\nreturn input;"}
              className={cn(
                "w-full font-mono text-[11px] bg-white/[0.04] border border-white/[0.08]",
                "rounded-lg px-2 py-1.5 text-white/80 resize-none focus:outline-none",
                "focus:border-orange-500/50 placeholder:text-white/20 leading-relaxed"
              )}
            />
            <button
              type="button"
              onClick={() => setCodeExpanded(true)}
              className="absolute top-1.5 right-1.5 p-0.5 rounded text-white/20 hover:text-white/60 hover:bg-white/[0.06] transition-colors"
              tabIndex={-1}
              title="Expand editor"
            >
              <Maximize2 className="h-3 w-3" />
            </button>
          </div>
          <TextExpandModal
            open={codeExpanded}
            onOpenChange={setCodeExpanded}
            value={code}
            onChange={(v) => onChange?.({ code: v })}
            title="Code"
            placeholder={"// input is available\nreturn input;"}
            mode="code"
          />
        </div>

        <div className="border-t border-white/[0.06]" />

        {/* output row */}
        <div ref={outputRowRef} className="flex items-center justify-end gap-2 h-6">
          <span className="text-[9px] text-white/20 font-mono">any</span>
          <span className="text-[10px] uppercase tracking-wider font-semibold text-orange-300/70">
            output
          </span>
        </div>

      </div>
    </div>
  );
}

export const CustomCodeNode = memo(CustomCodeNodeComponent);
