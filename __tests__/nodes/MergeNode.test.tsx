import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { MergeNode } from "@/components/canvas/nodes/MergeNode";
import type { MergeNodeData } from "@/components/canvas/nodes/MergeNode";
import type { NodeProps } from "@xyflow/react";

vi.mock("@xyflow/react", () => ({
  Handle: ({ id, type, position }: { id: string; type: string; position: string }) => (
    <div data-testid={`handle-${id}`} data-handle-type={type} data-position={position} />
  ),
  Position: { Left: "left", Right: "right" },
  useViewport: () => ({ zoom: 1 }),
}));

const DEFAULT_DATA: MergeNodeData = {
  mode: "first",
  inputCount: 2,
  separator: "",
  slotKeys: ["field0", "field1"],
};

function makeProps(overrides: Partial<MergeNodeData> = {}): NodeProps {
  const data: MergeNodeData = { ...DEFAULT_DATA, ...overrides };
  return { id: "node-1", data: data as unknown as Record<string, unknown>, selected: false } as NodeProps;
}

const getRemoveBtn = () => screen.getByRole("button", { name: "remove input" });
const getAddBtn    = () => screen.getByRole("button", { name: "add input"    });

// ─── 1. Rendering ─────────────────────────────────────────────────────────────

describe("MergeNode — rendering", () => {
  it("renders without crashing with defaultData", () => {
    render(<MergeNode {...makeProps()} />);
    expect(screen.getByText("Merge")).toBeInTheDocument();
  });

  it("shows 'Mode' section label", () => {
    render(<MergeNode {...makeProps()} />);
    expect(screen.getByText("Mode")).toBeInTheDocument();
  });

  it("shows 'Inputs' section label", () => {
    render(<MergeNode {...makeProps()} />);
    expect(screen.getByText("Inputs")).toBeInTheDocument();
  });

  it("shows 'output' label", () => {
    render(<MergeNode {...makeProps()} />);
    expect(screen.getByText("output")).toBeInTheDocument();
  });

  it("renders all three mode buttons", () => {
    render(<MergeNode {...makeProps()} />);
    expect(screen.getByRole("button", { name: /First/i  })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Join/i   })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Object/i })).toBeInTheDocument();
  });
});

// ─── 2. Header subtitle ───────────────────────────────────────────────────────

describe("MergeNode — header subtitle", () => {
  it("shows 'first active' for mode=first", () => {
    render(<MergeNode {...makeProps({ mode: "first" })} />);
    expect(screen.getByText("first active")).toBeInTheDocument();
  });

  it("shows 'join 2' for mode=join, inputCount=2", () => {
    render(<MergeNode {...makeProps({ mode: "join", inputCount: 2 })} />);
    expect(screen.getByText("join 2")).toBeInTheDocument();
  });

  it("shows 'join 5' for mode=join, inputCount=5", () => {
    render(<MergeNode {...makeProps({ mode: "join", inputCount: 5, slotKeys: ["f0","f1","f2","f3","f4"] })} />);
    expect(screen.getByText("join 5")).toBeInTheDocument();
  });

  it("shows 'object (2)' for mode=object, inputCount=2", () => {
    render(<MergeNode {...makeProps({ mode: "object" })} />);
    expect(screen.getByText("object (2)")).toBeInTheDocument();
  });

  it("shows 'object (4)' for mode=object, inputCount=4", () => {
    render(<MergeNode {...makeProps({ mode: "object", inputCount: 4, slotKeys: ["a","b","c","d"] })} />);
    expect(screen.getByText("object (4)")).toBeInTheDocument();
  });
});

// ─── 3. Handles ───────────────────────────────────────────────────────────────

describe("MergeNode — handles (inputCount=2, default)", () => {
  it("renders handle-input-0 as target on left", () => {
    render(<MergeNode {...makeProps()} />);
    const h = screen.getByTestId("handle-input-0");
    expect(h).toHaveAttribute("data-handle-type", "target");
    expect(h).toHaveAttribute("data-position", "left");
  });

  it("renders handle-input-1 as target on left", () => {
    render(<MergeNode {...makeProps()} />);
    const h = screen.getByTestId("handle-input-1");
    expect(h).toHaveAttribute("data-handle-type", "target");
    expect(h).toHaveAttribute("data-position", "left");
  });

  it("renders handle-output as source on right", () => {
    render(<MergeNode {...makeProps()} />);
    const h = screen.getByTestId("handle-output");
    expect(h).toHaveAttribute("data-handle-type", "source");
    expect(h).toHaveAttribute("data-position", "right");
  });

  it("has exactly 3 handles for inputCount=2", () => {
    render(<MergeNode {...makeProps()} />);
    expect(screen.getAllByTestId(/^handle-/)).toHaveLength(3);
  });

  it("does not render handle-input-2 when inputCount=2", () => {
    render(<MergeNode {...makeProps()} />);
    expect(screen.queryByTestId("handle-input-2")).not.toBeInTheDocument();
  });
});

