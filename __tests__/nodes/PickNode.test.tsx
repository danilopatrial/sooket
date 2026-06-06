import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { PickNode } from "@/components/canvas/nodes/PickNode";
import type { PickNodeData } from "@/components/canvas/nodes/PickNode";
import type { NodeProps } from "@xyflow/react";

vi.mock("@xyflow/react", () => ({
  Handle: ({ id, type, position }: { id: string; type: string; position: string }) => (
    <div data-testid={`handle-${id}`} data-handle-type={type} data-position={position} />
  ),
  Position: { Left: "left", Right: "right" },
  useViewport: () => ({ zoom: 1 }),
}));

function makeProps(overrides: Partial<PickNodeData> = {}): NodeProps {
  const data: PickNodeData = { key: "", ...overrides };
  return { id: "node-1", data: data as unknown as Record<string, unknown>, selected: false } as NodeProps;
}

// ─── 1. Rendering ─────────────────────────────────────────────────────────────

describe("PickNode — rendering", () => {
  it("renders without crashing with defaultData { key: '' }", () => {
    render(<PickNode {...makeProps()} />);
    expect(screen.getByText("Pick")).toBeInTheDocument();
  });

  it("shows the 'Key' section label", () => {
    render(<PickNode {...makeProps()} />);
    expect(screen.getByText("Key")).toBeInTheDocument();
  });

  it("shows the 'object' input row label", () => {
    render(<PickNode {...makeProps()} />);
    expect(screen.getByText("object")).toBeInTheDocument();
  });

  it("shows the 'value' output row label", () => {
    render(<PickNode {...makeProps()} />);
    expect(screen.getByText("value")).toBeInTheDocument();
  });

  it("renders the key input with correct placeholder", () => {
    render(<PickNode {...makeProps()} />);
    expect(screen.getByPlaceholderText("e.g. email or user.name")).toBeInTheDocument();
  });

  it("renders the key input with the current key value", () => {
    render(<PickNode {...makeProps({ key: "email" })} />);
    expect(screen.getByDisplayValue("email")).toBeInTheDocument();
  });

  it("renders an empty key input when key is empty string", () => {
    render(<PickNode {...makeProps({ key: "" })} />);
    expect(screen.getByRole("textbox")).toHaveValue("");
  });
});

// ─── 2. Header subtitle logic ─────────────────────────────────────────────────

describe("PickNode — header subtitle", () => {
  it("shows 'obj[key]' when key is empty (defaultData)", () => {
    render(<PickNode {...makeProps({ key: "" })} />);
    expect(screen.getByText('obj[key]')).toBeInTheDocument();
  });

  it("shows 'obj[\"email\"]' when key is 'email'", () => {
    render(<PickNode {...makeProps({ key: "email" })} />);
    expect(screen.getByText('obj["email"]')).toBeInTheDocument();
  });

  it("shows 'obj[\"user.name\"]' when key is 'user.name'", () => {
    render(<PickNode {...makeProps({ key: "user.name" })} />);
    expect(screen.getByText('obj["user.name"]')).toBeInTheDocument();
  });

  it("shows 'obj[\"a\"]' when key is 'a' (single character)", () => {
    render(<PickNode {...makeProps({ key: "a" })} />);
    expect(screen.getByText('obj["a"]')).toBeInTheDocument();
  });

  it("shows 'obj[\"hello world\"]' when key contains a space", () => {
    render(<PickNode {...makeProps({ key: "hello world" })} />);
    expect(screen.getByText('obj["hello world"]')).toBeInTheDocument();
  });

  it("subtitle switches from 'obj[key]' to 'obj[\"x\"]' as soon as key is non-empty", () => {
    const { rerender } = render(<PickNode {...makeProps({ key: "" })} />);
    expect(screen.getByText('obj[key]')).toBeInTheDocument();

    rerender(<PickNode {...makeProps({ key: "x" })} />);
    expect(screen.getByText('obj["x"]')).toBeInTheDocument();
    expect(screen.queryByText('obj[key]')).not.toBeInTheDocument();
  });
});

// ─── 3. Handles ───────────────────────────────────────────────────────────────

describe("PickNode — handles", () => {
  it("renders the input handle (target, left)", () => {
    render(<PickNode {...makeProps()} />);
    const h = screen.getByTestId("handle-input");
    expect(h).toHaveAttribute("data-handle-type", "target");
    expect(h).toHaveAttribute("data-position", "left");
  });

  it("renders the key handle (target, left)", () => {
    render(<PickNode {...makeProps()} />);
    const h = screen.getByTestId("handle-key");
    expect(h).toHaveAttribute("data-handle-type", "target");
    expect(h).toHaveAttribute("data-position", "left");
  });

  it("renders the output handle (source, right)", () => {
    render(<PickNode {...makeProps()} />);
    const h = screen.getByTestId("handle-output");
    expect(h).toHaveAttribute("data-handle-type", "source");
    expect(h).toHaveAttribute("data-position", "right");
  });

  it("has exactly three handles in the DOM", () => {
    render(<PickNode {...makeProps()} />);
    expect(screen.getAllByTestId(/^handle-/)).toHaveLength(3);
  });

  it("all three handles are always present regardless of connectedHandles", () => {
    render(<PickNode {...makeProps({ connectedHandles: ["input", "key"] })} />);
    expect(screen.getByTestId("handle-input")).toBeInTheDocument();
    expect(screen.getByTestId("handle-key")).toBeInTheDocument();
    expect(screen.getByTestId("handle-output")).toBeInTheDocument();
  });
});

// ─── 4. Key input onChange ────────────────────────────────────────────────────

