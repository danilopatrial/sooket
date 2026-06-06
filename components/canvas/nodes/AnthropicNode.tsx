"use client";

import { memo, useRef, useLayoutEffect, useState } from "react";
import { Handle, Position, type NodeProps, useViewport } from "@xyflow/react";
import { Slider } from "@/components/ui/slider";
import { cn } from "@/lib/utils";
import { VarField } from "@/components/canvas/VarField";

const MODELS = [
  { value: "claude-haiku-4-5-20251001", label: "Haiku 4.5",  sub: "affordable", temperature: true  },
  { value: "claude-sonnet-4-6",         label: "Sonnet 4.6", sub: "balanced", temperature: false },
  { value: "claude-opus-4-7",           label: "Opus 4.7",   sub: "most capable",       temperature: false },
];

export const MODELS_WITHOUT_TEMPERATURE = new Set(
  MODELS.filter((m) => !m.temperature).map((m) => m.value)
);

export type { AnthropicNodeData } from "@/lib/node-types";
import type { AnthropicNodeData } from "@/lib/node-types";

type Tops = { model: number; systemPrompt: number; temperature: number; history: number; userPrompt: number };

function AnthropicNodeComponent({ data, selected }: NodeProps) {
  const { zoom } = useViewport();

  const d               = data as unknown as AnthropicNodeData;
  const model           = d.model           ?? "claude-sonnet-4-6";
  const systemPrompt    = d.systemPrompt    ?? "You are a helpful assistant";
  const temperature     = d.temperature     ?? 0.7;
  const connected       = d.connectedHandles ?? [];
  const onChange        = d.onChange;

  const isModelOverridden     = connected.includes("model");
  const isSysPromptOverridden = connected.includes("systemPrompt");
  const isTempOverridden      = connected.includes("temperature");
  const supportsTemperature   = !MODELS_WITHOUT_TEMPERATURE.has(model);

  const nodeRef        = useRef<HTMLDivElement>(null);
  const modelRef       = useRef<HTMLParagraphElement>(null);
  const sysPromptRef   = useRef<HTMLParagraphElement>(null);
  const tempRef        = useRef<HTMLParagraphElement>(null);
  const historyRef     = useRef<HTMLParagraphElement>(null);
  const userPromptRef  = useRef<HTMLParagraphElement>(null);

  const [tops, setTops] = useState<Tops>({ model: 97, systemPrompt: 191, temperature: 282, history: 360, userPrompt: 390 });

  useLayoutEffect(() => {
    if (!nodeRef.current) return;
    const nodeTop = nodeRef.current.getBoundingClientRect().top;
    const mid = (ref: React.RefObject<HTMLParagraphElement | null>) => {
      if (!ref.current) return 0;
      const r = ref.current.getBoundingClientRect();
      return (r.top + r.height / 2 - nodeTop) / zoom;
    };
    setTops({
      model:        mid(modelRef),
      systemPrompt: mid(sysPromptRef),
      temperature:  mid(tempRef),
      history:      mid(historyRef),
      userPrompt:   mid(userPromptRef),
    });
  }, [model, supportsTemperature, zoom, isModelOverridden, isSysPromptOverridden, isTempOverridden]);

  const cfgHandle  = "!w-2 !h-2 !border-[1.5px] !border-[#1a1a1c] !bg-white/25";
  const mainHandle = "!w-2.5 !h-2.5 !border-2 !border-[#1a1a1c] !bg-violet-400";

  return (
    <div
      ref={nodeRef}
      className={cn(
        "w-64 rounded-2xl shadow-2xl transition-shadow",
        "border bg-[#1a1a1c]",
        selected ? "border-violet-500/50 shadow-violet-900/20" : "border-white/[0.08]"
      )}
    >
      <Handle type="target" id="model"        position={Position.Left} style={{ top: tops.model }}        className={cfgHandle} />
      <Handle type="target" id="systemPrompt" position={Position.Left} style={{ top: tops.systemPrompt }} className={cfgHandle} />
      <Handle type="target" id="temperature"  position={Position.Left} style={{ top: tops.temperature }}  className={cfgHandle} />
      <Handle type="target" id="history"      position={Position.Left} style={{ top: tops.history }}      className={cfgHandle} />
      <Handle type="target" id="userPrompt"   position={Position.Left} style={{ top: tops.userPrompt }}   className={mainHandle} />
      <Handle type="source" id="output" position={Position.Right} className={mainHandle} />

      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 bg-[#212124] border-b border-white/[0.06] rounded-t-2xl">
        <div className="h-8 w-8 rounded-lg bg-violet-600 flex items-center justify-center text-white font-bold text-sm shrink-0">
          A
        </div>
        <div className="min-w-0">
          <p className="text-[13px] font-semibold text-white leading-none">Anthropic</p>
          <p className="text-[11px] text-violet-300/70 mt-0.5 font-mono truncate">
            {MODELS.find((m) => m.value === model)?.label ?? model.replace("claude-", "")}
          </p>
        </div>
      </div>

      {/* Body */}
      <div className="p-4 space-y-4 nodrag">

        {/* Model */}
        <div className="space-y-1.5">
          <p ref={modelRef} className="text-[10px] text-white/30 uppercase tracking-wider">
            Model
          </p>
          <div className={cn("grid grid-cols-3 gap-1", isModelOverridden && "opacity-40 pointer-events-none")}>
            {MODELS.map((m) => (
              <button
                key={m.value}
                onClick={() => onChange?.({ model: m.value })}
                className={cn(
                  "rounded-lg border py-1.5 px-1 text-center transition-colors",
                  model === m.value
                    ? "bg-violet-600/30 border-violet-500/50"
                    : "bg-[#252527] border-white/[0.08] hover:border-white/20"
                )}
              >
                <p className="text-[10px] font-semibold text-white/80 leading-none">{m.label}</p>
                <p className="text-[9px] text-white/35 mt-0.5 leading-none">{m.sub}</p>
              </button>
            ))}
          </div>
          {isModelOverridden && (
            <p className="text-[9px] text-white/20">using connected value</p>
          )}
        </div>

        {/* System Prompt */}
        <div className="space-y-1.5">
          <p ref={sysPromptRef} className="text-[10px] text-white/30 uppercase tracking-wider">
            System Prompt
          </p>
          <div className={cn(isSysPromptOverridden && "opacity-40 pointer-events-none")}>
            <VarField
              value={systemPrompt}
              onChange={(v) => onChange?.({ systemPrompt: v })}
              rows={4}
              placeholder="You are a helpful assistant"
              expandTitle="System Prompt"
            />
          </div>
          {isSysPromptOverridden && (
            <p className="text-[9px] text-white/20">using connected value</p>
          )}
        </div>

        {/* Temperature */}
        {supportsTemperature ? (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <p ref={tempRef} className="text-[10px] text-white/30 uppercase tracking-wider">
                Temperature <span className="normal-case text-white/20 font-normal">— creative vs precise</span>
              </p>
              <span className="text-[11px] font-mono text-white/40">{temperature.toFixed(2)}</span>
            </div>
            <div className={cn(isTempOverridden && "opacity-40 pointer-events-none")}>
              <Slider
                min={0}
                max={1}
                step={0.01}
                value={[temperature]}
                onValueChange={(vals) => {
                  const v = Array.isArray(vals) ? vals[0] : (vals as number);
                  onChange?.({ temperature: v });
                }}
              />
            </div>
            <div className="flex justify-between text-[9px] text-white/15 px-0.5">
              <span>precise</span>
              <span>creative</span>
            </div>
          </div>
        ) : (
          <div className="space-y-1.5">
            <p ref={tempRef} className="text-[10px] text-white/30 uppercase tracking-wider">
              Temperature
            </p>
            <p className="text-[11px] text-white/20">fixed for this model</p>
          </div>
        )}

        {/* History */}
        <div className="space-y-1.5">
          <p ref={historyRef} className="text-[10px] text-white/30 uppercase tracking-wider">
            History <span className="normal-case text-white/20 font-normal">— optional</span>
          </p>
        </div>

        {/* User Prompt */}
        <div className="space-y-1.5">
          <p ref={userPromptRef} className="text-[10px] text-white/30 uppercase tracking-wider">
            User Prompt
          </p>
        </div>

      </div>
    </div>
  );
}

export const AnthropicNode = memo(AnthropicNodeComponent);
