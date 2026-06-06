import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { TextNode } from "@/components/canvas/nodes/TextNode";
import type { TextNodeData } from "@/components/canvas/nodes/TextNode";
import type { NodeProps } from "@xyflow/react";

vi.mock("@xyflow/react", () => ({
  Handle: ({ id, type, position }: { id: string; type: string; position: string }) => (
    <div data-testid={`handle-${id}`} data-handle-type={type} data-position={position} />
  ),
  Position: { Left: "left", Right: "right" },
}));

function makeProps(overrides: Partial<TextNodeData> = {}): NodeProps {
  const data: TextNodeData = { text: "", ...overrides };
  return { id: "node-1", data: data as unknown as Record<string, unknown>, selected: false } as NodeProps;
}

// ─── 1. Rendering ─────────────────────────────────────────────────────────────

describe("TextNode — rendering", () => {
  it("renders without crashing with defaultData { text: '' }", () => {
    render(<TextNode {...makeProps()} />);
    expect(screen.getByText("Text")).toBeInTheDocument();
  });

  it("shows the subtitle 'outputs this exact text'", () => {
    render(<TextNode {...makeProps()} />);
    expect(screen.getByText("outputs this exact text")).toBeInTheDocument();
  });

  it("shows the 'T' icon in the header", () => {
    render(<TextNode {...makeProps()} />);
    expect(screen.getByText("T")).toBeInTheDocument();
  });

  it("shows the 'Content' section label", () => {
    render(<TextNode {...makeProps()} />);
    expect(screen.getByText("Content")).toBeInTheDocument();
  });

  it("renders the textarea with placeholder 'Enter text…'", () => {
    render(<TextNode {...makeProps()} />);
    expect(screen.getByPlaceholderText("Enter text…")).toBeInTheDocument();
  });

  it("renders the textarea with the current text value", () => {
    render(<TextNode {...makeProps({ text: "hello world" })} />);
    expect(screen.getByDisplayValue("hello world")).toBeInTheDocument();
  });

  it("renders an empty textarea when text is empty string", () => {
    render(<TextNode {...makeProps({ text: "" })} />);
    expect(screen.getByRole("textbox")).toHaveValue("");
  });
});

// ─── 2. Handles ───────────────────────────────────────────────────────────────

describe("TextNode — handles", () => {
  it("renders the output handle (source, right)", () => {
    render(<TextNode {...makeProps()} />);
    const h = screen.getByTestId("handle-output");
    expect(h).toBeInTheDocument();
    expect(h).toHaveAttribute("data-handle-type", "source");
    expect(h).toHaveAttribute("data-position", "right");
  });

  it("does not render any input handle", () => {
    render(<TextNode {...makeProps()} />);
    expect(screen.queryByTestId("handle-input")).not.toBeInTheDocument();
  });

  it("has exactly one handle in the DOM", () => {
    render(<TextNode {...makeProps()} />);
    expect(screen.getAllByTestId(/^handle-/)).toHaveLength(1);
  });
});

// ─── 3. Textarea onChange ─────────────────────────────────────────────────────

describe("TextNode — textarea onChange", () => {
  it("calls onChange({ text: newValue }) when textarea changes", () => {
    const onChange = vi.fn();
    render(<TextNode {...makeProps({ onChange })} />);
    fireEvent.change(screen.getByRole("textbox"), { target: { value: "hello" } });
    expect(onChange).toHaveBeenCalledWith({ text: "hello" });
  });

  it("calls onChange({ text: '' }) when textarea is cleared", () => {
    const onChange = vi.fn();
    render(<TextNode {...makeProps({ text: "some text", onChange })} />);
    fireEvent.change(screen.getByRole("textbox"), { target: { value: "" } });
    expect(onChange).toHaveBeenCalledWith({ text: "" });
  });

  it("calls onChange with the full current string, not a diff", () => {
    const onChange = vi.fn();
    render(<TextNode {...makeProps({ onChange })} />);
    fireEvent.change(screen.getByRole("textbox"), { target: { value: "abc" } });
    expect(onChange).toHaveBeenCalledWith({ text: "abc" });
    expect(onChange).toHaveBeenCalledTimes(1);
  });

  it("calls onChange with a multiline string", () => {
    const onChange = vi.fn();
    render(<TextNode {...makeProps({ onChange })} />);
    const multiline = "line one\nline two\nline three";
    fireEvent.change(screen.getByRole("textbox"), { target: { value: multiline } });
    expect(onChange).toHaveBeenCalledWith({ text: multiline });
  });

  it("calls onChange with whitespace-only string", () => {
    const onChange = vi.fn();
    render(<TextNode {...makeProps({ onChange })} />);
    fireEvent.change(screen.getByRole("textbox"), { target: { value: "   " } });
    expect(onChange).toHaveBeenCalledWith({ text: "   " });
  });

  it("does not throw when textarea changes and onChange is not provided", () => {
    expect(() => {
      render(<TextNode {...makeProps()} />);
      fireEvent.change(screen.getByRole("textbox"), { target: { value: "test" } });
    }).not.toThrow();
  });
});

// ─── 4. Fallback defaults ─────────────────────────────────────────────────────

describe("TextNode — fallback defaults", () => {
  it("defaults text to '' when text is undefined", () => {
    const props = makeProps();
    (props.data as Record<string, unknown>).text = undefined;
    render(<TextNode {...props} />);
    expect(screen.getByRole("textbox")).toHaveValue("");
  });

  it("calls onChange({ text: newValue }) when text is undefined and user types", () => {
    const onChange = vi.fn();
    const props = makeProps({ onChange });
    (props.data as Record<string, unknown>).text = undefined;
    render(<TextNode {...props} />);
    fireEvent.change(screen.getByRole("textbox"), { target: { value: "hi" } });
    expect(onChange).toHaveBeenCalledWith({ text: "hi" });
  });
});

// ─── 5. onChange payload shape ────────────────────────────────────────────────

describe("TextNode — onChange payload shape", () => {
  const ALLOWED_KEYS = new Set<string>(["text", "onChange"]);

  it("payload contains only allowed TextNodeData keys", () => {
    const onChange = vi.fn();
    render(<TextNode {...makeProps({ onChange })} />);
    fireEvent.change(screen.getByRole("textbox"), { target: { value: "test" } });
    const payload = onChange.mock.calls[0][0];
    for (const key of Object.keys(payload)) {
      expect(ALLOWED_KEYS.has(key)).toBe(true);
    }
  });

  it("payload value is never undefined", () => {
    const onChange = vi.fn();
    render(<TextNode {...makeProps({ onChange })} />);
    fireEvent.change(screen.getByRole("textbox"), { target: { value: "test" } });
    const payload = onChange.mock.calls[0][0];
    for (const val of Object.values(payload)) {
      expect(val).not.toBeUndefined();
    }
  });

  it("payload is exactly { text: value } — no extra keys", () => {
    const onChange = vi.fn();
    render(<TextNode {...makeProps({ onChange })} />);
    fireEvent.change(screen.getByRole("textbox"), { target: { value: "hello" } });
    expect(Object.keys(onChange.mock.calls[0][0])).toEqual(["text"]);
  });
});

// ─── 6. Selected state ────────────────────────────────────────────────────────

describe("TextNode — selected state", () => {
  it("renders without crashing when selected=true", () => {
    render(<TextNode {...makeProps()} selected={true} />);
    expect(screen.getByText("Text")).toBeInTheDocument();
  });

  it("renders without crashing when selected=false", () => {
    render(<TextNode {...makeProps()} selected={false} />);
    expect(screen.getByText("Text")).toBeInTheDocument();
  });
});
