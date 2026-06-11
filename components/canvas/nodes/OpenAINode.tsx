"use client";

import { memo, useRef, useLayoutEffect, useState } from "react";
import { Handle, Position, type NodeProps, useViewport } from "@xyflow/react";
import { Slider } from "@/components/ui/slider";
import { cn } from "@/lib/utils";
import { VarField } from "@/components/canvas/VarField";

export const DEFAULT_OPENAI_BASE_URL = "https://api.openai.com/v1";

export type { OpenAINodeData } from "@/lib/node-types";
import type { OpenAINodeData } from "@/lib/node-types";

type Tops = { model: number; systemPrompt: number; temperature: number; history: number; userPrompt: number };

function OpenAINodeComponent({ data, selected }: NodeProps) {
  const { zoom } = useViewport();

  const d            = data as unknown as OpenAINodeData;
  const model        = d.model        ?? "gpt-4o-mini";
  const systemPrompt = d.systemPrompt ?? "You are a helpful assistant";
  const temperature  = d.temperature  ?? 0.7;
  const baseURL      = d.baseURL       ?? DEFAULT_OPENAI_BASE_URL;
  const connected    = d.connectedHandles ?? [];
  const onChange     = d.onChange;

  const isModelOverridden     = connected.includes("model");
  const isSysPromptOverridden = connected.includes("systemPrompt");
  const isTempOverridden      = connected.includes("temperature");

  const nodeRef       = useRef<HTMLDivElement>(null);
  const modelRef      = useRef<HTMLParagraphElement>(null);
  const sysPromptRef  = useRef<HTMLParagraphElement>(null);
  const tempRef       = useRef<HTMLParagraphElement>(null);
  const historyRef    = useRef<HTMLParagraphElement>(null);
  const userPromptRef = useRef<HTMLParagraphElement>(null);

  const [tops, setTops] = useState<Tops>({ model: 97, systemPrompt: 230, temperature: 320, history: 400, userPrompt: 430 });

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
  }, [model, zoom, isModelOverridden, isSysPromptOverridden, isTempOverridden]);

  const cfgHandle  = "!w-2 !h-2 !border-[1.5px] !border-[#1a1a1c] !bg-white/25";
  const mainHandle = "!w-2.5 !h-2.5 !border-2 !border-[#1a1a1c] !bg-emerald-400";
  const textInput  = "w-full bg-[#252527] border border-white/[0.08] rounded-lg px-2 py-1.5 text-[11px] text-white/80 font-mono outline-none focus:border-emerald-500/50";

  return (
    <div
      ref={nodeRef}
      className={cn(
        "w-64 rounded-2xl shadow-2xl transition-shadow",
        "border bg-[#1a1a1c]",
        selected ? "border-emerald-500/50 shadow-emerald-900/20" : "border-white/[0.08]"
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
        <div className="h-8 w-8 rounded-lg bg-emerald-600 flex items-center justify-center text-white font-bold text-sm shrink-0">
          ai
        </div>
        <div className="min-w-0">
          <p className="text-[13px] font-semibold text-white leading-none">OpenAI</p>
          <p className="text-[11px] text-emerald-300/70 mt-0.5 font-mono truncate">{model}</p>
        </div>
      </div>

      {/* Body */}
      <div className="p-4 space-y-4 nodrag">

        {/* Model */}
        <div className="space-y-1.5">
          <p ref={modelRef} className="text-[10px] text-white/30 uppercase tracking-wider">
            Model
          </p>
          <div className={cn(isModelOverridden && "opacity-40 pointer-events-none")}>
            <input
              className={textInput}
              value={model}
              placeholder="gpt-4o-mini"
              onChange={(e) => onChange?.({ model: e.target.value })}
            />
          </div>
          {isModelOverridden && (
            <p className="text-[9px] text-white/20">using connected value</p>
          )}
        </div>

        {/* Base URL */}
        <div className="space-y-1.5">
          <p className="text-[10px] text-white/30 uppercase tracking-wider">
            Base URL <span className="normal-case text-white/20 font-normal">— OpenAI-compatible</span>
          </p>
          <input
            className={textInput}
            value={baseURL}
            placeholder={DEFAULT_OPENAI_BASE_URL}
            onChange={(e) => onChange?.({ baseURL: e.target.value })}
          />
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
              max={2}
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

export const OpenAINode = memo(OpenAINodeComponent);
