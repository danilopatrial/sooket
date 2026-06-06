import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { PiiRedactNode } from "@/components/canvas/nodes/PiiRedactNode";
import type { PiiRedactNodeData, CustomPattern } from "@/components/canvas/nodes/PiiRedactNode";
import type { NodeProps } from "@xyflow/react";

vi.mock("@xyflow/react", () => ({
  Handle: ({ id, type, position }: { id: string; type: string; position: string }) => (
    <div data-testid={`handle-${id}`} data-handle-type={type} data-position={position} />
  ),
  Position: { Left: "left", Right: "right" },
}));

const DEFAULT_DATA: PiiRedactNodeData = {
  replacement: "",
  customPatterns: [],
};

const ONE_PATTERN: CustomPattern[] = [
  { id: "pat-1", label: "PHONE", regex: "\\d{3}-\\d{4}" },
];

const TWO_PATTERNS: CustomPattern[] = [
  { id: "pat-1", label: "PHONE", regex: "\\d{3}-\\d{4}" },
  { id: "pat-2", label: "EMAIL", regex: "[^@]+@[^@]+" },
];

function makeProps(overrides: Partial<PiiRedactNodeData> = {}): NodeProps {
  const data: PiiRedactNodeData = { ...DEFAULT_DATA, ...overrides };
  return {
    id: "node-1",
    data: data as unknown as Record<string, unknown>,
    selected: false,
  } as NodeProps;
}

// Preset buttons occupy indices 0-2; remove buttons follow (one per pattern); Add pattern is last
const getPresetBtn = (idx: 0 | 1 | 2) => screen.getAllByRole("button")[idx];
const getRemoveBtn = (idx = 0) => screen.getAllByRole("button")[3 + idx];
const getAddPatternBtn = () => screen.getByRole("button", { name: /add pattern/i });
const getReplacementInput = () => screen.getByPlaceholderText("or type a custom replacement…");

// ─── 1. Rendering ─────────────────────────────────────────────────────────────

describe("PiiRedactNode — rendering", () => {
  it("renders without crashing with defaultData", () => {
    render(<PiiRedactNode {...makeProps()} />);
    expect(screen.getByText("PII Redact")).toBeInTheDocument();
  });

  it("shows the subtitle 'redact sensitive data, via RegEx'", () => {
    render(<PiiRedactNode {...makeProps()} />);
    expect(screen.getByText("redact sensitive data, via RegEx")).toBeInTheDocument();
  });

  it("shows the 'Replace With' section label", () => {
    render(<PiiRedactNode {...makeProps()} />);
    expect(screen.getByText("Replace With")).toBeInTheDocument();
  });

  it("renders the '<type>' preset button", () => {
    render(<PiiRedactNode {...makeProps()} />);
    expect(screen.getByText("<type>")).toBeInTheDocument();
  });

  it("renders the '[REDACTED]' preset button", () => {
    render(<PiiRedactNode {...makeProps()} />);
    expect(screen.getByText("[REDACTED]")).toBeInTheDocument();
  });

  it("renders the '***' preset button", () => {
    render(<PiiRedactNode {...makeProps()} />);
    expect(screen.getByText("***")).toBeInTheDocument();
  });

  it("renders the replacement text input with correct placeholder", () => {
    render(<PiiRedactNode {...makeProps()} />);
    expect(getReplacementInput()).toBeInTheDocument();
  });

  it("shows the current replacement value in the text input", () => {
    render(<PiiRedactNode {...makeProps({ replacement: "[REDACTED]" })} />);
    expect(getReplacementInput()).toHaveValue("[REDACTED]");
  });

  it("shows empty replacement input when replacement is empty string", () => {
    render(<PiiRedactNode {...makeProps({ replacement: "" })} />);
    expect(getReplacementInput()).toHaveValue("");
  });

  it("shows the 'Custom Patterns' section label", () => {
    render(<PiiRedactNode {...makeProps()} />);
    expect(screen.getByText("Custom Patterns")).toBeInTheDocument();
  });

  it("renders the 'Add pattern' button", () => {
    render(<PiiRedactNode {...makeProps()} />);
    expect(getAddPatternBtn()).toBeInTheDocument();
  });

  it("does not render pattern column headers when customPatterns is empty", () => {
    render(<PiiRedactNode {...makeProps({ customPatterns: [] })} />);
    expect(screen.queryByText("label")).not.toBeInTheDocument();
    expect(screen.queryByText("regex pattern")).not.toBeInTheDocument();
  });

  it("renders column headers 'label' and 'regex pattern' when patterns exist", () => {
    render(<PiiRedactNode {...makeProps({ customPatterns: ONE_PATTERN })} />);
    expect(screen.getByText("label")).toBeInTheDocument();
    expect(screen.getByText("regex pattern")).toBeInTheDocument();
  });

  it("does not render any pattern rows when customPatterns is empty", () => {
    render(<PiiRedactNode {...makeProps({ customPatterns: [] })} />);
    expect(screen.queryByPlaceholderText("e.g. PHONE")).not.toBeInTheDocument();
  });

  it("renders the correct number of preset buttons (3)", () => {
    render(<PiiRedactNode {...makeProps()} />);
    // 3 preset buttons + 1 add pattern = 4 total with no patterns
    expect(screen.getAllByRole("button")).toHaveLength(4);
  });
});

