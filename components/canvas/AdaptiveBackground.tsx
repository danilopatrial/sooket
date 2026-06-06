"use client";

import { Background, BackgroundVariant, useViewport } from "@xyflow/react";
import { GRID_STEPS } from "@/lib/canvas-utils";

export function AdaptiveBackground() {
  const { zoom } = useViewport();

  const rawGap = 32 / zoom;
  const majorGap = GRID_STEPS.find((s) => s >= rawGap) ?? 512;
  const minorGap = majorGap / 4;

  const majorSize = Math.min(2.5, Math.max(1,   2   / zoom));
  const minorSize = Math.min(1.2, Math.max(0.4, 0.8 / zoom));

  return (
    <>
      <Background
        id="bg-minor"
        variant={BackgroundVariant.Dots}
        gap={minorGap}
        size={minorSize}
        color="#1d1d1d"
        style={{ opacity: zoom < 0.35 ? 0 : 1, transition: "opacity 0.15s" }}
      />
      <Background
        id="bg-major"
        variant={BackgroundVariant.Dots}
        gap={majorGap}
        size={majorSize}
        color="#2e2e2e"
      />
    </>
  );
}
