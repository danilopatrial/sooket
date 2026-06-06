import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { WebhookNode } from "@/components/canvas/nodes/WebhookNode";
import type { WebhookNodeData } from "@/components/canvas/nodes/WebhookNode";
import type { NodeProps } from "@xyflow/react";

vi.mock("@xyflow/react", () => ({
  Handle: ({ id, type, position }: { id: string; type: string; position: string }) => (
    <div data-testid={`handle-${id}`} data-handle-type={type} data-position={position} />
  ),
  Position: { Left: "left", Right: "right" },
  useViewport: () => ({ zoom: 1 }),
}));

vi.mock("@/components/canvas/VarField", () => ({
  VarField: ({ value, placeholder }: { value: string; placeholder?: string; onChange?: (v: string) => void }) => (
    <input data-testid="varfield" value={value} placeholder={placeholder} readOnly />
  ),
}));

function makeProps(overrides: Partial<WebhookNodeData> = {}): NodeProps {
  const data: WebhookNodeData = {
    mode: "action",
    method: "POST",
    url: "",
    headers: [],
    bodyTemplate: "",
    ...overrides,
  };
  return { id: "n1", data: data as unknown as Record<string, unknown>, selected: false } as NodeProps;
}

describe("WebhookNode — rendering", () => {
  it("renders without crashing", () => {
    render(<WebhookNode {...makeProps()} />);
    expect(screen.getByText("Webhook")).toBeInTheDocument();
  });

  it("shows method badge text in the rendered output", () => {
    render(<WebhookNode {...makeProps({ method: "POST" })} />);
    expect(screen.getAllByText("POST").length).toBeGreaterThanOrEqual(1);
  });

  it("shows mode toggle buttons", () => {
    render(<WebhookNode {...makeProps()} />);
    expect(screen.getByRole("button", { name: /trigger/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /action/i })).toBeInTheDocument();
  });

  it("shows Mode section label", () => {
    render(<WebhookNode {...makeProps()} />);
    expect(screen.getByText("Mode")).toBeInTheDocument();
  });

  it("renders without crashing in trigger mode", () => {
    render(<WebhookNode {...makeProps({ mode: "trigger" })} />);
    expect(screen.getByText("Webhook")).toBeInTheDocument();
  });
});

describe("WebhookNode — handles in action mode", () => {
  it("renders input handle (target, left)", () => {
    render(<WebhookNode {...makeProps({ mode: "action" })} />);
    expect(screen.getByTestId("handle-input")).toHaveAttribute("data-handle-type", "target");
  });

  it("renders output handle (source, right)", () => {
    render(<WebhookNode {...makeProps({ mode: "action" })} />);
    expect(screen.getByTestId("handle-output")).toHaveAttribute("data-handle-type", "source");
  });

  it("renders url handle (target, left) in action mode", () => {
    render(<WebhookNode {...makeProps({ mode: "action" })} />);
    expect(screen.getByTestId("handle-url")).toHaveAttribute("data-handle-type", "target");
  });
});

describe("WebhookNode — handles in trigger mode", () => {
  it("renders only output handle in trigger mode", () => {
    render(<WebhookNode {...makeProps({ mode: "trigger" })} />);
    expect(screen.getByTestId("handle-output")).toHaveAttribute("data-handle-type", "source");
    expect(screen.queryByTestId("handle-input")).not.toBeInTheDocument();
  });
});

describe("WebhookNode — onChange", () => {
  it("calls onChange({ mode: 'trigger' }) when trigger button clicked", () => {
    const onChange = vi.fn();
    render(<WebhookNode {...makeProps({ onChange, mode: "action" })} />);
    fireEvent.click(screen.getByRole("button", { name: /trigger/i }));
    expect(onChange).toHaveBeenCalledWith({ mode: "trigger" });
  });

  it("calls onChange({ mode: 'action' }) when action button clicked in trigger mode", () => {
    const onChange = vi.fn();
    render(<WebhookNode {...makeProps({ onChange, mode: "trigger" })} />);
    fireEvent.click(screen.getByRole("button", { name: /action/i }));
    expect(onChange).toHaveBeenCalledWith({ mode: "action" });
  });

  it("does not throw when onChange is absent", () => {
    render(<WebhookNode {...makeProps()} />);
    expect(() => fireEvent.click(screen.getByRole("button", { name: /trigger/i }))).not.toThrow();
  });
});