describe("MergeNode — handles (inputCount=5)", () => {
  it("renders handles input-0 through input-4", () => {
    render(<MergeNode {...makeProps({ inputCount: 5, slotKeys: ["a","b","c","d","e"] })} />);
    for (let i = 0; i < 5; i++) expect(screen.getByTestId(`handle-input-${i}`)).toBeInTheDocument();
  });

  it("has exactly 6 handles (5 inputs + output)", () => {
    render(<MergeNode {...makeProps({ inputCount: 5, slotKeys: ["a","b","c","d","e"] })} />);
    expect(screen.getAllByTestId(/^handle-/)).toHaveLength(6);
  });
});

describe("MergeNode — handles (inputCount=8, MAX)", () => {
  it("renders all 8 input handles", () => {
    const keys = Array.from({ length: 8 }, (_, i) => `f${i}`);
    render(<MergeNode {...makeProps({ inputCount: 8, slotKeys: keys })} />);
    for (let i = 0; i < 8; i++) expect(screen.getByTestId(`handle-input-${i}`)).toBeInTheDocument();
  });

  it("has exactly 9 handles (8 inputs + output)", () => {
    const keys = Array.from({ length: 8 }, (_, i) => `f${i}`);
    render(<MergeNode {...makeProps({ inputCount: 8, slotKeys: keys })} />);
    expect(screen.getAllByTestId(/^handle-/)).toHaveLength(9);
  });
});

// ─── 4. inputCount clamping ───────────────────────────────────────────────────

describe("MergeNode — inputCount clamping", () => {
  it("clamps inputCount=1 up to MIN_INPUTS (2)", () => {
    render(<MergeNode {...makeProps({ inputCount: 1 })} />);
    expect(screen.getByTestId("handle-input-0")).toBeInTheDocument();
    expect(screen.getByTestId("handle-input-1")).toBeInTheDocument();
    expect(screen.queryByTestId("handle-input-2")).not.toBeInTheDocument();
  });

  it("clamps inputCount=0 up to 2", () => {
    render(<MergeNode {...makeProps({ inputCount: 0 })} />);
    expect(screen.getAllByTestId(/^handle-input-/)).toHaveLength(2);
  });

  it("does not crash when inputCount is undefined (defaults to 2)", () => {
    const props = makeProps();
    (props.data as Record<string, unknown>).inputCount = undefined;
    render(<MergeNode {...props} />);
    expect(screen.getAllByTestId(/^handle-input-/)).toHaveLength(2);
  });
});

// ─── 5. Mode toggle onChange ──────────────────────────────────────────────────

describe("MergeNode — mode toggle onChange", () => {
  it("clicking Join calls onChange({ mode: 'join' })", () => {
    const onChange = vi.fn();
    render(<MergeNode {...makeProps({ mode: "first", onChange })} />);
    fireEvent.click(screen.getByRole("button", { name: /Join/i }));
    expect(onChange).toHaveBeenCalledWith({ mode: "join" });
  });

  it("clicking Object calls onChange({ mode: 'object' })", () => {
    const onChange = vi.fn();
    render(<MergeNode {...makeProps({ mode: "first", onChange })} />);
    fireEvent.click(screen.getByRole("button", { name: /Object/i }));
    expect(onChange).toHaveBeenCalledWith({ mode: "object" });
  });

  it("clicking First calls onChange({ mode: 'first' })", () => {
    const onChange = vi.fn();
    render(<MergeNode {...makeProps({ mode: "join", onChange })} />);
    fireEvent.click(screen.getByRole("button", { name: /First/i }));
    expect(onChange).toHaveBeenCalledWith({ mode: "first" });
  });

  it("mode payload contains only the mode key", () => {
    const onChange = vi.fn();
    render(<MergeNode {...makeProps({ onChange })} />);
    fireEvent.click(screen.getByRole("button", { name: /Join/i }));
    expect(Object.keys(onChange.mock.calls[0][0])).toEqual(["mode"]);
  });

  it("does not crash when mode changes and onChange is not provided", () => {
    render(<MergeNode {...makeProps()} />);
    expect(() => fireEvent.click(screen.getByRole("button", { name: /Join/i }))).not.toThrow();
  });
});

