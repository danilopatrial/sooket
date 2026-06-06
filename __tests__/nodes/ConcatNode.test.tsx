import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { ConcatNode } from "@/components/canvas/nodes/ConcatNode";
import type { ConcatNodeData } from "@/components/canvas/nodes/ConcatNode";
import type { NodeProps } from "@xyflow/react";

vi.mock("@xyflow/react", () => ({
  Handle: ({ id, type, position }: { id: string; type: string; position: string }) => (
    <div data-testid={`handle-${id}`} data-handle-type={type} data-position={position} />
  ),
  Position: { Left: "left", Right: "right" },
  useViewport: () => ({ zoom: 1 }),
}));

function makeProps(overrides: Partial<ConcatNodeData> = {}): NodeProps {
  const data: ConcatNodeData = { separator: "", inputCount: 2, ...overrides };
  return { id: "node-1", data: data as unknown as Record<string, unknown>, selected: false } as NodeProps;
}

// helpers — minus is the first button, plus is the second
const getMinusBtn = () => screen.getAllByRole("button")[0];
const getPlusBtn  = () => screen.getAllByRole("button")[1];

// ─── 1. Rendering ─────────────────────────────────────────────────────────────

describe("ConcatNode — rendering", () => {
  it("renders without crashing with defaultData { separator: '', inputCount: 2 }", () => {
    render(<ConcatNode {...makeProps()} />);
    expect(screen.getByText("Concat")).toBeInTheDocument();
  });

  it("shows 'join 2 strings' subtitle for defaultData", () => {
    render(<ConcatNode {...makeProps()} />);
    expect(screen.getByText("join 2 strings")).toBeInTheDocument();
  });

  it("shows the 'Separator' section label", () => {
    render(<ConcatNode {...makeProps()} />);
    expect(screen.getByText("Separator")).toBeInTheDocument();
  });

  it("shows the 'Inputs' section label", () => {
    render(<ConcatNode {...makeProps()} />);
    expect(screen.getByText("Inputs")).toBeInTheDocument();
  });

  it("shows the 'output' label", () => {
    render(<ConcatNode {...makeProps()} />);
    expect(screen.getByText("output")).toBeInTheDocument();
  });

  it("renders the separator input with correct placeholder", () => {
    render(<ConcatNode {...makeProps()} />);
    expect(screen.getByPlaceholderText('e.g. ", " or " "')).toBeInTheDocument();
  });

  it("renders separator input with current value", () => {
    render(<ConcatNode {...makeProps({ separator: " | " })} />);
    expect(screen.getByRole("textbox")).toHaveValue(" | ");
  });

  it("renders minus and plus buttons", () => {
    render(<ConcatNode {...makeProps()} />);
    expect(screen.getAllByRole("button")).toHaveLength(2);
  });
});

// ─── 2. Header subtitle — varies with inputCount ──────────────────────────────

describe("ConcatNode — header subtitle", () => {
  it("shows 'join 2 strings' when inputCount is 2", () => {
    render(<ConcatNode {...makeProps({ inputCount: 2 })} />);
    expect(screen.getByText("join 2 strings")).toBeInTheDocument();
  });

  it("shows 'join 4 strings' when inputCount is 4", () => {
    render(<ConcatNode {...makeProps({ inputCount: 4 })} />);
    expect(screen.getByText("join 4 strings")).toBeInTheDocument();
  });

  it("shows 'join 8 strings' when inputCount is 8 (MAX)", () => {
    render(<ConcatNode {...makeProps({ inputCount: 8 })} />);
    expect(screen.getByText("join 8 strings")).toBeInTheDocument();
  });
});

// ─── 3. Handles — dynamic input handles ──────────────────────────────────────

describe("ConcatNode — handles (defaultData, inputCount=2)", () => {
  it("renders handle-input-0 (target, left)", () => {
    render(<ConcatNode {...makeProps()} />);
    const h = screen.getByTestId("handle-input-0");
    expect(h).toHaveAttribute("data-handle-type", "target");
    expect(h).toHaveAttribute("data-position", "left");
  });

  it("renders handle-input-1 (target, left)", () => {
    render(<ConcatNode {...makeProps()} />);
    const h = screen.getByTestId("handle-input-1");
    expect(h).toHaveAttribute("data-handle-type", "target");
    expect(h).toHaveAttribute("data-position", "left");
  });

  it("renders the output handle (source, right)", () => {
    render(<ConcatNode {...makeProps()} />);
    const h = screen.getByTestId("handle-output");
    expect(h).toHaveAttribute("data-handle-type", "source");
    expect(h).toHaveAttribute("data-position", "right");
  });

  it("has exactly 3 handles for inputCount=2 (2 inputs + 1 output)", () => {
    render(<ConcatNode {...makeProps({ inputCount: 2 })} />);
    expect(screen.getAllByTestId(/^handle-/)).toHaveLength(3);
  });

  it("does NOT render handle-input-2 for inputCount=2", () => {
    render(<ConcatNode {...makeProps({ inputCount: 2 })} />);
    expect(screen.queryByTestId("handle-input-2")).not.toBeInTheDocument();
  });
});

