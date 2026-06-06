import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { NumberNode } from "@/components/canvas/nodes/NumberNode";
import type { NumberNodeData } from "@/components/canvas/nodes/NumberNode";
import type { NodeProps } from "@xyflow/react";

vi.mock("@xyflow/react", () => ({
  Handle: ({ id, type, position }: { id: string; type: string; position: string }) => (
    <div data-testid={`handle-${id}`} data-handle-type={type} data-position={position} />
  ),
  Position: { Left: "left", Right: "right" },
}));

vi.mock("@/components/ui/slider", () => ({
  Slider: ({
    onValueChange,
    value,
    min,
    max,
    step,
  }: {
    onValueChange?: (vals: number[]) => void;
    value?: number[];
    min?: number;
    max?: number;
    step?: number;
  }) => (
    <input
      data-testid="slider"
      type="range"
      min={min}
      max={max}
      step={step}
      value={value?.[0] ?? 0}
      onChange={(e) => onValueChange?.([parseFloat(e.target.value)])}
    />
  ),
}));

function makeProps(overrides: Partial<NumberNodeData> = {}): NodeProps {
  const data: NumberNodeData = {
    fixedValue: null,
    value: 0.5,
    min: 0,
    max: 1,
    ...overrides,
  };
  return { id: "node-1", data: data as unknown as Record<string, unknown>, selected: false } as NodeProps;
}

// helpers to find the three number <input> elements by order in the DOM
function getFixedInput()  { return screen.getByPlaceholderText("leave empty to use slider"); }
function getMinInput()    { return screen.getAllByRole("spinbutton")[1]; }
function getMaxInput()    { return screen.getAllByRole("spinbutton")[2]; }

// ─── 1. Rendering ─────────────────────────────────────────────────────────────

describe("NumberNode — rendering", () => {
  it("renders without crashing with defaultData", () => {
    render(<NumberNode {...makeProps()} />);
    expect(screen.getByText("Number")).toBeInTheDocument();
  });

  it("shows the '#' icon in the header", () => {
    render(<NumberNode {...makeProps()} />);
    expect(screen.getByText("#")).toBeInTheDocument();
  });

  it("shows 'Fixed Value' section label", () => {
    render(<NumberNode {...makeProps()} />);
    expect(screen.getByText("Fixed Value")).toBeInTheDocument();
  });

  it("shows 'Range' section label", () => {
    render(<NumberNode {...makeProps()} />);
    expect(screen.getByText("Range")).toBeInTheDocument();
  });

  it("shows 'Value' section label", () => {
    render(<NumberNode {...makeProps()} />);
    expect(screen.getByText("Value")).toBeInTheDocument();
  });

  it("shows 'Min' and 'Max' sub-labels", () => {
    render(<NumberNode {...makeProps()} />);
    expect(screen.getByText("Min")).toBeInTheDocument();
    expect(screen.getByText("Max")).toBeInTheDocument();
  });

  it("renders the fixed value input with placeholder 'leave empty to use slider'", () => {
    render(<NumberNode {...makeProps()} />);
    expect(getFixedInput()).toBeInTheDocument();
  });

  it("renders the slider", () => {
    render(<NumberNode {...makeProps()} />);
    expect(screen.getByTestId("slider")).toBeInTheDocument();
  });
});

// ─── 2. Header subtitle logic ─────────────────────────────────────────────────