// ─── 6. Separator field (join mode only) ─────────────────────────────────────

describe("MergeNode — separator field", () => {
  it("shows 'Separator' label in join mode", () => {
    render(<MergeNode {...makeProps({ mode: "join" })} />);
    expect(screen.getByText("Separator")).toBeInTheDocument();
  });

  it("does NOT show 'Separator' label in first mode", () => {
    render(<MergeNode {...makeProps({ mode: "first" })} />);
    expect(screen.queryByText("Separator")).not.toBeInTheDocument();
  });

  it("does NOT show 'Separator' label in object mode", () => {
    render(<MergeNode {...makeProps({ mode: "object" })} />);
    expect(screen.queryByText("Separator")).not.toBeInTheDocument();
  });

  it("separator input shows current value in join mode", () => {
    render(<MergeNode {...makeProps({ mode: "join", separator: " | " })} />);
    expect(screen.getByRole("textbox")).toHaveValue(" | ");
  });

  it("separator onChange calls onChange({ separator: newVal })", () => {
    const onChange = vi.fn();
    render(<MergeNode {...makeProps({ mode: "join", onChange })} />);
    fireEvent.change(screen.getByRole("textbox"), { target: { value: ", " } });
    expect(onChange).toHaveBeenCalledWith({ separator: ", " });
  });

  it("separator cleared calls onChange({ separator: '' })", () => {
    const onChange = vi.fn();
    render(<MergeNode {...makeProps({ mode: "join", separator: " | ", onChange })} />);
    fireEvent.change(screen.getByRole("textbox"), { target: { value: "" } });
    expect(onChange).toHaveBeenCalledWith({ separator: "" });
  });
});

// ─── 7. Object mode — per-slot key fields ────────────────────────────────────

describe("MergeNode — object mode key fields", () => {
  it("shows key input for each slot in object mode", () => {
    render(<MergeNode {...makeProps({ mode: "object", slotKeys: ["name", "age"] })} />);
    const inputs = screen.getAllByRole("textbox");
    expect(inputs).toHaveLength(2);
  });

  it("key input for slot 0 shows the correct value", () => {
    render(<MergeNode {...makeProps({ mode: "object", slotKeys: ["alpha", "beta"] })} />);
    expect(screen.getByDisplayValue("alpha")).toBeInTheDocument();
  });

  it("key input for slot 1 shows the correct value", () => {
    render(<MergeNode {...makeProps({ mode: "object", slotKeys: ["alpha", "beta"] })} />);
    expect(screen.getByDisplayValue("beta")).toBeInTheDocument();
  });

  it("changing slot 0 key calls onChange({ slotKeys: [newKey, ...rest] })", () => {
    const onChange = vi.fn();
    render(<MergeNode {...makeProps({ mode: "object", slotKeys: ["alpha", "beta"], onChange })} />);
    const inputs = screen.getAllByRole("textbox");
    fireEvent.change(inputs[0], { target: { value: "gamma" } });
    expect(onChange).toHaveBeenCalledWith({ slotKeys: ["gamma", "beta"] });
  });

  it("changing slot 1 key calls onChange({ slotKeys: [slot0, newKey] })", () => {
    const onChange = vi.fn();
    render(<MergeNode {...makeProps({ mode: "object", slotKeys: ["alpha", "beta"], onChange })} />);
    const inputs = screen.getAllByRole("textbox");
    fireEvent.change(inputs[1], { target: { value: "delta" } });
    expect(onChange).toHaveBeenCalledWith({ slotKeys: ["alpha", "delta"] });
  });

  it("slotKeys payload never mutates the original array", () => {
    const onChange = vi.fn();
    const original = ["x", "y"];
    render(<MergeNode {...makeProps({ mode: "object", slotKeys: original, onChange })} />);
    const inputs = screen.getAllByRole("textbox");
    fireEvent.change(inputs[0], { target: { value: "z" } });
    expect(original[0]).toBe("x"); // original unchanged
    expect(onChange.mock.calls[0][0].slotKeys[0]).toBe("z");
  });

  it("does NOT show key inputs in first mode", () => {
    render(<MergeNode {...makeProps({ mode: "first" })} />);
    expect(screen.queryAllByRole("textbox")).toHaveLength(0);
  });

  it("does NOT show key inputs in join mode", () => {
    // join mode shows the separator textbox but no key inputs
    render(<MergeNode {...makeProps({ mode: "join" })} />);
    // only the separator input
    expect(screen.getAllByRole("textbox")).toHaveLength(1);
  });
});

// ─── 8. Add / Remove inputs ───────────────────────────────────────────────────