describe("ConcatNode — handles (inputCount=5)", () => {
  it("renders handles input-0 through input-4 for inputCount=5", () => {
    render(<ConcatNode {...makeProps({ inputCount: 5 })} />);
    for (let i = 0; i < 5; i++) {
      expect(screen.getByTestId(`handle-input-${i}`)).toBeInTheDocument();
    }
  });

  it("has exactly 6 handles for inputCount=5 (5 inputs + 1 output)", () => {
    render(<ConcatNode {...makeProps({ inputCount: 5 })} />);
    expect(screen.getAllByTestId(/^handle-/)).toHaveLength(6);
  });

  it("does NOT render handle-input-5 for inputCount=5", () => {
    render(<ConcatNode {...makeProps({ inputCount: 5 })} />);
    expect(screen.queryByTestId("handle-input-5")).not.toBeInTheDocument();
  });
});

describe("ConcatNode — handles (inputCount=8, MAX)", () => {
  it("renders all 8 input handles for MAX inputCount", () => {
    render(<ConcatNode {...makeProps({ inputCount: 8 })} />);
    for (let i = 0; i < 8; i++) {
      expect(screen.getByTestId(`handle-input-${i}`)).toBeInTheDocument();
    }
  });

  it("has exactly 9 handles for inputCount=8 (8 inputs + 1 output)", () => {
    render(<ConcatNode {...makeProps({ inputCount: 8 })} />);
    expect(screen.getAllByTestId(/^handle-/)).toHaveLength(9);
  });
});

// ─── 4. Input count clamping ──────────────────────────────────────────────────

describe("ConcatNode — inputCount clamping (MIN_INPUTS=2)", () => {
  it("clamps inputCount=1 up to 2 (MIN_INPUTS)", () => {
    render(<ConcatNode {...makeProps({ inputCount: 1 })} />);
    expect(screen.getByText("join 2 strings")).toBeInTheDocument();
    expect(screen.getAllByTestId(/^handle-input-/)).toHaveLength(2);
  });

  it("clamps inputCount=0 up to 2", () => {
    render(<ConcatNode {...makeProps({ inputCount: 0 })} />);
    expect(screen.getByText("join 2 strings")).toBeInTheDocument();
  });

  it("does not crash when inputCount is undefined (defaults to MIN_INPUTS=2)", () => {
    const props = makeProps();
    (props.data as Record<string, unknown>).inputCount = undefined;
    render(<ConcatNode {...props} />);
    expect(screen.getByText("join 2 strings")).toBeInTheDocument();
  });
});

// ─── 5. Separator input onChange ──────────────────────────────────────────────

describe("ConcatNode — separator input onChange", () => {
  it("calls onChange({ separator: ', ' }) when separator is typed", () => {
    const onChange = vi.fn();
    render(<ConcatNode {...makeProps({ onChange })} />);
    fireEvent.change(screen.getByRole("textbox"), { target: { value: ", " } });
    expect(onChange).toHaveBeenCalledWith({ separator: ", " });
  });

  it("calls onChange({ separator: '' }) when separator is cleared", () => {
    const onChange = vi.fn();
    render(<ConcatNode {...makeProps({ separator: " | ", onChange })} />);
    fireEvent.change(screen.getByRole("textbox"), { target: { value: "" } });
    expect(onChange).toHaveBeenCalledWith({ separator: "" });
  });

  it("calls onChange({ separator: ' | ' }) for pipe separator", () => {
    const onChange = vi.fn();
    render(<ConcatNode {...makeProps({ onChange })} />);
    fireEvent.change(screen.getByRole("textbox"), { target: { value: " | " } });
    expect(onChange).toHaveBeenCalledWith({ separator: " | " });
  });

  it("calls onChange exactly once per input change", () => {
    const onChange = vi.fn();
    render(<ConcatNode {...makeProps({ onChange })} />);
    fireEvent.change(screen.getByRole("textbox"), { target: { value: "-" } });
    expect(onChange).toHaveBeenCalledTimes(1);
  });

  it("does not throw when separator changes and onChange is not provided", () => {
    expect(() => {
      render(<ConcatNode {...makeProps()} />);
      fireEvent.change(screen.getByRole("textbox"), { target: { value: "x" } });
    }).not.toThrow();
  });
});

