import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { ArrayLengthNode } from "@/components/canvas/nodes/ArrayLengthNode";
import type { NodeProps } from "@xyflow/react";

vi.mock("@xyflow/react", () => ({
  Handle: ({ id, type, position }: { id: string; type: string; position: string }) => (
    <div data-testid={`handle-${id}`} data-handle-type={type} data-position={position} />
  ),
  Position: { Left: "left", Right: "right" },
}));

// ArrayLengthNode has no exported data interface — data only uses connectedHandles
interface ArrayLengthData {
  connectedHandles?: string[];
}

function makeProps(overrides: ArrayLengthData = {}): NodeProps {
  return {
    id: "node-1",
    data: overrides as unknown as Record<string, unknown>,
    selected: false,
  } as NodeProps;
}

// ─── 1. Rendering ─────────────────────────────────────────────────────────────

describe("ArrayLengthNode — rendering", () => {
  it("renders without crashing with defaultData {}", () => {
    render(<ArrayLengthNode {...makeProps()} />);
    expect(screen.getByText("Array Length")).toBeInTheDocument();
  });

  it("shows the subtitle 'count items in a list'", () => {
    render(<ArrayLengthNode {...makeProps()} />);
    expect(screen.getByText("count items in a list")).toBeInTheDocument();
  });

  it("shows the 'list / array' input row label", () => {
    render(<ArrayLengthNode {...makeProps()} />);
    expect(screen.getByText("list / array")).toBeInTheDocument();
  });

  it("shows the 'count' output row label", () => {
    render(<ArrayLengthNode {...makeProps()} />);
    expect(screen.getByText("count")).toBeInTheDocument();
  });

  it("renders no interactive inputs or buttons", () => {
    render(<ArrayLengthNode {...makeProps()} />);
    expect(screen.queryByRole("textbox")).not.toBeInTheDocument();
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
    expect(screen.queryByRole("combobox")).not.toBeInTheDocument();
  });
});

// ─── 2. Handles ───────────────────────────────────────────────────────────────

describe("ArrayLengthNode — handles", () => {
  it("renders the input handle (target, left)", () => {
    render(<ArrayLengthNode {...makeProps()} />);
    const h = screen.getByTestId("handle-input");
    expect(h).toHaveAttribute("data-handle-type", "target");
    expect(h).toHaveAttribute("data-position", "left");
  });

  it("renders the output handle (source, right)", () => {
    render(<ArrayLengthNode {...makeProps()} />);
    const h = screen.getByTestId("handle-output");
    expect(h).toHaveAttribute("data-handle-type", "source");
    expect(h).toHaveAttribute("data-position", "right");
  });

  it("has exactly two handles in the DOM", () => {
    render(<ArrayLengthNode {...makeProps()} />);
    expect(screen.getAllByTestId(/^handle-/)).toHaveLength(2);
  });

  it("handles are always present regardless of connectedHandles", () => {
    render(<ArrayLengthNode {...makeProps({ connectedHandles: ["input"] })} />);
    expect(screen.getByTestId("handle-input")).toBeInTheDocument();
    expect(screen.getByTestId("handle-output")).toBeInTheDocument();
  });
});

// ─── 3. connectedHandles — input label ────────────────────────────────────────

describe("ArrayLengthNode — connectedHandles['input']", () => {
  it("renders the 'list / array' label when input is not connected", () => {
    render(<ArrayLengthNode {...makeProps({ connectedHandles: [] })} />);
    expect(screen.getByText("list / array")).toBeInTheDocument();
  });

  it("renders the 'list / array' label when input IS connected", () => {
    render(<ArrayLengthNode {...makeProps({ connectedHandles: ["input"] })} />);
    expect(screen.getByText("list / array")).toBeInTheDocument();
  });

  it("does not crash when connectedHandles includes 'output'", () => {
    expect(() =>
      render(<ArrayLengthNode {...makeProps({ connectedHandles: ["output"] })} />)
    ).not.toThrow();
  });

  it("does not crash when connectedHandles is empty", () => {
    expect(() =>
      render(<ArrayLengthNode {...makeProps({ connectedHandles: [] })} />)
    ).not.toThrow();
  });
});

// ─── 4. Fallback defaults ─────────────────────────────────────────────────────

describe("ArrayLengthNode — fallback defaults", () => {
  it("does not crash when connectedHandles is undefined", () => {
    expect(() => render(<ArrayLengthNode {...makeProps()} />)).not.toThrow();
  });

  it("renders all content correctly when data is completely empty ({})", () => {
    render(<ArrayLengthNode {...makeProps()} />);
    expect(screen.getByText("Array Length")).toBeInTheDocument();
    expect(screen.getByText("list / array")).toBeInTheDocument();
    expect(screen.getByText("count")).toBeInTheDocument();
  });
});

// ─── 5. Selected state ────────────────────────────────────────────────────────

describe("ArrayLengthNode — selected state", () => {
  it("renders without crashing when selected=true", () => {
    render(<ArrayLengthNode {...makeProps()} selected={true} />);
    expect(screen.getByText("Array Length")).toBeInTheDocument();
  });

  it("renders without crashing when selected=false", () => {
    render(<ArrayLengthNode {...makeProps()} selected={false} />);
    expect(screen.getByText("Array Length")).toBeInTheDocument();
  });
});
