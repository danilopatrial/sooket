import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { BooleanNode } from "@/components/canvas/nodes/BooleanNode";
import type { BooleanNodeData } from "@/components/canvas/nodes/BooleanNode";
import type { NodeProps } from "@xyflow/react";

vi.mock("@xyflow/react", () => ({
  Handle: ({ id, type, position }: { id: string; type: string; position: string }) => (
    <div data-testid={`handle-${id}`} data-handle-type={type} data-position={position} />
  ),
  Position: { Left: "left", Right: "right" },
}));

function makeProps(overrides: Partial<BooleanNodeData> = {}): NodeProps {
  const data: BooleanNodeData = { value: false, ...overrides };
  return { id: "node-1", data: data as unknown as Record<string, unknown>, selected: false } as NodeProps;
}

// ─── 1. Rendering ─────────────────────────────────────────────────────────────

describe("BooleanNode — rendering", () => {
  it("renders without crashing with defaultData { value: false }", () => {
    render(<BooleanNode {...makeProps()} />);
    expect(screen.getByText("Boolean")).toBeInTheDocument();
  });

  it("shows the 'true or false' subtitle", () => {
    render(<BooleanNode {...makeProps()} />);
    expect(screen.getByText("true or false")).toBeInTheDocument();
  });

  it("shows '01' in the icon area", () => {
    render(<BooleanNode {...makeProps()} />);
    expect(screen.getByText("01")).toBeInTheDocument();
  });

  it("shows 'false' button text when value is false", () => {
    render(<BooleanNode {...makeProps({ value: false })} />);
    expect(screen.getByRole("button", { name: "false" })).toBeInTheDocument();
  });

  it("shows 'true' button text when value is true", () => {
    render(<BooleanNode {...makeProps({ value: true })} />);
    expect(screen.getByRole("button", { name: "true" })).toBeInTheDocument();
  });
});

// ─── 2. Handles ───────────────────────────────────────────────────────────────

describe("BooleanNode — handles", () => {
  it("renders the output handle (source, right)", () => {
    render(<BooleanNode {...makeProps()} />);
    const h = screen.getByTestId("handle-output");
    expect(h).toBeInTheDocument();
    expect(h).toHaveAttribute("data-handle-type", "source");
    expect(h).toHaveAttribute("data-position", "right");
  });

  it("does not render any input handle", () => {
    render(<BooleanNode {...makeProps()} />);
    expect(screen.queryByTestId("handle-input")).not.toBeInTheDocument();
  });

  it("has exactly one handle in the DOM", () => {
    render(<BooleanNode {...makeProps()} />);
    expect(screen.getAllByTestId(/^handle-/)).toHaveLength(1);
  });
});

// ─── 3. Toggle logic ──────────────────────────────────────────────────────────

describe("BooleanNode — toggle logic", () => {
  it("calls onChange({ value: true }) when value is false and button is clicked", () => {
    const onChange = vi.fn();
    render(<BooleanNode {...makeProps({ value: false, onChange })} />);
    fireEvent.click(screen.getByRole("button"));
    expect(onChange).toHaveBeenCalledWith({ value: true });
  });

  it("calls onChange({ value: false }) when value is true and button is clicked", () => {
    const onChange = vi.fn();
    render(<BooleanNode {...makeProps({ value: true, onChange })} />);
    fireEvent.click(screen.getByRole("button"));
    expect(onChange).toHaveBeenCalledWith({ value: false });
  });

  it("calls onChange exactly once per click", () => {
    const onChange = vi.fn();
    render(<BooleanNode {...makeProps({ onChange })} />);
    fireEvent.click(screen.getByRole("button"));
    expect(onChange).toHaveBeenCalledTimes(1);
  });

  it("toggles false→true→false across two sequential clicks", () => {
    const onChange = vi.fn();
    const { rerender } = render(<BooleanNode {...makeProps({ value: false, onChange })} />);
    fireEvent.click(screen.getByRole("button"));
    expect(onChange).toHaveBeenLastCalledWith({ value: true });

    rerender(<BooleanNode {...makeProps({ value: true, onChange })} />);
    fireEvent.click(screen.getByRole("button"));
    expect(onChange).toHaveBeenLastCalledWith({ value: false });
  });
});

// ─── 4. Fallback default (undefined value) ────────────────────────────────────

describe("BooleanNode — fallback defaults", () => {
  it("defaults value to false when value is undefined", () => {
    const props = makeProps();
    (props.data as Record<string, unknown>).value = undefined;
    render(<BooleanNode {...props} />);
    expect(screen.getByRole("button", { name: "false" })).toBeInTheDocument();
  });

  it("calls onChange({ value: true }) when value is undefined and button is clicked", () => {
    const onChange = vi.fn();
    const props = makeProps({ onChange });
    (props.data as Record<string, unknown>).value = undefined;
    render(<BooleanNode {...props} />);
    fireEvent.click(screen.getByRole("button"));
    expect(onChange).toHaveBeenCalledWith({ value: true });
  });
});

// ─── 5. onChange payload shape ────────────────────────────────────────────────

describe("BooleanNode — onChange payload shape", () => {
  const ALLOWED_KEYS = new Set<string>(["value", "onChange"]);

  it("payload from false→true click contains only allowed BooleanNodeData keys", () => {
    const onChange = vi.fn();
    render(<BooleanNode {...makeProps({ value: false, onChange })} />);
    fireEvent.click(screen.getByRole("button"));
    const payload = onChange.mock.calls[0][0];
    for (const key of Object.keys(payload)) {
      expect(ALLOWED_KEYS.has(key)).toBe(true);
    }
  });

  it("payload from true→false click contains only allowed BooleanNodeData keys", () => {
    const onChange = vi.fn();
    render(<BooleanNode {...makeProps({ value: true, onChange })} />);
    fireEvent.click(screen.getByRole("button"));
    const payload = onChange.mock.calls[0][0];
    for (const key of Object.keys(payload)) {
      expect(ALLOWED_KEYS.has(key)).toBe(true);
    }
  });

  it("payload value is a boolean, never undefined", () => {
    const onChange = vi.fn();
    render(<BooleanNode {...makeProps({ onChange })} />);
    fireEvent.click(screen.getByRole("button"));
    const payload = onChange.mock.calls[0][0];
    expect(typeof payload.value).toBe("boolean");
    expect(payload.value).not.toBeUndefined();
  });

  it("payload is { value: true } exactly — no extra keys", () => {
    const onChange = vi.fn();
    render(<BooleanNode {...makeProps({ value: false, onChange })} />);
    fireEvent.click(screen.getByRole("button"));
    expect(onChange).toHaveBeenCalledWith({ value: true });
    expect(Object.keys(onChange.mock.calls[0][0])).toEqual(["value"]);
  });
});

// ─── 6. No-onChange safety ────────────────────────────────────────────────────

describe("BooleanNode — no onChange provided", () => {
  it("clicking the toggle button does not throw when onChange is undefined", () => {
    expect(() => {
      render(<BooleanNode {...makeProps()} />);
      fireEvent.click(screen.getByRole("button"));
    }).not.toThrow();
  });
});

// ─── 7. Selected state ────────────────────────────────────────────────────────

describe("BooleanNode — selected state", () => {
  it("renders without crashing when selected=true", () => {
    render(<BooleanNode {...makeProps()} selected={true} />);
    expect(screen.getByText("Boolean")).toBeInTheDocument();
  });

  it("renders without crashing when selected=false", () => {
    render(<BooleanNode {...makeProps()} selected={false} />);
    expect(screen.getByText("Boolean")).toBeInTheDocument();
  });
});