describe("PickNode — key input onChange", () => {
  it("calls onChange({ key: 'email' }) when 'email' is typed", () => {
    const onChange = vi.fn();
    render(<PickNode {...makeProps({ onChange })} />);
    fireEvent.change(screen.getByRole("textbox"), { target: { value: "email" } });
    expect(onChange).toHaveBeenCalledWith({ key: "email" });
  });

  it("calls onChange({ key: '' }) when input is cleared", () => {
    const onChange = vi.fn();
    render(<PickNode {...makeProps({ key: "email", onChange })} />);
    fireEvent.change(screen.getByRole("textbox"), { target: { value: "" } });
    expect(onChange).toHaveBeenCalledWith({ key: "" });
  });

  it("calls onChange({ key: 'user.name' }) for a dotted path key", () => {
    const onChange = vi.fn();
    render(<PickNode {...makeProps({ onChange })} />);
    fireEvent.change(screen.getByRole("textbox"), { target: { value: "user.name" } });
    expect(onChange).toHaveBeenCalledWith({ key: "user.name" });
  });

  it("calls onChange exactly once per input change", () => {
    const onChange = vi.fn();
    render(<PickNode {...makeProps({ onChange })} />);
    fireEvent.change(screen.getByRole("textbox"), { target: { value: "x" } });
    expect(onChange).toHaveBeenCalledTimes(1);
  });

  it("does not throw when input changes and onChange is not provided", () => {
    expect(() => {
      render(<PickNode {...makeProps()} />);
      fireEvent.change(screen.getByRole("textbox"), { target: { value: "test" } });
    }).not.toThrow();
  });
});

// ─── 5. connectedHandles — key input disabled ──────────────────────────────────

describe("PickNode — connectedHandles['key']", () => {
  it("key input is enabled when key handle is NOT connected", () => {
    render(<PickNode {...makeProps({ connectedHandles: [] })} />);
    expect(screen.getByRole("textbox")).not.toBeDisabled();
  });

  it("key input is disabled when key handle IS connected", () => {
    render(<PickNode {...makeProps({ connectedHandles: ["key"] })} />);
    expect(screen.getByRole("textbox")).toBeDisabled();
  });

  it("key input is enabled when only 'input' handle is connected", () => {
    render(<PickNode {...makeProps({ connectedHandles: ["input"] })} />);
    expect(screen.getByRole("textbox")).not.toBeDisabled();
  });

  it("key input is disabled when both 'input' and 'key' handles are connected", () => {
    render(<PickNode {...makeProps({ connectedHandles: ["input", "key"] })} />);
    expect(screen.getByRole("textbox")).toBeDisabled();
  });
});

// ─── 6. connectedHandles — object label ───────────────────────────────────────

describe("PickNode — connectedHandles['input'] object label", () => {
  it("renders the 'object' label when input is not connected", () => {
    render(<PickNode {...makeProps({ connectedHandles: [] })} />);
    expect(screen.getByText("object")).toBeInTheDocument();
  });

  it("renders the 'object' label when input IS connected", () => {
    render(<PickNode {...makeProps({ connectedHandles: ["input"] })} />);
    expect(screen.getByText("object")).toBeInTheDocument();
  });
});

// ─── 7. Fallback defaults ─────────────────────────────────────────────────────

describe("PickNode — fallback defaults", () => {
  it("defaults key to '' when key is undefined", () => {
    const props = makeProps();
    (props.data as Record<string, unknown>).key = undefined;
    render(<PickNode {...props} />);
    expect(screen.getByRole("textbox")).toHaveValue("");
    expect(screen.getByText("obj[key]")).toBeInTheDocument();
  });

  it("defaults connectedHandles to [] when undefined — no crash, key input enabled", () => {
    const props = makeProps();
    (props.data as Record<string, unknown>).connectedHandles = undefined;
    render(<PickNode {...props} />);
    expect(screen.getByRole("textbox")).not.toBeDisabled();
  });
});

// ─── 8. onChange payload shape ────────────────────────────────────────────────

describe("PickNode — onChange payload shape", () => {
  const ALLOWED_KEYS = new Set<string>(["key", "onChange", "connectedHandles"]);

  it("payload contains only allowed PickNodeData keys", () => {
    const onChange = vi.fn();
    render(<PickNode {...makeProps({ onChange })} />);
    fireEvent.change(screen.getByRole("textbox"), { target: { value: "test" } });
    for (const k of Object.keys(onChange.mock.calls[0][0])) {
      expect(ALLOWED_KEYS.has(k)).toBe(true);
    }
  });

  it("payload value is never undefined", () => {
    const onChange = vi.fn();
    render(<PickNode {...makeProps({ onChange })} />);
    fireEvent.change(screen.getByRole("textbox"), { target: { value: "name" } });
    for (const val of Object.values(onChange.mock.calls[0][0])) {
      expect(val).not.toBeUndefined();
    }
  });

  it("payload is exactly { key: value } — no extra keys", () => {
    const onChange = vi.fn();
    render(<PickNode {...makeProps({ onChange })} />);
    fireEvent.change(screen.getByRole("textbox"), { target: { value: "id" } });
    expect(Object.keys(onChange.mock.calls[0][0])).toEqual(["key"]);
  });
});

// ─── 9. Selected state ────────────────────────────────────────────────────────

describe("PickNode — selected state", () => {
  it("renders without crashing when selected=true", () => {
    render(<PickNode {...makeProps()} selected={true} />);
    expect(screen.getByText("Pick")).toBeInTheDocument();
  });

  it("renders without crashing when selected=false", () => {
    render(<PickNode {...makeProps()} selected={false} />);
    expect(screen.getByText("Pick")).toBeInTheDocument();
  });
});
