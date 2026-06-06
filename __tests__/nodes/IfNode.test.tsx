import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { IfNode } from "@/components/canvas/nodes/IfNode";
import type { IfNodeData, IfOperator } from "@/components/canvas/nodes/IfNode";
import type { NodeProps } from "@xyflow/react";

vi.mock("@xyflow/react", () => ({
  Handle: ({ id, type, position }: { id: string; type: string; position: string }) => (
    <div data-testid={`handle-${id}`} data-handle-type={type} data-position={position} />
  ),
  Position: { Left: "left", Right: "right" },
  useViewport: () => ({ zoom: 1 }),
}));

function makeProps(overrides: Partial<IfNodeData> = {}): NodeProps {
  const data: IfNodeData = { operator: "==", compareTo: "", ...overrides };
  return { id: "node-1", data: data as unknown as Record<string, unknown>, selected: false } as NodeProps;
}

// All 11 operators
const BINARY_OPERATORS: IfOperator[] = ["==", "!=", ">", "<", ">=", "<=", "contains", "startsWith", "endsWith"];
const UNARY_OPERATORS: IfOperator[] = ["isEmpty", "isTruthy"];

// ─── 1. Rendering ─────────────────────────────────────────────────────────────

describe("IfNode — rendering", () => {
  it("renders without crashing with defaultData { operator: '==', compareTo: '' }", () => {
    render(<IfNode {...makeProps()} />);
    expect(screen.getByText("If")).toBeInTheDocument();
  });

  it("shows the subtitle 'split flow on a condition'", () => {
    render(<IfNode {...makeProps()} />);
    expect(screen.getByText("split flow on a condition")).toBeInTheDocument();
  });

  it("shows the 'Condition' section label", () => {
    render(<IfNode {...makeProps()} />);
    expect(screen.getByText("Condition")).toBeInTheDocument();
  });

  it("shows the 'value' input row label", () => {
    render(<IfNode {...makeProps()} />);
    expect(screen.getByText("value")).toBeInTheDocument();
  });

  it("shows 'true' and 'false' output row labels", () => {
    render(<IfNode {...makeProps()} />);
    expect(screen.getByText("true")).toBeInTheDocument();
    expect(screen.getByText("false")).toBeInTheDocument();
  });

  it("renders the operator select with current operator selected", () => {
    render(<IfNode {...makeProps({ operator: "==" })} />);
    expect(screen.getByRole("combobox")).toHaveValue("==");
  });

  it("renders all 11 operators in the select", () => {
    render(<IfNode {...makeProps()} />);
    const select = screen.getByRole("combobox");
    const options = Array.from((select as HTMLSelectElement).options).map((o) => o.value);
    expect(options).toContain("==");
    expect(options).toContain("!=");
    expect(options).toContain(">");
    expect(options).toContain("<");
    expect(options).toContain(">=");
    expect(options).toContain("<=");
    expect(options).toContain("contains");
    expect(options).toContain("startsWith");
    expect(options).toContain("endsWith");
    expect(options).toContain("isEmpty");
    expect(options).toContain("isTruthy");
  });
});

// ─── 2. Handles — binary operators (compare handle present) ───────────────────

describe("IfNode — handles (binary operator '==')", () => {
  it("renders the input handle (target, left)", () => {
    render(<IfNode {...makeProps()} />);
    const h = screen.getByTestId("handle-input");
    expect(h).toHaveAttribute("data-handle-type", "target");
    expect(h).toHaveAttribute("data-position", "left");
  });

  it("renders the compare handle (target, left) for binary operator", () => {
    render(<IfNode {...makeProps({ operator: "==" })} />);
    const h = screen.getByTestId("handle-compare");
    expect(h).toHaveAttribute("data-handle-type", "target");
    expect(h).toHaveAttribute("data-position", "left");
  });

  it("renders the true handle (source, right)", () => {
    render(<IfNode {...makeProps()} />);
    const h = screen.getByTestId("handle-true");
    expect(h).toHaveAttribute("data-handle-type", "source");
    expect(h).toHaveAttribute("data-position", "right");
  });

  it("renders the false handle (source, right)", () => {
    render(<IfNode {...makeProps()} />);
    const h = screen.getByTestId("handle-false");
    expect(h).toHaveAttribute("data-handle-type", "source");
    expect(h).toHaveAttribute("data-position", "right");
  });

  it("has 5 handles total for a binary operator", () => {
    render(<IfNode {...makeProps({ operator: "==" })} />);
    expect(screen.getAllByTestId(/^handle-/)).toHaveLength(5);
  });
});

