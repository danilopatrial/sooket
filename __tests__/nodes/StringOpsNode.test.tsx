import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { StringOpsNode } from "@/components/canvas/nodes/StringOpsNode";
import type { StringOpsNodeData, StringOp } from "@/components/canvas/nodes/StringOpsNode";
import type { NodeProps } from "@xyflow/react";

vi.mock("@xyflow/react", () => ({
  Handle: ({ id, type, position }: { id: string; type: string; position: string }) => (
    <div data-testid={`handle-${id}`} data-handle-type={type} data-position={position} />
  ),
  Position: { Left: "left", Right: "right" },
  useViewport: () => ({ zoom: 1 }),
}));

const DEFAULT_DATA: StringOpsNodeData = {
  op: "uppercase",
  separator: ",",
  sliceStart: 0,
  sliceEnd: 0,
  sliceEndEnabled: false,
};

function makeProps(overrides: Partial<StringOpsNodeData> = {}): NodeProps {
  const data: StringOpsNodeData = { ...DEFAULT_DATA, ...overrides };
  return { id: "node-1", data: data as unknown as Record<string, unknown>, selected: false } as NodeProps;
}

const ALL_OPS: { value: StringOp; label: string }[] = [
  { value: "uppercase", label: "UPPER" },
  { value: "lowercase", label: "lower" },
  { value: "trim",      label: "trim"  },
  { value: "split",     label: "split" },
  { value: "slice",     label: "slice" },
];

// ─── 1. Rendering ─────────────────────────────────────────────────────────────

describe("StringOpsNode — rendering", () => {
  it("renders without crashing with defaultData", () => {
    render(<StringOpsNode {...makeProps()} />);
    expect(screen.getByText("String Ops")).toBeInTheDocument();
  });

  it("shows the subtitle 'transform text values'", () => {
    render(<StringOpsNode {...makeProps()} />);
    expect(screen.getByText("transform text values")).toBeInTheDocument();
  });

  it("shows the 'Operation' section label", () => {
    render(<StringOpsNode {...makeProps()} />);
    expect(screen.getByText("Operation")).toBeInTheDocument();
  });

  it("renders all five op buttons with correct labels", () => {
    render(<StringOpsNode {...makeProps()} />);
    expect(screen.getByText("UPPER")).toBeInTheDocument();
    expect(screen.getByText("lower")).toBeInTheDocument();
    expect(screen.getByText("trim")).toBeInTheDocument();
    expect(screen.getByText("split")).toBeInTheDocument();
    expect(screen.getByText("slice")).toBeInTheDocument();
  });

  it("renders exactly five op buttons for non-slice ops", () => {
    render(<StringOpsNode {...makeProps({ op: "uppercase" })} />);
    expect(screen.getAllByRole("button")).toHaveLength(5);
  });
});

// ─── 2. Handles ───────────────────────────────────────────────────────────────

describe("StringOpsNode — handles", () => {
  it("renders the input handle (target, left)", () => {
    render(<StringOpsNode {...makeProps()} />);
    const h = screen.getByTestId("handle-input");
    expect(h).toHaveAttribute("data-handle-type", "target");
    expect(h).toHaveAttribute("data-position", "left");
  });

  it("renders the output handle (source, right)", () => {
    render(<StringOpsNode {...makeProps()} />);
    const h = screen.getByTestId("handle-output");
    expect(h).toHaveAttribute("data-handle-type", "source");
    expect(h).toHaveAttribute("data-position", "right");
  });

  it("has exactly two handles in the DOM for all ops", () => {
    for (const { value } of ALL_OPS) {
      const { unmount } = render(<StringOpsNode {...makeProps({ op: value })} />);
      expect(screen.getAllByTestId(/^handle-/)).toHaveLength(2);
      unmount();
    }
  });
});

// ─── 3. Output label (split → "array", others → "string") ────────────────────