// ─── 2. Handles ───────────────────────────────────────────────────────────────

describe("PiiRedactNode — handles", () => {
  it("renders the 'input' handle (target, left)", () => {
    render(<PiiRedactNode {...makeProps()} />);
    const h = screen.getByTestId("handle-input");
    expect(h).toHaveAttribute("data-handle-type", "target");
    expect(h).toHaveAttribute("data-position", "left");
  });

  it("renders the 'output' handle (source, right)", () => {
    render(<PiiRedactNode {...makeProps()} />);
    const h = screen.getByTestId("handle-output");
    expect(h).toHaveAttribute("data-handle-type", "source");
    expect(h).toHaveAttribute("data-position", "right");
  });

  it("has exactly two handles in the DOM", () => {
    render(<PiiRedactNode {...makeProps()} />);
    expect(screen.getAllByTestId(/^handle-/)).toHaveLength(2);
  });

  it("both handles are always present regardless of customPatterns", () => {
    render(<PiiRedactNode {...makeProps({ customPatterns: TWO_PATTERNS })} />);
    expect(screen.getByTestId("handle-input")).toBeInTheDocument();
    expect(screen.getByTestId("handle-output")).toBeInTheDocument();
  });
});

// ─── 3. Preset buttons onChange ───────────────────────────────────────────────

describe("PiiRedactNode — preset buttons onChange", () => {
  it("calls onChange({ replacement: '' }) when '<type>' (first preset) is clicked", () => {
    const onChange = vi.fn();
    render(<PiiRedactNode {...makeProps({ replacement: "***", onChange })} />);
    fireEvent.click(getPresetBtn(0));
    expect(onChange).toHaveBeenCalledWith({ replacement: "" });
  });

  it("calls onChange({ replacement: '[REDACTED]' }) when '[REDACTED]' preset is clicked", () => {
    const onChange = vi.fn();
    render(<PiiRedactNode {...makeProps({ onChange })} />);
    fireEvent.click(getPresetBtn(1));
    expect(onChange).toHaveBeenCalledWith({ replacement: "[REDACTED]" });
  });

  it("calls onChange({ replacement: '***' }) when '***' preset is clicked", () => {
    const onChange = vi.fn();
    render(<PiiRedactNode {...makeProps({ onChange })} />);
    fireEvent.click(getPresetBtn(2));
    expect(onChange).toHaveBeenCalledWith({ replacement: "***" });
  });

  it("calls onChange exactly once per preset click", () => {
    const onChange = vi.fn();
    render(<PiiRedactNode {...makeProps({ onChange })} />);
    fireEvent.click(getPresetBtn(1));
    expect(onChange).toHaveBeenCalledTimes(1);
  });

  it("does not throw when preset is clicked and onChange is not provided", () => {
    expect(() => {
      render(<PiiRedactNode {...makeProps()} />);
      fireEvent.click(getPresetBtn(1));
    }).not.toThrow();
  });
});

