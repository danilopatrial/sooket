import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { MathNode } from "@/components/canvas/nodes/MathNode";
import type { MathNodeData } from "@/components/canvas/nodes/MathNode";
import type { NodeProps } from "@xyflow/react";

vi.mock("@xyflow/react", () => ({
  Handle: ({ id, type, position }: { id: string; type: string; position: string }) => (
    <div data-testid={`handle-${id}`} data-handle-type={type} data-position={position} />
  ),
  Position: { Left: "left", Right: "right" },
  useViewport: () => ({ zoom: 1 }),
}));

function makeProps(overrides: Partial<MathNodeData> = {}): NodeProps {
  const data: MathNodeData = { operator: "+", defaultA: 0, defaultB: 0, ...overrides };
  return { id: "n1", data: data as unknown as Record<string, unknown>, selected: false } as NodeProps;
}

describe("MathNode — rendering", () => {
  it("renders without crashing", () => {
    render(<MathNode {...makeProps()} />);
    expect(screen.getByText("Math")).toBeInTheDocument();
  });

  it("shows preview '= 0' with defaultA=0, defaultB=0, operator='+'", () => {
    render(<MathNode {...makeProps()} />);
    expect(screen.getByText("= 0")).toBeInTheDocument();
  });

  it("shows preview '= 6' with defaultA=2, defaultB=3, operator='*'", () => {
    render(<MathNode {...makeProps({ operator: "*", defaultA: 2, defaultB: 3 })} />);
    expect(screen.getByText("= 6")).toBeInTheDocument();
  });

  it("shows '÷0 err' when dividing by zero", () => {
    render(<MathNode {...makeProps({ operator: "/", defaultA: 1, defaultB: 0 })} />);
    expect(screen.getByText(/÷0 err/)).toBeInTheDocument();
  });

  it("shows A and B input labels", () => {
    render(<MathNode {...makeProps()} />);
    expect(screen.getByText("A")).toBeInTheDocument();
    expect(screen.getByText("B")).toBeInTheDocument();
  });
});

describe("MathNode — handles", () => {
  it("renders handle-a (target, left)", () => {
    render(<MathNode {...makeProps()} />);
    expect(screen.getByTestId("handle-a")).toHaveAttribute("data-handle-type", "target");
  });

  it("renders handle-b (target, left)", () => {
    render(<MathNode {...makeProps()} />);
    expect(screen.getByTestId("handle-b")).toHaveAttribute("data-handle-type", "target");
  });

  it("renders handle-result (source, right)", () => {
    render(<MathNode {...makeProps()} />);
    expect(screen.getByTestId("handle-result")).toHaveAttribute("data-handle-type", "source");
  });

  it("has exactly 3 handles", () => {
    render(<MathNode {...makeProps()} />);
    expect(screen.getAllByTestId(/^handle-/)).toHaveLength(3);
  });
});

describe("MathNode — onChange", () => {
  it("calls onChange({ defaultA: newVal }) when A input changes", () => {
    const onChange = vi.fn();
    render(<MathNode {...makeProps({ onChange })} />);
    const inputs = screen.getAllByRole("spinbutton");
    fireEvent.change(inputs[0], { target: { value: "42" } });
    expect(onChange).toHaveBeenCalledWith({ defaultA: 42 });
  });

  it("calls onChange({ defaultB: newVal }) when B input changes", () => {
    const onChange = vi.fn();
    render(<MathNode {...makeProps({ onChange })} />);
    const inputs = screen.getAllByRole("spinbutton");
    fireEvent.change(inputs[1], { target: { value: "7" } });
    expect(onChange).toHaveBeenCalledWith({ defaultB: 7 });
  });

  it("calls onChange({ operator: '*' }) when × button clicked", () => {
    const onChange = vi.fn();
    render(<MathNode {...makeProps({ onChange })} />);
    fireEvent.click(screen.getByRole("button", { name: "×" }));
    expect(onChange).toHaveBeenCalledWith({ operator: "*" });
  });

  it("calls onChange({ operator: '-' }) when − button clicked", () => {
    const onChange = vi.fn();
    render(<MathNode {...makeProps({ onChange })} />);
    fireEvent.click(screen.getByRole("button", { name: "−" }));
    expect(onChange).toHaveBeenCalledWith({ operator: "-" });
  });

  it("does not throw when onChange is absent and inputs change", () => {
    render(<MathNode {...makeProps()} />);
    const inputs = screen.getAllByRole("spinbutton");
    expect(() => fireEvent.change(inputs[0], { target: { value: "5" } })).not.toThrow();
  });
});