describe("NumberNode — header subtitle", () => {
  it("shows 'value: 0.500' when fixedValue is null (defaultData)", () => {
    render(<NumberNode {...makeProps()} />);
    expect(screen.getByText("value: 0.500")).toBeInTheDocument();
  });

  it("shows 'value: X.XXX' with 3 decimal places when not fixed", () => {
    render(<NumberNode {...makeProps({ value: 0.25, min: 0, max: 1, fixedValue: null })} />);
    expect(screen.getByText("value: 0.250")).toBeInTheDocument();
  });

  it("shows 'fixed: 5' when fixedValue is 5", () => {
    render(<NumberNode {...makeProps({ fixedValue: 5 })} />);
    expect(screen.getByText("fixed: 5")).toBeInTheDocument();
  });

  it("shows 'fixed: 0' when fixedValue is 0 (0 !== null, so it IS fixed)", () => {
    render(<NumberNode {...makeProps({ fixedValue: 0 })} />);
    expect(screen.getByText("fixed: 0")).toBeInTheDocument();
  });

  it("shows 'fixed: -3' when fixedValue is -3", () => {
    render(<NumberNode {...makeProps({ fixedValue: -3 })} />);
    expect(screen.getByText("fixed: -3")).toBeInTheDocument();
  });

  it("shows 'value: ...' (not fixed) when fixedValue is null", () => {
    render(<NumberNode {...makeProps({ fixedValue: null, value: 0.7 })} />);
    expect(screen.getByText("value: 0.700")).toBeInTheDocument();
  });
});

// ─── 3. safeValue clamping ────────────────────────────────────────────────────

describe("NumberNode — safeValue clamping", () => {
  it("clamps value to max when value exceeds max", () => {
    render(<NumberNode {...makeProps({ value: 1.5, min: 0, max: 1, fixedValue: null })} />);
    expect(screen.getByText("value: 1.000")).toBeInTheDocument();
  });

  it("clamps value to min when value is below min", () => {
    render(<NumberNode {...makeProps({ value: -0.5, min: 0, max: 1, fixedValue: null })} />);
    expect(screen.getByText("value: 0.000")).toBeInTheDocument();
  });

  it("does not clamp value when it is within [min, max]", () => {
    render(<NumberNode {...makeProps({ value: 0.5, min: 0, max: 1, fixedValue: null })} />);
    expect(screen.getByText("value: 0.500")).toBeInTheDocument();
  });

  it("clamps value to boundary when value equals min exactly", () => {
    render(<NumberNode {...makeProps({ value: 0, min: 0, max: 1, fixedValue: null })} />);
    expect(screen.getByText("value: 0.000")).toBeInTheDocument();
  });

  it("clamps value to boundary when value equals max exactly", () => {
    render(<NumberNode {...makeProps({ value: 1, min: 0, max: 1, fixedValue: null })} />);
    expect(screen.getByText("value: 1.000")).toBeInTheDocument();
  });
});

// ─── 4. Handles ───────────────────────────────────────────────────────────────

describe("NumberNode — handles", () => {
  it("renders the output handle (source, right)", () => {
    render(<NumberNode {...makeProps()} />);
    const h = screen.getByTestId("handle-output");
    expect(h).toBeInTheDocument();
    expect(h).toHaveAttribute("data-handle-type", "source");
    expect(h).toHaveAttribute("data-position", "right");
  });

  it("does not render any input handle", () => {
    render(<NumberNode {...makeProps()} />);
    expect(screen.queryByTestId("handle-input")).not.toBeInTheDocument();
  });

  it("has exactly one handle in the DOM", () => {
    render(<NumberNode {...makeProps()} />);
    expect(screen.getAllByTestId(/^handle-/)).toHaveLength(1);
  });
});

// ─── 5. Fixed value input onChange ───────────────────────────────────────────