// ─── 4. Replacement text input onChange ───────────────────────────────────────

describe("PiiRedactNode — replacement text input onChange", () => {
  it("calls onChange({ replacement: 'CUSTOM' }) when custom text is typed", () => {
    const onChange = vi.fn();
    render(<PiiRedactNode {...makeProps({ onChange })} />);
    fireEvent.change(getReplacementInput(), { target: { value: "CUSTOM" } });
    expect(onChange).toHaveBeenCalledWith({ replacement: "CUSTOM" });
  });

  it("calls onChange({ replacement: '' }) when input is cleared", () => {
    const onChange = vi.fn();
    render(<PiiRedactNode {...makeProps({ replacement: "[REDACTED]", onChange })} />);
    fireEvent.change(getReplacementInput(), { target: { value: "" } });
    expect(onChange).toHaveBeenCalledWith({ replacement: "" });
  });

  it("calls onChange({ replacement: '***' }) when '***' is typed directly", () => {
    const onChange = vi.fn();
    render(<PiiRedactNode {...makeProps({ onChange })} />);
    fireEvent.change(getReplacementInput(), { target: { value: "***" } });
    expect(onChange).toHaveBeenCalledWith({ replacement: "***" });
  });

  it("calls onChange exactly once per input change", () => {
    const onChange = vi.fn();
    render(<PiiRedactNode {...makeProps({ onChange })} />);
    fireEvent.change(getReplacementInput(), { target: { value: "X" } });
    expect(onChange).toHaveBeenCalledTimes(1);
  });

  it("does not throw when input changes and onChange is not provided", () => {
    expect(() => {
      render(<PiiRedactNode {...makeProps()} />);
      fireEvent.change(getReplacementInput(), { target: { value: "test" } });
    }).not.toThrow();
  });
});

// ─── 5. Custom patterns — rendering ───────────────────────────────────────────

describe("PiiRedactNode — custom patterns rendering", () => {
  it("renders label and regex inputs for each pattern", () => {
    render(<PiiRedactNode {...makeProps({ customPatterns: ONE_PATTERN })} />);
    expect(screen.getByPlaceholderText("e.g. PHONE")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("\\d{3}-\\d{4}")).toBeInTheDocument();
  });

  it("renders the pattern label value in its input", () => {
    render(<PiiRedactNode {...makeProps({ customPatterns: ONE_PATTERN })} />);
    expect(screen.getByPlaceholderText("e.g. PHONE")).toHaveValue("PHONE");
  });

  it("renders the pattern regex value in its input", () => {
    render(<PiiRedactNode {...makeProps({ customPatterns: ONE_PATTERN })} />);
    expect(screen.getByPlaceholderText("\\d{3}-\\d{4}")).toHaveValue("\\d{3}-\\d{4}");
  });

  it("renders two rows of inputs for TWO_PATTERNS", () => {
    render(<PiiRedactNode {...makeProps({ customPatterns: TWO_PATTERNS })} />);
    expect(screen.getAllByPlaceholderText("e.g. PHONE")).toHaveLength(2);
    expect(screen.getAllByPlaceholderText("\\d{3}-\\d{4}")).toHaveLength(2);
  });

  it("renders a remove button for each pattern (plus 3 presets + add = correct total)", () => {
    render(<PiiRedactNode {...makeProps({ customPatterns: TWO_PATTERNS })} />);
    // 3 preset + 2 remove + 1 add = 6
    expect(screen.getAllByRole("button")).toHaveLength(6);
  });
});

// ─── 6. Add pattern ───────────────────────────────────────────────────────────