describe("StringOpsNode — output label", () => {
  it("shows 'array' output label when op is 'split'", () => {
    render(<StringOpsNode {...makeProps({ op: "split" })} />);
    expect(screen.getByText("array")).toBeInTheDocument();
  });

  it("shows 'string' output label when op is 'uppercase'", () => {
    render(<StringOpsNode {...makeProps({ op: "uppercase" })} />);
    expect(screen.getByText("string")).toBeInTheDocument();
  });

  it("shows 'string' output label when op is 'lowercase'", () => {
    render(<StringOpsNode {...makeProps({ op: "lowercase" })} />);
    expect(screen.getByText("string")).toBeInTheDocument();
  });

  it("shows 'string' output label when op is 'trim'", () => {
    render(<StringOpsNode {...makeProps({ op: "trim" })} />);
    expect(screen.getByText("string")).toBeInTheDocument();
  });

  it("shows 'string' output label when op is 'slice'", () => {
    render(<StringOpsNode {...makeProps({ op: "slice" })} />);
    expect(screen.getByText("string")).toBeInTheDocument();
  });
});

// ─── 4. Conditional sections — split vs slice vs simple ──────────────────────

describe("StringOpsNode — conditional config sections", () => {
  it("shows Separator section when op is 'split'", () => {
    render(<StringOpsNode {...makeProps({ op: "split" })} />);
    expect(screen.getByText("Separator")).toBeInTheDocument();
    expect(screen.getByPlaceholderText('e.g. "," or " "')).toBeInTheDocument();
  });

  it("hides Separator section when op is not 'split'", () => {
    for (const { value } of ALL_OPS.filter((o) => o.value !== "split")) {
      const { unmount } = render(<StringOpsNode {...makeProps({ op: value })} />);
      expect(screen.queryByText("Separator")).not.toBeInTheDocument();
      unmount();
    }
  });

  it("shows Start and End config when op is 'slice'", () => {
    render(<StringOpsNode {...makeProps({ op: "slice" })} />);
    expect(screen.getByText("Start")).toBeInTheDocument();
    expect(screen.getByText("End")).toBeInTheDocument();
  });

  it("hides Start/End config when op is not 'slice'", () => {
    for (const { value } of ALL_OPS.filter((o) => o.value !== "slice")) {
      const { unmount } = render(<StringOpsNode {...makeProps({ op: value })} />);
      expect(screen.queryByText("Start")).not.toBeInTheDocument();
      unmount();
    }
  });

  it("shows neither Separator nor Start for 'uppercase'", () => {
    render(<StringOpsNode {...makeProps({ op: "uppercase" })} />);
    expect(screen.queryByText("Separator")).not.toBeInTheDocument();
    expect(screen.queryByText("Start")).not.toBeInTheDocument();
  });

  it("shows neither Separator nor Start for 'lowercase'", () => {
    render(<StringOpsNode {...makeProps({ op: "lowercase" })} />);
    expect(screen.queryByText("Separator")).not.toBeInTheDocument();
    expect(screen.queryByText("Start")).not.toBeInTheDocument();
  });

  it("shows neither Separator nor Start for 'trim'", () => {
    render(<StringOpsNode {...makeProps({ op: "trim" })} />);
    expect(screen.queryByText("Separator")).not.toBeInTheDocument();
    expect(screen.queryByText("Start")).not.toBeInTheDocument();
  });
});

// ─── 5. Op button onChange ────────────────────────────────────────────────────

describe("StringOpsNode — op button onChange", () => {
  it("calls onChange({ op: 'uppercase' }) when UPPER is clicked", () => {
    const onChange = vi.fn();
    render(<StringOpsNode {...makeProps({ op: "lowercase", onChange })} />);
    fireEvent.click(screen.getByText("UPPER"));
    expect(onChange).toHaveBeenCalledWith({ op: "uppercase" });
  });

  it("calls onChange({ op: 'lowercase' }) when lower is clicked", () => {
    const onChange = vi.fn();
    render(<StringOpsNode {...makeProps({ onChange })} />);
    fireEvent.click(screen.getByText("lower"));
    expect(onChange).toHaveBeenCalledWith({ op: "lowercase" });
  });

  it("calls onChange({ op: 'trim' }) when trim is clicked", () => {
    const onChange = vi.fn();
    render(<StringOpsNode {...makeProps({ onChange })} />);
    fireEvent.click(screen.getByText("trim"));
    expect(onChange).toHaveBeenCalledWith({ op: "trim" });
  });

  it("calls onChange({ op: 'split' }) when split is clicked", () => {
    const onChange = vi.fn();
    render(<StringOpsNode {...makeProps({ onChange })} />);
    fireEvent.click(screen.getByText("split"));
    expect(onChange).toHaveBeenCalledWith({ op: "split" });
  });

  it("calls onChange({ op: 'slice' }) when slice is clicked", () => {
    const onChange = vi.fn();
    render(<StringOpsNode {...makeProps({ onChange })} />);
    fireEvent.click(screen.getByText("slice"));
    expect(onChange).toHaveBeenCalledWith({ op: "slice" });
  });

  it("calls onChange exactly once per op button click", () => {
    const onChange = vi.fn();
    render(<StringOpsNode {...makeProps({ onChange })} />);
    fireEvent.click(screen.getByText("lower"));
    expect(onChange).toHaveBeenCalledTimes(1);
  });

  it("clicking the active op button still calls onChange", () => {
    const onChange = vi.fn();
    render(<StringOpsNode {...makeProps({ op: "uppercase", onChange })} />);
    fireEvent.click(screen.getByText("UPPER"));
    expect(onChange).toHaveBeenCalledWith({ op: "uppercase" });
  });

  it("does not throw when op button clicked without onChange", () => {
    expect(() => {
      render(<StringOpsNode {...makeProps()} />);
      fireEvent.click(screen.getByText("lower"));
    }).not.toThrow();
  });
});

