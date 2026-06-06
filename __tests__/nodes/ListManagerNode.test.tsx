import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { ListManagerNode } from "@/components/canvas/nodes/ListManagerNode";
import type { ListManagerNodeData } from "@/components/canvas/nodes/ListManagerNode";
import type { NodeProps } from "@xyflow/react";

vi.mock("@xyflow/react", () => ({
  Handle: ({ id, type, position }: { id: string; type: string; position: string }) => (
    <div data-testid={`handle-${id}-${type}`} data-handle-type={type} data-position={position} />
  ),
  Position: { Left: "left", Right: "right" },
  useViewport: () => ({ zoom: 1 }),
}));

function makeProps(overrides: Partial<ListManagerNodeData> = {}): NodeProps {
  const data: ListManagerNodeData = { action: "add", entryType: "value", ...overrides };
  return { id: "n1", data: data as unknown as Record<string, unknown>, selected: false } as NodeProps;
}

describe("ListManagerNode — rendering", () => {
  it("renders without crashing", () => {
    render(<ListManagerNode {...makeProps()} />);
    expect(screen.getByText("List Manager")).toBeInTheDocument();
  });

  it("shows 'modify access list at runtime' subtitle", () => {
    render(<ListManagerNode {...makeProps()} />);
    expect(screen.getByText("modify access list at runtime")).toBeInTheDocument();
  });

  it("shows 'add' badge when action=add", () => {
    render(<ListManagerNode {...makeProps({ action: "add" })} />);
    expect(screen.getAllByText("add").length).toBeGreaterThan(0);
  });

  it("shows 'remove' badge when action=remove", () => {
    render(<ListManagerNode {...makeProps({ action: "remove" })} />);
    expect(screen.getAllByText("remove").length).toBeGreaterThan(0);
  });

  it("shows Action section label", () => {
    render(<ListManagerNode {...makeProps()} />);
    expect(screen.getByText("Action")).toBeInTheDocument();
  });

  it("shows Entry Type section label", () => {
    render(<ListManagerNode {...makeProps()} />);
    expect(screen.getByText("Entry Type")).toBeInTheDocument();
  });
});

describe("ListManagerNode — handles", () => {
  it("renders value input handle (target, left)", () => {
    render(<ListManagerNode {...makeProps()} />);
    const h = screen.getByTestId("handle-value-target");
    expect(h).toHaveAttribute("data-handle-type", "target");
  });

  it("renders action input handle (target, left)", () => {
    render(<ListManagerNode {...makeProps()} />);
    expect(screen.getByTestId("handle-action-target")).toHaveAttribute("data-handle-type", "target");
  });

  it("renders value output handle (source, right)", () => {
    render(<ListManagerNode {...makeProps()} />);
    expect(screen.getByTestId("handle-value-source")).toHaveAttribute("data-handle-type", "source");
  });

  it("renders success handle (source, right)", () => {
    render(<ListManagerNode {...makeProps()} />);
    expect(screen.getByTestId("handle-success-source")).toHaveAttribute("data-handle-type", "source");
  });

  it("renders error handle (source, right)", () => {
    render(<ListManagerNode {...makeProps()} />);
    expect(screen.getByTestId("handle-error-source")).toHaveAttribute("data-handle-type", "source");
  });
});

describe("ListManagerNode — onChange", () => {
  it("calls onChange({ action: 'remove' }) when remove button clicked", () => {
    const onChange = vi.fn();
    render(<ListManagerNode {...makeProps({ onChange })} />);
    fireEvent.click(screen.getByRole("button", { name: /^remove$/i }));
    expect(onChange).toHaveBeenCalledWith({ action: "remove" });
  });

  it("calls onChange({ action: 'add' }) when add button clicked in remove mode", () => {
    const onChange = vi.fn();
    render(<ListManagerNode {...makeProps({ action: "remove", onChange })} />);
    fireEvent.click(screen.getByRole("button", { name: /^add$/i }));
    expect(onChange).toHaveBeenCalledWith({ action: "add" });
  });

  it("calls onChange({ entryType: 'ip' }) when IP type button clicked", () => {
    const onChange = vi.fn();
    render(<ListManagerNode {...makeProps({ onChange })} />);
    fireEvent.click(screen.getByRole("button", { name: /^ip$/i }));
    expect(onChange).toHaveBeenCalledWith({ entryType: "ip" });
  });
});