describe("PiiRedactNode — add pattern", () => {
  it("calls onChange with one extra pattern when 'Add pattern' is clicked", () => {
    const onChange = vi.fn();
    render(<PiiRedactNode {...makeProps({ customPatterns: [], onChange })} />);
    fireEvent.click(getAddPatternBtn());
    const { customPatterns } = onChange.mock.calls[0][0] as { customPatterns: CustomPattern[] };
    expect(customPatterns).toHaveLength(1);
  });

  it("new pattern has empty label and regex", () => {
    const onChange = vi.fn();
    render(<PiiRedactNode {...makeProps({ customPatterns: [], onChange })} />);
    fireEvent.click(getAddPatternBtn());
    const { customPatterns } = onChange.mock.calls[0][0] as { customPatterns: CustomPattern[] };
    expect(customPatterns[0].label).toBe("");
    expect(customPatterns[0].regex).toBe("");
  });

  it("new pattern has a non-empty id", () => {
    const onChange = vi.fn();
    render(<PiiRedactNode {...makeProps({ customPatterns: [], onChange })} />);
    fireEvent.click(getAddPatternBtn());
    const { customPatterns } = onChange.mock.calls[0][0] as { customPatterns: CustomPattern[] };
    expect(customPatterns[0].id).toBeTruthy();
  });

  it("preserves existing patterns when adding a new one", () => {
    const onChange = vi.fn();
    render(<PiiRedactNode {...makeProps({ customPatterns: ONE_PATTERN, onChange })} />);
    fireEvent.click(getAddPatternBtn());
    const { customPatterns } = onChange.mock.calls[0][0] as { customPatterns: CustomPattern[] };
    expect(customPatterns).toHaveLength(2);
    expect(customPatterns[0].id).toBe("pat-1");
  });

  it("calls onChange exactly once per click", () => {
    const onChange = vi.fn();
    render(<PiiRedactNode {...makeProps({ customPatterns: [], onChange })} />);
    fireEvent.click(getAddPatternBtn());
    expect(onChange).toHaveBeenCalledTimes(1);
  });

  it("does not throw when 'Add pattern' is clicked and onChange is not provided", () => {
    expect(() => {
      render(<PiiRedactNode {...makeProps()} />);
      fireEvent.click(getAddPatternBtn());
    }).not.toThrow();
  });
});

// ─── 7. Remove pattern ────────────────────────────────────────────────────────

describe("PiiRedactNode — remove pattern", () => {
  it("calls onChange with pattern removed when X is clicked", () => {
    const onChange = vi.fn();
    render(<PiiRedactNode {...makeProps({ customPatterns: ONE_PATTERN, onChange })} />);
    fireEvent.click(getRemoveBtn(0));
    expect(onChange).toHaveBeenCalledWith({ customPatterns: [] });
  });

  it("removes only the first pattern when two patterns exist", () => {
    const onChange = vi.fn();
    render(<PiiRedactNode {...makeProps({ customPatterns: TWO_PATTERNS, onChange })} />);
    fireEvent.click(getRemoveBtn(0));
    const { customPatterns } = onChange.mock.calls[0][0] as { customPatterns: CustomPattern[] };
    expect(customPatterns).toHaveLength(1);
    expect(customPatterns[0].id).toBe("pat-2");
  });

  it("removes only the second pattern when second X is clicked", () => {
    const onChange = vi.fn();
    render(<PiiRedactNode {...makeProps({ customPatterns: TWO_PATTERNS, onChange })} />);
    fireEvent.click(getRemoveBtn(1));
    const { customPatterns } = onChange.mock.calls[0][0] as { customPatterns: CustomPattern[] };
    expect(customPatterns).toHaveLength(1);
    expect(customPatterns[0].id).toBe("pat-1");
  });

  it("calls onChange exactly once per remove click", () => {
    const onChange = vi.fn();
    render(<PiiRedactNode {...makeProps({ customPatterns: ONE_PATTERN, onChange })} />);
    fireEvent.click(getRemoveBtn(0));
    expect(onChange).toHaveBeenCalledTimes(1);
  });

  it("does not throw when X is clicked and onChange is not provided", () => {
    expect(() => {
      render(<PiiRedactNode {...makeProps({ customPatterns: ONE_PATTERN })} />);
      fireEvent.click(getRemoveBtn(0));
    }).not.toThrow();
  });
});

// ─── 8. Update pattern label ──────────────────────────────────────────────────