describe("NumberNode — fixed value input onChange", () => {
  it("calls onChange({ fixedValue: 42 }) when '42' is entered", () => {
    const onChange = vi.fn();
    render(<NumberNode {...makeProps({ onChange })} />);
    fireEvent.change(getFixedInput(), { target: { value: "42" } });
    expect(onChange).toHaveBeenCalledWith({ fixedValue: 42 });
  });

  it("calls onChange({ fixedValue: null }) when input is cleared to empty string", () => {
    const onChange = vi.fn();
    render(<NumberNode {...makeProps({ fixedValue: 5, onChange })} />);
    fireEvent.change(getFixedInput(), { target: { value: "" } });
    expect(onChange).toHaveBeenCalledWith({ fixedValue: null });
  });

  it("calls onChange({ fixedValue: 0 }) when '0' is entered", () => {
    const onChange = vi.fn();
    render(<NumberNode {...makeProps({ onChange })} />);
    fireEvent.change(getFixedInput(), { target: { value: "0" } });
    expect(onChange).toHaveBeenCalledWith({ fixedValue: 0 });
  });

  it("calls onChange({ fixedValue: -3.5 }) when '-3.5' is entered", () => {
    const onChange = vi.fn();
    render(<NumberNode {...makeProps({ onChange })} />);
    fireEvent.change(getFixedInput(), { target: { value: "-3.5" } });
    expect(onChange).toHaveBeenCalledWith({ fixedValue: -3.5 });
  });

  it("calls onChange({ fixedValue: 3.14 }) when '3.14' is entered", () => {
    const onChange = vi.fn();
    render(<NumberNode {...makeProps({ onChange })} />);
    fireEvent.change(getFixedInput(), { target: { value: "3.14" } });
    expect(onChange).toHaveBeenCalledWith({ fixedValue: 3.14 });
  });

  it("fixed value input shows empty string when fixedValue is null", () => {
    render(<NumberNode {...makeProps({ fixedValue: null })} />);
    expect(getFixedInput()).toHaveValue(null); // number input with empty value
  });

  it("fixed value input shows the current fixedValue when set", () => {
    render(<NumberNode {...makeProps({ fixedValue: 7 })} />);
    expect(getFixedInput()).toHaveValue(7);
  });
});

// ─── 6. Min input onChange ────────────────────────────────────────────────────

describe("NumberNode — min input onChange", () => {
  it("calls onChange({ min: 5 }) when '5' is entered in min input", () => {
    const onChange = vi.fn();
    render(<NumberNode {...makeProps({ onChange })} />);
    fireEvent.change(getMinInput(), { target: { value: "5" } });
    expect(onChange).toHaveBeenCalledWith({ min: 5 });
  });

  it("calls onChange({ min: 0 }) when min input is cleared (fallback 0)", () => {
    const onChange = vi.fn();
    render(<NumberNode {...makeProps({ onChange })} />);
    fireEvent.change(getMinInput(), { target: { value: "" } });
    expect(onChange).toHaveBeenCalledWith({ min: 0 });
  });

  it("calls onChange({ min: 0 }) when a non-numeric string is entered in min (NaN || 0)", () => {
    const onChange = vi.fn();
    render(<NumberNode {...makeProps({ onChange })} />);
    fireEvent.change(getMinInput(), { target: { value: "abc" } });
    expect(onChange).toHaveBeenCalledWith({ min: 0 });
  });

  it("calls onChange({ min: -10 }) for negative min value", () => {
    const onChange = vi.fn();
    render(<NumberNode {...makeProps({ onChange })} />);
    fireEvent.change(getMinInput(), { target: { value: "-10" } });
    expect(onChange).toHaveBeenCalledWith({ min: -10 });
  });

  it("min input reflects the current min value", () => {
    render(<NumberNode {...makeProps({ min: 3 })} />);
    expect(getMinInput()).toHaveValue(3);
  });
});

// ─── 7. Max input onChange ────────────────────────────────────────────────────

describe("NumberNode — max input onChange", () => {
  it("calls onChange({ max: 10 }) when '10' is entered in max input", () => {
    const onChange = vi.fn();
    render(<NumberNode {...makeProps({ onChange })} />);
    fireEvent.change(getMaxInput(), { target: { value: "10" } });
    expect(onChange).toHaveBeenCalledWith({ max: 10 });
  });

  it("calls onChange({ max: 1 }) when max input is cleared (fallback 1)", () => {
    const onChange = vi.fn();
    render(<NumberNode {...makeProps({ onChange })} />);
    fireEvent.change(getMaxInput(), { target: { value: "" } });
    expect(onChange).toHaveBeenCalledWith({ max: 1 });
  });

  it("calls onChange({ max: 1 }) when a non-numeric string is entered in max (NaN || 1)", () => {
    const onChange = vi.fn();
    render(<NumberNode {...makeProps({ onChange })} />);
    fireEvent.change(getMaxInput(), { target: { value: "abc" } });
    expect(onChange).toHaveBeenCalledWith({ max: 1 });
  });

  it("calls onChange({ max: 100 }) for large max value", () => {
    const onChange = vi.fn();
    render(<NumberNode {...makeProps({ onChange })} />);
    fireEvent.change(getMaxInput(), { target: { value: "100" } });
    expect(onChange).toHaveBeenCalledWith({ max: 100 });
  });

  it("max input reflects the current max value", () => {
    render(<NumberNode {...makeProps({ max: 50 })} />);
    expect(getMaxInput()).toHaveValue(50);
  });
});

