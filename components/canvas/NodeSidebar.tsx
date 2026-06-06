"use client";

import { useState, useMemo } from "react";
import { Search, ChevronLeft, ChevronRight, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { NODE_REGISTRY, NODE_CATEGORIES, CATEGORY_LABEL, type NodeDef, type NodeCategory } from "./nodes/registry";

// Static map so Tailwind's scanner can detect all color class names
const BG_TO_TEXT: Record<string, string> = {
  "bg-violet-500":  "text-violet-500",
  "bg-amber-500":   "text-amber-500",
  "bg-blue-500":    "text-blue-500",
  "bg-emerald-600": "text-emerald-600",
  "bg-emerald-500": "text-emerald-500",
  "bg-cyan-500":    "text-cyan-500",
  "bg-rose-500":    "text-rose-500",
  "bg-indigo-500":  "text-indigo-500",
  "bg-sky-500":     "text-sky-500",
  "bg-orange-500":  "text-orange-500",
  "bg-yellow-500":  "text-yellow-500",
  "bg-pink-500":    "text-pink-500",
  "bg-lime-500":    "text-lime-500",
  "bg-teal-500":    "text-teal-500",
  "bg-purple-500":  "text-purple-500",
};

function bgToText(color: string) {
  return BG_TO_TEXT[color] ?? "text-white/50";
}

interface NodeItemProps {
  node: NodeDef;
  onAdd: () => void;
  showCategory?: boolean;
}

function NodeItem({ node, onAdd, showCategory }: NodeItemProps) {
  function onDragStart(e: React.DragEvent) {
    e.dataTransfer.setData("application/reactflow", node.type);
    e.dataTransfer.effectAllowed = "move";
  }

  const Icon = node.icon;

  return (
    <div
      draggable
      onDragStart={onDragStart}
      onClick={onAdd}
      className="flex items-center gap-2.5 mx-2 px-2.5 py-2 rounded-lg transition-colors select-none cursor-pointer hover:bg-white/[0.06] group"
    >
      <div className={cn("shrink-0", bgToText(node.color))}>
        <Icon size={15} strokeWidth={1.8} />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-[12.5px] text-white leading-none truncate">{node.label}</p>
        <p className="text-[10px] text-white/35 mt-0.5 truncate">{node.sub}</p>
      </div>
      {showCategory && (
        <span className="text-[9px] font-medium tracking-wide text-white/20 uppercase shrink-0">
          {CATEGORY_LABEL[node.category]}
        </span>
      )}
    </div>
  );
}

interface NodeSidebarProps {
  onAddNode: (type: string) => void;
}

export function NodeSidebar({ onAddNode }: NodeSidebarProps) {
  const [collapsed, setCollapsed] = useState(false);
  const [activeCategory, setActiveCategory] = useState<NodeCategory>("request");
  const [query, setQuery] = useState("");

  const searchResults = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return null;
    return NODE_REGISTRY.filter(
      (n) => n.label.toLowerCase().includes(q) || n.sub.toLowerCase().includes(q)
    );
  }, [query]);

  const categoryNodes = useMemo(
    () => NODE_REGISTRY.filter((n) => n.category === activeCategory),
    [activeCategory]
  );

  if (collapsed) {
    return (
      <div className="shrink-0 w-8 border-r border-white/[0.06] bg-[#141414] flex flex-col items-center pt-3">
        <button
          onClick={() => setCollapsed(false)}
          className="p-1 rounded text-white/30 hover:text-white/70 hover:bg-white/[0.06] transition-colors"
          title="Show sidebar"
        >
          <ChevronRight size={14} />
        </button>
      </div>
    );
  }

  return (
    <div className="shrink-0 w-[220px] border-r border-white/[0.06] bg-[#141414] flex flex-col min-h-0">
      {/* Search bar row */}
      <div className="flex items-center gap-1 px-2 pt-3 pb-2 border-b border-white/[0.04]">
        <div className="relative flex-1">
          <Search size={11} className="absolute left-2 top-1/2 -translate-y-1/2 text-white/25 pointer-events-none" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search nodes…"
            className="w-full bg-white/[0.05] text-white/80 text-[11px] placeholder:text-white/25 rounded-md pl-6 pr-6 py-1.5 outline-none focus:bg-white/[0.08] transition-colors"
          />
          {query && (
            <button
              onClick={() => setQuery("")}
              className="absolute right-1.5 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60"
            >
              <X size={10} />
            </button>
          )}
        </div>
        <button
          onClick={() => setCollapsed(true)}
          className="shrink-0 p-1 rounded text-white/25 hover:text-white/60 hover:bg-white/[0.06] transition-colors"
          title="Hide sidebar"
        >
          <ChevronLeft size={14} />
        </button>
      </div>

      {/* Body: tab strip + node list */}
      <div className="flex flex-1 min-h-0">
        {/* Vertical category tab strip */}
        {!searchResults && (
          <div className="shrink-0 w-9 flex flex-col border-r border-white/[0.04] py-2 gap-0.5">
            {NODE_CATEGORIES.map((cat) => {
              const isActive = cat === activeCategory;
              return (
                <button
                  key={cat}
                  onClick={() => setActiveCategory(cat)}
                  className={cn(
                    "relative flex items-center justify-center py-3 px-1 transition-colors cursor-pointer",
                    isActive
                      ? "text-white"
                      : "text-white/30 hover:text-white/60"
                  )}
                  title={CATEGORY_LABEL[cat]}
                >
                  {isActive && (
                    <span className="absolute left-0 top-2 bottom-2 w-[2px] rounded-r-full bg-white/50" />
                  )}
                  <span
                    className="text-[10px] font-semibold tracking-[0.12em] uppercase whitespace-nowrap select-none"
                    style={{ writingMode: "vertical-rl", transform: "rotate(180deg)" }}
                  >
                    {CATEGORY_LABEL[cat]}
                  </span>
                </button>
              );
            })}
          </div>
        )}

        {/* Node list */}
        <div className="flex-1 overflow-y-auto py-2 min-w-0">
          {searchResults ? (
            searchResults.length === 0 ? (
              <p className="text-[11px] text-white/25 text-center mt-8 px-4">No nodes match &ldquo;{query}&rdquo;</p>
            ) : (
              searchResults.map((n) => (
                <NodeItem key={n.type} node={n} onAdd={() => onAddNode(n.type)} showCategory />
              ))
            )
          ) : (
            categoryNodes.map((n) => (
              <NodeItem key={n.type} node={n} onAdd={() => onAddNode(n.type)} />
            ))
          )}
        </div>
      </div>
    </div>
  );
}
