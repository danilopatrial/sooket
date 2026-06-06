import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { DateTimeNode } from "@/components/canvas/nodes/DateTimeNode";
import type { DateTimeNodeData } from "@/components/canvas/nodes/DateTimeNode";
import type { NodeProps } from "@xyflow/react";

vi.mock("@xyflow/react", () => ({
  Handle: ({ id, type, position }: { id: string; type: string; position: string }) => (
    <div data-testid={`handle-${id}`} data-handle-type={type} data-position={position} />
  ),
  Position: { Left: "left", Right: "right" },
}));

function makeProps(overrides: Partial<DateTimeNodeData> = {}): NodeProps {
  const data: DateTimeNodeData = { mode: "now", formatStr: "ISO", ...overrides };
  return { id: "node-1", data: data as unknown as Record<string, unknown>, selected: false } as NodeProps;
}

// ─── 1. Rendering ─────────────────────────────────────────────────────────────

describe("DateTimeNode — rendering", () => {
  it("renders without crashing with defaultData { mode: 'now', formatStr: 'ISO' }", () => {
    render(<DateTimeNode {...makeProps()} />);
    expect(screen.getByText("Date / Time")).toBeInTheDocument();
  });

  it("shows 'current timestamp' subtitle when mode is 'now'", () => {
    render(<DateTimeNode {...makeProps({ mode: "now" })} />);
    expect(screen.getByText("current timestamp")).toBeInTheDocument();
  });

  it("shows 'formats a date value' subtitle when mode is 'format'", () => {
    render(<DateTimeNode {...makeProps({ mode: "format" })} />);
    expect(screen.getByText("formats a date value")).toBeInTheDocument();
  });

  it("renders both mode buttons ('now' and 'format')", () => {
    render(<DateTimeNode {...makeProps()} />);
    expect(screen.getByText("now")).toBeInTheDocument();
    expect(screen.getByText("format")).toBeInTheDocument();
  });

  it("renders all three format preset buttons (ISO, unix, locale)", () => {
    render(<DateTimeNode {...makeProps()} />);
    expect(screen.getByRole("button", { name: "ISO" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "unix" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "locale" })).toBeInTheDocument();
  });

  it("renders the format text input with current formatStr value", () => {
    render(<DateTimeNode {...makeProps({ formatStr: "ISO" })} />);
    expect(screen.getByDisplayValue("ISO")).toBeInTheDocument();
  });

  it("renders the format input with custom formatStr value", () => {
    render(<DateTimeNode {...makeProps({ formatStr: "YYYY-MM-DD" })} />);
    expect(screen.getByDisplayValue("YYYY-MM-DD")).toBeInTheDocument();
  });

  it("renders the format input placeholder 'ISO'", () => {
    render(<DateTimeNode {...makeProps({ formatStr: "" })} />);
    expect(screen.getByPlaceholderText("ISO")).toBeInTheDocument();
  });
});

// ─── 2. Handles ───────────────────────────────────────────────────────────────

describe("DateTimeNode — handles", () => {
  it("renders the output handle (source, right) in mode=now", () => {
    render(<DateTimeNode {...makeProps({ mode: "now" })} />);
    const h = screen.getByTestId("handle-output");
    expect(h).toBeInTheDocument();
    expect(h).toHaveAttribute("data-handle-type", "source");
    expect(h).toHaveAttribute("data-position", "right");
  });

  it("renders the output handle (source, right) in mode=format", () => {
    render(<DateTimeNode {...makeProps({ mode: "format" })} />);
    const h = screen.getByTestId("handle-output");
    expect(h).toBeInTheDocument();
    expect(h).toHaveAttribute("data-handle-type", "source");
    expect(h).toHaveAttribute("data-position", "right");
  });

  it("does NOT render the input handle when mode is 'now'", () => {
    render(<DateTimeNode {...makeProps({ mode: "now" })} />);
    expect(screen.queryByTestId("handle-input")).not.toBeInTheDocument();
  });

  it("renders the input handle (target, left) when mode is 'format'", () => {
    render(<DateTimeNode {...makeProps({ mode: "format" })} />);
    const h = screen.getByTestId("handle-input");
    expect(h).toBeInTheDocument();
    expect(h).toHaveAttribute("data-handle-type", "target");
    expect(h).toHaveAttribute("data-position", "left");
  });
});

// ─── 3. Mode toggle onChange ───────────────────────────────────────────────────

