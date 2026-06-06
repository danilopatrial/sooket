import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { RetryNode } from "@/components/canvas/nodes/RetryNode";
import type { RetryNodeData } from "@/components/canvas/nodes/RetryNode";
import type { NodeProps } from "@xyflow/react";

vi.mock("@xyflow/react", () => ({
  Handle: ({ id, type, position }: { id: string; type: string; position: string }) => (
    <div data-testid={`handle-${id}`} data-handle-type={type} data-position={position} />
  ),
  Position: { Left: "left", Right: "right" },
  useViewport: () => ({ zoom: 1 }),
}));

function makeProps(overrides: Partial<RetryNodeData> = {}): NodeProps {
  const data: RetryNodeData = {
    maxAttempts: 3,
    backoff: "exponential",
    baseDelayMs: 1000,
    maxDelayMs: 30000,
    ...overrides,
  };
  return { id: "node-retry", data: data as unknown as Record<string, unknown>, selected: false } as NodeProps;
}

// ─── 1. Rendering ─────────────────────────────────────────────────────────────

describe("RetryNode — rendering", () => {
  it("renders without crashing with default data", () => {
    render(<RetryNode {...makeProps()} />);
    expect(screen.getByText("Retry")).toBeInTheDocument();
  });

  it("renders 'input' label", () => {
    render(<RetryNode {...makeProps()} />);
    expect(screen.getByText("input")).toBeInTheDocument();
  });

  it("renders 'output' label", () => {
    render(<RetryNode {...makeProps()} />);
    expect(screen.getByText("output")).toBeInTheDocument();
  });

  it("renders 'failed' label", () => {
    render(<RetryNode {...makeProps()} />);
    expect(screen.getByText("failed")).toBeInTheDocument();
  });

  it("shows maxAttempts in the subtitle", () => {
    render(<RetryNode {...makeProps({ maxAttempts: 5 })} />);
    expect(screen.getByText(/5×/)).toBeInTheDocument();
  });

  it("shows backoff strategy in the subtitle", () => {
    render(<RetryNode {...makeProps({ backoff: "linear" })} />);
    expect(screen.getByText(/linear/)).toBeInTheDocument();
  });

  it("shows base delay in seconds in subtitle when >= 1000ms", () => {
    render(<RetryNode {...makeProps({ baseDelayMs: 2000 })} />);
    expect(screen.getByText(/2s/)).toBeInTheDocument();
  });

  it("shows base delay in ms in subtitle when < 1000ms", () => {
    render(<RetryNode {...makeProps({ baseDelayMs: 500 })} />);
    expect(screen.getByText(/500ms/)).toBeInTheDocument();
  });

  it("renders Max Attempts label", () => {
    render(<RetryNode {...makeProps()} />);
    expect(screen.getByText("Max Attempts")).toBeInTheDocument();
  });

  it("renders Backoff label", () => {
    render(<RetryNode {...makeProps()} />);
    expect(screen.getByText("Backoff")).toBeInTheDocument();
  });

  it("renders Base Delay (ms) label", () => {
    render(<RetryNode {...makeProps()} />);
    expect(screen.getByText("Base Delay (ms)")).toBeInTheDocument();
  });

  it("renders Max Delay (ms) label", () => {
    render(<RetryNode {...makeProps()} />);
    expect(screen.getByText("Max Delay (ms)")).toBeInTheDocument();
  });

  it("renders no extra buttons", () => {
    render(<RetryNode {...makeProps()} />);
    expect(screen.queryAllByRole("button")).toHaveLength(0);
  });
});

// ─── 2. Handles ───────────────────────────────────────────────────────────────

