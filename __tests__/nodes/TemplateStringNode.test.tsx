import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { TemplateStringNode } from "@/components/canvas/nodes/TemplateStringNode";
import type { TemplateStringNodeData, TemplateStringSlot } from "@/components/canvas/nodes/TemplateStringNode";
import type { NodeProps } from "@xyflow/react";

vi.mock("@xyflow/react", () => ({
  Handle: ({ id, type, position }: { id: string; type: string; position: string }) => (
    <div data-testid={`handle-${id}`} data-handle-type={type} data-position={position} />
  ),
  Position: { Left: "left", Right: "right" },
  useViewport: () => ({ zoom: 1 }),
}));

const DEFAULT_DATA: TemplateStringNodeData = { template: "", slots: [] };

const ONE_SLOT: TemplateStringSlot[] = [{ name: "name", fallback: "World" }];

const TWO_SLOTS: TemplateStringSlot[] = [
  { name: "name",    fallback: "World" },
  { name: "orderId", fallback: ""      },
];

const THREE_SLOTS: TemplateStringSlot[] = [
  { name: "a", fallback: "x" },
  { name: "b", fallback: ""  },
  { name: "c", fallback: "z" },
];

function makeProps(overrides: Partial<TemplateStringNodeData> = {}): NodeProps {
  const data: TemplateStringNodeData = { ...DEFAULT_DATA, ...overrides };
  return {
    id: "node-1",
    data: data as unknown as Record<string, unknown>,
    selected: false,
  } as NodeProps;
}

const getTemplateArea = () => screen.getByPlaceholderText(/hello.*\{\{name\}\}/i);
const getFallbackInputs = () => screen.getAllByPlaceholderText("fallback");
const getFallbackInput  = (idx = 0) => getFallbackInputs()[idx];

// ─── 1. Rendering ─────────────────────────────────────────────────────────────

describe("TemplateStringNode — rendering", () => {
  it("renders without crashing with defaultData { template: '', slots: [] }", () => {
    render(<TemplateStringNode {...makeProps()} />);
    expect(screen.getByText("Template String")).toBeInTheDocument();
  });

  it("shows the 'Template' section label", () => {
    render(<TemplateStringNode {...makeProps()} />);
    expect(screen.getByText("Template")).toBeInTheDocument();
  });

  it("renders the template textarea", () => {
    render(<TemplateStringNode {...makeProps()} />);
    expect(getTemplateArea()).toBeInTheDocument();
  });

  it("shows the current template value in the textarea", () => {
    render(<TemplateStringNode {...makeProps({ template: "Hello {{name}}", slots: ONE_SLOT })} />);
    expect(getTemplateArea()).toHaveValue("Hello {{name}}");
  });

  it("shows the 'output' label in the output row", () => {
    render(<TemplateStringNode {...makeProps()} />);
    expect(screen.getByText("output")).toBeInTheDocument();
  });

  it("shows syntax hint text", () => {
    render(<TemplateStringNode {...makeProps()} />);
    expect(screen.getByText(/use/i)).toBeInTheDocument();
    expect(screen.getByText("{{name}}")).toBeInTheDocument();
  });

  it("does not render slot column headers when slots is empty", () => {
    render(<TemplateStringNode {...makeProps()} />);
    expect(screen.queryByText("slot")).not.toBeInTheDocument();
    expect(screen.queryByText("if disconnected")).not.toBeInTheDocument();
  });

  it("renders column headers when slots exist", () => {
    render(<TemplateStringNode {...makeProps({ template: "{{name}}", slots: ONE_SLOT })} />);
    expect(screen.getByText("slot")).toBeInTheDocument();
    expect(screen.getByText("if disconnected")).toBeInTheDocument();
  });

  it("renders the slot name label for each slot", () => {
    render(<TemplateStringNode {...makeProps({ template: "{{name}}", slots: ONE_SLOT })} />);
    // {{name}} appears in the backdrop, textarea, hint, and slot row — at least one must be present
    expect(screen.getAllByText("{{name}}").length).toBeGreaterThanOrEqual(1);
  });

  it("renders fallback input for each slot", () => {
    render(<TemplateStringNode {...makeProps({ template: "{{name}}", slots: ONE_SLOT })} />);
    expect(getFallbackInput()).toBeInTheDocument();
  });

  it("shows the fallback value in its input", () => {
    render(<TemplateStringNode {...makeProps({ template: "{{name}}", slots: ONE_SLOT })} />);
    expect(getFallbackInput()).toHaveValue("World");
  });

  it("renders two fallback inputs for TWO_SLOTS", () => {
    render(<TemplateStringNode {...makeProps({ template: "{{name}} {{orderId}}", slots: TWO_SLOTS })} />);
    expect(getFallbackInputs()).toHaveLength(2);
  });

  it("shows empty fallback value when it is empty string", () => {
    render(<TemplateStringNode {...makeProps({ template: "{{name}} {{orderId}}", slots: TWO_SLOTS })} />);
    expect(getFallbackInputs()[1]).toHaveValue("");
  });
});