describe("DateTimeNode — mode toggle onChange", () => {
  it("calls onChange({ mode: 'now' }) when 'now' button is clicked", () => {
    const onChange = vi.fn();
    render(<DateTimeNode {...makeProps({ mode: "format", onChange })} />);
    fireEvent.click(screen.getByText("now"));
    expect(onChange).toHaveBeenCalledWith({ mode: "now" });
  });

  it("calls onChange({ mode: 'format' }) when 'format' button is clicked", () => {
    const onChange = vi.fn();
    render(<DateTimeNode {...makeProps({ mode: "now", onChange })} />);
    fireEvent.click(screen.getByText("format"));
    expect(onChange).toHaveBeenCalledWith({ mode: "format" });
  });

  it("onChange is called exactly once per mode button click", () => {
    const onChange = vi.fn();
    render(<DateTimeNode {...makeProps({ onChange })} />);
    fireEvent.click(screen.getByText("format"));
    expect(onChange).toHaveBeenCalledTimes(1);
  });

  it("clicking the already-active mode button still calls onChange", () => {
    const onChange = vi.fn();
    render(<DateTimeNode {...makeProps({ mode: "now", onChange })} />);
    fireEvent.click(screen.getByText("now"));
    expect(onChange).toHaveBeenCalledWith({ mode: "now" });
  });
});

// ─── 4. Format preset buttons onChange ────────────────────────────────────────

describe("DateTimeNode — format preset buttons onChange", () => {
  it("calls onChange({ formatStr: 'ISO' }) when ISO preset is clicked", () => {
    const onChange = vi.fn();
    render(<DateTimeNode {...makeProps({ formatStr: "unix", onChange })} />);
    fireEvent.click(screen.getByText("ISO"));
    expect(onChange).toHaveBeenCalledWith({ formatStr: "ISO" });
  });

  it("calls onChange({ formatStr: 'unix' }) when unix preset is clicked", () => {
    const onChange = vi.fn();
    render(<DateTimeNode {...makeProps({ onChange })} />);
    fireEvent.click(screen.getByText("unix"));
    expect(onChange).toHaveBeenCalledWith({ formatStr: "unix" });
  });

  it("calls onChange({ formatStr: 'locale' }) when locale preset is clicked", () => {
    const onChange = vi.fn();
    render(<DateTimeNode {...makeProps({ onChange })} />);
    fireEvent.click(screen.getByText("locale"));
    expect(onChange).toHaveBeenCalledWith({ formatStr: "locale" });
  });

  it("clicking active preset still calls onChange", () => {
    const onChange = vi.fn();
    render(<DateTimeNode {...makeProps({ formatStr: "ISO", onChange })} />);
    fireEvent.click(screen.getByRole("button", { name: "ISO" }));
    expect(onChange).toHaveBeenCalledWith({ formatStr: "ISO" });
  });
});

// ─── 5. Format text input onChange ────────────────────────────────────────────

describe("DateTimeNode — format text input onChange", () => {
  it("calls onChange({ formatStr: newValue }) when input changes", () => {
    const onChange = vi.fn();
    render(<DateTimeNode {...makeProps({ onChange })} />);
    const input = screen.getByRole("textbox");
    fireEvent.change(input, { target: { value: "YYYY-MM-DD" } });
    expect(onChange).toHaveBeenCalledWith({ formatStr: "YYYY-MM-DD" });
  });

  it("calls onChange({ formatStr: '' }) when input is cleared", () => {
    const onChange = vi.fn();
    render(<DateTimeNode {...makeProps({ formatStr: "ISO", onChange })} />);
    const input = screen.getByRole("textbox");
    fireEvent.change(input, { target: { value: "" } });
    expect(onChange).toHaveBeenCalledWith({ formatStr: "" });
  });

  it("calls onChange with full string value not a diff", () => {
    const onChange = vi.fn();
    render(<DateTimeNode {...makeProps({ onChange })} />);
    const input = screen.getByRole("textbox");
    fireEvent.change(input, { target: { value: "custom" } });
    expect(onChange).toHaveBeenCalledWith({ formatStr: "custom" });
    expect(onChange).toHaveBeenCalledTimes(1);
  });

  it("does not throw when input changes and onChange is not provided", () => {
    expect(() => {
      render(<DateTimeNode {...makeProps()} />);
      const input = screen.getByRole("textbox");
      fireEvent.change(input, { target: { value: "test" } });
    }).not.toThrow();
  });
});

// ─── 6. Hint text logic ───────────────────────────────────────────────────────

