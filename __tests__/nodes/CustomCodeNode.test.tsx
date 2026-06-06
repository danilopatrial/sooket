import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { CustomCodeNode } from "@/components/canvas/nodes/CustomCodeNode";
import type { CustomCodeNodeData } from "@/components/canvas/nodes/CustomCodeNode";
import type { NodeProps } from "@xyflow/react";

vi.mock("@xyflow/react", () => ({
  Handle: ({ id, type, position }: { id: string; type: string; position: string }) => (
    <div data-testid={`handle-${id}`} data-handle-type={type} data-position={position} />
  ),
  Position: { Left: "left", Right: "right" },
  useViewport: () => ({ zoom: 1 }),
}));

function makeProps(overrides: Partial<CustomCodeNodeData> = {}): NodeProps {
  const data: CustomCodeNodeData = {
    code: "",
    ...overrides,
  };
  return { id: "node-cc", data: data as unknown as Record<string, unknown>, selected: false } as NodeProps;
}

// ─── 1. Rendering ─────────────────────────────────────────────────────────────

describe("CustomCodeNode — rendering", () => {
  it("renders without crashing with default data", () => {
    render(<CustomCodeNode {...makeProps()} />);
    expect(screen.getByText("Custom Code")).toBeInTheDocument();
  });

  it("renders the subtitle", () => {
    render(<CustomCodeNode {...makeProps()} />);
    expect(screen.getByText("JS · full server access")).toBeInTheDocument();
  });

  it("renders the Code label", () => {
    render(<CustomCodeNode {...makeProps()} />);
    expect(screen.getByText("Code")).toBeInTheDocument();
  });

  it("renders the 'input' row label", () => {
    render(<CustomCodeNode {...makeProps()} />);
    expect(screen.getByText("input")).toBeInTheDocument();
  });

  it("renders the 'output' row label", () => {
    render(<CustomCodeNode {...makeProps()} />);
    expect(screen.getByText("output")).toBeInTheDocument();
  });

  it("renders the expand-editor button", () => {
    render(<CustomCodeNode {...makeProps()} />);
    expect(screen.queryAllByRole("button")).toHaveLength(1);
    expect(screen.getByTitle("Expand editor")).toBeInTheDocument();
  });
});

// ─── 2. Handles ───────────────────────────────────────────────────────────────

describe("CustomCodeNode — handles", () => {
  it("renders exactly 2 handles", () => {
    render(<CustomCodeNode {...makeProps()} />);
    expect(screen.getAllByTestId(/^handle-/)).toHaveLength(2);
  });

  it("'input' handle is a target on the left", () => {
    render(<CustomCodeNode {...makeProps()} />);
    const h = screen.getByTestId("handle-input");
    expect(h).toHaveAttribute("data-handle-type", "target");
    expect(h).toHaveAttribute("data-position", "left");
  });

  it("'output' handle is a source on the right", () => {
    render(<CustomCodeNode {...makeProps()} />);
    const h = screen.getByTestId("handle-output");
    expect(h).toHaveAttribute("data-handle-type", "source");
    expect(h).toHaveAttribute("data-position", "right");
  });

  it("only one handle is a target", () => {
    render(<CustomCodeNode {...makeProps()} />);
    const all = screen.getAllByTestId(/^handle-/);
    const targets = all.filter((h) => h.getAttribute("data-handle-type") === "target");
    expect(targets).toHaveLength(1);
  });

  it("only one handle is a source", () => {
    render(<CustomCodeNode {...makeProps()} />);
    const all = screen.getAllByTestId(/^handle-/);
    const sources = all.filter((h) => h.getAttribute("data-handle-type") === "source");
    expect(sources).toHaveLength(1);
  });
});

// ─── 3. Textarea ──────────────────────────────────────────────────────────────

