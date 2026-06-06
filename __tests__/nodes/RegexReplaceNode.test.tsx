import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { RegexReplaceNode } from "@/components/canvas/nodes/RegexReplaceNode";
import type { RegexReplaceNodeData } from "@/components/canvas/nodes/RegexReplaceNode";
import type { NodeProps } from "@xyflow/react";

vi.mock("@xyflow/react", () => ({
  Handle: ({ id, type, position }: { id: string; type: string; position: string }) => (
    <div data-testid={`handle-${id}`} data-handle-type={type} data-position={position} />
  ),
  Position: { Left: "left", Right: "right" },
  useViewport: () => ({ zoom: 1 }),
}));

const DEFAULT_DATA: RegexReplaceNodeData = {
  pattern: "",
  replace: "",
  flags: "g",
};

function makeProps(overrides: Partial<RegexReplaceNodeData> = {}): NodeProps {
  const data: RegexReplaceNodeData = { ...DEFAULT_DATA, ...overrides };
  return { id: "node-1", data: data as unknown as Record<string, unknown>, selected: false } as NodeProps;
}

// ─── 1. Rendering ────────────────────────────────────────────────────────────

describe("RegexReplaceNode — rendering", () => {
  it("renders without crashing with default data", () => {
    render(<RegexReplaceNode {...makeProps()} />);
    expect(screen.getByText("Regex Replace")).toBeInTheDocument();
  });

  it("shows the subtitle", () => {
    render(<RegexReplaceNode {...makeProps()} />);
    expect(screen.getByText("find & replace with regex")).toBeInTheDocument();
  });

  it("shows Pattern, Replace, and Flags labels", () => {
    render(<RegexReplaceNode {...makeProps()} />);
    expect(screen.getByText("Pattern")).toBeInTheDocument();
    expect(screen.getByText("Replace")).toBeInTheDocument();
    expect(screen.getByText("Flags")).toBeInTheDocument();
  });

  it("shows Preview label", () => {
    render(<RegexReplaceNode {...makeProps()} />);
    expect(screen.getByText("Preview")).toBeInTheDocument();
  });

  it("shows 'string' output label", () => {
    render(<RegexReplaceNode {...makeProps()} />);
    expect(screen.getByText("string")).toBeInTheDocument();
  });
});

// ─── 2. Handles ──────────────────────────────────────────────────────────────

describe("RegexReplaceNode — handles", () => {
  it("renders input handle (target, left)", () => {
    render(<RegexReplaceNode {...makeProps()} />);
    const h = screen.getByTestId("handle-input");
    expect(h).toHaveAttribute("data-handle-type", "target");
    expect(h).toHaveAttribute("data-position", "left");
  });

  it("renders pattern handle (target, left)", () => {
    render(<RegexReplaceNode {...makeProps()} />);
    const h = screen.getByTestId("handle-pattern");
    expect(h).toHaveAttribute("data-handle-type", "target");
    expect(h).toHaveAttribute("data-position", "left");
  });

  it("renders replace handle (target, left)", () => {
    render(<RegexReplaceNode {...makeProps()} />);
    const h = screen.getByTestId("handle-replace");
    expect(h).toHaveAttribute("data-handle-type", "target");
    expect(h).toHaveAttribute("data-position", "left");
  });

  it("renders output handle (source, right)", () => {
    render(<RegexReplaceNode {...makeProps()} />);
    const h = screen.getByTestId("handle-output");
    expect(h).toHaveAttribute("data-handle-type", "source");
    expect(h).toHaveAttribute("data-position", "right");
  });

  it("has exactly four handles", () => {
    render(<RegexReplaceNode {...makeProps()} />);
    expect(screen.getAllByTestId(/^handle-/)).toHaveLength(4);
  });
});

// ─── 2b. connectedHandles label highlight ─────────────────────────────────────

