import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { NullCheckNode } from "@/components/canvas/nodes/NullCheckNode";
import type { NullCheckNodeData } from "@/components/canvas/nodes/NullCheckNode";
import type { NodeProps } from "@xyflow/react";

vi.mock("@xyflow/react", () => ({
  Handle: ({ id, type, position }: { id: string; type: string; position: string }) => (
    <div data-testid={`handle-${id}`} data-handle-type={type} data-position={position} />
  ),
  Position: { Left: "left", Right: "right" },
  useViewport: () => ({ zoom: 1 }),
}));

function makeProps(overrides: Partial<NullCheckNodeData> = {}): NodeProps {
  const data: NullCheckNodeData = { fallback: "", ...overrides };
  return { id: "node-1", data: data as unknown as Record<string, unknown>, selected: false } as NodeProps;
}

// ─── 1. Rendering ─────────────────────────────────────────────────────────────

describe("NullCheckNode — rendering", () => {
  it("renders without crashing with defaultData { fallback: '' }", () => {
    render(<NullCheckNode {...makeProps()} />);
    expect(screen.getByText("Null Check")).toBeInTheDocument();
  });

  it("shows the subtitle 'fallback if value is empty'", () => {
    render(<NullCheckNode {...makeProps()} />);
    expect(screen.getByText("fallback if value is empty")).toBeInTheDocument();
  });

  it("shows the 'Fallback' section label", () => {
    render(<NullCheckNode {...makeProps()} />);
    expect(screen.getByText("Fallback")).toBeInTheDocument();
  });

  it("shows the 'value' input row label", () => {
    render(<NullCheckNode {...makeProps()} />);
    expect(screen.getByText("value")).toBeInTheDocument();
  });

  it("shows the 'output' label", () => {
    render(<NullCheckNode {...makeProps()} />);
    expect(screen.getByText("output")).toBeInTheDocument();
  });

  it("renders the fallback text input with placeholder 'backup value…'", () => {
    render(<NullCheckNode {...makeProps()} />);
    expect(screen.getByPlaceholderText("backup value…")).toBeInTheDocument();
  });

  it("renders the fallback input with current fallback value", () => {
    render(<NullCheckNode {...makeProps({ fallback: "default text" })} />);
    expect(screen.getByDisplayValue("default text")).toBeInTheDocument();
  });

  it("renders the fallback input empty when fallback is empty string", () => {
    render(<NullCheckNode {...makeProps({ fallback: "" })} />);
    expect(screen.getByRole("textbox")).toHaveValue("");
  });
});

// ─── 2. Handles ───────────────────────────────────────────────────────────────

describe("NullCheckNode — handles", () => {
  it("renders the input handle (target, left)", () => {
    render(<NullCheckNode {...makeProps()} />);
    const h = screen.getByTestId("handle-input");
    expect(h).toHaveAttribute("data-handle-type", "target");
    expect(h).toHaveAttribute("data-position", "left");
  });

  it("renders the fallback handle (target, left)", () => {
    render(<NullCheckNode {...makeProps()} />);
    const h = screen.getByTestId("handle-fallback");
    expect(h).toHaveAttribute("data-handle-type", "target");
    expect(h).toHaveAttribute("data-position", "left");
  });

  it("renders the output handle (source, right)", () => {
    render(<NullCheckNode {...makeProps()} />);
    const h = screen.getByTestId("handle-output");
    expect(h).toHaveAttribute("data-handle-type", "source");
    expect(h).toHaveAttribute("data-position", "right");
  });

  it("has exactly three handles in the DOM", () => {
    render(<NullCheckNode {...makeProps()} />);
    expect(screen.getAllByTestId(/^handle-/)).toHaveLength(3);
  });

  it("all three handles are present regardless of connectedHandles", () => {
    render(<NullCheckNode {...makeProps({ connectedHandles: ["input", "fallback"] })} />);
    expect(screen.getByTestId("handle-input")).toBeInTheDocument();
    expect(screen.getByTestId("handle-fallback")).toBeInTheDocument();
    expect(screen.getByTestId("handle-output")).toBeInTheDocument();
  });
});

// ─── 3. Fallback input onChange ───────────────────────────────────────────────

describe("NullCheckNode — fallback input onChange", () => {
  it("calls onChange({ fallback: 'hello' }) when text is typed", () => {
    const onChange = vi.fn();
    render(<NullCheckNode {...makeProps({ onChange })} />);
    fireEvent.change(screen.getByRole("textbox"), { target: { value: "hello" } });
    expect(onChange).toHaveBeenCalledWith({ fallback: "hello" });
  });

  it("calls onChange({ fallback: '' }) when input is cleared", () => {
    const onChange = vi.fn();
    render(<NullCheckNode {...makeProps({ fallback: "old value", onChange })} />);
    fireEvent.change(screen.getByRole("textbox"), { target: { value: "" } });
    expect(onChange).toHaveBeenCalledWith({ fallback: "" });
  });

  it("calls onChange with the full current value, not a diff", () => {
    const onChange = vi.fn();
    render(<NullCheckNode {...makeProps({ onChange })} />);
    fireEvent.change(screen.getByRole("textbox"), { target: { value: "backup" } });
    expect(onChange).toHaveBeenCalledWith({ fallback: "backup" });
    expect(onChange).toHaveBeenCalledTimes(1);
  });

  it("calls onChange with a numeric string", () => {
    const onChange = vi.fn();
    render(<NullCheckNode {...makeProps({ onChange })} />);
    fireEvent.change(screen.getByRole("textbox"), { target: { value: "0" } });
    expect(onChange).toHaveBeenCalledWith({ fallback: "0" });
  });

  it("does not throw when input changes and onChange is not provided", () => {
    expect(() => {
      render(<NullCheckNode {...makeProps()} />);
      fireEvent.change(screen.getByRole("textbox"), { target: { value: "test" } });
    }).not.toThrow();
  });
});