// ─── 6. Split — separator input onChange ──────────────────────────────────────

describe("StringOpsNode — split / separator onChange", () => {
  it("calls onChange({ separator: '|' }) when separator is typed", () => {
    const onChange = vi.fn();
    render(<StringOpsNode {...makeProps({ op: "split", onChange })} />);
    fireEvent.change(screen.getByRole("textbox"), { target: { value: "|" } });
    expect(onChange).toHaveBeenCalledWith({ separator: "|" });
  });

  it("calls onChange({ separator: '' }) when separator is cleared", () => {
    const onChange = vi.fn();
    render(<StringOpsNode {...makeProps({ op: "split", separator: ",", onChange })} />);
    fireEvent.change(screen.getByRole("textbox"), { target: { value: "" } });
    expect(onChange).toHaveBeenCalledWith({ separator: "" });
  });

  it("separator input reflects the current separator value", () => {
    render(<StringOpsNode {...makeProps({ op: "split", separator: ";" })} />);
    expect(screen.getByRole("textbox")).toHaveValue(";");
  });

  it("does not throw when separator changes without onChange", () => {
    expect(() => {
      render(<StringOpsNode {...makeProps({ op: "split" })} />);
      fireEvent.change(screen.getByRole("textbox"), { target: { value: "x" } });
    }).not.toThrow();
  });
});

// ─── 7. Slice — Start input onChange ──────────────────────────────────────────

describe("StringOpsNode — slice / sliceStart onChange", () => {
  it("calls onChange({ sliceStart: 3 }) when Start is set to 3", () => {
    const onChange = vi.fn();
    render(<StringOpsNode {...makeProps({ op: "slice", onChange })} />);
    const [startInput] = screen.getAllByRole("spinbutton");
    fireEvent.change(startInput, { target: { value: "3" } });
    expect(onChange).toHaveBeenCalledWith({ sliceStart: 3 });
  });

  it("calls onChange({ sliceStart: 0 }) when Start is reset to 0 from non-zero", () => {
    const onChange = vi.fn();
    render(<StringOpsNode {...makeProps({ op: "slice", sliceStart: 3, onChange })} />);
    const [startInput] = screen.getAllByRole("spinbutton");
    fireEvent.change(startInput, { target: { value: "0" } });
    expect(onChange).toHaveBeenCalledWith({ sliceStart: 0 });
  });

  it("calls onChange({ sliceStart: -2 }) for negative start (slice from end)", () => {
    const onChange = vi.fn();
    render(<StringOpsNode {...makeProps({ op: "slice", onChange })} />);
    const [startInput] = screen.getAllByRole("spinbutton");
    fireEvent.change(startInput, { target: { value: "-2" } });
    expect(onChange).toHaveBeenCalledWith({ sliceStart: -2 });
  });

  it("Start input reflects the current sliceStart value", () => {
    render(<StringOpsNode {...makeProps({ op: "slice", sliceStart: 5 })} />);
    expect(screen.getAllByRole("spinbutton")[0]).toHaveValue(5);
  });

  it("does not throw when Start changes without onChange", () => {
    expect(() => {
      render(<StringOpsNode {...makeProps({ op: "slice" })} />);
      const [startInput] = screen.getAllByRole("spinbutton");
      fireEvent.change(startInput, { target: { value: "1" } });
    }).not.toThrow();
  });
});