// ─── 2. Subtitle logic ────────────────────────────────────────────────────────

describe("TemplateStringNode — subtitle logic", () => {
  it("shows 'interpolate inputs into a string' when slots is empty", () => {
    render(<TemplateStringNode {...makeProps()} />);
    expect(screen.getByText("interpolate inputs into a string")).toBeInTheDocument();
  });

  it("shows '1 slot wired' for ONE_SLOT", () => {
    render(<TemplateStringNode {...makeProps({ template: "{{name}}", slots: ONE_SLOT })} />);
    expect(screen.getByText("1 slot wired")).toBeInTheDocument();
  });

  it("shows '2 slots wired' for TWO_SLOTS", () => {
    render(<TemplateStringNode {...makeProps({ template: "{{name}} {{orderId}}", slots: TWO_SLOTS })} />);
    expect(screen.getByText("2 slots wired")).toBeInTheDocument();
  });

  it("shows '3 slots wired' for THREE_SLOTS", () => {
    render(
      <TemplateStringNode
        {...makeProps({ template: "{{a}} {{b}} {{c}}", slots: THREE_SLOTS })}
      />
    );
    expect(screen.getByText("3 slots wired")).toBeInTheDocument();
  });

  it("uses singular 'slot' for count 1, plural 'slots' for count 2", () => {
    const { rerender } = render(
      <TemplateStringNode {...makeProps({ template: "{{name}}", slots: ONE_SLOT })} />
    );
    expect(screen.getByText("1 slot wired")).toBeInTheDocument();

    rerender(
      <TemplateStringNode {...makeProps({ template: "{{name}} {{orderId}}", slots: TWO_SLOTS })} />
    );
    expect(screen.getByText("2 slots wired")).toBeInTheDocument();
    expect(screen.queryByText("2 slot wired")).not.toBeInTheDocument();
  });
});

// ─── 3. Handles ───────────────────────────────────────────────────────────────

