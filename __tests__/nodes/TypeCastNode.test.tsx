import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { TypeCastNode } from "@/components/canvas/nodes/TypeCastNode";
import type { TypeCastNodeData, CastTarget } from "@/components/canvas/nodes/TypeCastNode";
import type { NodeProps } from "@xyflow/react";

vi.mock("@xyflow/react", () => ({
  Handle: ({ id, type, position }: { id: string; type: string; position: string }) => (
    <div data-testid={`handle-${id}`} data-handle-type={type} data-position={position} />
  ),
  Position: { Left: "left", Right: "right" },
}));

function makeProps(overrides: Partial<TypeCastNodeData> = {}): NodeProps {
  const data: TypeCastNodeData = { target: "string", ...overrides };
  return { id: "node-1", data: data as unknown as Record<string, unknown>, selected: false } as NodeProps;
}

const ALL_TARGETS: CastTarget[] = ["string", "number", "boolean"];

// ─── 1. Rendering ─────────────────────────────────────────────────────────────

describe("TypeCastNode — rendering", () => {
  it("renders without crashing with defaultData { target: 'string' }", () => {
    render(<TypeCastNode {...makeProps()} />);
    expect(screen.getByText("Type Cast")).toBeInTheDocument();
  });

  it("shows the 'Convert To' section label", () => {
    render(<TypeCastNode {...makeProps()} />);
    expect(screen.getByText("Convert To")).toBeInTheDocument();
  });

  it("renders all three target buttons: string, number, boolean", () => {
    render(<TypeCastNode {...makeProps()} />);
    expect(screen.getByRole("button", { name: /string/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /number/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /boolean/i })).toBeInTheDocument();
  });

  it("renders exactly three buttons", () => {
    render(<TypeCastNode {...makeProps()} />);
    expect(screen.getAllByRole("button")).toHaveLength(3);
  });
});

// ─── 2. Header subtitle ───────────────────────────────────────────────────────

describe("TypeCastNode — header subtitle", () => {
  it("shows 'convert to string' when target is 'string'", () => {
    render(<TypeCastNode {...makeProps({ target: "string" })} />);
    expect(screen.getByText("convert to string")).toBeInTheDocument();
  });

  it("shows 'convert to number' when target is 'number'", () => {
    render(<TypeCastNode {...makeProps({ target: "number" })} />);
    expect(screen.getByText("convert to number")).toBeInTheDocument();
  });

  it("shows 'convert to boolean' when target is 'boolean'", () => {
    render(<TypeCastNode {...makeProps({ target: "boolean" })} />);
    expect(screen.getByText("convert to boolean")).toBeInTheDocument();
  });

  it.each(ALL_TARGETS)("subtitle reflects the active target '%s'", (target) => {
    render(<TypeCastNode {...makeProps({ target })} />);
    expect(screen.getByText(`convert to ${target}`)).toBeInTheDocument();
  });
});

// ─── 3. Handles ───────────────────────────────────────────────────────────────

describe("TypeCastNode — handles", () => {
  it("renders the input handle (target, left)", () => {
    render(<TypeCastNode {...makeProps()} />);
    const h = screen.getByTestId("handle-input");
    expect(h).toHaveAttribute("data-handle-type", "target");
    expect(h).toHaveAttribute("data-position", "left");
  });

  it("renders the output handle (source, right)", () => {
    render(<TypeCastNode {...makeProps()} />);
    const h = screen.getByTestId("handle-output");
    expect(h).toHaveAttribute("data-handle-type", "source");
    expect(h).toHaveAttribute("data-position", "right");
  });

  it("has exactly two handles in the DOM", () => {
    render(<TypeCastNode {...makeProps()} />);
    expect(screen.getAllByTestId(/^handle-/)).toHaveLength(2);
  });

  it("both handles are always present regardless of target", () => {
    for (const target of ALL_TARGETS) {
      const { unmount } = render(<TypeCastNode {...makeProps({ target })} />);
      expect(screen.getByTestId("handle-input")).toBeInTheDocument();
      expect(screen.getByTestId("handle-output")).toBeInTheDocument();
      unmount();
    }
  });
});

// ─── 4. Target button onClick onChange ───────────────────────────────────────