// ─── 6. Minus button (remove input) ──────────────────────────────────────────

describe("ConcatNode — minus button", () => {
  it("minus button is disabled when inputCount equals MIN_INPUTS (2)", () => {
    render(<ConcatNode {...makeProps({ inputCount: 2 })} />);
    expect(getMinusBtn()).toBeDisabled();
  });

  it("minus button is enabled when inputCount is 3", () => {
    render(<ConcatNode {...makeProps({ inputCount: 3 })} />);
    expect(getMinusBtn()).not.toBeDisabled();
  });

  it("calls onChange({ inputCount: 2 }) when minus is clicked at inputCount=3", () => {
    const onChange = vi.fn();
    render(<ConcatNode {...makeProps({ inputCount: 3, onChange })} />);
    fireEvent.click(getMinusBtn());
    expect(onChange).toHaveBeenCalledWith({ inputCount: 2 });
  });

  it("calls onChange({ inputCount: 4 }) when minus is clicked at inputCount=5", () => {
    const onChange = vi.fn();
    render(<ConcatNode {...makeProps({ inputCount: 5, onChange })} />);
    fireEvent.click(getMinusBtn());
    expect(onChange).toHaveBeenCalledWith({ inputCount: 4 });
  });

  it("calls onChange({ inputCount: 2 }) at boundary: minus clicked at inputCount=2 (clamped)", () => {
    const onChange = vi.fn();
    render(<ConcatNode {...makeProps({ inputCount: 2, onChange })} />);
    fireEvent.click(getMinusBtn());
    // button is disabled so click has no effect (onChange not called)
    expect(onChange).not.toHaveBeenCalled();
  });

  it("does not throw when minus is clicked and onChange is not provided", () => {
    expect(() => {
      render(<ConcatNode {...makeProps({ inputCount: 3 })} />);
      fireEvent.click(getMinusBtn());
    }).not.toThrow();
  });
});

// ─── 7. Plus button (add input) ───────────────────────────────────────────────

describe("ConcatNode — plus button", () => {
  it("plus button is disabled when inputCount equals MAX_INPUTS (8)", () => {
    render(<ConcatNode {...makeProps({ inputCount: 8 })} />);
    expect(getPlusBtn()).toBeDisabled();
  });

  it("plus button is enabled when inputCount is 7", () => {
    render(<ConcatNode {...makeProps({ inputCount: 7 })} />);
    expect(getPlusBtn()).not.toBeDisabled();
  });

  it("plus button is enabled at MIN_INPUTS (2)", () => {
    render(<ConcatNode {...makeProps({ inputCount: 2 })} />);
    expect(getPlusBtn()).not.toBeDisabled();
  });

  it("calls onChange({ inputCount: 3 }) when plus is clicked at inputCount=2", () => {
    const onChange = vi.fn();
    render(<ConcatNode {...makeProps({ inputCount: 2, onChange })} />);
    fireEvent.click(getPlusBtn());
    expect(onChange).toHaveBeenCalledWith({ inputCount: 3 });
  });

  it("calls onChange({ inputCount: 6 }) when plus is clicked at inputCount=5", () => {
    const onChange = vi.fn();
    render(<ConcatNode {...makeProps({ inputCount: 5, onChange })} />);
    fireEvent.click(getPlusBtn());
    expect(onChange).toHaveBeenCalledWith({ inputCount: 6 });
  });

  it("calls onChange({ inputCount: 8 }) when plus is clicked at inputCount=7 (boundary)", () => {
    const onChange = vi.fn();
    render(<ConcatNode {...makeProps({ inputCount: 7, onChange })} />);
    fireEvent.click(getPlusBtn());
    expect(onChange).toHaveBeenCalledWith({ inputCount: 8 });
  });

  it("plus is disabled at MAX_INPUTS so click produces no onChange call", () => {
    const onChange = vi.fn();
    render(<ConcatNode {...makeProps({ inputCount: 8, onChange })} />);
    fireEvent.click(getPlusBtn());
    expect(onChange).not.toHaveBeenCalled();
  });

  it("does not throw when plus is clicked and onChange is not provided", () => {
    expect(() => {
      render(<ConcatNode {...makeProps({ inputCount: 2 })} />);
      fireEvent.click(getPlusBtn());
    }).not.toThrow();
  });
});

