import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { ContentGuardrailNode } from "@/components/canvas/nodes/ContentGuardrailNode";
import type { ContentGuardrailNodeData } from "@/components/canvas/nodes/ContentGuardrailNode";
import type { NodeProps } from "@xyflow/react";

vi.mock("@xyflow/react", () => ({
  Handle: ({ id, type, position }: { id: string; type: string; position: string }) => (
    <div data-testid={`handle-${id}`} data-handle-type={type} data-position={position} />
  ),
  Position: { Left: "left", Right: "right" },
  useViewport: () => ({ zoom: 1 }),
}));

vi.mock("@/components/canvas/TextExpandModal", () => ({
  TextExpandModal: () => null,
}));

function makeProps(overrides: Partial<ContentGuardrailNodeData> = {}): NodeProps {
  const data: ContentGuardrailNodeData = {
    patterns: [],
    useLlm: false,
    action: "block",
    ...overrides,
  };
  return { id: "n1", data: data as unknown as Record<string, unknown>, selected: false } as NodeProps;
}

describe("ContentGuardrailNode — rendering", () => {
  it("renders without crashing", () => {
    render(<ContentGuardrailNode {...makeProps()} />);
    expect(screen.getByText("Content Guardrail")).toBeInTheDocument();
  });

  it("shows '0 patterns' subtitle with default data", () => {
    render(<ContentGuardrailNode {...makeProps()} />);
    expect(screen.getByText(/0 patterns/)).toBeInTheDocument();
  });

  it("shows pattern count in subtitle", () => {
    render(<ContentGuardrailNode {...makeProps({ patterns: [{ id: "a", text: "bad" }] })} />);
    expect(screen.getByText(/1 pattern/)).toBeInTheDocument();
  });

  it("shows 'No patterns' placeholder when patterns is empty", () => {
    render(<ContentGuardrailNode {...makeProps()} />);
    expect(screen.getByText(/No patterns/i)).toBeInTheDocument();
  });

  it("shows On Violation dropdown", () => {
    render(<ContentGuardrailNode {...makeProps()} />);
    expect(screen.getByText("On Violation")).toBeInTheDocument();
  });
});

describe("ContentGuardrailNode — handles", () => {
  it("renders input handle (target, left)", () => {
    render(<ContentGuardrailNode {...makeProps()} />);
    expect(screen.getByTestId("handle-input")).toHaveAttribute("data-handle-type", "target");
  });

  it("renders output handle (source, right)", () => {
    render(<ContentGuardrailNode {...makeProps()} />);
    expect(screen.getByTestId("handle-output")).toHaveAttribute("data-handle-type", "source");
  });

  it("renders flagged handle (source, right)", () => {
    render(<ContentGuardrailNode {...makeProps()} />);
    expect(screen.getByTestId("handle-flagged")).toHaveAttribute("data-handle-type", "source");
  });

  it("has exactly 3 handles", () => {
    render(<ContentGuardrailNode {...makeProps()} />);
    expect(screen.getAllByTestId(/^handle-/)).toHaveLength(3);
  });
});

describe("ContentGuardrailNode — onChange", () => {
  it("calls onChange with new patterns array when add button clicked", () => {
    const onChange = vi.fn();
    render(<ContentGuardrailNode {...makeProps({ onChange })} />);
    fireEvent.click(screen.getByRole("button", { name: /add/i }));
    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ patterns: expect.any(Array) }));
    expect(onChange.mock.calls[0][0].patterns).toHaveLength(1);
  });

  it("calls onChange with updated action when select changes", () => {
    const onChange = vi.fn();
    render(<ContentGuardrailNode {...makeProps({ onChange })} />);
    fireEvent.change(screen.getByRole("combobox"), { target: { value: "flag" } });
    expect(onChange).toHaveBeenCalledWith({ action: "flag" });
  });

  it("calls onChange toggling useLlm when LLM Check button clicked", () => {
    const onChange = vi.fn();
    render(<ContentGuardrailNode {...makeProps({ onChange, useLlm: false })} />);
    // The toggle button is the one with role=button and no explicit name
    const toggleBtn = screen.getAllByRole("button").find(
      (b) => b.closest(".flex.items-center.justify-between") !== null &&
             b.closest(".flex.items-center.justify-between")?.textContent?.includes("LLM Check")
    );
    if (toggleBtn) fireEvent.click(toggleBtn);
    expect(onChange).toHaveBeenCalledWith({ useLlm: true });
  });
});