describe("RetryNode — handles", () => {
  it("renders the 'input' handle as target on the left", () => {
    render(<RetryNode {...makeProps()} />);
    const h = screen.getByTestId("handle-input");
    expect(h).toHaveAttribute("data-handle-type", "target");
    expect(h).toHaveAttribute("data-position", "left");
  });

  it("renders the 'output' handle as source on the right", () => {
    render(<RetryNode {...makeProps()} />);
    const h = screen.getByTestId("handle-output");
    expect(h).toHaveAttribute("data-handle-type", "source");
    expect(h).toHaveAttribute("data-position", "right");
  });

  it("renders the 'failed' handle as source on the right", () => {
    render(<RetryNode {...makeProps()} />);
    const h = screen.getByTestId("handle-failed");
    expect(h).toHaveAttribute("data-handle-type", "source");
    expect(h).toHaveAttribute("data-position", "right");
  });

  it("has exactly 3 handles total", () => {
    render(<RetryNode {...makeProps()} />);
    expect(screen.getAllByTestId(/^handle-/)).toHaveLength(3);
  });

  it("only the input handle is a target", () => {
    render(<RetryNode {...makeProps()} />);
    const all = screen.getAllByTestId(/^handle-/);
    const targets = all.filter((h) => h.getAttribute("data-handle-type") === "target");
    expect(targets).toHaveLength(1);
    expect(targets[0]).toHaveAttribute("data-testid", "handle-input");
  });

  it("output and failed handles are both sources", () => {
    render(<RetryNode {...makeProps()} />);
    const all = screen.getAllByTestId(/^handle-/);
    const sources = all.filter((h) => h.getAttribute("data-handle-type") === "source");
    expect(sources).toHaveLength(2);
  });
});

// ─── 3. Config controls ───────────────────────────────────────────────────────

describe("RetryNode — config controls", () => {
  it("maxAttempts input shows current value", () => {
    render(<RetryNode {...makeProps({ maxAttempts: 5 })} />);
    const inputs = screen.getAllByRole("spinbutton");
    expect(inputs[0]).toHaveValue(5);
  });

  it("baseDelayMs input shows current value", () => {
    render(<RetryNode {...makeProps({ baseDelayMs: 2000 })} />);
    const inputs = screen.getAllByRole("spinbutton");
    expect(inputs[1]).toHaveValue(2000);
  });

  it("backoff select shows current strategy", () => {
    render(<RetryNode {...makeProps({ backoff: "linear" })} />);
    const sel = screen.getByRole("combobox");
    expect((sel as HTMLSelectElement).value).toBe("linear");
  });

  it("calls onChange with new maxAttempts on valid change", () => {
    const onChange = vi.fn();
    render(<RetryNode {...makeProps({ onChange })} />);
    const inputs = screen.getAllByRole("spinbutton");
    fireEvent.change(inputs[0], { target: { value: "7" } });
    expect(onChange).toHaveBeenCalledWith({ maxAttempts: 7 });
  });

  it("does not call onChange when maxAttempts is 0 (below min)", () => {
    const onChange = vi.fn();
    render(<RetryNode {...makeProps({ onChange })} />);
    const inputs = screen.getAllByRole("spinbutton");
    fireEvent.change(inputs[0], { target: { value: "0" } });
    expect(onChange).not.toHaveBeenCalled();
  });

  it("does not call onChange when maxAttempts exceeds 10", () => {
    const onChange = vi.fn();
    render(<RetryNode {...makeProps({ onChange })} />);
    const inputs = screen.getAllByRole("spinbutton");
    fireEvent.change(inputs[0], { target: { value: "11" } });
    expect(onChange).not.toHaveBeenCalled();
  });

  it("calls onChange with new backoff on select change", () => {
    const onChange = vi.fn();
    render(<RetryNode {...makeProps({ onChange })} />);
    fireEvent.change(screen.getByRole("combobox"), { target: { value: "none" } });
    expect(onChange).toHaveBeenCalledWith({ backoff: "none" });
  });

  it("calls onChange with new baseDelayMs on valid change", () => {
    const onChange = vi.fn();
    render(<RetryNode {...makeProps({ onChange })} />);
    const inputs = screen.getAllByRole("spinbutton");
    fireEvent.change(inputs[1], { target: { value: "500" } });
    expect(onChange).toHaveBeenCalledWith({ baseDelayMs: 500 });
  });

  it("does not call onChange when baseDelayMs is negative", () => {
    const onChange = vi.fn();
    render(<RetryNode {...makeProps({ onChange })} />);
    const inputs = screen.getAllByRole("spinbutton");
    fireEvent.change(inputs[1], { target: { value: "-1" } });
    expect(onChange).not.toHaveBeenCalled();
  });

  it("does not call onChange when baseDelayMs exceeds 30000", () => {
    const onChange = vi.fn();
    render(<RetryNode {...makeProps({ onChange })} />);
    const inputs = screen.getAllByRole("spinbutton");
    fireEvent.change(inputs[1], { target: { value: "30001" } });
    expect(onChange).not.toHaveBeenCalled();
  });

  it("does not crash when onChange is undefined", () => {
    render(<RetryNode {...makeProps({ onChange: undefined })} />);
    const inputs = screen.getAllByRole("spinbutton");
    expect(() => fireEvent.change(inputs[0], { target: { value: "4" } })).not.toThrow();
  });

  it("maxDelayMs input shows current value", () => {
    render(<RetryNode {...makeProps({ maxDelayMs: 45000 })} />);
    const inputs = screen.getAllByRole("spinbutton");
    expect(inputs[2]).toHaveValue(45000);
  });

  it("defaults maxDelayMs to 30000 when not provided", () => {
    const props = makeProps();
    delete (props.data as Record<string, unknown>).maxDelayMs;
    render(<RetryNode {...props} />);
    const inputs = screen.getAllByRole("spinbutton");
    expect(inputs[2]).toHaveValue(30000);
  });

  it("calls onChange with new maxDelayMs on valid change", () => {
    const onChange = vi.fn();
    render(<RetryNode {...makeProps({ onChange })} />);
    const inputs = screen.getAllByRole("spinbutton");
    fireEvent.change(inputs[2], { target: { value: "60000" } });
    expect(onChange).toHaveBeenCalledWith({ maxDelayMs: 60000 });
  });

  it("does not call onChange when maxDelayMs is below 100", () => {
    const onChange = vi.fn();
    render(<RetryNode {...makeProps({ onChange })} />);
    const inputs = screen.getAllByRole("spinbutton");
    fireEvent.change(inputs[2], { target: { value: "50" } });
    expect(onChange).not.toHaveBeenCalled();
  });

  it("does not call onChange when maxDelayMs exceeds 300000", () => {
    const onChange = vi.fn();
    render(<RetryNode {...makeProps({ onChange })} />);
    const inputs = screen.getAllByRole("spinbutton");
    fireEvent.change(inputs[2], { target: { value: "300001" } });
    expect(onChange).not.toHaveBeenCalled();
  });
});