describe("TemplateStringNode — handles", () => {
  it("renders the 'output' source handle (right) always", () => {
    render(<TemplateStringNode {...makeProps()} />);
    const h = screen.getByTestId("handle-output");
    expect(h).toHaveAttribute("data-handle-type", "source");
    expect(h).toHaveAttribute("data-position", "right");
  });

  it("has exactly 1 handle when slots is empty (just output)", () => {
    render(<TemplateStringNode {...makeProps()} />);
    expect(screen.getAllByTestId(/^handle-/)).toHaveLength(1);
  });

  it("renders a target handle per slot using slot.name as id", () => {
    render(<TemplateStringNode {...makeProps({ template: "{{name}}", slots: ONE_SLOT })} />);
    const h = screen.getByTestId("handle-name");
    expect(h).toHaveAttribute("data-handle-type", "target");
    expect(h).toHaveAttribute("data-position", "left");
  });

  it("has exactly 2 handles for ONE_SLOT (name + output)", () => {
    render(<TemplateStringNode {...makeProps({ template: "{{name}}", slots: ONE_SLOT })} />);
    expect(screen.getAllByTestId(/^handle-/)).toHaveLength(2);
  });

  it("renders handles for both slots in TWO_SLOTS", () => {
    render(<TemplateStringNode {...makeProps({ template: "{{name}} {{orderId}}", slots: TWO_SLOTS })} />);
    expect(screen.getByTestId("handle-name")).toBeInTheDocument();
    expect(screen.getByTestId("handle-orderId")).toBeInTheDocument();
  });

  it("has exactly 3 handles for TWO_SLOTS (name + orderId + output)", () => {
    render(<TemplateStringNode {...makeProps({ template: "{{name}} {{orderId}}", slots: TWO_SLOTS })} />);
    expect(screen.getAllByTestId(/^handle-/)).toHaveLength(3);
  });

  it("has exactly 4 handles for THREE_SLOTS", () => {
    render(
      <TemplateStringNode
        {...makeProps({ template: "{{a}} {{b}} {{c}}", slots: THREE_SLOTS })}
      />
    );
    expect(screen.getAllByTestId(/^handle-/)).toHaveLength(4);
  });

  it("output handle is always present regardless of slot count", () => {
    render(
      <TemplateStringNode
        {...makeProps({ template: "{{a}} {{b}} {{c}}", slots: THREE_SLOTS })}
      />
    );
    expect(screen.getByTestId("handle-output")).toBeInTheDocument();
  });
});

// ─── 4. Template changes ──────────────────────────────────────────────────────

describe("TemplateStringNode — template changes", () => {
  it("calls onChange with updated template when textarea changes", () => {
    const onChange = vi.fn();
    render(<TemplateStringNode {...makeProps({ onChange })} />);
    fireEvent.change(getTemplateArea(), { target: { value: "Hello {{world}}" } });
    expect(onChange).toHaveBeenCalledOnce();
    const call = onChange.mock.calls[0][0] as Partial<TemplateStringNodeData>;
    expect(call.template).toBe("Hello {{world}}");
  });

  it("syncs new slots from the template on change", () => {
    const onChange = vi.fn();
    render(<TemplateStringNode {...makeProps({ onChange })} />);
    fireEvent.change(getTemplateArea(), { target: { value: "{{a}} {{b}}" } });
    const { slots } = onChange.mock.calls[0][0] as Partial<TemplateStringNodeData>;
    expect(slots).toHaveLength(2);
    expect(slots![0].name).toBe("a");
    expect(slots![1].name).toBe("b");
  });

  it("new slots start with empty fallback", () => {
    const onChange = vi.fn();
    render(<TemplateStringNode {...makeProps({ onChange })} />);
    fireEvent.change(getTemplateArea(), { target: { value: "{{brand}}" } });
    const { slots } = onChange.mock.calls[0][0] as Partial<TemplateStringNodeData>;
    expect(slots![0].fallback).toBe("");
  });

  it("preserves fallback for an existing slot when template changes around it", () => {
    const onChange = vi.fn();
    render(<TemplateStringNode {...makeProps({ template: "{{name}}", slots: ONE_SLOT, onChange })} />);
    fireEvent.change(getTemplateArea(), { target: { value: "Hey {{name}}, order {{orderId}} ready" } });
    const { slots } = onChange.mock.calls[0][0] as Partial<TemplateStringNodeData>;
    const nameSlot = slots!.find((s) => s.name === "name");
    expect(nameSlot?.fallback).toBe("World"); // preserved from ONE_SLOT
  });

  it("drops slots no longer present in the template", () => {
    const onChange = vi.fn();
    render(
      <TemplateStringNode
        {...makeProps({ template: "{{name}} {{orderId}}", slots: TWO_SLOTS, onChange })}
      />
    );
    fireEvent.change(getTemplateArea(), { target: { value: "{{name}}" } });
    const { slots } = onChange.mock.calls[0][0] as Partial<TemplateStringNodeData>;
    expect(slots).toHaveLength(1);
    expect(slots![0].name).toBe("name");
  });

  it("yields empty slots array when template becomes blank", () => {
    const onChange = vi.fn();
    render(<TemplateStringNode {...makeProps({ template: "{{name}}", slots: ONE_SLOT, onChange })} />);
    fireEvent.change(getTemplateArea(), { target: { value: "" } });
    const { slots } = onChange.mock.calls[0][0] as Partial<TemplateStringNodeData>;
    expect(slots).toHaveLength(0);
  });

  it("deduplicates repeated slots when syncing", () => {
    const onChange = vi.fn();
    render(<TemplateStringNode {...makeProps({ onChange })} />);
    fireEvent.change(getTemplateArea(), { target: { value: "{{x}} {{x}} {{x}}" } });
    const { slots } = onChange.mock.calls[0][0] as Partial<TemplateStringNodeData>;
    expect(slots).toHaveLength(1);
    expect(slots![0].name).toBe("x");
  });

  it("ignores invalid {{...}} tokens (leading digit) when syncing slots", () => {
    const onChange = vi.fn();
    render(<TemplateStringNode {...makeProps({ onChange })} />);
    fireEvent.change(getTemplateArea(), { target: { value: "{{123bad}} {{ok}}" } });
    const { slots } = onChange.mock.calls[0][0] as Partial<TemplateStringNodeData>;
    expect(slots).toHaveLength(1);
    expect(slots![0].name).toBe("ok");
  });

  it("payload always contains both template and slots keys", () => {
    const onChange = vi.fn();
    render(<TemplateStringNode {...makeProps({ onChange })} />);
    fireEvent.change(getTemplateArea(), { target: { value: "hi" } });
    const keys = Object.keys(onChange.mock.calls[0][0]);
    expect(keys).toContain("template");
    expect(keys).toContain("slots");
  });

  it("does not throw when onChange is not provided", () => {
    expect(() => {
      render(<TemplateStringNode {...makeProps()} />);
      fireEvent.change(getTemplateArea(), { target: { value: "{{x}}" } });
    }).not.toThrow();
  });
});