// ─── 8. Slice — End toggle button ────────────────────────────────────────────

describe("StringOpsNode — slice / sliceEndEnabled toggle", () => {
  it("shows 'off' toggle button when sliceEndEnabled is false", () => {
    render(<StringOpsNode {...makeProps({ op: "slice", sliceEndEnabled: false })} />);
    expect(screen.getByRole("button", { name: "off" })).toBeInTheDocument();
  });

  it("shows 'on' toggle button when sliceEndEnabled is true", () => {
    render(<StringOpsNode {...makeProps({ op: "slice", sliceEndEnabled: true })} />);
    expect(screen.getByRole("button", { name: "on" })).toBeInTheDocument();
  });

  it("calls onChange({ sliceEndEnabled: true }) when toggle is clicked from off", () => {
    const onChange = vi.fn();
    render(<StringOpsNode {...makeProps({ op: "slice", sliceEndEnabled: false, onChange })} />);
    fireEvent.click(screen.getByRole("button", { name: "off" }));
    expect(onChange).toHaveBeenCalledWith({ sliceEndEnabled: true });
  });

  it("calls onChange({ sliceEndEnabled: false }) when toggle is clicked from on", () => {
    const onChange = vi.fn();
    render(<StringOpsNode {...makeProps({ op: "slice", sliceEndEnabled: true, onChange })} />);
    fireEvent.click(screen.getByRole("button", { name: "on" }));
    expect(onChange).toHaveBeenCalledWith({ sliceEndEnabled: false });
  });

  it("does not throw when End toggle is clicked without onChange", () => {
    expect(() => {
      render(<StringOpsNode {...makeProps({ op: "slice" })} />);
      fireEvent.click(screen.getByRole("button", { name: "off" }));
    }).not.toThrow();
  });
});

// ─── 9. Slice — End input (only when sliceEndEnabled) ────────────────────────

describe("StringOpsNode — slice / sliceEnd input", () => {
  it("does NOT render End input when sliceEndEnabled is false", () => {
    render(<StringOpsNode {...makeProps({ op: "slice", sliceEndEnabled: false })} />);
    // only the Start spinbutton is present
    expect(screen.getAllByRole("spinbutton")).toHaveLength(1);
  });

  it("renders End input when sliceEndEnabled is true", () => {
    render(<StringOpsNode {...makeProps({ op: "slice", sliceEndEnabled: true })} />);
    expect(screen.getAllByRole("spinbutton")).toHaveLength(2);
  });

  it("calls onChange({ sliceEnd: 5 }) when End is set to 5", () => {
    const onChange = vi.fn();
    render(<StringOpsNode {...makeProps({ op: "slice", sliceEndEnabled: true, onChange })} />);
    const [, endInput] = screen.getAllByRole("spinbutton");
    fireEvent.change(endInput, { target: { value: "5" } });
    expect(onChange).toHaveBeenCalledWith({ sliceEnd: 5 });
  });

  it("calls onChange({ sliceEnd: -1 }) for negative end index", () => {
    const onChange = vi.fn();
    render(<StringOpsNode {...makeProps({ op: "slice", sliceEndEnabled: true, onChange })} />);
    const [, endInput] = screen.getAllByRole("spinbutton");
    fireEvent.change(endInput, { target: { value: "-1" } });
    expect(onChange).toHaveBeenCalledWith({ sliceEnd: -1 });
  });

  it("End input reflects the current sliceEnd value", () => {
    render(<StringOpsNode {...makeProps({ op: "slice", sliceEndEnabled: true, sliceEnd: 8 })} />);
    const [, endInput] = screen.getAllByRole("spinbutton");
    expect(endInput).toHaveValue(8);
  });

  it("does not throw when End input changes without onChange", () => {
    expect(() => {
      render(<StringOpsNode {...makeProps({ op: "slice", sliceEndEnabled: true })} />);
      const [, endInput] = screen.getAllByRole("spinbutton");
      fireEvent.change(endInput, { target: { value: "3" } });
    }).not.toThrow();
  });
});

// ─── 10. Fallback defaults ────────────────────────────────────────────────────

