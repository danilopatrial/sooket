import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { SchemaValidatorNode } from "@/components/canvas/nodes/SchemaValidatorNode";
import type { SchemaValidatorNodeData } from "@/components/canvas/nodes/SchemaValidatorNode";
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

function makeProps(overrides: Partial<SchemaValidatorNodeData> = {}): NodeProps {
  const data: SchemaValidatorNodeData = { schema: "", action: "block", ...overrides };
  return { id: "n1", data: data as unknown as Record<string, unknown>, selected: false } as NodeProps;
}

describe("SchemaValidatorNode — rendering", () => {
  it("renders without crashing", () => {
    render(<SchemaValidatorNode {...makeProps()} />);
    expect(screen.getByText("Schema Validator")).toBeInTheDocument();
  });

  it("renders input, valid, and invalid handles", () => {
    render(<SchemaValidatorNode {...makeProps()} />);
    expect(screen.getByTestId("handle-input")).toHaveAttribute("data-handle-type", "target");
    expect(screen.getByTestId("handle-valid")).toHaveAttribute("data-handle-type", "source");
    expect(screen.getByTestId("handle-invalid")).toHaveAttribute("data-handle-type", "source");
  });

  it("shows the configured action in the subtitle", () => {
    render(<SchemaValidatorNode {...makeProps({ action: "pass" })} />);
    expect(screen.getByText(/JSON Schema · pass/)).toBeInTheDocument();
  });

  it("renders the current schema text", () => {
    render(<SchemaValidatorNode {...makeProps({ schema: '{"type":"string"}' })} />);
    expect(screen.getByDisplayValue('{"type":"string"}')).toBeInTheDocument();
  });
});

describe("SchemaValidatorNode — interaction", () => {
  it("calls onChange when the schema text changes", () => {
    const onChange = vi.fn();
    render(<SchemaValidatorNode {...makeProps({ onChange })} />);
    const textarea = screen.getByRole("textbox");
    fireEvent.change(textarea, { target: { value: '{"type":"number"}' } });
    expect(onChange).toHaveBeenCalledWith({ schema: '{"type":"number"}' });
  });

  it("calls onChange when the action changes", () => {
    const onChange = vi.fn();
    render(<SchemaValidatorNode {...makeProps({ onChange })} />);
    fireEvent.change(screen.getByRole("combobox"), { target: { value: "pass" } });
    expect(onChange).toHaveBeenCalledWith({ action: "pass" });
  });
});
