import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { CacheNode } from "@/components/canvas/nodes/CacheNode";
import type { CacheNodeData } from "@/components/canvas/nodes/CacheNode";
import type { NodeProps } from "@xyflow/react";

vi.mock("@xyflow/react", () => ({
  Handle: ({ id, type, position }: { id: string; type: string; position: string }) => (
    <div data-testid={`handle-${id}`} data-handle-type={type} data-position={position} />
  ),
  Position: { Left: "left", Right: "right" },
  useViewport: () => ({ zoom: 1 }),
}));

function makeProps(overrides: Partial<CacheNodeData> = {}): NodeProps {
  const data: CacheNodeData = { ttl: 3600, ...overrides };
  return { id: "node-1", data: data as unknown as Record<string, unknown>, selected: false } as NodeProps;
}

// ─── 1. Rendering ─────────────────────────────────────────────────────────────

describe("CacheNode — rendering", () => {
  it("renders without crashing with default data", () => {
    render(<CacheNode {...makeProps()} />);
    expect(screen.getByText("Cache")).toBeInTheDocument();
  });

  it("shows TTL as hours when ttl >= 3600", () => {
    render(<CacheNode {...makeProps({ ttl: 3600 })} />);
    expect(screen.getByText("1h TTL")).toBeInTheDocument();
  });

  it("shows TTL as minutes when 60 <= ttl < 3600", () => {
    render(<CacheNode {...makeProps({ ttl: 120 })} />);
    expect(screen.getByText("2m TTL")).toBeInTheDocument();
  });

  it("shows TTL as seconds when ttl < 60", () => {
    render(<CacheNode {...makeProps({ ttl: 30 })} />);
    expect(screen.getByText("30s TTL")).toBeInTheDocument();
  });

  it("defaults to 1h TTL when ttl is undefined", () => {
    const props = makeProps();
    (props.data as Record<string, unknown>).ttl = undefined;
    render(<CacheNode {...props} />);
    expect(screen.getByText("1h TTL")).toBeInTheDocument();
  });

  it("shows 'key' input row label", () => {
    render(<CacheNode {...makeProps()} />);
    expect(screen.getByText("key")).toBeInTheDocument();
  });

  it("shows 'value' input row label", () => {
    render(<CacheNode {...makeProps()} />);
    // 'value' appears both in the row label and the output hint — getByText with exact match
    const labels = screen.getAllByText("value");
    expect(labels.length).toBeGreaterThanOrEqual(1);
  });

  it("shows 'output' source row label", () => {
    render(<CacheNode {...makeProps()} />);
    expect(screen.getByText("output")).toBeInTheDocument();
  });

  it("shows 'hit' source row label", () => {
    render(<CacheNode {...makeProps()} />);
    expect(screen.getByText("hit")).toBeInTheDocument();
  });

  it("shows TTL input with correct value", () => {
    render(<CacheNode {...makeProps({ ttl: 60 })} />);
    const input = screen.getByRole("spinbutton");
    expect(input).toHaveValue(60);
  });

  it("shows 'lazy' hint on the value row", () => {
    render(<CacheNode {...makeProps()} />);
    expect(screen.getByText("lazy")).toBeInTheDocument();
  });

  it("shows 'bool' type hint on hit row", () => {
    render(<CacheNode {...makeProps()} />);
    expect(screen.getByText("bool")).toBeInTheDocument();
  });
});

// ─── 2. Handles ───────────────────────────────────────────────────────────────

describe("CacheNode — handles", () => {
  it("renders the 'key' handle as target on the left", () => {
    render(<CacheNode {...makeProps()} />);
    const h = screen.getByTestId("handle-key");
    expect(h).toHaveAttribute("data-handle-type", "target");
    expect(h).toHaveAttribute("data-position", "left");
  });

  it("renders the 'value' handle as target on the left", () => {
    render(<CacheNode {...makeProps()} />);
    const h = screen.getByTestId("handle-value");
    expect(h).toHaveAttribute("data-handle-type", "target");
    expect(h).toHaveAttribute("data-position", "left");
  });

  it("renders the 'output' handle as source on the right", () => {
    render(<CacheNode {...makeProps()} />);
    const h = screen.getByTestId("handle-output");
    expect(h).toHaveAttribute("data-handle-type", "source");
    expect(h).toHaveAttribute("data-position", "right");
  });

  it("renders the 'hit' handle as source on the right", () => {
    render(<CacheNode {...makeProps()} />);
    const h = screen.getByTestId("handle-hit");
    expect(h).toHaveAttribute("data-handle-type", "source");
    expect(h).toHaveAttribute("data-position", "right");
  });

  it("has exactly 4 handles total (2 targets + 2 sources)", () => {
    render(<CacheNode {...makeProps()} />);
    expect(screen.getAllByTestId(/^handle-/)).toHaveLength(4);
  });

  it("has exactly 2 target handles", () => {
    render(<CacheNode {...makeProps()} />);
    const all = screen.getAllByTestId(/^handle-/);
    const targets = all.filter((h) => h.getAttribute("data-handle-type") === "target");
    expect(targets).toHaveLength(2);
  });

  it("has exactly 2 source handles", () => {
    render(<CacheNode {...makeProps()} />);
    const all = screen.getAllByTestId(/^handle-/);
    const sources = all.filter((h) => h.getAttribute("data-handle-type") === "source");
    expect(sources).toHaveLength(2);
  });
});