describe("TypeCastNode — target button onChange", () => {
  it("calls onChange({ target: 'string' }) when 'string' button is clicked", () => {
    const onChange = vi.fn();
    render(<TypeCastNode {...makeProps({ target: "number", onChange })} />);
    fireEvent.click(screen.getByRole("button", { name: /^string/ }));
    expect(onChange).toHaveBeenCalledWith({ target: "string" });
  });

  it("calls onChange({ target: 'number' }) when 'number' button is clicked", () => {
    const onChange = vi.fn();
    render(<TypeCastNode {...makeProps({ onChange })} />);
    fireEvent.click(screen.getByRole("button", { name: /^number/ }));
    expect(onChange).toHaveBeenCalledWith({ target: "number" });
  });

  it("calls onChange({ target: 'boolean' }) when 'boolean' button is clicked", () => {
    const onChange = vi.fn();
    render(<TypeCastNode {...makeProps({ onChange })} />);
    fireEvent.click(screen.getByRole("button", { name: /^boolean/ }));
    expect(onChange).toHaveBeenCalledWith({ target: "boolean" });
  });

  it("calls onChange exactly once per button click", () => {
    const onChange = vi.fn();
    render(<TypeCastNode {...makeProps({ onChange })} />);
    fireEvent.click(screen.getByRole("button", { name: /^number/ }));
    expect(onChange).toHaveBeenCalledTimes(1);
  });

  it("clicking the already-active target still calls onChange", () => {
    const onChange = vi.fn();
    render(<TypeCastNode {...makeProps({ target: "string", onChange })} />);
    fireEvent.click(screen.getByRole("button", { name: /^string/ }));
    expect(onChange).toHaveBeenCalledWith({ target: "string" });
  });

  it("does not throw when button is clicked and onChange is not provided", () => {
    expect(() => {
      render(<TypeCastNode {...makeProps()} />);
      fireEvent.click(screen.getByRole("button", { name: /^number/ }));
    }).not.toThrow();
  });
});

// ─── 5. Fallback defaults ─────────────────────────────────────────────────────

describe("TypeCastNode — fallback defaults", () => {
  it("defaults target to 'string' when target is undefined", () => {
    const props = makeProps();
    (props.data as Record<string, unknown>).target = undefined;
    render(<TypeCastNode {...props} />);
    expect(screen.getByText("convert to string")).toBeInTheDocument();
  });

  it("does not crash when target is undefined", () => {
    const props = makeProps();
    (props.data as Record<string, unknown>).target = undefined;
    expect(() => render(<TypeCastNode {...props} />)).not.toThrow();
  });
});

// ─── 6. onChange payload shape ────────────────────────────────────────────────

describe("TypeCastNode — onChange payload shape", () => {
  const ALLOWED_KEYS = new Set<string>(["target", "onChange"]);

  it("string button payload contains only allowed TypeCastNodeData keys", () => {
    const onChange = vi.fn();
    render(<TypeCastNode {...makeProps({ target: "number", onChange })} />);
    fireEvent.click(screen.getByRole("button", { name: /^string/ }));
    for (const key of Object.keys(onChange.mock.calls[0][0])) {
      expect(ALLOWED_KEYS.has(key)).toBe(true);
    }
  });

  it("number button payload contains only allowed TypeCastNodeData keys", () => {
    const onChange = vi.fn();
    render(<TypeCastNode {...makeProps({ onChange })} />);
    fireEvent.click(screen.getByRole("button", { name: /^number/ }));
    for (const key of Object.keys(onChange.mock.calls[0][0])) {
      expect(ALLOWED_KEYS.has(key)).toBe(true);
    }
  });

  it("boolean button payload contains only allowed TypeCastNodeData keys", () => {
    const onChange = vi.fn();
    render(<TypeCastNode {...makeProps({ onChange })} />);
    fireEvent.click(screen.getByRole("button", { name: /^boolean/ }));
    for (const key of Object.keys(onChange.mock.calls[0][0])) {
      expect(ALLOWED_KEYS.has(key)).toBe(true);
    }
  });

  it("payload target value is one of the valid CastTarget literals", () => {
    const onChange = vi.fn();
    render(<TypeCastNode {...makeProps({ onChange })} />);
    fireEvent.click(screen.getByRole("button", { name: /^boolean/ }));
    const { target } = onChange.mock.calls[0][0];
    expect(["string", "number", "boolean"]).toContain(target);
  });

  it("payload target value is never undefined", () => {
    const onChange = vi.fn();
    render(<TypeCastNode {...makeProps({ onChange })} />);
    fireEvent.click(screen.getByRole("button", { name: /^number/ }));
    expect(onChange.mock.calls[0][0].target).not.toBeUndefined();
  });

  it("payload is exactly { target: value } — no extra keys", () => {
    const onChange = vi.fn();
    render(<TypeCastNode {...makeProps({ onChange })} />);
    fireEvent.click(screen.getByRole("button", { name: /^boolean/ }));
    expect(Object.keys(onChange.mock.calls[0][0])).toEqual(["target"]);
  });
});

// ─── 7. Selected state ────────────────────────────────────────────────────────

describe("TypeCastNode — selected state", () => {
  it("renders without crashing when selected=true", () => {
    render(<TypeCastNode {...makeProps()} selected={true} />);
    expect(screen.getByText("Type Cast")).toBeInTheDocument();
  });

  it("renders without crashing when selected=false", () => {
    render(<TypeCastNode {...makeProps()} selected={false} />);
    expect(screen.getByText("Type Cast")).toBeInTheDocument();
  });
});
