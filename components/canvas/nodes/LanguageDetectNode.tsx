"use client";

import { memo, useRef, useLayoutEffect, useState } from "react";
import { Handle, Position, type NodeProps, useViewport } from "@xyflow/react";
import { Languages, Plus, X } from "lucide-react";
import { cn } from "@/lib/utils";
export type { LangRoute, LanguageDetectNodeData } from "@/lib/node-types";
import type { LanguageDetectNodeData } from "@/lib/node-types";


// ISO 639-3 → display name for common languages
export const LANG_NAMES: Record<string, string> = {
  eng: "English",
  spa: "Spanish",
  fra: "French",
  deu: "German",
  ita: "Italian",
  por: "Portuguese",
  nld: "Dutch",
  pol: "Polish",
  rus: "Russian",
  jpn: "Japanese",
  zho: "Chinese",
  kor: "Korean",
  ara: "Arabic",
  hin: "Hindi",
  tur: "Turkish",
  swe: "Swedish",
  dan: "Danish",
  nor: "Norwegian",
  fin: "Finnish",
  ces: "Czech",
  vie: "Vietnamese",
  ind: "Indonesian",
  tha: "Thai",
  ukr: "Ukrainian",
  heb: "Hebrew",
};





function LanguageDetectNodeComponent({ data, selected }: NodeProps) {
  const { zoom } = useViewport();

  const d          = data as unknown as LanguageDetectNodeData;
  const routes     = d.routes     ?? [];
  const hasDefault = d.hasDefault ?? true;
  const onChange   = d.onChange;

  const nodeRef     = useRef<HTMLDivElement>(null);
  const inputRowRef = useRef<HTMLDivElement>(null);
  const outRefs     = useRef<Map<string, HTMLElement>>(new Map());
  const defaultRef  = useRef<HTMLDivElement>(null);
  const langRef     = useRef<HTMLDivElement>(null);
  const confRef     = useRef<HTMLDivElement>(null);

  const [inputTop,   setInputTop]   = useState(0);
  const [outTops,    setOutTops]    = useState<Record<string, number>>({});
  const [defaultTop, setDefaultTop] = useState(0);
  const [langTop,    setLangTop]    = useState(0);
  const [confTop,    setConfTop]    = useState(0);

  const routeIds = routes.map((r) => r.id).join(",");
  useLayoutEffect(() => {
    if (!nodeRef.current) return;
    const nodeTop = nodeRef.current.getBoundingClientRect().top;
    const mid = (el: HTMLElement | null) => {
      if (!el) return 0;
      const r = el.getBoundingClientRect();
      return (r.top + r.height / 2 - nodeTop) / zoom;
    };
    setInputTop(mid(inputRowRef.current));
    const tops: Record<string, number> = {};
    routes.forEach((r) => { tops[r.id] = mid(outRefs.current.get(r.id) ?? null); });
    setOutTops(tops);
    setDefaultTop(mid(defaultRef.current));
    setLangTop(mid(langRef.current));
    setConfTop(mid(confRef.current));
  }, [routeIds, hasDefault, zoom]); // eslint-disable-line react-hooks/exhaustive-deps

  function addRoute() {
    const id = Math.random().toString(36).slice(2, 8);
    onChange?.({ routes: [...routes, { id, lang: "" }] });
  }

  function removeRoute(id: string) {
    onChange?.({ routes: routes.filter((r) => r.id !== id) });
  }

  function updateLang(id: string, lang: string) {
    onChange?.({ routes: routes.map((r) => (r.id === id ? { ...r, lang: lang.toLowerCase().trim() } : r)) });
  }

  const inputDot   = "!w-2.5 !h-2.5 !border-2 !border-[#1a1a1c] !bg-sky-400";
  const routeDot   = "!w-2.5 !h-2.5 !border-2 !border-[#1a1a1c] !bg-cyan-400";
  const defaultDot = "!w-2.5 !h-2.5 !border-2 !border-[#1a1a1c] !bg-white/30";
  const langDot    = "!w-2.5 !h-2.5 !border-2 !border-[#1a1a1c] !bg-violet-400";
  const confDot    = "!w-2.5 !h-2.5 !border-2 !border-[#1a1a1c] !bg-amber-400";

  const subtitle =
    routes.length === 0
      ? "detect language"
      : `${routes.length} ${routes.length === 1 ? "language" : "languages"}${hasDefault ? " + default" : ""}`;

  return (
    <div
      ref={nodeRef}
      className={cn(
        "w-72 rounded-2xl shadow-2xl transition-shadow",
        "border bg-[#1a1a1c]",
        selected ? "border-sky-500/50 shadow-sky-900/20" : "border-white/[0.08]"
      )}
    >
      <Handle
        type="target"
        id="input"
        position={Position.Left}
        style={{ top: inputTop }}
        className={inputDot}
      />

      {routes.map((r) => (
        <Handle
          key={r.id}
          type="source"
          id={r.id}
          position={Position.Right}
          style={{ top: outTops[r.id] ?? 0 }}
          className={routeDot}
        />
      ))}

      {hasDefault && (
        <Handle
          type="source"
          id="default"
          position={Position.Right}
          style={{ top: defaultTop }}
          className={defaultDot}
        />
      )}

      <Handle
        type="source"
        id="lang"
        position={Position.Right}
        style={{ top: langTop }}
        className={langDot}
      />
      <Handle
        type="source"
        id="confidence"
        position={Position.Right}
        style={{ top: confTop }}
        className={confDot}
      />

      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 bg-[#212124] border-b border-white/[0.06] rounded-t-2xl">
        <div className="h-8 w-8 rounded-lg bg-sky-600 flex items-center justify-center shrink-0">
          <Languages className="h-4 w-4 text-white" />
        </div>
        <div className="min-w-0">
          <p className="text-[13px] font-semibold text-white leading-none">Language Detect</p>
          <p className="text-[11px] text-sky-300/70 mt-0.5 truncate">{subtitle}</p>
        </div>
      </div>

      {/* Body */}
      <div className="p-3 space-y-2 nodrag">

        {/* Input row */}
        <div ref={inputRowRef} className="flex items-center h-6">
          <span className="text-[10px] text-white/30 uppercase tracking-wider">input text</span>
        </div>

        <div className="border-t border-white/[0.06]" />

        {/* Routes config */}
        <div>
          <p className="text-[10px] text-white/30 uppercase tracking-wider mb-1.5">Routes</p>

          {routes.length === 0 ? (
            <p className="text-[11px] text-white/20 text-center py-2">add a language below</p>
          ) : (
            <div className="space-y-1.5">
              <div className="flex items-center gap-1.5 px-0.5 mb-0.5">
                <p className="flex-1 text-[9px] text-white/20 uppercase tracking-wider">ISO 639-3 code</p>
                <div className="h-4 w-6 shrink-0" />
              </div>

              {routes.map((r) => (
                <div key={r.id} className="flex items-center gap-1.5">
                  <input
                    value={r.lang}
                    onChange={(e) => updateLang(r.id, e.target.value)}
                    placeholder="e.g. eng, spa"
                    maxLength={3}
                    className={cn(
                      "flex-1 min-w-0 rounded-lg border border-white/[0.08] bg-[#252527]",
                      "px-2.5 py-1.5 text-[12px] font-mono text-white/90",
                      "focus:outline-none focus:border-sky-500/40 transition-colors",
                      "placeholder:text-white/20"
                    )}
                  />
                  <span className="text-[10px] text-cyan-300/60 w-20 truncate shrink-0">
                    {LANG_NAMES[r.lang] ?? (r.lang ? "unknown" : "")}
                  </span>
                  <button
                    onClick={() => removeRoute(r.id)}
                    className="h-6 w-6 flex items-center justify-center rounded-md text-white/20 hover:text-red-400 hover:bg-red-500/10 transition-colors shrink-0"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Add route button */}
        <button
          onClick={addRoute}
          className="w-full flex items-center justify-center gap-1.5 py-1.5 rounded-lg border border-dashed border-white/[0.12] text-[11px] text-white/30 hover:text-white/60 hover:border-white/25 transition-colors"
        >
          <Plus className="h-3 w-3" />
          Add language
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

        {/* Output handle rows */}
        <div className="space-y-1">
          {routes.map((r) => (
            <div
              key={r.id}
              ref={(el) => {
                if (el) outRefs.current.set(r.id, el);
                else outRefs.current.delete(r.id);
              }}
              className="flex items-center justify-end gap-1.5 h-6"
            >
              <span className="text-[11px] font-mono text-cyan-400/70 truncate max-w-[160px]">
                {LANG_NAMES[r.lang] ?? (r.lang || "(language)")}
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

          <div ref={langRef} className="flex items-center justify-end gap-1.5 h-6">
            <span className="text-[11px] font-mono text-violet-400/70">lang</span>
          </div>
          <div ref={confRef} className="flex items-center justify-end gap-1.5 h-6">
            <span className="text-[11px] font-mono text-amber-400/70">confidence</span>
          </div>
        </div>

      </div>
    </div>
  );
}

export const LanguageDetectNode = memo(LanguageDetectNodeComponent);
