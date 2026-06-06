import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { SemanticCacheNode } from "@/components/canvas/nodes/SemanticCacheNode";
import type { SemanticCacheNodeData } from "@/components/canvas/nodes/SemanticCacheNode";
import type { NodeProps } from "@xyflow/react";

vi.mock("@xyflow/react", () => ({
  Handle: ({ id, type, position }: { id: string; type: string; position: string }) => (
    <div data-testid={`handle-${id}`} data-handle-type={type} data-position={position} />
  ),
  Position: { Left: "left", Right: "right" },
  useViewport: () => ({ zoom: 1 }),
}));

function makeProps(overrides: Partial<SemanticCacheNodeData> = {}): NodeProps {
  const data: SemanticCacheNodeData = { ttl: 3600, threshold: 0.85, ...overrides };
  return { id: "node-1", data: data as unknown as Record<string, unknown>, selected: false } as NodeProps;
}

// ─── 1. Rendering ─────────────────────────────────────────────────────────────

describe("SemanticCacheNode — rendering", () => {
  it("renders without crashing with default data", () => {
    render(<SemanticCacheNode {...makeProps()} />);
    expect(screen.getByText("Semantic Cache")).toBeInTheDocument();
  });

  it("shows TTL as hours when ttl >= 3600", () => {
    render(<SemanticCacheNode {...makeProps({ ttl: 3600 })} />);
    expect(screen.getByText("1h TTL")).toBeInTheDocument();
  });

  it("shows TTL as minutes when 60 <= ttl < 3600", () => {
    render(<SemanticCacheNode {...makeProps({ ttl: 120 })} />);
    expect(screen.getByText("2m TTL")).toBeInTheDocument();
  });

  it("shows TTL as seconds when ttl < 60", () => {
    render(<SemanticCacheNode {...makeProps({ ttl: 30 })} />);
    expect(screen.getByText("30s TTL")).toBeInTheDocument();
  });

  it("defaults to 1h TTL when ttl is undefined", () => {
    const props = makeProps();
    (props.data as Record<string, unknown>).ttl = undefined;
    render(<SemanticCacheNode {...props} />);
    expect(screen.getByText("1h TTL")).toBeInTheDocument();
  });

  it("shows threshold label with two decimal places", () => {
    render(<SemanticCacheNode {...makeProps({ threshold: 0.92 })} />);
    expect(screen.getByText(/0\.92/)).toBeInTheDocument();
  });

  it("defaults threshold to 0.85 when undefined", () => {
    const props = makeProps();
    (props.data as Record<string, unknown>).threshold = undefined;
    render(<SemanticCacheNode {...props} />);
    expect(screen.getByText(/0\.85/)).toBeInTheDocument();
  });

  it("shows 'key' input row label", () => {
    render(<SemanticCacheNode {...makeProps()} />);
    expect(screen.getByText("key")).toBeInTheDocument();
  });

  it("shows 'value' input row label", () => {
    render(<SemanticCacheNode {...makeProps()} />);
    const labels = screen.getAllByText("value");
    expect(labels.length).toBeGreaterThanOrEqual(1);
  });

  it("shows 'output' source row label", () => {
    render(<SemanticCacheNode {...makeProps()} />);
    expect(screen.getByText("output")).toBeInTheDocument();
  });

  it("shows 'hit' source row label", () => {
    render(<SemanticCacheNode {...makeProps()} />);
    expect(screen.getByText("hit")).toBeInTheDocument();
  });

  it("shows 'lazy' type hint on value row", () => {
    render(<SemanticCacheNode {...makeProps()} />);
    expect(screen.getByText("lazy")).toBeInTheDocument();
  });

  it("shows 'text' type hint on key row", () => {
    render(<SemanticCacheNode {...makeProps()} />);
    expect(screen.getByText("text")).toBeInTheDocument();
  });

  it("shows 'bool' type hint on hit row", () => {
    render(<SemanticCacheNode {...makeProps()} />);
    expect(screen.getByText("bool")).toBeInTheDocument();
  });

  it("shows 'loose' and 'strict' threshold scale labels", () => {
    render(<SemanticCacheNode {...makeProps()} />);
    expect(screen.getByText("loose")).toBeInTheDocument();
    expect(screen.getByText("strict")).toBeInTheDocument();
  });
});

