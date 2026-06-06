"use client";

import { Download, Upload } from "lucide-react";
import type { Node } from "@xyflow/react";

interface CanvasStatusBarProps {
  slug: string;
  nodes: Node[];
  onZoomIn: () => void;
  onZoomOut: () => void;
  onFitView: () => void;
  onImportClick: () => void;
  onExport: () => void;
  importInputRef: React.RefObject<HTMLInputElement | null>;
  onImportFile: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

export function CanvasStatusBar({
  slug,
  nodes,
  onZoomIn,
  onZoomOut,
  onFitView,
  onImportClick,
  onExport,
  importInputRef,
  onImportFile,
}: CanvasStatusBarProps) {
  return (
    <div className="flex items-center gap-3 px-4 h-9 border-t border-white/[0.06] bg-[#141414] text-xs text-white/30 shrink-0">
      {/* Zoom controls */}
      <div className="flex items-center gap-0.5">
        {[
          { label: "+",   action: onZoomIn },
          { label: "−",   action: onZoomOut },
          { label: "fit", action: onFitView },
        ].map(({ label, action }) => (
          <button
            key={label}
            onClick={action}
            className="h-6 min-w-[24px] px-1.5 flex items-center justify-center rounded text-xs text-white/50 hover:bg-white/[0.06] hover:text-white/80 transition-colors"
          >
            {label}
          </button>
        ))}
      </div>

      <div className="h-3 w-px bg-white/[0.08]" />

      {/* Node count */}
      <div className="flex items-center gap-1.5">
        <div className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
        <span>
          {nodes.length} {nodes.length === 1 ? "node" : "nodes"}
        </span>
      </div>

      <span>workflow: {slug}</span>

      <div className="flex-1" />

      <input
        ref={importInputRef}
        type="file"
        accept=".json"
        className="hidden"
        onChange={onImportFile}
      />
      <button
        onClick={onImportClick}
        title="Import workflow JSON"
        className="h-6 w-6 flex items-center justify-center rounded hover:bg-white/[0.06] transition-colors text-white/40 hover:text-white/70"
      >
        <Upload className="h-3.5 w-3.5" />
      </button>
      <button
        onClick={onExport}
        title="Export workflow JSON"
        className="h-6 w-6 flex items-center justify-center rounded hover:bg-white/[0.06] transition-colors text-white/40 hover:text-white/70"
      >
        <Download className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}