// ─── 8. Slider onChange ───────────────────────────────────────────────────────

describe("NumberNode — slider onChange", () => {
  it("calls onChange({ value: 0.7 }) when slider moves to 0.7", () => {
    const onChange = vi.fn();
    render(<NumberNode {...makeProps({ onChange })} />);
    fireEvent.change(screen.getByTestId("slider"), { target: { value: "0.7" } });
    expect(onChange).toHaveBeenCalledWith({ value: 0.7 });
  });

  it("calls onChange({ value: 0 }) when slider moves to min boundary", () => {
    const onChange = vi.fn();
    render(<NumberNode {...makeProps({ min: 0, max: 1, onChange })} />);
    fireEvent.change(screen.getByTestId("slider"), { target: { value: "0" } });
    expect(onChange).toHaveBeenCalledWith({ value: 0 });
  });

  it("calls onChange({ value: 1 }) when slider moves to max boundary", () => {
    const onChange = vi.fn();
    render(<NumberNode {...makeProps({ min: 0, max: 1, onChange })} />);
    fireEvent.change(screen.getByTestId("slider"), { target: { value: "1" } });
    expect(onChange).toHaveBeenCalledWith({ value: 1 });
  });

  it("slider receives the clamped safeValue as its current value", () => {
    render(<NumberNode {...makeProps({ value: 1.5, min: 0, max: 1 })} />);
    expect(screen.getByTestId("slider")).toHaveValue("1");
  });

  it("slider receives correct min and max attributes", () => {
    render(<NumberNode {...makeProps({ min: 0, max: 100 })} />);
    const slider = screen.getByTestId("slider");
    expect(slider).toHaveAttribute("min", "0");
    expect(slider).toHaveAttribute("max", "100");
  });
});

// ─── 9. isFixed — range/slider section dimming ────────────────────────────────

describe("NumberNode — isFixed state (NaN treated as not fixed)", () => {
  it("NaN fixedValue does NOT show 'fixed:' subtitle (NaN is not fixed)", () => {
    render(<NumberNode {...makeProps({ fixedValue: NaN })} />);
    // isFixed = NaN !== null && !isNaN(NaN) = true && false = false
    expect(screen.queryByText(/^fixed:/)).not.toBeInTheDocument();
  });

  it("null fixedValue is treated as not fixed", () => {
    render(<NumberNode {...makeProps({ fixedValue: null, value: 0.5 })} />);
    expect(screen.queryByText(/^fixed:/)).not.toBeInTheDocument();
    expect(screen.getByText("value: 0.500")).toBeInTheDocument();
  });

  it("fixedValue 0 IS treated as fixed (0 !== null)", () => {
    render(<NumberNode {...makeProps({ fixedValue: 0 })} />);
    expect(screen.getByText("fixed: 0")).toBeInTheDocument();
  });
});

// ─── 10. Fallback defaults ────────────────────────────────────────────────────