// ─── 3. TTL onChange ──────────────────────────────────────────────────────────

describe("CacheNode — TTL onChange", () => {
  it("calls onChange with new ttl when input changes to valid integer", () => {
    const onChange = vi.fn();
    render(<CacheNode {...makeProps({ onChange })} />);
    const input = screen.getByRole("spinbutton");
    fireEvent.change(input, { target: { value: "7200" } });
    expect(onChange).toHaveBeenCalledWith({ ttl: 7200 });
  });

  it("does not call onChange when input is non-numeric", () => {
    const onChange = vi.fn();
    render(<CacheNode {...makeProps({ onChange })} />);
    const input = screen.getByRole("spinbutton");
    fireEvent.change(input, { target: { value: "abc" } });
    expect(onChange).not.toHaveBeenCalled();
  });

  it("does not call onChange when value is 0 (below min of 1)", () => {
    const onChange = vi.fn();
    render(<CacheNode {...makeProps({ onChange })} />);
    const input = screen.getByRole("spinbutton");
    fireEvent.change(input, { target: { value: "0" } });
    expect(onChange).not.toHaveBeenCalled();
  });

  it("does not call onChange when value is negative", () => {
    const onChange = vi.fn();
    render(<CacheNode {...makeProps({ onChange })} />);
    const input = screen.getByRole("spinbutton");
    fireEvent.change(input, { target: { value: "-5" } });
    expect(onChange).not.toHaveBeenCalled();
  });

  it("calls onChange with ttl=1 (minimum valid value)", () => {
    const onChange = vi.fn();
    render(<CacheNode {...makeProps({ onChange })} />);
    const input = screen.getByRole("spinbutton");
    fireEvent.change(input, { target: { value: "1" } });
    expect(onChange).toHaveBeenCalledWith({ ttl: 1 });
  });

  it("does not crash when onChange is undefined and TTL changes", () => {
    render(<CacheNode {...makeProps({ onChange: undefined })} />);
    const input = screen.getByRole("spinbutton");
    expect(() => fireEvent.change(input, { target: { value: "600" } })).not.toThrow();
  });
});

// ─── 4. connectedHandles ──────────────────────────────────────────────────────

describe("CacheNode — connectedHandles", () => {
  it("does not crash when connectedHandles is undefined", () => {
    const props = makeProps();
    (props.data as Record<string, unknown>).connectedHandles = undefined;
    expect(() => render(<CacheNode {...props} />)).not.toThrow();
  });

  it("renders correctly with empty connectedHandles", () => {
    render(<CacheNode {...makeProps({ connectedHandles: [] })} />);
    expect(screen.getByText("Cache")).toBeInTheDocument();
  });

  it("renders correctly when 'key' is in connectedHandles", () => {
    render(<CacheNode {...makeProps({ connectedHandles: ["key"] })} />);
    expect(screen.getByText("key")).toBeInTheDocument();
  });

  it("renders correctly when 'value' is in connectedHandles", () => {
    render(<CacheNode {...makeProps({ connectedHandles: ["value"] })} />);
    expect(screen.getByText("Cache")).toBeInTheDocument();
  });
});

// ─── 5. Selected state ────────────────────────────────────────────────────────

describe("CacheNode — selected state", () => {
  it("renders without crashing when selected=true", () => {
    render(<CacheNode {...makeProps()} selected={true} />);
    expect(screen.getByText("Cache")).toBeInTheDocument();
  });

  it("renders without crashing when selected=false", () => {
    render(<CacheNode {...makeProps()} selected={false} />);
    expect(screen.getByText("Cache")).toBeInTheDocument();
  });

  it("still shows all four handles regardless of selected state", () => {
    render(<CacheNode {...makeProps()} selected={true} />);
    expect(screen.getByTestId("handle-key")).toBeInTheDocument();
    expect(screen.getByTestId("handle-value")).toBeInTheDocument();
    expect(screen.getByTestId("handle-output")).toBeInTheDocument();
    expect(screen.getByTestId("handle-hit")).toBeInTheDocument();
  });
});
