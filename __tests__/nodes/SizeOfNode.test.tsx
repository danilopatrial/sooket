import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { SizeOfNode } from "@/components/canvas/nodes/SizeOfNode";
import type { SizeOfNodeData } from "@/components/canvas/nodes/SizeOfNode";
import type { NodeProps } from "@xyflow/react";

vi.mock("@xyflow/react", () => ({
  Handle: ({ id, type, position }: { id: string; type: string; position: string }) => (
    <div data-testid={`handle-${id}`} data-handle-type={type} data-position={position} />
  ),
  Position: { Left: "left", Right: "right" },
  useViewport: () => ({ zoom: 1 }),
}));

function makeProps(overrides: Partial<SizeOfNodeData> = {}): NodeProps {
  return {
    id: "node-1",
    data: overrides as unknown as Record<string, unknown>,
    selected: false,
  } as NodeProps;
}

// ─── 1. Rendering ─────────────────────────────────────────────────────────────

describe("SizeOfNode — rendering", () => {
  it("renders without crashing with defaultData {}", () => {
    render(<SizeOfNode {...makeProps()} />);
    expect(screen.getByText("Size Of")).toBeInTheDocument();
  });

  it("shows the subtitle 'counts characters'", () => {
    render(<SizeOfNode {...makeProps()} />);
    expect(screen.getByText("counts characters")).toBeInTheDocument();
  });

  it("shows the '|x|' icon in the header", () => {
    render(<SizeOfNode {...makeProps()} />);
    expect(screen.getByText("|x|")).toBeInTheDocument();
  });

  it("shows the 'text input' body label", () => {
    render(<SizeOfNode {...makeProps()} />);
    expect(screen.getByText("text input")).toBeInTheDocument();
  });

  it("shows the 'char count' body label", () => {
    render(<SizeOfNode {...makeProps()} />);
    expect(screen.getByText("char count")).toBeInTheDocument();
  });

  it("renders no interactive inputs, buttons, or selects", () => {
    render(<SizeOfNode {...makeProps()} />);
    expect(screen.queryByRole("textbox")).not.toBeInTheDocument();
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
    expect(screen.queryByRole("combobox")).not.toBeInTheDocument();
    expect(screen.queryByRole("spinbutton")).not.toBeInTheDocument();
  });
});

// ─── 2. Handles ───────────────────────────────────────────────────────────────

describe("SizeOfNode — handles", () => {
  it("renders the input handle (target, left)", () => {
    render(<SizeOfNode {...makeProps()} />);
    const h = screen.getByTestId("handle-input");
    expect(h).toHaveAttribute("data-handle-type", "target");
    expect(h).toHaveAttribute("data-position", "left");
  });

  it("renders the output handle (source, right)", () => {
    render(<SizeOfNode {...makeProps()} />);
    const h = screen.getByTestId("handle-output");
    expect(h).toHaveAttribute("data-handle-type", "source");
    expect(h).toHaveAttribute("data-position", "right");
  });

  it("has exactly two handles in the DOM", () => {
    render(<SizeOfNode {...makeProps()} />);
    expect(screen.getAllByTestId(/^handle-/)).toHaveLength(2);
  });

  it("both handles are always present regardless of connectedHandles", () => {
    render(<SizeOfNode {...makeProps({ connectedHandles: ["input"] })} />);
    expect(screen.getByTestId("handle-input")).toBeInTheDocument();
    expect(screen.getByTestId("handle-output")).toBeInTheDocument();
  });
});

// ─── 3. connectedHandles — input label ────────────────────────────────────────

describe("SizeOfNode — connectedHandles['input']", () => {
  it("renders the 'text input' label when input is not connected", () => {
    render(<SizeOfNode {...makeProps({ connectedHandles: [] })} />);
    expect(screen.getByText("text input")).toBeInTheDocument();
  });

  it("renders the 'text input' label when input IS connected", () => {
    render(<SizeOfNode {...makeProps({ connectedHandles: ["input"] })} />);
    expect(screen.getByText("text input")).toBeInTheDocument();
  });

  it("'char count' label is always present regardless of connected state", () => {
    render(<SizeOfNode {...makeProps({ connectedHandles: ["input"] })} />);
    expect(screen.getByText("char count")).toBeInTheDocument();
  });

  it("does not crash when connectedHandles includes unknown handles", () => {
    expect(() =>
      render(<SizeOfNode {...makeProps({ connectedHandles: ["output", "something"] })} />)
    ).not.toThrow();
  });
});

// ─── 4. Fallback defaults ─────────────────────────────────────────────────────

describe("SizeOfNode — fallback defaults", () => {
  it("does not crash when connectedHandles is undefined", () => {
    expect(() => render(<SizeOfNode {...makeProps()} />)).not.toThrow();
  });

  it("renders all content correctly when data is completely empty", () => {
    render(<SizeOfNode {...makeProps()} />);
    expect(screen.getByText("Size Of")).toBeInTheDocument();
    expect(screen.getByText("text input")).toBeInTheDocument();
    expect(screen.getByText("char count")).toBeInTheDocument();
  });

  it("renders all content correctly when connectedHandles is empty array", () => {
    render(<SizeOfNode {...makeProps({ connectedHandles: [] })} />);
    expect(screen.getByText("Size Of")).toBeInTheDocument();
    expect(screen.getByText("text input")).toBeInTheDocument();
    expect(screen.getByText("char count")).toBeInTheDocument();
  });
});

// ─── 5. Selected state ────────────────────────────────────────────────────────

describe("SizeOfNode — selected state", () => {
  it("renders without crashing when selected=true", () => {
    render(<SizeOfNode {...makeProps()} selected={true} />);
    expect(screen.getByText("Size Of")).toBeInTheDocument();
  });

  it("renders without crashing when selected=false", () => {
    render(<SizeOfNode {...makeProps()} selected={false} />);
    expect(screen.getByText("Size Of")).toBeInTheDocument();
  });
});