describe("RegexReplaceNode — connectedHandles label highlight", () => {
  it("Pattern label is highlighted when 'pattern' is in connectedHandles", () => {
    render(<RegexReplaceNode {...makeProps({ connectedHandles: ["pattern"] })} />);
    // highlighted label uses text-teal-300; not the default text-white/30
    const labels = screen.getAllByText("Pattern");
    expect(labels[0].className).toContain("text-teal-300");
  });

  it("Replace label is highlighted when 'replace' is in connectedHandles", () => {
    render(<RegexReplaceNode {...makeProps({ connectedHandles: ["replace"] })} />);
    const labels = screen.getAllByText("Replace");
    expect(labels[0].className).toContain("text-teal-300");
  });

  it("Pattern label is dimmed when 'pattern' is not connected", () => {
    render(<RegexReplaceNode {...makeProps({ connectedHandles: [] })} />);
    const labels = screen.getAllByText("Pattern");
    expect(labels[0].className).toContain("text-white/30");
  });

  it("Replace label is dimmed when 'replace' is not connected", () => {
    render(<RegexReplaceNode {...makeProps({ connectedHandles: [] })} />);
    const labels = screen.getAllByText("Replace");
    expect(labels[0].className).toContain("text-white/30");
  });
});

// ─── 3. Live preview — valid patterns ────────────────────────────────────────

describe("RegexReplaceNode — live preview (valid)", () => {
  it("shows the sample string unchanged when pattern is empty", () => {
    render(<RegexReplaceNode {...makeProps({ pattern: "", replace: "" })} />);
    expect(screen.getByText("Hello World 123")).toBeInTheDocument();
  });

  it("replaces digits with ** when pattern=\\d+ replace=**", () => {
    render(<RegexReplaceNode {...makeProps({ pattern: "\\d+", replace: "**", flags: "g" })} />);
    expect(screen.getByText("Hello World **")).toBeInTheDocument();
  });

  it("replaces first occurrence only when flags='' (no g flag)", () => {
    render(<RegexReplaceNode {...makeProps({ pattern: "l", replace: "L", flags: "" })} />);
    expect(screen.getByText("HeLlo World 123")).toBeInTheDocument();
  });

  it("replaces all occurrences with g flag", () => {
    render(<RegexReplaceNode {...makeProps({ pattern: "l", replace: "L", flags: "g" })} />);
    expect(screen.getByText("HeLLo WorLd 123")).toBeInTheDocument();
  });

  it("case-insensitive match with i flag", () => {
    render(<RegexReplaceNode {...makeProps({ pattern: "hello", replace: "Hi", flags: "gi" })} />);
    expect(screen.getByText("Hi World 123")).toBeInTheDocument();
  });

  it("replace with empty string removes matched text", () => {
    render(<RegexReplaceNode {...makeProps({ pattern: "\\s+", replace: "", flags: "g" })} />);
    expect(screen.getByText("HelloWorld123")).toBeInTheDocument();
  });

  it("supports capture group backreference $1", () => {
    render(<RegexReplaceNode {...makeProps({ pattern: "(\\d+)", replace: "[$1]", flags: "g" })} />);
    expect(screen.getByText("Hello World [123]")).toBeInTheDocument();
  });
});

// ─── 4. Live preview — invalid pattern ───────────────────────────────────────

describe("RegexReplaceNode — live preview (invalid)", () => {
  it("shows 'Invalid regex' for an invalid pattern", () => {
    render(<RegexReplaceNode {...makeProps({ pattern: "[unclosed", replace: "", flags: "g" })} />);
    expect(screen.getByText("Invalid regex")).toBeInTheDocument();
  });

  it("shows 'Invalid regex' for invalid flags", () => {
    render(<RegexReplaceNode {...makeProps({ pattern: "a", replace: "b", flags: "zzz" })} />);
    expect(screen.getByText("Invalid regex")).toBeInTheDocument();
  });

  it("does not show the sample string when pattern is invalid", () => {
    render(<RegexReplaceNode {...makeProps({ pattern: "[unclosed", replace: "" })} />);
    expect(screen.queryByText("Hello World 123")).not.toBeInTheDocument();
  });
});

// ─── 5. onChange callbacks ────────────────────────────────────────────────────