describe("MergeNode — add input button", () => {
  it("add button is enabled at inputCount=2 (MIN)", () => {
    render(<MergeNode {...makeProps()} />);
    expect(getAddBtn()).not.toBeDisabled();
  });

  it("add button is disabled at inputCount=8 (MAX)", () => {
    const keys = Array.from({ length: 8 }, (_, i) => `f${i}`);
    render(<MergeNode {...makeProps({ inputCount: 8, slotKeys: keys })} />);
    expect(getAddBtn()).toBeDisabled();
  });

  it("clicking add at inputCount=2 calls onChange({ inputCount: 3, slotKeys: [..., 'field2'] })", () => {
    const onChange = vi.fn();
    render(<MergeNode {...makeProps({ onChange })} />);
    fireEvent.click(getAddBtn());
    expect(onChange).toHaveBeenCalledWith({ inputCount: 3, slotKeys: ["field0", "field1", "field2"] });
  });

  it("clicking add at inputCount=7 produces inputCount=8 (MAX boundary)", () => {
    const onChange = vi.fn();
    const keys = Array.from({ length: 7 }, (_, i) => `f${i}`);
    render(<MergeNode {...makeProps({ inputCount: 7, slotKeys: keys, onChange })} />);
    fireEvent.click(getAddBtn());
    expect(onChange.mock.calls[0][0].inputCount).toBe(8);
  });

  it("does not call onChange when add is clicked at MAX", () => {
    const onChange = vi.fn();
    const keys = Array.from({ length: 8 }, (_, i) => `f${i}`);
    render(<MergeNode {...makeProps({ inputCount: 8, slotKeys: keys, onChange })} />);
    fireEvent.click(getAddBtn());
    expect(onChange).not.toHaveBeenCalled();
  });

  it("does not crash when add is clicked and onChange is not provided", () => {
    render(<MergeNode {...makeProps()} />);
    expect(() => fireEvent.click(getAddBtn())).not.toThrow();
  });
});

describe("MergeNode — remove input button", () => {
  it("remove button is disabled at inputCount=2 (MIN)", () => {
    render(<MergeNode {...makeProps()} />);
    expect(getRemoveBtn()).toBeDisabled();
  });

  it("remove button is enabled at inputCount=3", () => {
    render(<MergeNode {...makeProps({ inputCount: 3, slotKeys: ["a","b","c"] })} />);
    expect(getRemoveBtn()).not.toBeDisabled();
  });

  it("clicking remove at inputCount=3 calls onChange({ inputCount: 2, slotKeys: [first two keys] })", () => {
    const onChange = vi.fn();
    render(<MergeNode {...makeProps({ inputCount: 3, slotKeys: ["x","y","z"], onChange })} />);
    fireEvent.click(getRemoveBtn());
    expect(onChange).toHaveBeenCalledWith({ inputCount: 2, slotKeys: ["x", "y"] });
  });

  it("slotKeys after remove drops the last entry", () => {
    const onChange = vi.fn();
    render(<MergeNode {...makeProps({ inputCount: 4, slotKeys: ["a","b","c","d"], onChange })} />);
    fireEvent.click(getRemoveBtn());
    expect(onChange.mock.calls[0][0].slotKeys).toEqual(["a","b","c"]);
  });

  it("does not call onChange when remove is clicked at MIN", () => {
    const onChange = vi.fn();
    render(<MergeNode {...makeProps({ onChange })} />);
    fireEvent.click(getRemoveBtn());
    expect(onChange).not.toHaveBeenCalled();
  });

  it("does not crash when remove is clicked and onChange is not provided", () => {
    render(<MergeNode {...makeProps({ inputCount: 3, slotKeys: ["a","b","c"] })} />);
    expect(() => fireEvent.click(getRemoveBtn())).not.toThrow();
  });
});

// ─── 9. connectedHandles coloring ─────────────────────────────────────────────

describe("MergeNode — connectedHandles", () => {
  it("does not crash with connectedHandles=['input-0']", () => {
    render(<MergeNode {...makeProps({ connectedHandles: ["input-0"] })} />);
    expect(screen.getByText("Merge")).toBeInTheDocument();
  });

  it("does not crash when connectedHandles is undefined", () => {
    const props = makeProps();
    (props.data as Record<string, unknown>).connectedHandles = undefined;
    expect(() => render(<MergeNode {...props} />)).not.toThrow();
  });

  it("renders input row labels for all inputs regardless of connected state", () => {
    render(<MergeNode {...makeProps({ connectedHandles: ["input-0"] })} />);
    expect(screen.getByText("1")).toBeInTheDocument();
    expect(screen.getByText("2")).toBeInTheDocument();
  });
});