describe("PiiRedactNode — update pattern label", () => {
  it("calls onChange with updated label when label input changes", () => {
    const onChange = vi.fn();
    render(<PiiRedactNode {...makeProps({ customPatterns: ONE_PATTERN, onChange })} />);
    fireEvent.change(screen.getByPlaceholderText("e.g. PHONE"), {
      target: { value: "SSN" },
    });
    const { customPatterns } = onChange.mock.calls[0][0] as { customPatterns: CustomPattern[] };
    expect(customPatterns[0].label).toBe("SSN");
  });

  it("preserves regex and id when only label changes", () => {
    const onChange = vi.fn();
    render(<PiiRedactNode {...makeProps({ customPatterns: ONE_PATTERN, onChange })} />);
    fireEvent.change(screen.getByPlaceholderText("e.g. PHONE"), {
      target: { value: "SSN" },
    });
    const { customPatterns } = onChange.mock.calls[0][0] as { customPatterns: CustomPattern[] };
    expect(customPatterns[0].id).toBe("pat-1");
    expect(customPatterns[0].regex).toBe("\\d{3}-\\d{4}");
  });

  it("calls onChange with updated label '' when label is cleared", () => {
    const onChange = vi.fn();
    render(<PiiRedactNode {...makeProps({ customPatterns: ONE_PATTERN, onChange })} />);
    fireEvent.change(screen.getByPlaceholderText("e.g. PHONE"), {
      target: { value: "" },
    });
    const { customPatterns } = onChange.mock.calls[0][0] as { customPatterns: CustomPattern[] };
    expect(customPatterns[0].label).toBe("");
  });

  it("updates only the target pattern's label when two patterns exist", () => {
    const onChange = vi.fn();
    render(<PiiRedactNode {...makeProps({ customPatterns: TWO_PATTERNS, onChange })} />);
    fireEvent.change(screen.getAllByPlaceholderText("e.g. PHONE")[0], {
      target: { value: "DOB" },
    });
    const { customPatterns } = onChange.mock.calls[0][0] as { customPatterns: CustomPattern[] };
    expect(customPatterns[0].label).toBe("DOB");
    expect(customPatterns[1].label).toBe("EMAIL");
  });

  it("calls onChange exactly once per label change", () => {
    const onChange = vi.fn();
    render(<PiiRedactNode {...makeProps({ customPatterns: ONE_PATTERN, onChange })} />);
    fireEvent.change(screen.getByPlaceholderText("e.g. PHONE"), {
      target: { value: "SSN" },
    });
    expect(onChange).toHaveBeenCalledTimes(1);
  });
});

// ─── 9. Update pattern regex ──────────────────────────────────────────────────

describe("PiiRedactNode — update pattern regex", () => {
  it("calls onChange with updated regex when regex input changes", () => {
    const onChange = vi.fn();
    render(<PiiRedactNode {...makeProps({ customPatterns: ONE_PATTERN, onChange })} />);
    fireEvent.change(screen.getByPlaceholderText("\\d{3}-\\d{4}"), {
      target: { value: "\\d{9}" },
    });
    const { customPatterns } = onChange.mock.calls[0][0] as { customPatterns: CustomPattern[] };
    expect(customPatterns[0].regex).toBe("\\d{9}");
  });

  it("preserves label and id when only regex changes", () => {
    const onChange = vi.fn();
    render(<PiiRedactNode {...makeProps({ customPatterns: ONE_PATTERN, onChange })} />);
    fireEvent.change(screen.getByPlaceholderText("\\d{3}-\\d{4}"), {
      target: { value: "\\d{9}" },
    });
    const { customPatterns } = onChange.mock.calls[0][0] as { customPatterns: CustomPattern[] };
    expect(customPatterns[0].id).toBe("pat-1");
    expect(customPatterns[0].label).toBe("PHONE");
  });

  it("calls onChange with updated regex '' when regex is cleared", () => {
    const onChange = vi.fn();
    render(<PiiRedactNode {...makeProps({ customPatterns: ONE_PATTERN, onChange })} />);
    fireEvent.change(screen.getByPlaceholderText("\\d{3}-\\d{4}"), {
      target: { value: "" },
    });
    const { customPatterns } = onChange.mock.calls[0][0] as { customPatterns: CustomPattern[] };
    expect(customPatterns[0].regex).toBe("");
  });

  it("updates only the target pattern's regex when two patterns exist", () => {
    const onChange = vi.fn();
    render(<PiiRedactNode {...makeProps({ customPatterns: TWO_PATTERNS, onChange })} />);
    fireEvent.change(screen.getAllByPlaceholderText("\\d{3}-\\d{4}")[0], {
      target: { value: "new-regex" },
    });
    const { customPatterns } = onChange.mock.calls[0][0] as { customPatterns: CustomPattern[] };
    expect(customPatterns[0].regex).toBe("new-regex");
    expect(customPatterns[1].regex).toBe("[^@]+@[^@]+");
  });

  it("calls onChange exactly once per regex change", () => {
    const onChange = vi.fn();
    render(<PiiRedactNode {...makeProps({ customPatterns: ONE_PATTERN, onChange })} />);
    fireEvent.change(screen.getByPlaceholderText("\\d{3}-\\d{4}"), {
      target: { value: "new" },
    });
    expect(onChange).toHaveBeenCalledTimes(1);
  });
});