describe("RegexReplaceNode — onChange", () => {
  it("calls onChange({ pattern }) when Pattern field changes", () => {
    const onChange = vi.fn();
    render(<RegexReplaceNode {...makeProps({ onChange })} />);
    const [patternInput] = screen.getAllByRole("textbox");
    fireEvent.change(patternInput, { target: { value: "\\d+" } });
    expect(onChange).toHaveBeenCalledWith({ pattern: "\\d+" });
  });

  it("calls onChange({ replace }) when Replace field changes", () => {
    const onChange = vi.fn();
    render(<RegexReplaceNode {...makeProps({ onChange })} />);
    const inputs = screen.getAllByRole("textbox");
    fireEvent.change(inputs[1], { target: { value: "**" } });
    expect(onChange).toHaveBeenCalledWith({ replace: "**" });
  });

  it("calls onChange({ flags }) when Flags input changes", () => {
    const onChange = vi.fn();
    render(<RegexReplaceNode {...makeProps({ onChange })} />);
    const inputs = screen.getAllByRole("textbox");
    fireEvent.change(inputs[2], { target: { value: "gi" } });
    expect(onChange).toHaveBeenCalledWith({ flags: "gi" });
  });

  it("does not throw when inputs change without onChange", () => {
    expect(() => {
      render(<RegexReplaceNode {...makeProps()} />);
      const [p, r, f] = screen.getAllByRole("textbox");
      fireEvent.change(p, { target: { value: "x" } });
      fireEvent.change(r, { target: { value: "y" } });
      fireEvent.change(f, { target: { value: "i" } });
    }).not.toThrow();
  });

  it("calls onChange exactly once per change event", () => {
    const onChange = vi.fn();
    render(<RegexReplaceNode {...makeProps({ onChange })} />);
    fireEvent.change(screen.getAllByRole("textbox")[0], { target: { value: "abc" } });
    expect(onChange).toHaveBeenCalledTimes(1);
  });
});

// ─── 6. Field values reflect props ────────────────────────────────────────────

describe("RegexReplaceNode — field values", () => {
  it("Pattern input reflects the current pattern", () => {
    render(<RegexReplaceNode {...makeProps({ pattern: "\\w+" })} />);
    expect(screen.getAllByRole("textbox")[0]).toHaveValue("\\w+");
  });

  it("Replace input reflects the current replace", () => {
    render(<RegexReplaceNode {...makeProps({ replace: "X" })} />);
    expect(screen.getAllByRole("textbox")[1]).toHaveValue("X");
  });

  it("Flags input reflects the current flags", () => {
    render(<RegexReplaceNode {...makeProps({ flags: "gi" })} />);
    expect(screen.getAllByRole("textbox")[2]).toHaveValue("gi");
  });
});

// ─── 7. Fallback defaults ─────────────────────────────────────────────────────

describe("RegexReplaceNode — fallback defaults", () => {
  it("defaults pattern to '' when undefined — shows sample text in preview", () => {
    const props = makeProps();
    (props.data as Record<string, unknown>).pattern = undefined;
    render(<RegexReplaceNode {...props} />);
    expect(screen.getByText("Hello World 123")).toBeInTheDocument();
  });

  it("defaults flags to 'g' when undefined", () => {
    const props = makeProps({ pattern: "" });
    (props.data as Record<string, unknown>).flags = undefined;
    render(<RegexReplaceNode {...props} />);
    expect(screen.getAllByRole("textbox")[2]).toHaveValue("g");
  });

  it("defaults replace to '' when undefined — substitutes empty string", () => {
    const props = makeProps({ pattern: "\\d+", flags: "g" });
    (props.data as Record<string, unknown>).replace = undefined;
    render(<RegexReplaceNode {...props} />);
    // digits removed → "Hello World " (trailing space); regex matcher ignores trailing whitespace
    expect(screen.getByText(/^Hello World\s*$/)).toBeInTheDocument();
  });
});

// ─── 8. Selected state ────────────────────────────────────────────────────────

describe("RegexReplaceNode — selected state", () => {
  it("renders without crashing when selected=true", () => {
    render(<RegexReplaceNode {...makeProps()} selected={true} />);
    expect(screen.getByText("Regex Replace")).toBeInTheDocument();
  });

  it("renders without crashing when selected=false", () => {
    render(<RegexReplaceNode {...makeProps()} selected={false} />);
    expect(screen.getByText("Regex Replace")).toBeInTheDocument();
  });
});