describe("StringOpsNode — fallback defaults", () => {
  it("defaults op to 'uppercase' when undefined", () => {
    const props = makeProps();
    (props.data as Record<string, unknown>).op = undefined;
    render(<StringOpsNode {...props} />);
    expect(screen.getByText("string")).toBeInTheDocument(); // uppercase → "string"
    expect(screen.queryByText("Separator")).not.toBeInTheDocument();
  });

  it("defaults separator to ',' when undefined", () => {
    const props = makeProps({ op: "split" });
    (props.data as Record<string, unknown>).separator = undefined;
    render(<StringOpsNode {...props} />);
    expect(screen.getByRole("textbox")).toHaveValue(",");
  });

  it("defaults sliceStart to 0 when undefined", () => {
    const props = makeProps({ op: "slice" });
    (props.data as Record<string, unknown>).sliceStart = undefined;
    render(<StringOpsNode {...props} />);
    expect(screen.getAllByRole("spinbutton")[0]).toHaveValue(0);
  });

  it("defaults sliceEndEnabled to false when undefined — End input hidden", () => {
    const props = makeProps({ op: "slice" });
    (props.data as Record<string, unknown>).sliceEndEnabled = undefined;
    render(<StringOpsNode {...props} />);
    expect(screen.getAllByRole("spinbutton")).toHaveLength(1);
  });
});

// ─── 11. onChange payload shape ───────────────────────────────────────────────

describe("StringOpsNode — onChange payload shape", () => {
  const ALLOWED_KEYS = new Set<string>([
    "op", "separator", "sliceStart", "sliceEnd", "sliceEndEnabled", "onChange", "connectedHandles",
  ]);

  it("op button payload contains only allowed keys", () => {
    const onChange = vi.fn();
    render(<StringOpsNode {...makeProps({ onChange })} />);
    fireEvent.click(screen.getByText("lower"));
    for (const key of Object.keys(onChange.mock.calls[0][0])) {
      expect(ALLOWED_KEYS.has(key)).toBe(true);
    }
  });

  it("separator payload contains only allowed keys", () => {
    const onChange = vi.fn();
    render(<StringOpsNode {...makeProps({ op: "split", onChange })} />);
    fireEvent.change(screen.getByRole("textbox"), { target: { value: "|" } });
    for (const key of Object.keys(onChange.mock.calls[0][0])) {
      expect(ALLOWED_KEYS.has(key)).toBe(true);
    }
  });

  it("sliceStart payload contains only allowed keys", () => {
    const onChange = vi.fn();
    render(<StringOpsNode {...makeProps({ op: "slice", onChange })} />);
    fireEvent.change(screen.getAllByRole("spinbutton")[0], { target: { value: "2" } });
    for (const key of Object.keys(onChange.mock.calls[0][0])) {
      expect(ALLOWED_KEYS.has(key)).toBe(true);
    }
  });

  it("sliceEndEnabled toggle payload contains only allowed keys", () => {
    const onChange = vi.fn();
    render(<StringOpsNode {...makeProps({ op: "slice", onChange })} />);
    fireEvent.click(screen.getByRole("button", { name: "off" }));
    for (const key of Object.keys(onChange.mock.calls[0][0])) {
      expect(ALLOWED_KEYS.has(key)).toBe(true);
    }
  });

  it("sliceEnd payload contains only allowed keys", () => {
    const onChange = vi.fn();
    render(<StringOpsNode {...makeProps({ op: "slice", sliceEndEnabled: true, onChange })} />);
    fireEvent.change(screen.getAllByRole("spinbutton")[1], { target: { value: "5" } });
    for (const key of Object.keys(onChange.mock.calls[0][0])) {
      expect(ALLOWED_KEYS.has(key)).toBe(true);
    }
  });

  it("payload values are never undefined", () => {
    const onChange = vi.fn();
    render(<StringOpsNode {...makeProps({ onChange })} />);
    fireEvent.click(screen.getByText("trim"));
    for (const val of Object.values(onChange.mock.calls[0][0])) {
      expect(val).not.toBeUndefined();
    }
  });
});

// ─── 12. Selected state ───────────────────────────────────────────────────────

describe("StringOpsNode — selected state", () => {
  it("renders without crashing when selected=true", () => {
    render(<StringOpsNode {...makeProps()} selected={true} />);
    expect(screen.getByText("String Ops")).toBeInTheDocument();
  });

  it("renders without crashing when selected=false", () => {
    render(<StringOpsNode {...makeProps()} selected={false} />);
    expect(screen.getByText("String Ops")).toBeInTheDocument();
  });
});