// ─── 10. Fallback defaults ────────────────────────────────────────────────────

describe("PiiRedactNode — fallback defaults", () => {
  it("defaults replacement to '' when undefined", () => {
    const props = makeProps();
    (props.data as Record<string, unknown>).replacement = undefined;
    render(<PiiRedactNode {...props} />);
    expect(getReplacementInput()).toHaveValue("");
  });

  it("defaults customPatterns to [] when undefined — no pattern rows rendered", () => {
    const props = makeProps();
    (props.data as Record<string, unknown>).customPatterns = undefined;
    render(<PiiRedactNode {...props} />);
    expect(screen.queryByPlaceholderText("e.g. PHONE")).not.toBeInTheDocument();
  });

  it("does not crash when connectedHandles is undefined", () => {
    expect(() =>
      render(<PiiRedactNode {...makeProps({ connectedHandles: undefined })} />)
    ).not.toThrow();
  });

  it("renders all content correctly when data is completely empty", () => {
    const props = {
      id: "node-1",
      data: {} as unknown as Record<string, unknown>,
      selected: false,
    } as NodeProps;
    render(<PiiRedactNode {...props} />);
    expect(screen.getByText("PII Redact")).toBeInTheDocument();
    expect(getReplacementInput()).toHaveValue("");
  });

  it("does not crash when customPatterns is empty array", () => {
    expect(() =>
      render(<PiiRedactNode {...makeProps({ customPatterns: [] })} />)
    ).not.toThrow();
  });
});

// ─── 11. onChange payload shape ───────────────────────────────────────────────