describe("CustomCodeNode — textarea", () => {
  it("shows the current code value", () => {
    render(<CustomCodeNode {...makeProps({ code: "return input * 2;" })} />);
    const ta = screen.getByRole("textbox");
    expect((ta as HTMLTextAreaElement).value).toBe("return input * 2;");
  });

  it("shows empty string when code is empty", () => {
    render(<CustomCodeNode {...makeProps({ code: "" })} />);
    const ta = screen.getByRole("textbox");
    expect((ta as HTMLTextAreaElement).value).toBe("");
  });

  it("calls onChange with updated code on user input", () => {
    const onChange = vi.fn();
    render(<CustomCodeNode {...makeProps({ onChange })} />);
    const ta = screen.getByRole("textbox");
    fireEvent.change(ta, { target: { value: "return 42;" } });
    expect(onChange).toHaveBeenCalledWith({ code: "return 42;" });
  });

  it("calls onChange with empty string when user clears the textarea", () => {
    const onChange = vi.fn();
    render(<CustomCodeNode {...makeProps({ code: "return 1;", onChange })} />);
    const ta = screen.getByRole("textbox");
    fireEvent.change(ta, { target: { value: "" } });
    expect(onChange).toHaveBeenCalledWith({ code: "" });
  });

  it("calls onChange with multiline code", () => {
    const onChange = vi.fn();
    render(<CustomCodeNode {...makeProps({ onChange })} />);
    const ta = screen.getByRole("textbox");
    const multiline = "const x = input;\nreturn x + 1;";
    fireEvent.change(ta, { target: { value: multiline } });
    expect(onChange).toHaveBeenCalledWith({ code: multiline });
  });

  it("does not crash when onChange is undefined", () => {
    render(<CustomCodeNode {...makeProps({ onChange: undefined })} />);
    const ta = screen.getByRole("textbox");
    expect(() => fireEvent.change(ta, { target: { value: "return 1;" } })).not.toThrow();
  });

  it("textarea has spellCheck disabled", () => {
    render(<CustomCodeNode {...makeProps()} />);
    const ta = screen.getByRole("textbox");
    expect(ta).toHaveAttribute("spellCheck", "false");
  });

  it("textarea has 5 rows", () => {
    render(<CustomCodeNode {...makeProps()} />);
    const ta = screen.getByRole("textbox");
    expect(ta).toHaveAttribute("rows", "5");
  });
});

// ─── 4. connectedHandles ──────────────────────────────────────────────────────

describe("CustomCodeNode — connectedHandles", () => {
  it("does not crash with undefined connectedHandles", () => {
    const props = makeProps();
    (props.data as Record<string, unknown>).connectedHandles = undefined;
    expect(() => render(<CustomCodeNode {...props} />)).not.toThrow();
  });

  it("does not crash with empty connectedHandles", () => {
    render(<CustomCodeNode {...makeProps({ connectedHandles: [] })} />);
    expect(screen.getByText("Custom Code")).toBeInTheDocument();
  });

  it("does not crash when connectedHandles includes 'input'", () => {
    render(<CustomCodeNode {...makeProps({ connectedHandles: ["input"] })} />);
    expect(screen.getByText("input")).toBeInTheDocument();
  });

  it("renders 'input' label regardless of connection state", () => {
    const { rerender } = render(<CustomCodeNode {...makeProps({ connectedHandles: [] })} />);
    expect(screen.getByText("input")).toBeInTheDocument();
    rerender(<CustomCodeNode {...makeProps({ connectedHandles: ["input"] })} />);
    expect(screen.getByText("input")).toBeInTheDocument();
  });
});

// ─── 5. Default value fallbacks ───────────────────────────────────────────────

describe("CustomCodeNode — default value fallbacks", () => {
  it("uses code='' when not provided", () => {
    const props = makeProps();
    delete (props.data as Record<string, unknown>).code;
    render(<CustomCodeNode {...props} />);
    const ta = screen.getByRole("textbox");
    expect((ta as HTMLTextAreaElement).value).toBe("");
  });

  it("renders without crashing when data is entirely empty object", () => {
    const props = { id: "node-cc", data: {}, selected: false } as NodeProps;
    expect(() => render(<CustomCodeNode {...props} />)).not.toThrow();
  });
});

// ─── 6. Selected state ────────────────────────────────────────────────────────

describe("CustomCodeNode — selected state", () => {
  it("renders without crashing when selected=true", () => {
    render(<CustomCodeNode {...makeProps()} selected={true} />);
    expect(screen.getByText("Custom Code")).toBeInTheDocument();
  });

  it("renders without crashing when selected=false", () => {
    render(<CustomCodeNode {...makeProps()} selected={false} />);
    expect(screen.getByText("Custom Code")).toBeInTheDocument();
  });

  it("both handles present regardless of selected state", () => {
    render(<CustomCodeNode {...makeProps()} selected={true} />);
    expect(screen.getByTestId("handle-input")).toBeInTheDocument();
    expect(screen.getByTestId("handle-output")).toBeInTheDocument();
  });
});
