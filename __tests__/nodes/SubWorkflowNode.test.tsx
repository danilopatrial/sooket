import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { SubWorkflowNode } from "@/components/canvas/nodes/SubWorkflowNode";
import type { SubWorkflowNodeData } from "@/components/canvas/nodes/SubWorkflowNode";
import type { NodeProps } from "@xyflow/react";

vi.mock("@xyflow/react", () => ({
  Handle: ({ id, type, position }: { id: string; type: string; position: string }) => (
    <div data-testid={`handle-${id}`} data-handle-type={type} data-position={position} />
  ),
  Position: { Left: "left", Right: "right" },
  useViewport: () => ({ zoom: 1 }),
}));

// fetch returns empty workflow list → node renders text input (not select)
vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
  json: () => Promise.resolve([]),
}));

function makeProps(overrides: Partial<SubWorkflowNodeData> = {}): NodeProps {
  const data: SubWorkflowNodeData = { slug: "", ...overrides };
  return { id: "n1", data: data as unknown as Record<string, unknown>, selected: false } as NodeProps;
}

describe("SubWorkflowNode — rendering", () => {
  it("renders without crashing", () => {
    render(<SubWorkflowNode {...makeProps()} />);
    expect(screen.getByText("Sub-Workflow")).toBeInTheDocument();
  });

  it("shows 'Target Workflow' label", () => {
    render(<SubWorkflowNode {...makeProps()} />);
    expect(screen.getByText("Target Workflow")).toBeInTheDocument();
  });

  it("shows input and output labels", () => {
    render(<SubWorkflowNode {...makeProps()} />);
    expect(screen.getByText("input")).toBeInTheDocument();
    expect(screen.getByText("output")).toBeInTheDocument();
  });

  it("renders the slug input with current value", () => {
    render(<SubWorkflowNode {...makeProps({ slug: "my-wf" })} />);
    expect(screen.getByPlaceholderText("workflow-slug")).toHaveValue("my-wf");
  });

  it("renders without crashing when selected=true", () => {
    render(<SubWorkflowNode {...makeProps()} selected={true} />);
    expect(screen.getByText("Sub-Workflow")).toBeInTheDocument();
  });
});

describe("SubWorkflowNode — handles", () => {
  it("renders input handle (target, left)", () => {
    render(<SubWorkflowNode {...makeProps()} />);
    expect(screen.getByTestId("handle-input")).toHaveAttribute("data-handle-type", "target");
  });

  it("renders output handle (source, right)", () => {
    render(<SubWorkflowNode {...makeProps()} />);
    expect(screen.getByTestId("handle-output")).toHaveAttribute("data-handle-type", "source");
  });

  it("has exactly 2 handles", () => {
    render(<SubWorkflowNode {...makeProps()} />);
    expect(screen.getAllByTestId(/^handle-/)).toHaveLength(2);
  });
});

describe("SubWorkflowNode — onChange", () => {
  it("calls onChange({ slug }) when input changes", () => {
    const onChange = vi.fn();
    render(<SubWorkflowNode {...makeProps({ onChange })} />);
    fireEvent.change(screen.getByPlaceholderText("workflow-slug"), {
      target: { value: "new-slug" },
    });
    expect(onChange).toHaveBeenCalledWith({ slug: "new-slug" });
  });

  it("calls onChange({ slug: '' }) when input is cleared", () => {
    const onChange = vi.fn();
    render(<SubWorkflowNode {...makeProps({ slug: "existing", onChange })} />);
    fireEvent.change(screen.getByPlaceholderText("workflow-slug"), {
      target: { value: "" },
    });
    expect(onChange).toHaveBeenCalledWith({ slug: "" });
  });

  it("does not throw when onChange is absent", () => {
    render(<SubWorkflowNode {...makeProps()} />);
    expect(() =>
      fireEvent.change(screen.getByPlaceholderText("workflow-slug"), { target: { value: "x" } })
    ).not.toThrow();
  });
});