// ─── 3. Handles — unary operators (compare handle absent) ─────────────────────

describe("IfNode — handles (unary operators)", () => {
  it("does NOT render the compare handle for 'isEmpty'", () => {
    render(<IfNode {...makeProps({ operator: "isEmpty" })} />);
    expect(screen.queryByTestId("handle-compare")).not.toBeInTheDocument();
  });

  it("does NOT render the compare handle for 'isTruthy'", () => {
    render(<IfNode {...makeProps({ operator: "isTruthy" })} />);
    expect(screen.queryByTestId("handle-compare")).not.toBeInTheDocument();
  });

  it("has only 4 handles for 'isEmpty' (input + data + true + false)", () => {
    render(<IfNode {...makeProps({ operator: "isEmpty" })} />);
    expect(screen.getAllByTestId(/^handle-/)).toHaveLength(4);
  });

  it("has only 4 handles for 'isTruthy' (input + data + true + false)", () => {
    render(<IfNode {...makeProps({ operator: "isTruthy" })} />);
    expect(screen.getAllByTestId(/^handle-/)).toHaveLength(4);
  });

  it("still renders input, true, and false handles for 'isEmpty'", () => {
    render(<IfNode {...makeProps({ operator: "isEmpty" })} />);
    expect(screen.getByTestId("handle-input")).toBeInTheDocument();
    expect(screen.getByTestId("handle-true")).toBeInTheDocument();
    expect(screen.getByTestId("handle-false")).toBeInTheDocument();
  });
});

// ─── 4. Compare-to section — binary vs unary ──────────────────────────────────

describe("IfNode — Compare To section visibility", () => {
  it("shows the 'Compare To' section for binary operator '=='", () => {
    render(<IfNode {...makeProps({ operator: "==" })} />);
    expect(screen.getByText("Compare To")).toBeInTheDocument();
  });

  it("shows the compare-to input for binary operator '!='", () => {
    render(<IfNode {...makeProps({ operator: "!=" })} />);
    expect(screen.getByPlaceholderText("value to match against…")).toBeInTheDocument();
  });

  it("hides the 'Compare To' section for 'isEmpty'", () => {
    render(<IfNode {...makeProps({ operator: "isEmpty" })} />);
    expect(screen.queryByText("Compare To")).not.toBeInTheDocument();
    expect(screen.queryByPlaceholderText("value to match against…")).not.toBeInTheDocument();
  });

  it("hides the 'Compare To' section for 'isTruthy'", () => {
    render(<IfNode {...makeProps({ operator: "isTruthy" })} />);
    expect(screen.queryByText("Compare To")).not.toBeInTheDocument();
    expect(screen.queryByPlaceholderText("value to match against…")).not.toBeInTheDocument();
  });

  it.each(BINARY_OPERATORS)("shows Compare To section for binary operator '%s'", (op) => {
    render(<IfNode {...makeProps({ operator: op })} />);
    expect(screen.getByText("Compare To")).toBeInTheDocument();
  });

  it.each(UNARY_OPERATORS)("hides Compare To section for unary operator '%s'", (op) => {
    render(<IfNode {...makeProps({ operator: op })} />);
    expect(screen.queryByText("Compare To")).not.toBeInTheDocument();
  });
});

// ─── 5. Operator select onChange ──────────────────────────────────────────────