// ─── 4. connectedHandles — fallback ───────────────────────────────────────────

describe("NullCheckNode — connectedHandles['fallback']", () => {
  it("fallback input is enabled when fallback handle is NOT connected", () => {
    render(<NullCheckNode {...makeProps({ connectedHandles: [] })} />);
    expect(screen.getByRole("textbox")).not.toBeDisabled();
  });

  it("fallback input is disabled when fallback handle IS connected", () => {
    render(<NullCheckNode {...makeProps({ connectedHandles: ["fallback"] })} />);
    expect(screen.getByRole("textbox")).toBeDisabled();
  });

  it("shows 'using connected value' when fallback handle is connected", () => {
    render(<NullCheckNode {...makeProps({ connectedHandles: ["fallback"] })} />);
    expect(screen.getByText("using connected value")).toBeInTheDocument();
  });

  it("does not show 'using connected value' when fallback handle is not connected", () => {
    render(<NullCheckNode {...makeProps({ connectedHandles: [] })} />);
    expect(screen.queryByText("using connected value")).not.toBeInTheDocument();
  });

  it("'using connected value' is not shown when only 'input' is connected", () => {
    render(<NullCheckNode {...makeProps({ connectedHandles: ["input"] })} />);
    expect(screen.queryByText("using connected value")).not.toBeInTheDocument();
  });

  it("'using connected value' is shown when both input and fallback are connected", () => {
    render(<NullCheckNode {...makeProps({ connectedHandles: ["input", "fallback"] })} />);
    expect(screen.getByText("using connected value")).toBeInTheDocument();
  });
});

// ─── 5. connectedHandles — input label ────────────────────────────────────────

describe("NullCheckNode — connectedHandles['input'] label", () => {
  it("renders the 'value' label when input is not connected", () => {
    render(<NullCheckNode {...makeProps({ connectedHandles: [] })} />);
    expect(screen.getByText("value")).toBeInTheDocument();
  });

  it("renders the 'value' label when input IS connected", () => {
    render(<NullCheckNode {...makeProps({ connectedHandles: ["input"] })} />);
    expect(screen.getByText("value")).toBeInTheDocument();
  });
});

// ─── 6. Fallback defaults ─────────────────────────────────────────────────────

describe("NullCheckNode — fallback defaults", () => {
  it("defaults fallback to '' when fallback is undefined", () => {
    const props = makeProps();
    (props.data as Record<string, unknown>).fallback = undefined;
    render(<NullCheckNode {...props} />);
    expect(screen.getByRole("textbox")).toHaveValue("");
  });

  it("defaults connectedHandles to [] when undefined — no crash and no 'using connected value'", () => {
    const props = makeProps();
    (props.data as Record<string, unknown>).connectedHandles = undefined;
    render(<NullCheckNode {...props} />);
    expect(screen.queryByText("using connected value")).not.toBeInTheDocument();
    expect(screen.getByRole("textbox")).not.toBeDisabled();
  });
});

// ─── 7. onChange payload shape ────────────────────────────────────────────────

describe("NullCheckNode — onChange payload shape", () => {
  const ALLOWED_KEYS = new Set<string>(["fallback", "onChange", "connectedHandles"]);

  it("payload contains only allowed NullCheckNodeData keys", () => {
    const onChange = vi.fn();
    render(<NullCheckNode {...makeProps({ onChange })} />);
    fireEvent.change(screen.getByRole("textbox"), { target: { value: "test" } });
    for (const key of Object.keys(onChange.mock.calls[0][0])) {
      expect(ALLOWED_KEYS.has(key)).toBe(true);
    }
  });

  it("payload value is never undefined", () => {
    const onChange = vi.fn();
    render(<NullCheckNode {...makeProps({ onChange })} />);
    fireEvent.change(screen.getByRole("textbox"), { target: { value: "test" } });
    for (const val of Object.values(onChange.mock.calls[0][0])) {
      expect(val).not.toBeUndefined();
    }
  });

  it("payload is exactly { fallback: value } — no extra keys", () => {
    const onChange = vi.fn();
    render(<NullCheckNode {...makeProps({ onChange })} />);
    fireEvent.change(screen.getByRole("textbox"), { target: { value: "hello" } });
    expect(Object.keys(onChange.mock.calls[0][0])).toEqual(["fallback"]);
  });
});

// ─── 8. Selected state ────────────────────────────────────────────────────────

describe("NullCheckNode — selected state", () => {
  it("renders without crashing when selected=true", () => {
    render(<NullCheckNode {...makeProps()} selected={true} />);
    expect(screen.getByText("Null Check")).toBeInTheDocument();
  });

  it("renders without crashing when selected=false", () => {
    render(<NullCheckNode {...makeProps()} selected={false} />);
    expect(screen.getByText("Null Check")).toBeInTheDocument();
  });
});