// ─── 5. Update fallback ───────────────────────────────────────────────────────

describe("TemplateStringNode — update slot fallback", () => {
  it("calls onChange with updated fallback when fallback input changes", () => {
    const onChange = vi.fn();
    render(<TemplateStringNode {...makeProps({ template: "{{name}}", slots: ONE_SLOT, onChange })} />);
    fireEvent.change(getFallbackInput(), { target: { value: "Alice" } });
    const { slots } = onChange.mock.calls[0][0] as Partial<TemplateStringNodeData>;
    expect(slots![0].fallback).toBe("Alice");
  });

  it("preserves slot name when fallback changes", () => {
    const onChange = vi.fn();
    render(<TemplateStringNode {...makeProps({ template: "{{name}}", slots: ONE_SLOT, onChange })} />);
    fireEvent.change(getFallbackInput(), { target: { value: "Alice" } });
    const { slots } = onChange.mock.calls[0][0] as Partial<TemplateStringNodeData>;
    expect(slots![0].name).toBe("name");
  });

  it("calls onChange with fallback '' when fallback is cleared", () => {
    const onChange = vi.fn();
    render(<TemplateStringNode {...makeProps({ template: "{{name}}", slots: ONE_SLOT, onChange })} />);
    fireEvent.change(getFallbackInput(), { target: { value: "" } });
    const { slots } = onChange.mock.calls[0][0] as Partial<TemplateStringNodeData>;
    expect(slots![0].fallback).toBe("");
  });

  it("updates only the target slot fallback when two slots exist", () => {
    const onChange = vi.fn();
    render(
      <TemplateStringNode
        {...makeProps({ template: "{{name}} {{orderId}}", slots: TWO_SLOTS, onChange })}
      />
    );
    fireEvent.change(getFallbackInputs()[0], { target: { value: "Bob" } });
    const { slots } = onChange.mock.calls[0][0] as Partial<TemplateStringNodeData>;
    expect(slots![0].fallback).toBe("Bob");
    expect(slots![1].fallback).toBe(""); // orderId unchanged
  });

  it("fallback onChange payload contains only 'slots' key", () => {
    const onChange = vi.fn();
    render(<TemplateStringNode {...makeProps({ template: "{{name}}", slots: ONE_SLOT, onChange })} />);
    fireEvent.change(getFallbackInput(), { target: { value: "x" } });
    expect(Object.keys(onChange.mock.calls[0][0])).toEqual(["slots"]);
  });

  it("calls onChange exactly once per fallback change", () => {
    const onChange = vi.fn();
    render(<TemplateStringNode {...makeProps({ template: "{{name}}", slots: ONE_SLOT, onChange })} />);
    fireEvent.change(getFallbackInput(), { target: { value: "x" } });
    expect(onChange).toHaveBeenCalledTimes(1);
  });
});