describe("IfNode — operator select onChange", () => {
  it("calls onChange({ operator: '!=' }) when '!=' is selected", () => {
    const onChange = vi.fn();
    render(<IfNode {...makeProps({ onChange })} />);
    fireEvent.change(screen.getByRole("combobox"), { target: { value: "!=" } });
    expect(onChange).toHaveBeenCalledWith({ operator: "!=" });
  });

  it("calls onChange({ operator: '>' }) when '>' is selected", () => {
    const onChange = vi.fn();
    render(<IfNode {...makeProps({ onChange })} />);
    fireEvent.change(screen.getByRole("combobox"), { target: { value: ">" } });
    expect(onChange).toHaveBeenCalledWith({ operator: ">" });
  });

  it("calls onChange({ operator: 'contains' }) when 'contains' is selected", () => {
    const onChange = vi.fn();
    render(<IfNode {...makeProps({ onChange })} />);
    fireEvent.change(screen.getByRole("combobox"), { target: { value: "contains" } });
    expect(onChange).toHaveBeenCalledWith({ operator: "contains" });
  });

  it("calls onChange({ operator: 'isEmpty' }) when 'isEmpty' is selected", () => {
    const onChange = vi.fn();
    render(<IfNode {...makeProps({ onChange })} />);
    fireEvent.change(screen.getByRole("combobox"), { target: { value: "isEmpty" } });
    expect(onChange).toHaveBeenCalledWith({ operator: "isEmpty" });
  });

  it("calls onChange({ operator: 'isTruthy' }) when 'isTruthy' is selected", () => {
    const onChange = vi.fn();
    render(<IfNode {...makeProps({ onChange })} />);
    fireEvent.change(screen.getByRole("combobox"), { target: { value: "isTruthy" } });
    expect(onChange).toHaveBeenCalledWith({ operator: "isTruthy" });
  });

  it("calls onChange exactly once per select change", () => {
    const onChange = vi.fn();
    render(<IfNode {...makeProps({ onChange })} />);
    fireEvent.change(screen.getByRole("combobox"), { target: { value: "contains" } });
    expect(onChange).toHaveBeenCalledTimes(1);
  });

  it("does not throw when operator changes and onChange is not provided", () => {
    expect(() => {
      render(<IfNode {...makeProps()} />);
      fireEvent.change(screen.getByRole("combobox"), { target: { value: "!=" } });
    }).not.toThrow();
  });
});

// ─── 6. Compare-to input onChange ─────────────────────────────────────────────

describe("IfNode — compare-to input onChange", () => {
  it("calls onChange({ compareTo: 'hello' }) when text is typed", () => {
    const onChange = vi.fn();
    render(<IfNode {...makeProps({ onChange })} />);
    const input = screen.getByPlaceholderText("value to match against…");
    fireEvent.change(input, { target: { value: "hello" } });
    expect(onChange).toHaveBeenCalledWith({ compareTo: "hello" });
  });

  it("calls onChange({ compareTo: '' }) when input is cleared", () => {
    const onChange = vi.fn();
    render(<IfNode {...makeProps({ compareTo: "hello", onChange })} />);
    const input = screen.getByPlaceholderText("value to match against…");
    fireEvent.change(input, { target: { value: "" } });
    expect(onChange).toHaveBeenCalledWith({ compareTo: "" });
  });

  it("calls onChange({ compareTo: '42' }) for a numeric string", () => {
    const onChange = vi.fn();
    render(<IfNode {...makeProps({ onChange })} />);
    const input = screen.getByPlaceholderText("value to match against…");
    fireEvent.change(input, { target: { value: "42" } });
    expect(onChange).toHaveBeenCalledWith({ compareTo: "42" });
  });

  it("calls onChange exactly once per input change", () => {
    const onChange = vi.fn();
    render(<IfNode {...makeProps({ onChange })} />);
    const input = screen.getByPlaceholderText("value to match against…");
    fireEvent.change(input, { target: { value: "test" } });
    expect(onChange).toHaveBeenCalledTimes(1);
  });

  it("reflects the current compareTo value in the input", () => {
    render(<IfNode {...makeProps({ compareTo: "hello world" })} />);
    expect(screen.getByDisplayValue("hello world")).toBeInTheDocument();
  });

  it("does not throw when input changes and onChange is not provided", () => {
    expect(() => {
      render(<IfNode {...makeProps()} />);
      const input = screen.getByPlaceholderText("value to match against…");
      fireEvent.change(input, { target: { value: "test" } });
    }).not.toThrow();
  });
});

// ─── 7. connectedHandles — compare ────────────────────────────────────────────