describe("PiiRedactNode — onChange payload shape", () => {
  const ALLOWED_KEYS = new Set<string>(["replacement", "customPatterns", "onChange", "connectedHandles"]);

  it("preset button payload contains only allowed keys", () => {
    const onChange = vi.fn();
    render(<PiiRedactNode {...makeProps({ onChange })} />);
    fireEvent.click(getPresetBtn(1));
    for (const k of Object.keys(onChange.mock.calls[0][0])) {
      expect(ALLOWED_KEYS.has(k)).toBe(true);
    }
  });

  it("preset button payload is exactly { replacement: value } — no extra keys", () => {
    const onChange = vi.fn();
    render(<PiiRedactNode {...makeProps({ onChange })} />);
    fireEvent.click(getPresetBtn(2));
    expect(Object.keys(onChange.mock.calls[0][0])).toEqual(["replacement"]);
  });

  it("text input payload is exactly { replacement: value } — no extra keys", () => {
    const onChange = vi.fn();
    render(<PiiRedactNode {...makeProps({ onChange })} />);
    fireEvent.change(getReplacementInput(), { target: { value: "X" } });
    expect(Object.keys(onChange.mock.calls[0][0])).toEqual(["replacement"]);
  });

  it("add-pattern payload is exactly { customPatterns: array } — no extra keys", () => {
    const onChange = vi.fn();
    render(<PiiRedactNode {...makeProps({ customPatterns: [], onChange })} />);
    fireEvent.click(getAddPatternBtn());
    expect(Object.keys(onChange.mock.calls[0][0])).toEqual(["customPatterns"]);
  });

  it("remove-pattern payload is exactly { customPatterns: array } — no extra keys", () => {
    const onChange = vi.fn();
    render(<PiiRedactNode {...makeProps({ customPatterns: ONE_PATTERN, onChange })} />);
    fireEvent.click(getRemoveBtn(0));
    expect(Object.keys(onChange.mock.calls[0][0])).toEqual(["customPatterns"]);
  });

  it("update-label payload is exactly { customPatterns: array } — no extra keys", () => {
    const onChange = vi.fn();
    render(<PiiRedactNode {...makeProps({ customPatterns: ONE_PATTERN, onChange })} />);
    fireEvent.change(screen.getByPlaceholderText("e.g. PHONE"), { target: { value: "SSN" } });
    expect(Object.keys(onChange.mock.calls[0][0])).toEqual(["customPatterns"]);
  });

  it("update-regex payload is exactly { customPatterns: array } — no extra keys", () => {
    const onChange = vi.fn();
    render(<PiiRedactNode {...makeProps({ customPatterns: ONE_PATTERN, onChange })} />);
    fireEvent.change(screen.getByPlaceholderText("\\d{3}-\\d{4}"), { target: { value: "x" } });
    expect(Object.keys(onChange.mock.calls[0][0])).toEqual(["customPatterns"]);
  });

  it("payload values are never undefined", () => {
    const onChange = vi.fn();
    render(<PiiRedactNode {...makeProps({ onChange })} />);
    fireEvent.click(getPresetBtn(1));
    for (const val of Object.values(onChange.mock.calls[0][0])) {
      expect(val).not.toBeUndefined();
    }
  });
});

// ─── 12. Selected state ───────────────────────────────────────────────────────

describe("PiiRedactNode — selected state", () => {
  it("renders without crashing when selected=true", () => {
    render(<PiiRedactNode {...makeProps()} selected={true} />);
    expect(screen.getByText("PII Redact")).toBeInTheDocument();
  });

  it("renders without crashing when selected=false", () => {
    render(<PiiRedactNode {...makeProps()} selected={false} />);
    expect(screen.getByText("PII Redact")).toBeInTheDocument();
  });
});

// ─── 13. Active preset button highlighting ────────────────────────────────────

describe("PiiRedactNode — active preset button highlighting", () => {
  it("marks the '<type>' button as active when replacement is ''", () => {
    render(<PiiRedactNode {...makeProps({ replacement: "" })} />);
    expect(getPresetBtn(0)).toHaveClass("bg-rose-600/30");
  });

  it("does not mark '[REDACTED]' or '***' as active when replacement is ''", () => {
    render(<PiiRedactNode {...makeProps({ replacement: "" })} />);
    expect(getPresetBtn(1)).not.toHaveClass("bg-rose-600/30");
    expect(getPresetBtn(2)).not.toHaveClass("bg-rose-600/30");
  });

  it("marks the '[REDACTED]' button as active when replacement is '[REDACTED]'", () => {
    render(<PiiRedactNode {...makeProps({ replacement: "[REDACTED]" })} />);
    expect(getPresetBtn(1)).toHaveClass("bg-rose-600/30");
  });

  it("does not mark '<type>' or '***' as active when replacement is '[REDACTED]'", () => {
    render(<PiiRedactNode {...makeProps({ replacement: "[REDACTED]" })} />);
    expect(getPresetBtn(0)).not.toHaveClass("bg-rose-600/30");
    expect(getPresetBtn(2)).not.toHaveClass("bg-rose-600/30");
  });

  it("marks the '***' button as active when replacement is '***'", () => {
    render(<PiiRedactNode {...makeProps({ replacement: "***" })} />);
    expect(getPresetBtn(2)).toHaveClass("bg-rose-600/30");
  });

  it("does not mark '<type>' or '[REDACTED]' as active when replacement is '***'", () => {
    render(<PiiRedactNode {...makeProps({ replacement: "***" })} />);
    expect(getPresetBtn(0)).not.toHaveClass("bg-rose-600/30");
    expect(getPresetBtn(1)).not.toHaveClass("bg-rose-600/30");
  });

  it("marks no preset button as active when replacement is a custom value", () => {
    render(<PiiRedactNode {...makeProps({ replacement: "CUSTOM_MASK" })} />);
    expect(getPresetBtn(0)).not.toHaveClass("bg-rose-600/30");
    expect(getPresetBtn(1)).not.toHaveClass("bg-rose-600/30");
    expect(getPresetBtn(2)).not.toHaveClass("bg-rose-600/30");
  });
});

