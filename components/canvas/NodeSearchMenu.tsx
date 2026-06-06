"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import { NODE_REGISTRY, CATEGORY_LABEL, type NodeCategory } from "./nodes/registry";

interface Props {
  screenPos: { x: number; y: number };
  onSelect: (type: string) => void;
  onClose: () => void;
}

const CATEGORY_ORDER: NodeCategory[] = ["ai", "request", "external", "format", "logic", "transform", "static"];

export function NodeSearchMenu({ screenPos, onSelect, onClose }: Props) {
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    function handleMouseDown(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    }
    document.addEventListener("mousedown", handleMouseDown);
    return () => document.removeEventListener("mousedown", handleMouseDown);
  }, [onClose]);

  const filtered = useMemo(() => {
    const q = query.toLowerCase().trim();
    if (!q) return NODE_REGISTRY;
    return NODE_REGISTRY.filter(
      (n) =>
        n.label.toLowerCase().includes(q) ||
        n.sub.toLowerCase().includes(q) ||
        n.category.toLowerCase().includes(q) ||
        CATEGORY_LABEL[n.category].toLowerCase().includes(q)
    );
  }, [query]);

  const grouped = useMemo(() => {
    const map = new Map<NodeCategory, typeof NODE_REGISTRY>();
    for (const cat of CATEGORY_ORDER) map.set(cat, []);
    for (const node of filtered) map.get(node.category)?.push(node);
    return map;
  }, [filtered]);

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { setActiveIndex(0); }, [query]);

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((i) => Math.min(i + 1, filtered.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (filtered[activeIndex]) onSelect(filtered[activeIndex].type);
    } else if (e.key === "Escape") {
      onClose();
    }
  }

  // Clamp to viewport
  const left = Math.min(screenPos.x, (typeof window !== "undefined" ? window.innerWidth : 1920) - 304);
  const top  = Math.min(screenPos.y, (typeof window !== "undefined" ? window.innerHeight : 1080) - 420);

  return (
    <div
      ref={menuRef}
      style={{ position: "fixed", left, top, zIndex: 9999 }}
      className="w-72 bg-[#1a1a1a] border border-white/[0.1] rounded-xl shadow-2xl shadow-black/70 overflow-hidden"
    >
      {/* Search input */}
      <div className="flex items-center gap-2 px-3 py-2.5 border-b border-white/[0.06]">
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className="text-white/30 shrink-0">
          <circle cx="6" cy="6" r="4.5" stroke="currentColor" strokeWidth="1.3" />
          <path d="M9.5 9.5L12.5 12.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
        </svg>
        <input
          ref={inputRef}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Search nodes…"
          className="flex-1 bg-transparent text-sm text-white placeholder-white/30 focus:outline-none"
        />
        <kbd className="text-[10px] text-white/20 font-mono">esc</kbd>
      </div>

      {/* Results */}
      <div className="max-h-[340px] overflow-y-auto py-1">
        {filtered.length === 0 ? (
          <p className="px-3 py-5 text-sm text-white/30 text-center">No nodes found</p>
        ) : (
          CATEGORY_ORDER.map((cat) => {
            const items = grouped.get(cat) ?? [];
            if (!items.length) return null;
            return (
              <div key={cat}>
                <p className="px-3 pt-2 pb-0.5 text-[10px] font-semibold text-white/25 uppercase tracking-widest">
                  {CATEGORY_LABEL[cat]}
                </p>
                {items.map((node) => {
                  const idx = filtered.indexOf(node);
                  return (
                    <button
                      key={node.type}
                      onClick={() => onSelect(node.type)}
                      onMouseEnter={() => setActiveIndex(idx)}
                      className={[
                        "w-full flex items-center gap-2.5 px-3 py-2 text-left transition-colors",
                        idx === activeIndex
                          ? "bg-white/[0.08]"
                          : "hover:bg-white/[0.04]",
                      ].join(" ")}
                    >
                      <div className={`h-2 w-2 rounded-full shrink-0 ${node.color}`} />
                      <div className="min-w-0">
                        <p className="text-sm text-white/90 leading-snug">{node.label}</p>
                        <p className="text-xs text-white/35 leading-snug truncate">{node.sub}</p>
                      </div>
                    </button>
                  );
                })}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
