"use client";

import { memo, useRef, useLayoutEffect, useState } from "react";
import { Handle, Position, type NodeProps, useViewport } from "@xyflow/react";
import { Braces, Maximize2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { parseSlots } from "@/lib/template-string";
import { VarField } from "@/components/canvas/VarField";
import { TextExpandModal } from "@/components/canvas/TextExpandModal";
export type { TemplateStringSlot, TemplateStringNodeData } from "@/lib/node-types";
import type { TemplateStringSlot, TemplateStringNodeData } from "@/lib/node-types";






/** Preserve fallback values for existing slots; add new slots; drop removed ones. */
function syncSlots(template: string, existing: TemplateStringSlot[]): TemplateStringSlot[] {
  const names = parseSlots(template);
  const byName = new Map(existing.map((s) => [s.name, s]));
  return names.map((name) => byName.get(name) ?? { name, fallback: "" });
}

function HighlightedTemplate({ text }: { text: string }) {
  const parts = text.split(/(\{\{[A-Za-z_][A-Za-z0-9_]*\}\})/g);
  return (
    <>
      {parts.map((part, i) =>
        /^\{\{[A-Za-z_][A-Za-z0-9_]*\}\}$/.test(part) ? (
          <mark key={i} className="bg-transparent text-sky-400 font-semibold font-mono">
            {part}
          </mark>
        ) : (
          <span key={i}>{part}</span>
        )
      )}
    </>
  );
}

function TemplateStringNodeComponent({ data, selected }: NodeProps) {
  const { zoom } = useViewport();

  const d        = data as unknown as TemplateStringNodeData;
  const template = d.template ?? "";
  const slots    = d.slots    ?? [];
  const onChange = d.onChange;

  const nodeRef      = useRef<HTMLDivElement>(null);
  const rowRefs      = useRef<Map<string, HTMLElement>>(new Map());
  const outputRowRef = useRef<HTMLDivElement>(null);
  const [handleTops, setHandleTops] = useState<Record<string, number>>({});
  const [outputTop,  setOutputTop]  = useState(0);
  const [templateExpanded, setTemplateExpanded] = useState(false);

  const slotNames = slots.map((s) => s.name).join(",");
  useLayoutEffect(() => {
    if (!nodeRef.current) return;
    const nodeTop = nodeRef.current.getBoundingClientRect().top;
    const mid = (el: HTMLElement | null) => {
      if (!el) return 0;
      const r = el.getBoundingClientRect();
      return (r.top + r.height / 2 - nodeTop) / zoom;
    };
    const tops: Record<string, number> = {};
    slots.forEach((s) => {
      tops[s.name] = mid(rowRefs.current.get(s.name) ?? null);
    });
    setHandleTops(tops);
    setOutputTop(mid(outputRowRef.current));
  }, [slotNames, zoom]); // eslint-disable-line react-hooks/exhaustive-deps

  function handleTemplateChange(value: string) {
    const newSlots = syncSlots(value, slots);
    onChange?.({ template: value, slots: newSlots });
  }

  function updateFallback(name: string, fallback: string) {
    onChange?.({
      slots: slots.map((s) => (s.name === name ? { ...s, fallback } : s)),
    });
  }

  const dot = "!w-2.5 !h-2.5 !border-2 !border-[#1a1a1c] !bg-sky-400";

  const subtitle =
    slots.length === 0
      ? "interpolate inputs into a string"
      : `${slots.length} ${slots.length === 1 ? "slot" : "slots"} wired`;

  return (
    <div
      ref={nodeRef}
      className={cn(
        "w-80 rounded-2xl shadow-2xl transition-shadow",
        "border bg-[#1a1a1c]",
        selected ? "border-sky-500/50 shadow-sky-900/20" : "border-white/[0.08]"
      )}
    >
      {/* Per-slot target handles — left side */}
      {slots.map((s) => (
        <Handle
          key={s.name}
          type="target"
          id={s.name}
          position={Position.Left}
          style={{ top: handleTops[s.name] ?? 0 }}
          className={dot}
        />
      ))}

      {/* Single output source handle — right side */}
      <Handle
        type="source"
        id="output"
        position={Position.Right}
        style={{ top: outputTop }}
        className={dot}
      />

      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 bg-[#212124] border-b border-white/[0.06] rounded-t-2xl">
        <div className="h-8 w-8 rounded-lg bg-sky-600 flex items-center justify-center text-white shrink-0">
          <Braces className="h-4 w-4" />
        </div>
        <div className="min-w-0">
          <p className="text-[13px] font-semibold text-white leading-none">Template String</p>
          <p className="text-[11px] text-sky-300/70 mt-0.5 truncate">{subtitle}</p>
        </div>
      </div>

      {/* Body */}
      <div className="p-3 space-y-2 nodrag">
        {/* Template textarea */}
        <div>
          <p className="text-[10px] text-white/30 uppercase tracking-wider mb-1.5">Template</p>
          <div className="relative rounded-lg border border-white/[0.08] bg-[#252527] focus-within:border-sky-500/40 transition-colors">
            {/* Highlight backdrop */}
            <div
              aria-hidden
              className="absolute inset-0 pointer-events-none select-none overflow-hidden text-[12px] px-3 py-2 leading-relaxed whitespace-pre-wrap break-words text-white/90"
            >
              <HighlightedTemplate text={template} />
              {" "}
            </div>
            <textarea
              value={template}
              onChange={(e) => handleTemplateChange(e.target.value)}
              placeholder="e.g. Hello {{name}}, your order {{orderId}} is ready"
              rows={3}
              spellCheck={false}
              className="relative w-full bg-transparent focus:outline-none placeholder-white/20 text-transparent caret-white/80 text-[12px] px-3 py-2 leading-relaxed resize-none"
            />
            <button
              type="button"
              onClick={() => setTemplateExpanded(true)}
              className="absolute top-1.5 right-1.5 z-10 p-0.5 rounded text-white/20 hover:text-white/60 hover:bg-white/[0.06] transition-colors"
              tabIndex={-1}
              title="Expand editor"
            >
              <Maximize2 className="h-3 w-3" />
            </button>
          </div>
          <TextExpandModal
            open={templateExpanded}
            onOpenChange={setTemplateExpanded}
            value={template}
            onChange={handleTemplateChange}
            title="Template"
            placeholder="e.g. Hello {{name}}, your order {{orderId}} is ready"
          />
          <p className="text-[10px] text-white/20 mt-1">
            Use{" "}
            <span className="font-mono text-sky-400/70">{"{{name}}"}</span>
            {" "}to create an input slot
          </p>
        </div>

        {/* Slot list */}
        {slots.length > 0 && (
          <div>
            <div className="flex items-center gap-1.5 px-0.5 mb-0.5">
              <p className="w-24 shrink-0 text-[9px] text-white/20 uppercase tracking-wider">slot</p>
              <p className="flex-1 text-[9px] text-white/20 uppercase tracking-wider">if disconnected</p>
            </div>
            <div className="space-y-1">
              {slots.map((s) => (
                <div
                  key={s.name}
                  ref={(el) => {
                    if (el) rowRefs.current.set(s.name, el);
                    else rowRefs.current.delete(s.name);
                  }}
                  className="flex items-center gap-1.5"
                >
                  <span className="w-24 shrink-0 text-[11px] font-mono text-sky-400/80 truncate">
                    {`{{${s.name}}}`}
                  </span>
                  <VarField
                    as="input"
                    value={s.fallback}
                    onChange={(v) => updateFallback(s.name, v)}
                    placeholder="fallback"
                    focusBorderClass="focus:border-sky-500/40"
                    typographyClass="text-[12px] px-2.5 py-1.5 font-mono"
                    textColorClass="text-white/50"
                    wrapperClass="flex-1 min-w-0"
                  />
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="border-t border-white/[0.06]" />

        <div ref={outputRowRef} className="flex items-center justify-end gap-2 h-6">
          <span className="text-[11px] font-mono text-sky-300/50">output</span>
        </div>
      </div>
    </div>
  );
}

export const TemplateStringNode = memo(TemplateStringNodeComponent);