// ─── 8. Input row labels ──────────────────────────────────────────────────────

describe("ConcatNode — input row labels", () => {
  it("shows labels '1' and '2' for inputCount=2", () => {
    render(<ConcatNode {...makeProps({ inputCount: 2 })} />);
    expect(screen.getByText("1")).toBeInTheDocument();
    expect(screen.getByText("2")).toBeInTheDocument();
  });

  it("shows labels 1 through 5 for inputCount=5", () => {
    render(<ConcatNode {...makeProps({ inputCount: 5 })} />);
    for (let i = 1; i <= 5; i++) {
      expect(screen.getByText(String(i))).toBeInTheDocument();
    }
  });

  it("shows 'string' type label for each input row", () => {
    render(<ConcatNode {...makeProps({ inputCount: 3 })} />);
    expect(screen.getAllByText("string")).toHaveLength(3);
  });
});

// ─── 9. connectedHandles coloring ─────────────────────────────────────────────

describe("ConcatNode — connectedHandles", () => {
  it("renders input row labels regardless of connected state", () => {
    render(<ConcatNode {...makeProps({ connectedHandles: ["input-0"] })} />);
    expect(screen.getByText("1")).toBeInTheDocument();
  });

  it("defaults connectedHandles to [] when undefined — no crash", () => {
    const props = makeProps();
    (props.data as Record<string, unknown>).connectedHandles = undefined;
    expect(() => render(<ConcatNode {...props} />)).not.toThrow();
  });
});

// ─── 10. onChange payload shape ───────────────────────────────────────────────

describe("ConcatNode — onChange payload shape", () => {
  const ALLOWED_KEYS = new Set<string>(["separator", "inputCount", "onChange", "connectedHandles"]);

  it("separator payload contains only allowed ConcatNodeData keys", () => {
    const onChange = vi.fn();
    render(<ConcatNode {...makeProps({ onChange })} />);
    fireEvent.change(screen.getByRole("textbox"), { target: { value: "-" } });
    for (const key of Object.keys(onChange.mock.calls[0][0])) {
      expect(ALLOWED_KEYS.has(key)).toBe(true);
    }
  });

  it("minus button payload contains only allowed keys", () => {
    const onChange = vi.fn();
    render(<ConcatNode {...makeProps({ inputCount: 3, onChange })} />);
    fireEvent.click(getMinusBtn());
    for (const key of Object.keys(onChange.mock.calls[0][0])) {
      expect(ALLOWED_KEYS.has(key)).toBe(true);
    }
  });

  it("plus button payload contains only allowed keys", () => {
    const onChange = vi.fn();
    render(<ConcatNode {...makeProps({ onChange })} />);
    fireEvent.click(getPlusBtn());
    for (const key of Object.keys(onChange.mock.calls[0][0])) {
      expect(ALLOWED_KEYS.has(key)).toBe(true);
    }
  });

  it("separator payload value is never undefined", () => {
    const onChange = vi.fn();
    render(<ConcatNode {...makeProps({ onChange })} />);
    fireEvent.change(screen.getByRole("textbox"), { target: { value: "x" } });
    expect(onChange.mock.calls[0][0].separator).not.toBeUndefined();
  });

  it("inputCount payload value is a number", () => {
    const onChange = vi.fn();
    render(<ConcatNode {...makeProps({ inputCount: 3, onChange })} />);
    fireEvent.click(getMinusBtn());
    expect(typeof onChange.mock.calls[0][0].inputCount).toBe("number");
  });
});

// ─── 11. Fallback defaults ────────────────────────────────────────────────────

describe("ConcatNode — fallback defaults", () => {
  it("defaults separator to '' when separator is undefined", () => {
    const props = makeProps();
    (props.data as Record<string, unknown>).separator = undefined;
    render(<ConcatNode {...props} />);
    expect(screen.getByRole("textbox")).toHaveValue("");
  });
});

// ─── 12. Selected state ───────────────────────────────────────────────────────

describe("ConcatNode — selected state", () => {
  it("renders without crashing when selected=true", () => {
    render(<ConcatNode {...makeProps()} selected={true} />);
    expect(screen.getByText("Concat")).toBeInTheDocument();
  });

  it("renders without crashing when selected=false", () => {
    render(<ConcatNode {...makeProps()} selected={false} />);
    expect(screen.getByText("Concat")).toBeInTheDocument();
  });
});