// ─── 2. Handles ───────────────────────────────────────────────────────────────

describe("SemanticCacheNode — handles", () => {
  it("renders the 'key' handle as target on the left", () => {
    render(<SemanticCacheNode {...makeProps()} />);
    const h = screen.getByTestId("handle-key");
    expect(h).toHaveAttribute("data-handle-type", "target");
    expect(h).toHaveAttribute("data-position", "left");
  });

  it("renders the 'value' handle as target on the left", () => {
    render(<SemanticCacheNode {...makeProps()} />);
    const h = screen.getByTestId("handle-value");
    expect(h).toHaveAttribute("data-handle-type", "target");
    expect(h).toHaveAttribute("data-position", "left");
  });

  it("renders the 'output' handle as source on the right", () => {
    render(<SemanticCacheNode {...makeProps()} />);
    const h = screen.getByTestId("handle-output");
    expect(h).toHaveAttribute("data-handle-type", "source");
    expect(h).toHaveAttribute("data-position", "right");
  });

  it("renders the 'hit' handle as source on the right", () => {
    render(<SemanticCacheNode {...makeProps()} />);
    const h = screen.getByTestId("handle-hit");
    expect(h).toHaveAttribute("data-handle-type", "source");
    expect(h).toHaveAttribute("data-position", "right");
  });

  it("has exactly 4 handles (2 targets + 2 sources)", () => {
    render(<SemanticCacheNode {...makeProps()} />);
    expect(screen.getAllByTestId(/^handle-/)).toHaveLength(4);
  });

  it("has exactly 2 target handles", () => {
    render(<SemanticCacheNode {...makeProps()} />);
    const all     = screen.getAllByTestId(/^handle-/);
    const targets = all.filter((h) => h.getAttribute("data-handle-type") === "target");
    expect(targets).toHaveLength(2);
  });

  it("has exactly 2 source handles", () => {
    render(<SemanticCacheNode {...makeProps()} />);
    const all     = screen.getAllByTestId(/^handle-/);
    const sources = all.filter((h) => h.getAttribute("data-handle-type") === "source");
    expect(sources).toHaveLength(2);
  });
});

// ─── 3. TTL onChange ──────────────────────────────────────────────────────────

describe("SemanticCacheNode — TTL onChange", () => {
  it("calls onChange with new ttl for a valid value", () => {
    const onChange = vi.fn();
    render(<SemanticCacheNode {...makeProps({ onChange })} />);
    const input = screen.getByRole("spinbutton");
    fireEvent.change(input, { target: { value: "7200" } });
    expect(onChange).toHaveBeenCalledWith({ ttl: 7200 });
  });

  it("does not call onChange for non-numeric input", () => {
    const onChange = vi.fn();
    render(<SemanticCacheNode {...makeProps({ onChange })} />);
    const input = screen.getByRole("spinbutton");
    fireEvent.change(input, { target: { value: "abc" } });
    expect(onChange).not.toHaveBeenCalled();
  });

  it("does not call onChange for ttl=0 (below min)", () => {
    const onChange = vi.fn();
    render(<SemanticCacheNode {...makeProps({ onChange })} />);
    const input = screen.getByRole("spinbutton");
    fireEvent.change(input, { target: { value: "0" } });
    expect(onChange).not.toHaveBeenCalled();
  });

  it("does not call onChange for negative ttl", () => {
    const onChange = vi.fn();
    render(<SemanticCacheNode {...makeProps({ onChange })} />);
    const input = screen.getByRole("spinbutton");
    fireEvent.change(input, { target: { value: "-10" } });
    expect(onChange).not.toHaveBeenCalled();
  });

  it("calls onChange with ttl=1 (minimum valid)", () => {
    const onChange = vi.fn();
    render(<SemanticCacheNode {...makeProps({ onChange })} />);
    const input = screen.getByRole("spinbutton");
    fireEvent.change(input, { target: { value: "1" } });
    expect(onChange).toHaveBeenCalledWith({ ttl: 1 });
  });

  it("does not crash when onChange is undefined", () => {
    render(<SemanticCacheNode {...makeProps({ onChange: undefined })} />);
    const input = screen.getByRole("spinbutton");
    expect(() => fireEvent.change(input, { target: { value: "600" } })).not.toThrow();
  });
});