// ─── 10. Input row labels ─────────────────────────────────────────────────────

describe("MergeNode — input row labels", () => {
  it("shows '1' and '2' for inputCount=2", () => {
    render(<MergeNode {...makeProps()} />);
    expect(screen.getByText("1")).toBeInTheDocument();
    expect(screen.getByText("2")).toBeInTheDocument();
  });

  it("shows '1' through '5' for inputCount=5", () => {
    render(<MergeNode {...makeProps({ inputCount: 5, slotKeys: ["a","b","c","d","e"] })} />);
    for (let i = 1; i <= 5; i++) expect(screen.getByText(String(i))).toBeInTheDocument();
  });

  it("shows 'any' type hint in first mode", () => {
    render(<MergeNode {...makeProps({ mode: "first" })} />);
    expect(screen.getAllByText("any")).toHaveLength(2);
  });

  it("shows 'string' type hint in join mode", () => {
    render(<MergeNode {...makeProps({ mode: "join" })} />);
    expect(screen.getAllByText("string")).toHaveLength(2);
  });

  it("does NOT show type hint in object mode (key fields appear instead)", () => {
    render(<MergeNode {...makeProps({ mode: "object" })} />);
    expect(screen.queryByText("any")).not.toBeInTheDocument();
    expect(screen.queryByText("string")).not.toBeInTheDocument();
  });
});

// ─── 11. Fallback defaults ────────────────────────────────────────────────────

describe("MergeNode — fallback defaults", () => {
  it("defaults mode to 'first' when undefined", () => {
    const props = makeProps();
    (props.data as Record<string, unknown>).mode = undefined;
    render(<MergeNode {...props} />);
    expect(screen.getByText("first active")).toBeInTheDocument();
  });

  it("defaults separator to '' when undefined (join mode)", () => {
    const props = makeProps({ mode: "join" });
    (props.data as Record<string, unknown>).separator = undefined;
    render(<MergeNode {...props} />);
    expect(screen.getByRole("textbox")).toHaveValue("");
  });

  it("defaults slotKeys when undefined in object mode", () => {
    const props = makeProps({ mode: "object" });
    (props.data as Record<string, unknown>).slotKeys = undefined;
    render(<MergeNode {...props} />);
    expect(screen.getAllByRole("textbox")).toHaveLength(2);
  });
});

// ─── 12. Selected state ───────────────────────────────────────────────────────

describe("MergeNode — selected state", () => {
  it("renders without crashing when selected=true", () => {
    render(<MergeNode {...makeProps()} selected={true} />);
    expect(screen.getByText("Merge")).toBeInTheDocument();
  });

  it("renders without crashing when selected=false", () => {
    render(<MergeNode {...makeProps()} selected={false} />);
    expect(screen.getByText("Merge")).toBeInTheDocument();
  });
});

// ─── 13. onChange payload shape ───────────────────────────────────────────────

describe("MergeNode — onChange payload shape", () => {
  const ALLOWED = new Set<string>(["mode", "inputCount", "separator", "slotKeys", "onChange", "connectedHandles"]);

  it("mode payload keys are within allowed set", () => {
    const onChange = vi.fn();
    render(<MergeNode {...makeProps({ onChange })} />);
    fireEvent.click(screen.getByRole("button", { name: /Join/i }));
    for (const key of Object.keys(onChange.mock.calls[0][0])) expect(ALLOWED.has(key)).toBe(true);
  });

  it("add-input payload keys are within allowed set", () => {
    const onChange = vi.fn();
    render(<MergeNode {...makeProps({ onChange })} />);
    fireEvent.click(getAddBtn());
    for (const key of Object.keys(onChange.mock.calls[0][0])) expect(ALLOWED.has(key)).toBe(true);
  });

  it("remove-input payload keys are within allowed set", () => {
    const onChange = vi.fn();
    render(<MergeNode {...makeProps({ inputCount: 3, slotKeys: ["a","b","c"], onChange })} />);
    fireEvent.click(getRemoveBtn());
    for (const key of Object.keys(onChange.mock.calls[0][0])) expect(ALLOWED.has(key)).toBe(true);
  });

  it("separator payload keys are within allowed set", () => {
    const onChange = vi.fn();
    render(<MergeNode {...makeProps({ mode: "join", onChange })} />);
    fireEvent.change(screen.getByRole("textbox"), { target: { value: "-" } });
    for (const key of Object.keys(onChange.mock.calls[0][0])) expect(ALLOWED.has(key)).toBe(true);
  });
});
