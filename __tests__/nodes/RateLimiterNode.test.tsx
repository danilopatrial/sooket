import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { RateLimiterNode } from "@/components/canvas/nodes/RateLimiterNode";
import type { RateLimiterNodeData } from "@/components/canvas/nodes/RateLimiterNode";
import type { NodeProps } from "@xyflow/react";

vi.mock("@xyflow/react", () => ({
  Handle: ({ id, type, position }: { id: string; type: string; position: string }) => (
    <div data-testid={`handle-${id}`} data-handle-type={type} data-position={position} />
  ),
  Position: { Left: "left", Right: "right" },
  useViewport: () => ({ zoom: 1 }),
}));

function makeProps(overrides: Partial<RateLimiterNodeData> = {}): NodeProps {
  const data: RateLimiterNodeData = {
    keySource: "ip",
    windowSeconds: 60,
    limit: 100,
    action: "block",
    delayMs: 1000,
    ...overrides,
  };
  return { id: "n1", data: data as unknown as Record<string, unknown>, selected: false } as NodeProps;
}

describe("RateLimiterNode — rendering", () => {
  it("renders without crashing", () => {
    render(<RateLimiterNode {...makeProps()} />);
    expect(screen.getByText("Rate Limiter")).toBeInTheDocument();
  });

  it("shows limit/window/action in subtitle", () => {
    render(<RateLimiterNode {...makeProps({ limit: 50, windowSeconds: 60, action: "block" })} />);
    expect(screen.getByText(/50 req \/ 1m · block/)).toBeInTheDocument();
  });

  it("formats windowSeconds=3600 as '1h'", () => {
    render(<RateLimiterNode {...makeProps({ windowSeconds: 3600, limit: 10, action: "block" })} />);
    expect(screen.getByText(/1h/)).toBeInTheDocument();
  });

  it("formats windowSeconds=30 as '30s'", () => {
    render(<RateLimiterNode {...makeProps({ windowSeconds: 30, limit: 5, action: "block" })} />);
    expect(screen.getByText(/30s/)).toBeInTheDocument();
  });

  it("renders without crashing when selected=true", () => {
    render(<RateLimiterNode {...makeProps()} selected={true} />);
    expect(screen.getByText("Rate Limiter")).toBeInTheDocument();
  });
});

describe("RateLimiterNode — handles", () => {
  it("renders input handle (target, left)", () => {
    render(<RateLimiterNode {...makeProps()} />);
    expect(screen.getByTestId("handle-input")).toHaveAttribute("data-handle-type", "target");
  });

  it("renders key handle (target, left)", () => {
    render(<RateLimiterNode {...makeProps()} />);
    expect(screen.getByTestId("handle-key")).toHaveAttribute("data-handle-type", "target");
  });

  it("renders output handle (source, right)", () => {
    render(<RateLimiterNode {...makeProps()} />);
    expect(screen.getByTestId("handle-output")).toHaveAttribute("data-handle-type", "source");
  });

  it("renders blocked handle (source, right)", () => {
    render(<RateLimiterNode {...makeProps()} />);
    expect(screen.getByTestId("handle-blocked")).toHaveAttribute("data-handle-type", "source");
  });

  it("has exactly 4 handles", () => {
    render(<RateLimiterNode {...makeProps()} />);
    expect(screen.getAllByTestId(/^handle-/)).toHaveLength(4);
  });
});