describe("NumberNode — fallback defaults", () => {
  it("defaults value to 0.5 when value is undefined", () => {
    const props = makeProps();
    (props.data as Record<string, unknown>).value = undefined;
    render(<NumberNode {...props} />);
    expect(screen.getByText("value: 0.500")).toBeInTheDocument();
  });

  it("defaults min to 0 when min is undefined", () => {
    const props = makeProps();
    (props.data as Record<string, unknown>).min = undefined;
    render(<NumberNode {...props} />);
    expect(getMinInput()).toHaveValue(0);
  });

  it("defaults max to 1 when max is undefined", () => {
    const props = makeProps();
    (props.data as Record<string, unknown>).max = undefined;
    render(<NumberNode {...props} />);
    expect(getMaxInput()).toHaveValue(1);
  });

  it("defaults fixedValue to null when fixedValue is undefined", () => {
    const props = makeProps();
    (props.data as Record<string, unknown>).fixedValue = undefined;
    render(<NumberNode {...props} />);
    expect(getFixedInput()).toHaveValue(null);
    expect(screen.getByText("value: 0.500")).toBeInTheDocument();
  });
});

// ─── 11. onChange payload shape ───────────────────────────────────────────────

describe("NumberNode — onChange payload shape", () => {
  const ALLOWED_KEYS = new Set<string>(["fixedValue", "value", "min", "max", "onChange"]);

  it("fixed value input payload contains only allowed keys", () => {
    const onChange = vi.fn();
    render(<NumberNode {...makeProps({ onChange })} />);
    fireEvent.change(getFixedInput(), { target: { value: "5" } });
    for (const key of Object.keys(onChange.mock.calls[0][0])) {
      expect(ALLOWED_KEYS.has(key)).toBe(true);
    }
  });

  it("min input payload contains only allowed keys", () => {
    const onChange = vi.fn();
    render(<NumberNode {...makeProps({ onChange })} />);
    fireEvent.change(getMinInput(), { target: { value: "2" } });
    for (const key of Object.keys(onChange.mock.calls[0][0])) {
      expect(ALLOWED_KEYS.has(key)).toBe(true);
    }
  });

  it("max input payload contains only allowed keys", () => {
    const onChange = vi.fn();
    render(<NumberNode {...makeProps({ onChange })} />);
    fireEvent.change(getMaxInput(), { target: { value: "5" } });
    for (const key of Object.keys(onChange.mock.calls[0][0])) {
      expect(ALLOWED_KEYS.has(key)).toBe(true);
    }
  });

  it("slider payload contains only allowed keys", () => {
    const onChange = vi.fn();
    render(<NumberNode {...makeProps({ onChange })} />);
    fireEvent.change(screen.getByTestId("slider"), { target: { value: "0.7" } });
    const payload = onChange.mock.calls[0][0];
    for (const key of Object.keys(payload)) {
      expect(ALLOWED_KEYS.has(key)).toBe(true);
    }
  });
});

// ─── 12. No-onChange safety ───────────────────────────────────────────────────

describe("NumberNode — no onChange provided", () => {
  it("changing fixed value input does not throw", () => {
    expect(() => {
      render(<NumberNode {...makeProps()} />);
      fireEvent.change(getFixedInput(), { target: { value: "5" } });
    }).not.toThrow();
  });

  it("changing min input does not throw", () => {
    expect(() => {
      render(<NumberNode {...makeProps()} />);
      fireEvent.change(getMinInput(), { target: { value: "2" } });
    }).not.toThrow();
  });

  it("changing max input does not throw", () => {
    expect(() => {
      render(<NumberNode {...makeProps()} />);
      fireEvent.change(getMaxInput(), { target: { value: "5" } });
    }).not.toThrow();
  });

  it("moving the slider does not throw", () => {
    expect(() => {
      render(<NumberNode {...makeProps()} />);
      fireEvent.change(screen.getByTestId("slider"), { target: { value: "0.7" } });
    }).not.toThrow();
  });
});

// ─── 13. Selected state ───────────────────────────────────────────────────────

describe("NumberNode — selected state", () => {
  it("renders without crashing when selected=true", () => {
    render(<NumberNode {...makeProps()} selected={true} />);
    expect(screen.getByText("Number")).toBeInTheDocument();
  });

  it("renders without crashing when selected=false", () => {
    render(<NumberNode {...makeProps()} selected={false} />);
    expect(screen.getByText("Number")).toBeInTheDocument();
  });
});