describe("DateTimeNode — hint text below format input", () => {
  it("shows ISO hint '2025-01-15T12:00:00Z' when formatStr is 'ISO'", () => {
    render(<DateTimeNode {...makeProps({ formatStr: "ISO" })} />);
    expect(screen.getByText("2025-01-15T12:00:00Z")).toBeInTheDocument();
  });

  it("shows unix hint '1736942400' when formatStr is 'unix'", () => {
    render(<DateTimeNode {...makeProps({ formatStr: "unix" })} />);
    expect(screen.getByText("1736942400")).toBeInTheDocument();
  });

  it("shows locale hint '1/15/2025, 12:00 PM' when formatStr is 'locale'", () => {
    render(<DateTimeNode {...makeProps({ formatStr: "locale" })} />);
    expect(screen.getByText("1/15/2025, 12:00 PM")).toBeInTheDocument();
  });

  it("shows 'custom format string' when formatStr does not match any preset", () => {
    render(<DateTimeNode {...makeProps({ formatStr: "YYYY-MM-DD" })} />);
    expect(screen.getByText("custom format string")).toBeInTheDocument();
  });

  it("shows 'custom format string' when formatStr is empty", () => {
    render(<DateTimeNode {...makeProps({ formatStr: "" })} />);
    expect(screen.getByText("custom format string")).toBeInTheDocument();
  });

  it("shows 'custom format string' for a value that is a partial prefix of a preset", () => {
    render(<DateTimeNode {...makeProps({ formatStr: "IS" })} />);
    expect(screen.getByText("custom format string")).toBeInTheDocument();
  });
});

// ─── 7. Fallback defaults (undefined fields) ──────────────────────────────────

describe("DateTimeNode — fallback defaults", () => {
  it("defaults mode to 'now' when mode is undefined", () => {
    const props = makeProps();
    (props.data as Record<string, unknown>).mode = undefined;
    render(<DateTimeNode {...props} />);
    expect(screen.getByText("current timestamp")).toBeInTheDocument();
    expect(screen.queryByTestId("handle-input")).not.toBeInTheDocument();
  });

  it("defaults formatStr to 'ISO' when formatStr is undefined", () => {
    const props = makeProps();
    (props.data as Record<string, unknown>).formatStr = undefined;
    render(<DateTimeNode {...props} />);
    expect(screen.getByDisplayValue("ISO")).toBeInTheDocument();
    expect(screen.getByText("2025-01-15T12:00:00Z")).toBeInTheDocument();
  });
});

// ─── 8. onChange payload shape ────────────────────────────────────────────────

describe("DateTimeNode — onChange payload shape", () => {
  const ALLOWED_KEYS = new Set<string>(["mode", "formatStr", "onChange"]);

  it("mode button payload contains only allowed DateTimeNodeData keys", () => {
    const onChange = vi.fn();
    render(<DateTimeNode {...makeProps({ onChange })} />);
    fireEvent.click(screen.getByText("format"));
    const payload = onChange.mock.calls[0][0];
    for (const key of Object.keys(payload)) {
      expect(ALLOWED_KEYS.has(key)).toBe(true);
    }
  });

  it("preset button payload contains only allowed DateTimeNodeData keys", () => {
    const onChange = vi.fn();
    render(<DateTimeNode {...makeProps({ onChange })} />);
    fireEvent.click(screen.getByText("unix"));
    const payload = onChange.mock.calls[0][0];
    for (const key of Object.keys(payload)) {
      expect(ALLOWED_KEYS.has(key)).toBe(true);
    }
  });

  it("text input payload contains only allowed DateTimeNodeData keys", () => {
    const onChange = vi.fn();
    render(<DateTimeNode {...makeProps({ onChange })} />);
    const input = screen.getByRole("textbox");
    fireEvent.change(input, { target: { value: "custom" } });
    const payload = onChange.mock.calls[0][0];
    for (const key of Object.keys(payload)) {
      expect(ALLOWED_KEYS.has(key)).toBe(true);
    }
  });

  it("onChange payload values are never undefined", () => {
    const onChange = vi.fn();
    render(<DateTimeNode {...makeProps({ onChange })} />);
    fireEvent.click(screen.getByText("format"));
    const payload = onChange.mock.calls[0][0];
    for (const val of Object.values(payload)) {
      expect(val).not.toBeUndefined();
    }
  });
});

// ─── 9. No-onChange safety ────────────────────────────────────────────────────

describe("DateTimeNode — no onChange provided", () => {
  it("clicking 'now' mode button does not throw", () => {
    expect(() => {
      render(<DateTimeNode {...makeProps()} />);
      fireEvent.click(screen.getByText("now"));
    }).not.toThrow();
  });

  it("clicking 'format' mode button does not throw", () => {
    expect(() => {
      render(<DateTimeNode {...makeProps()} />);
      fireEvent.click(screen.getByText("format"));
    }).not.toThrow();
  });

  it("clicking 'unix' preset does not throw", () => {
    expect(() => {
      render(<DateTimeNode {...makeProps()} />);
      fireEvent.click(screen.getByText("unix"));
    }).not.toThrow();
  });
});

// ─── 10. Selected state ───────────────────────────────────────────────────────

describe("DateTimeNode — selected state", () => {
  it("renders without crashing when selected=true", () => {
    render(<DateTimeNode {...makeProps()} selected={true} />);
    expect(screen.getByText("Date / Time")).toBeInTheDocument();
  });

  it("renders without crashing when selected=false", () => {
    render(<DateTimeNode {...makeProps()} selected={false} />);
    expect(screen.getByText("Date / Time")).toBeInTheDocument();
  });
});