// ─── 4. Threshold slider onChange ─────────────────────────────────────────────

describe("SemanticCacheNode — threshold onChange", () => {
  it("calls onChange with new threshold from slider", () => {
    const onChange = vi.fn();
    render(<SemanticCacheNode {...makeProps({ onChange })} />);
    const slider = screen.getByRole("slider");
    fireEvent.change(slider, { target: { value: "0.7" } });
    expect(onChange).toHaveBeenCalledWith({ threshold: 0.7 });
  });

  it("calls onChange with threshold=0 (boundary)", () => {
    const onChange = vi.fn();
    render(<SemanticCacheNode {...makeProps({ onChange })} />);
    const slider = screen.getByRole("slider");
    fireEvent.change(slider, { target: { value: "0" } });
    expect(onChange).toHaveBeenCalledWith({ threshold: 0 });
  });

  it("calls onChange with threshold=1 (boundary)", () => {
    const onChange = vi.fn();
    render(<SemanticCacheNode {...makeProps({ onChange })} />);
    const slider = screen.getByRole("slider");
    fireEvent.change(slider, { target: { value: "1" } });
    expect(onChange).toHaveBeenCalledWith({ threshold: 1 });
  });

  it("does not crash when onChange is undefined and slider changes", () => {
    render(<SemanticCacheNode {...makeProps({ onChange: undefined })} />);
    const slider = screen.getByRole("slider");
    expect(() => fireEvent.change(slider, { target: { value: "0.8" } })).not.toThrow();
  });
});

// ─── 5. connectedHandles ──────────────────────────────────────────────────────

describe("SemanticCacheNode — connectedHandles", () => {
  it("does not crash when connectedHandles is undefined", () => {
    const props = makeProps();
    (props.data as Record<string, unknown>).connectedHandles = undefined;
    expect(() => render(<SemanticCacheNode {...props} />)).not.toThrow();
  });

  it("renders correctly with empty connectedHandles", () => {
    render(<SemanticCacheNode {...makeProps({ connectedHandles: [] })} />);
    expect(screen.getByText("Semantic Cache")).toBeInTheDocument();
  });

  it("renders correctly when 'key' is in connectedHandles", () => {
    render(<SemanticCacheNode {...makeProps({ connectedHandles: ["key"] })} />);
    expect(screen.getByText("key")).toBeInTheDocument();
  });

  it("renders correctly when both handles connected", () => {
    render(<SemanticCacheNode {...makeProps({ connectedHandles: ["key", "value"] })} />);
    expect(screen.getByText("Semantic Cache")).toBeInTheDocument();
  });
});

// ─── 6. Selected state ────────────────────────────────────────────────────────

describe("SemanticCacheNode — selected state", () => {
  it("renders without crashing when selected=true", () => {
    render(<SemanticCacheNode {...makeProps()} selected={true} />);
    expect(screen.getByText("Semantic Cache")).toBeInTheDocument();
  });

  it("still shows all four handles when selected", () => {
    render(<SemanticCacheNode {...makeProps()} selected={true} />);
    expect(screen.getByTestId("handle-key")).toBeInTheDocument();
    expect(screen.getByTestId("handle-value")).toBeInTheDocument();
    expect(screen.getByTestId("handle-output")).toBeInTheDocument();
    expect(screen.getByTestId("handle-hit")).toBeInTheDocument();
  });
});
