"use client";

import { Bug, History, Settings2 } from "lucide-react";
import Link from "next/link";

interface CanvasTopBarProps {
  slug: string;
  name: string;
  onNameChange: (name: string) => void;
  isActive: boolean;
  toggling: boolean;
  onToggleActive: () => void;
  saving: boolean;
  showSaved: boolean;
  onSave: () => void;
  debugOpen: boolean;
  onToggleDebug: () => void;
  historyOpen: boolean;
  onToggleHistory: () => void;
}

export function CanvasTopBar({
  slug,
  name,
  onNameChange,
  isActive,
  toggling,
  onToggleActive,
  saving,
  showSaved,
  onSave,
  debugOpen,
  onToggleDebug,
  historyOpen,
  onToggleHistory,
}: CanvasTopBarProps) {
  return (
    <div className="flex items-center gap-3 px-4 h-[52px] border-b border-white/[0.06] bg-[#141414] shrink-0">
      {/* Brand icon — click to go home */}
      <Link
        href="/workflow"
        className="h-7 w-7 rounded-md bg-violet-600 flex items-center justify-center shrink-0 hover:bg-violet-500 transition-colors"
        title="Back to workflows"
      >
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
          <path d="M7 1L13 7L7 13L1 7L7 1Z" stroke="white" strokeWidth="1.5" strokeLinejoin="round" />
        </svg>
      </Link>

      {/* Workflow name */}
      <input
        type="text"
        value={name}
        onChange={(e: React.ChangeEvent<HTMLInputElement>) => onNameChange(e.target.value)}
        className="w-64 bg-[#1e1e1e] border border-white/[0.08] rounded-lg px-3 py-1.5 text-sm text-white placeholder-white/30 focus:outline-none focus:border-violet-500/40 focus:ring-1 focus:ring-violet-500/10 transition-colors"
      />

      {showSaved && (
        <span className="text-xs text-white/30 select-none">saved</span>
      )}

      <div className="flex-1" />

      {/* Active toggle */}
      <button
        onClick={onToggleActive}
        disabled={toggling}
        className="flex items-center gap-2 group disabled:opacity-60"
        title={isActive ? "Deactivate workflow" : "Activate workflow"}
      >
        <span className="text-sm text-white/40">active</span>
        <div className={[
          "relative w-8 h-[18px] rounded-full transition-colors duration-150",
          isActive ? "bg-violet-600" : "bg-white/[0.12]",
        ].join(" ")}>
          <div className={[
            "absolute top-0.5 h-3.5 w-3.5 rounded-full bg-white shadow transition-transform duration-150",
            isActive ? "translate-x-[18px]" : "translate-x-0.5",
          ].join(" ")} />
        </div>
      </button>

      {/* Debug */}
      <button
        onClick={onToggleDebug}
        title="Debug panel"
        className={[
          "h-8 w-8 flex items-center justify-center rounded-lg transition-colors shrink-0",
          debugOpen
            ? "text-violet-400 bg-violet-500/10 hover:bg-violet-500/20"
            : "text-white/50 hover:text-white hover:bg-white/[0.08]",
        ].join(" ")}
      >
        <Bug className="h-4 w-4" />
      </button>

      {/* History */}
      <button
        onClick={onToggleHistory}
        title="Version history"
        className={[
          "h-8 w-8 flex items-center justify-center rounded-lg transition-colors shrink-0",
          historyOpen
            ? "text-violet-400 bg-violet-500/10 hover:bg-violet-500/20"
            : "text-white/50 hover:text-white hover:bg-white/[0.08]",
        ].join(" ")}
      >
        <History className="h-4 w-4" />
      </button>

      {/* Config */}
      <Link
        href={`/workflow/${slug}/config`}
        title="Workflow settings"
        className="h-8 w-8 flex items-center justify-center rounded-lg text-white/50 hover:text-white hover:bg-white/[0.08] transition-colors shrink-0"
      >
        <Settings2 className="h-4 w-4" />
      </Link>

      {/* Save */}
      <button
        onClick={onSave}
        disabled={saving}
        className="px-4 py-1.5 rounded-lg bg-white text-black text-sm font-medium hover:bg-white/90 transition-colors disabled:opacity-50 shrink-0"
      >
        {saving ? "Saving…" : "Save"}
      </button>
    </div>
  );
}