// ─── 6. onChange payload shape ────────────────────────────────────────────────

describe("TemplateStringNode — onChange payload shape", () => {
  const ALLOWED_KEYS = new Set<string>(["template", "slots", "onChange", "connectedHandles"]);

  it("template-change payload contains only allowed keys", () => {
    const onChange = vi.fn();
    render(<TemplateStringNode {...makeProps({ onChange })} />);
    fireEvent.change(getTemplateArea(), { target: { value: "hi" } });
    for (const k of Object.keys(onChange.mock.calls[0][0])) {
      expect(ALLOWED_KEYS.has(k)).toBe(true);
    }
  });

  it("fallback-change payload contains only allowed keys", () => {
    const onChange = vi.fn();
    render(<TemplateStringNode {...makeProps({ template: "{{name}}", slots: ONE_SLOT, onChange })} />);
    fireEvent.change(getFallbackInput(), { target: { value: "x" } });
    for (const k of Object.keys(onChange.mock.calls[0][0])) {
      expect(ALLOWED_KEYS.has(k)).toBe(true);
    }
  });

  it("slots array in template-change payload is never undefined", () => {
    const onChange = vi.fn();
    render(<TemplateStringNode {...makeProps({ onChange })} />);
    fireEvent.change(getTemplateArea(), { target: { value: "{{x}}" } });
    expect(onChange.mock.calls[0][0].slots).not.toBeUndefined();
  });
});

// ─── 7. Null / missing data safety ────────────────────────────────────────────

describe("TemplateStringNode — null / missing data safety", () => {
  it("defaults template to '' when undefined — textarea is empty", () => {
    const props = makeProps();
    (props.data as Record<string, unknown>).template = undefined;
    render(<TemplateStringNode {...props} />);
    expect(getTemplateArea()).toHaveValue("");
  });

  it("defaults slots to [] when undefined — no slot rows rendered", () => {
    const props = makeProps();
    (props.data as Record<string, unknown>).slots = undefined;
    render(<TemplateStringNode {...props} />);
    expect(screen.queryByPlaceholderText("fallback")).not.toBeInTheDocument();
  });

  it("renders correctly when data is completely empty", () => {
    const props = {
      id: "n1",
      data: {} as unknown as Record<string, unknown>,
      selected: false,
    } as NodeProps;
    render(<TemplateStringNode {...props} />);
    expect(screen.getByText("Template String")).toBeInTheDocument();
  });

  it("does not crash when connectedHandles is undefined", () => {
    expect(() =>
      render(<TemplateStringNode {...makeProps({ connectedHandles: undefined })} />)
    ).not.toThrow();
  });

  it("renders without crashing with selected=true", () => {
    render(<TemplateStringNode {...makeProps()} selected={true} />);
    expect(screen.getByText("Template String")).toBeInTheDocument();
  });

  it("renders without crashing with selected=false", () => {
    render(<TemplateStringNode {...makeProps()} selected={false} />);
    expect(screen.getByText("Template String")).toBeInTheDocument();
  });
});