// ─── 14. Pattern ID uniqueness ────────────────────────────────────────────────

describe("PiiRedactNode — pattern ID uniqueness", () => {
  it("generates unique IDs when 'Add pattern' is clicked on a node that already has one pattern", () => {
    const onChange = vi.fn();
    render(<PiiRedactNode {...makeProps({ customPatterns: ONE_PATTERN, onChange })} />);
    fireEvent.click(getAddPatternBtn());
    const { customPatterns } = onChange.mock.calls[0][0] as { customPatterns: CustomPattern[] };
    expect(customPatterns[0].id).not.toBe(customPatterns[1].id);
  });
});

// ─── 15. Pattern append order ─────────────────────────────────────────────────

describe("PiiRedactNode — new pattern is appended at end", () => {
  it("places the new pattern at the last index", () => {
    const onChange = vi.fn();
    render(<PiiRedactNode {...makeProps({ customPatterns: ONE_PATTERN, onChange })} />);
    fireEvent.click(getAddPatternBtn());
    const { customPatterns } = onChange.mock.calls[0][0] as { customPatterns: CustomPattern[] };
    expect(customPatterns[0].id).toBe("pat-1");
    expect(customPatterns[1].label).toBe("");
    expect(customPatterns[1].regex).toBe("");
  });
});

// ─── 16. Middle-item removal ──────────────────────────────────────────────────

const THREE_PATTERNS: CustomPattern[] = [
  { id: "pat-1", label: "PHONE", regex: "\\d{3}-\\d{4}" },
  { id: "pat-2", label: "EMAIL", regex: "[^@]+@[^@]+" },
  { id: "pat-3", label: "SSN",   regex: "\\d{3}-\\d{2}-\\d{4}" },
];

describe("PiiRedactNode — middle-item removal", () => {
  it("removes only the middle pattern when the second X is clicked from three patterns", () => {
    const onChange = vi.fn();
    render(<PiiRedactNode {...makeProps({ customPatterns: THREE_PATTERNS, onChange })} />);
    fireEvent.click(getRemoveBtn(1));
    const { customPatterns } = onChange.mock.calls[0][0] as { customPatterns: CustomPattern[] };
    expect(customPatterns).toHaveLength(2);
    expect(customPatterns[0].id).toBe("pat-1");
    expect(customPatterns[1].id).toBe("pat-3");
  });

  it("renders 3 pattern rows and 3 remove buttons (plus 3 presets + add = 7 total) for THREE_PATTERNS", () => {
    render(<PiiRedactNode {...makeProps({ customPatterns: THREE_PATTERNS })} />);
    expect(screen.getAllByRole("button")).toHaveLength(7);
  });
});

// ─── 17. connectedHandles with values ─────────────────────────────────────────

describe("PiiRedactNode — connectedHandles with values", () => {
  it("does not crash when connectedHandles contains a single handle id", () => {
    expect(() =>
      render(<PiiRedactNode {...makeProps({ connectedHandles: ["input"] })} />)
    ).not.toThrow();
  });

  it("renders both handles when connectedHandles contains both ids", () => {
    render(<PiiRedactNode {...makeProps({ connectedHandles: ["input", "output"] })} />);
    expect(screen.getByTestId("handle-input")).toBeInTheDocument();
    expect(screen.getByTestId("handle-output")).toBeInTheDocument();
  });

  it("does not crash when connectedHandles contains an unknown id", () => {
    expect(() =>
      render(<PiiRedactNode {...makeProps({ connectedHandles: ["nonexistent"] })} />)
    ).not.toThrow();
  });
});
