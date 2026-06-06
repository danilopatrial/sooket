"use client";

import { useRef, useState } from "react";
import { Maximize2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useVariables } from "@/lib/variables-context";
import { useWorkflowNodes } from "@/lib/nodes-context";
import { TextExpandModal } from "@/components/canvas/TextExpandModal";

const PARTIAL_VAR      = /\$([A-Z0-9_]*)$/;
// Matches $node. followed by a partial node ID at cursor, inside {{ ... }}
const PARTIAL_NODE_REF = /\{\{[^}]*\$node\.([A-Za-z0-9_-]*)$/;

type SuggestionMode = "vars" | "nodes";

interface VarFieldProps {
  value: string;
  onChange: (value: string) => void;
  as?: "textarea" | "input";
  rows?: number;
  placeholder?: string;
  /** Layout classes on the outer wrapper (flex-1, min-w-0, w-full…) */
  wrapperClass?: string;
  /**
   * Typography classes applied identically to both the backdrop and the input
   * so highlighted text stays pixel-aligned with the real text.
   * Defaults: textarea → "text-[12px] px-3 py-2 leading-relaxed"
   *           input    → "text-[11px] px-2.5 py-1.5 font-mono"
   */
  typographyClass?: string;
  /** Text colour for non-highlighted text in the backdrop */
  textColorClass?: string;
  focusBorderClass?: string;
  disabled?: boolean;
  /** Label shown in the expand modal title */
  expandTitle?: string;
}

function HighlightedSegment({ text, knownNames }: { text: string; knownNames: string[] }) {
  const parts = text.split(/(\$[A-Z][A-Z0-9_]*)/g);
  return (
    <>
      {parts.map((part, i) => {
        if (/^\$[A-Z][A-Z0-9_]*$/.test(part)) {
          const known = knownNames.includes(part.slice(1));
          return (
            <mark
              key={i}
              className={cn("bg-transparent font-semibold", known ? "text-violet-400" : "text-amber-400")}
            >
              {part}
            </mark>
          );
        }
        return <span key={i}>{part}</span>;
      })}
    </>
  );
}

function Highlighted({
  text,
  knownNames,
  knownNodeIds,
}: {
  text: string;
  knownNames: string[];
  knownNodeIds: string[];
  colorClass: string;
}) {
  // Split on {{ ... }} blocks — capture the blocks themselves
  const segments = text.split(/(\{\{[\s\S]*?\}\})/g);
  return (
    <>
      {segments.map((seg, i) => {
        if (/^\{\{[\s\S]*?\}\}$/.test(seg)) {
          // Check if this is a $node reference
          const inner = seg.slice(2, -2).trim();
          const nodeMatch = inner.match(/^\$node\.([A-Za-z0-9_-]+)/);
          const isKnownNode = nodeMatch ? knownNodeIds.includes(nodeMatch[1]) : false;
          return (
            <mark
              key={i}
              className={cn(
                "bg-transparent font-semibold",
                nodeMatch
                  ? isKnownNode ? "text-sky-400" : "text-amber-400"
                  : "text-sky-400/70"
              )}
            >
              {seg}
            </mark>
          );
        }
        return <HighlightedSegment key={i} text={seg} knownNames={knownNames} />;
      })}
    </>
  );
}

export function VarField({
  value,
  onChange,
  as = "textarea",
  rows = 4,
  placeholder,
  wrapperClass,
  typographyClass,
  textColorClass = "text-white/90",
  focusBorderClass = "focus:border-violet-500/40",
  disabled = false,
  expandTitle,
}: VarFieldProps) {
  const { names } = useVariables();
  const { nodes: workflowNodes } = useWorkflowNodes();
  const inputRef = useRef<HTMLTextAreaElement & HTMLInputElement>(null);
  const backdropRef = useRef<HTMLDivElement>(null);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [suggestionMode, setSuggestionMode] = useState<SuggestionMode>("vars");
  const [selectedIdx, setSelectedIdx] = useState(0);
  const [focused, setFocused] = useState(false);
  const [expandOpen, setExpandOpen] = useState(false);

  const defaultTypography =
    as === "textarea"
      ? "text-[12px] px-3 py-2 leading-relaxed"
      : "text-[11px] px-2.5 py-1.5 font-mono";
  const typography = typographyClass ?? defaultTypography;

  // Keep backdrop scroll in sync with the input
  function syncScroll() {
    if (inputRef.current && backdropRef.current) {
      backdropRef.current.scrollTop = inputRef.current.scrollTop;
      backdropRef.current.scrollLeft = inputRef.current.scrollLeft;
    }
  }

  function computeSuggestions(val: string, cursorPos: number) {
    if (disabled) { setSuggestions([]); return; }
    const before = val.slice(0, cursorPos);

    // Node autocomplete: $node. inside {{ ... }}
    const nodeMatch = before.match(PARTIAL_NODE_REF);
    if (nodeMatch && workflowNodes.length > 0) {
      const partial = nodeMatch[1];
      const filtered = workflowNodes
        .filter((n) => n.id.startsWith(partial))
        .map((n) => n.id);
      setSuggestions(filtered);
      setSuggestionMode("nodes");
      setSelectedIdx(0);
      return;
    }

    // Variable autocomplete: $VAR_NAME
    if (names.length === 0) { setSuggestions([]); return; }
    const varMatch = before.match(PARTIAL_VAR);
    if (!varMatch) { setSuggestions([]); return; }
    const filtered = names.filter((n) => n.startsWith(varMatch[1]));
    setSuggestions(filtered);
    setSuggestionMode("vars");
    setSelectedIdx(0);
  }

  function handleChange(
    e: React.ChangeEvent<HTMLTextAreaElement | HTMLInputElement>
  ) {
    const newVal = e.target.value;
    const cursor = e.target.selectionStart ?? newVal.length;
    onChange(newVal);
    computeSuggestions(newVal, cursor);
  }

  function insertVar(name: string) {
    const el = inputRef.current;
    if (!el) return;
    const cursor = el.selectionStart ?? value.length;
    const before = value.slice(0, cursor);
    const after = value.slice(cursor);
    const m = before.match(PARTIAL_VAR);
    if (!m) return;
    const newBefore = before.slice(0, before.length - m[0].length) + `$${name}`;
    onChange(newBefore + after);
    setSuggestions([]);
    const pos = newBefore.length;
    requestAnimationFrame(() => {
      if (inputRef.current) {
        inputRef.current.selectionStart = pos;
        inputRef.current.selectionEnd = pos;
        inputRef.current.focus();
      }
    });
  }

  function insertNodeRef(nodeId: string) {
    const el = inputRef.current;
    if (!el) return;
    const cursor = el.selectionStart ?? value.length;
    const before = value.slice(0, cursor);
    const after = value.slice(cursor);
    const m = before.match(PARTIAL_NODE_REF);
    if (!m) return;
    // Replace partial id with full nodeId; keep the $node. prefix already typed
    const partialLen = m[1].length;
    const newBefore = before.slice(0, before.length - partialLen) + nodeId;
    onChange(newBefore + after);
    setSuggestions([]);
    const pos = newBefore.length;
    requestAnimationFrame(() => {
      if (inputRef.current) {
        inputRef.current.selectionStart = pos;
        inputRef.current.selectionEnd = pos;
        inputRef.current.focus();
      }
    });
  }

  function insertSuggestion(suggestion: string) {
    if (suggestionMode === "nodes") insertNodeRef(suggestion);
    else insertVar(suggestion);
  }

  function handleKeyDown(
    e: React.KeyboardEvent<HTMLTextAreaElement | HTMLInputElement>
  ) {
    if (suggestions.length === 0) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIdx((i) => Math.min(i + 1, suggestions.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIdx((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter" || e.key === "Tab") {
      e.preventDefault();
      insertSuggestion(suggestions[selectedIdx]);
    } else if (e.key === "Escape") {
      setSuggestions([]);
    }
  }

  function handleBlur() {
    setFocused(false);
    setTimeout(() => setSuggestions([]), 150);
  }

  // Strip the "focus:" prefix — we manage focus state manually via `focused`
  const activeBorder = focusBorderClass.replace(/^focus:/, "");

  const wrapperCn = cn(
    "relative rounded-lg border bg-[#252527] transition-colors",
    focused ? activeBorder : "border-white/[0.08]",
    disabled && "opacity-30 pointer-events-none",
    wrapperClass
  );

  // Backdrop: same typography as the input, absolutely fills the wrapper
  const backdropCn = cn(
    "absolute inset-0 pointer-events-none select-none overflow-hidden",
    typography,
    textColorClass,
    as === "textarea" ? "whitespace-pre-wrap break-words" : "whitespace-nowrap flex items-center"
  );

  // Input: transparent text + caret so only the backdrop text shows
  const inputCn = cn(
    "relative w-full bg-transparent focus:outline-none placeholder-white/20",
    "text-transparent caret-white/80",
    typography,
    as === "textarea" ? "resize-none" : ""
  );

  return (
    <>
    <div className={wrapperCn}>
      {/* Highlighted text rendered behind the transparent input */}
      <div ref={backdropRef} aria-hidden className={backdropCn}>
        <Highlighted
          text={value}
          knownNames={names}
          knownNodeIds={workflowNodes.map((n) => n.id)}
          colorClass={textColorClass}
        />
        {/* Trailing space prevents last-line height collapse in textarea */}
        {as === "textarea" && " "}
      </div>

      {as === "textarea" && expandTitle && (
        <button
          type="button"
          onClick={() => setExpandOpen(true)}
          className="absolute top-1.5 right-1.5 z-10 p-0.5 rounded text-white/20 hover:text-white/60 hover:bg-white/[0.06] transition-colors"
          tabIndex={-1}
          title="Expand editor"
        >
          <Maximize2 className="h-3 w-3" />
        </button>
      )}

      {as === "textarea" ? (
        <textarea
          ref={inputRef as React.RefObject<HTMLTextAreaElement>}
          value={value}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          onFocus={() => setFocused(true)}
          onBlur={handleBlur}
          onScroll={syncScroll}
          rows={rows}
          placeholder={placeholder}
          spellCheck={false}
          disabled={disabled}
          className={inputCn}
        />
      ) : (
        <input
          ref={inputRef as React.RefObject<HTMLInputElement>}
          type="text"
          value={value}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          onFocus={() => setFocused(true)}
          onBlur={handleBlur}
          onScroll={syncScroll}
          placeholder={placeholder}
          spellCheck={false}
          disabled={disabled}
          className={inputCn}
        />
      )}

      {suggestions.length > 0 && (
        <div className="absolute left-0 right-0 top-full mt-1 z-50 rounded-lg border border-white/[0.12] bg-[#1e1e20] shadow-2xl overflow-hidden">
          <p className="px-2.5 pt-1.5 pb-1 text-[9px] text-white/25 uppercase tracking-wider">
            {suggestionMode === "nodes" ? "Nodes" : "Variables"}
          </p>
          {suggestionMode === "nodes"
            ? suggestions.map((nodeId, i) => {
                const nodeInfo = workflowNodes.find((n) => n.id === nodeId);
                return (
                  <button
                    key={nodeId}
                    type="button"
                    onMouseDown={() => insertSuggestion(nodeId)}
                    className={cn(
                      "w-full text-left px-2.5 py-1.5 text-[11px] font-mono transition-colors flex items-center gap-1.5",
                      i === selectedIdx
                        ? "bg-sky-600/25 text-sky-200"
                        : "text-white/60 hover:bg-white/[0.05]"
                    )}
                  >
                    <span className="text-sky-400 shrink-0">$node.</span>
                    <span className="truncate">{nodeId}</span>
                    {nodeInfo && (
                      <span className="ml-auto text-white/25 text-[10px] shrink-0">{nodeInfo.label}</span>
                    )}
                  </button>
                );
              })
            : suggestions.map((name, i) => (
                <button
                  key={name}
                  type="button"
                  onMouseDown={() => insertSuggestion(name)}
                  className={cn(
                    "w-full text-left px-2.5 py-1.5 text-[11px] font-mono transition-colors",
                    i === selectedIdx
                      ? "bg-violet-600/25 text-violet-200"
                      : "text-white/60 hover:bg-white/[0.05]"
                  )}
                >
                  <span className="text-violet-400">$</span>
                  {name}
                </button>
              ))
          }
          <p className="px-2.5 pb-1.5 pt-1 text-[9px] text-white/20">
            ↑↓ · Enter insert · Esc dismiss
          </p>
        </div>
      )}
    </div>

    {expandTitle && (
      <TextExpandModal
        open={expandOpen}
        onOpenChange={setExpandOpen}
        value={value}
        onChange={onChange}
        title={expandTitle}
        placeholder={placeholder}
      />
    )}
    </>
  );
}