// ─── 4. connectedHandles ──────────────────────────────────────────────────────

describe("RetryNode — connectedHandles", () => {
  it("does not crash with undefined connectedHandles", () => {
    const props = makeProps();
    (props.data as Record<string, unknown>).connectedHandles = undefined;
    expect(() => render(<RetryNode {...props} />)).not.toThrow();
  });

  it("does not crash with empty connectedHandles", () => {
    render(<RetryNode {...makeProps({ connectedHandles: [] })} />);
    expect(screen.getByText("Retry")).toBeInTheDocument();
  });

  it("does not crash when connectedHandles includes 'input'", () => {
    render(<RetryNode {...makeProps({ connectedHandles: ["input"] })} />);
    expect(screen.getByText("input")).toBeInTheDocument();
  });
});

// ─── 5. Selected state ────────────────────────────────────────────────────────

describe("RetryNode — selected state", () => {
  it("renders without crashing when selected=true", () => {
    render(<RetryNode {...makeProps()} selected={true} />);
    expect(screen.getByText("Retry")).toBeInTheDocument();
  });

  it("renders without crashing when selected=false", () => {
    render(<RetryNode {...makeProps()} selected={false} />);
    expect(screen.getByText("Retry")).toBeInTheDocument();
  });

  it("all three handles present regardless of selected state", () => {
    render(<RetryNode {...makeProps()} selected={true} />);
    expect(screen.getByTestId("handle-input")).toBeInTheDocument();
    expect(screen.getByTestId("handle-output")).toBeInTheDocument();
    expect(screen.getByTestId("handle-failed")).toBeInTheDocument();
  });
});

// ─── 6. Default value fallbacks ───────────────────────────────────────────────

describe("RetryNode — default value fallbacks", () => {
  it("uses maxAttempts=3 when not provided", () => {
    const props = makeProps();
    delete (props.data as Record<string, unknown>).maxAttempts;
    render(<RetryNode {...props} />);
    const inputs = screen.getAllByRole("spinbutton");
    expect(inputs[0]).toHaveValue(3);
  });

  it("uses backoff=exponential when not provided", () => {
    const props = makeProps();
    delete (props.data as Record<string, unknown>).backoff;
    render(<RetryNode {...props} />);
    expect((screen.getByRole("combobox") as HTMLSelectElement).value).toBe("exponential");
  });

  it("uses baseDelayMs=1000 when not provided", () => {
    const props = makeProps();
    delete (props.data as Record<string, unknown>).baseDelayMs;
    render(<RetryNode {...props} />);
    const inputs = screen.getAllByRole("spinbutton");
    expect(inputs[1]).toHaveValue(1000);
  });
});