describe("IfNode — connectedHandles for 'compare'", () => {
  it("compare input is enabled when compare handle is NOT connected", () => {
    render(<IfNode {...makeProps({ connectedHandles: [] })} />);
    const input = screen.getByPlaceholderText("value to match against…");
    expect(input).not.toBeDisabled();
  });

  it("compare input is disabled when compare handle IS connected", () => {
    render(<IfNode {...makeProps({ connectedHandles: ["compare"] })} />);
    const input = screen.getByPlaceholderText("value to match against…");
    expect(input).toBeDisabled();
  });

  it("shows 'using connected value' when compare is connected", () => {
    render(<IfNode {...makeProps({ connectedHandles: ["compare"] })} />);
    expect(screen.getByText("using connected value")).toBeInTheDocument();
  });

  it("does not show 'using connected value' when compare is not connected", () => {
    render(<IfNode {...makeProps({ connectedHandles: [] })} />);
    expect(screen.queryByText("using connected value")).not.toBeInTheDocument();
  });

  it("shows 'using connected value' only for compare — not for other connected handles", () => {
    render(<IfNode {...makeProps({ connectedHandles: ["input"] })} />);
    expect(screen.queryByText("using connected value")).not.toBeInTheDocument();
  });
});

// ─── 8. connectedHandles — input label color ──────────────────────────────────

describe("IfNode — connectedHandles for 'input'", () => {
  it("renders the 'value' label regardless of connected state", () => {
    render(<IfNode {...makeProps({ connectedHandles: [] })} />);
    expect(screen.getByText("value")).toBeInTheDocument();
  });

  it("renders the 'value' label when input is connected", () => {
    render(<IfNode {...makeProps({ connectedHandles: ["input"] })} />);
    expect(screen.getByText("value")).toBeInTheDocument();
  });
});

// ─── 9. Fallback defaults ─────────────────────────────────────────────────────

describe("IfNode — fallback defaults", () => {
  it("defaults operator to '==' when operator is undefined", () => {
    const props = makeProps();
    (props.data as Record<string, unknown>).operator = undefined;
    render(<IfNode {...props} />);
    expect(screen.getByRole("combobox")).toHaveValue("==");
  });

  it("defaults compareTo to '' when compareTo is undefined", () => {
    const props = makeProps();
    (props.data as Record<string, unknown>).compareTo = undefined;
    render(<IfNode {...props} />);
    expect(screen.getByPlaceholderText("value to match against…")).toHaveValue("");
  });

  it("defaults connectedHandles to [] when undefined — no crash", () => {
    const props = makeProps();
    (props.data as Record<string, unknown>).connectedHandles = undefined;
    expect(() => render(<IfNode {...props} />)).not.toThrow();
  });
});

// ─── 10. onChange payload shape ───────────────────────────────────────────────

describe("IfNode — onChange payload shape", () => {
  const ALLOWED_KEYS = new Set<string>(["operator", "compareTo", "onChange", "connectedHandles"]);

  it("operator select payload contains only allowed IfNodeData keys", () => {
    const onChange = vi.fn();
    render(<IfNode {...makeProps({ onChange })} />);
    fireEvent.change(screen.getByRole("combobox"), { target: { value: "!=" } });
    for (const key of Object.keys(onChange.mock.calls[0][0])) {
      expect(ALLOWED_KEYS.has(key)).toBe(true);
    }
  });

  it("compare-to input payload contains only allowed IfNodeData keys", () => {
    const onChange = vi.fn();
    render(<IfNode {...makeProps({ onChange })} />);
    const input = screen.getByPlaceholderText("value to match against…");
    fireEvent.change(input, { target: { value: "test" } });
    for (const key of Object.keys(onChange.mock.calls[0][0])) {
      expect(ALLOWED_KEYS.has(key)).toBe(true);
    }
  });

  it("operator payload value is never undefined", () => {
    const onChange = vi.fn();
    render(<IfNode {...makeProps({ onChange })} />);
    fireEvent.change(screen.getByRole("combobox"), { target: { value: ">" } });
    expect(onChange.mock.calls[0][0].operator).not.toBeUndefined();
  });

  it("compareTo payload value is never undefined", () => {
    const onChange = vi.fn();
    render(<IfNode {...makeProps({ onChange })} />);
    const input = screen.getByPlaceholderText("value to match against…");
    fireEvent.change(input, { target: { value: "abc" } });
    expect(onChange.mock.calls[0][0].compareTo).not.toBeUndefined();
  });
});

// ─── 11. Selected state ───────────────────────────────────────────────────────

describe("IfNode — selected state", () => {
  it("renders without crashing when selected=true", () => {
    render(<IfNode {...makeProps()} selected={true} />);
    expect(screen.getByText("If")).toBeInTheDocument();
  });

  it("renders without crashing when selected=false", () => {
    render(<IfNode {...makeProps()} selected={false} />);
    expect(screen.getByText("If")).toBeInTheDocument();
  });
});
