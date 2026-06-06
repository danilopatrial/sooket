import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { XmlJsonNode } from "@/components/canvas/nodes/XmlJsonNode";
import type { XmlJsonNodeData, XmlJsonDirection } from "@/components/canvas/nodes/XmlJsonNode";
import type { NodeProps } from "@xyflow/react";

vi.mock("@xyflow/react", () => ({
  Handle: ({ id, type, position }: { id: string; type: string; position: string }) => (
    <div data-testid={`handle-${id}`} data-handle-type={type} data-position={position} />
  ),
  Position: { Left: "left", Right: "right" },
}));

const DEFAULT_DATA: XmlJsonNodeData = {
  direction: "xml-to-json",
  rootElement: "root",
  prettyPrint: false,
};

function makeProps(overrides: Partial<XmlJsonNodeData> = {}): NodeProps {
  const data: XmlJsonNodeData = { ...DEFAULT_DATA, ...overrides };
  return { id: "node-1", data: data as unknown as Record<string, unknown>, selected: false } as NodeProps;
}

const ALL_DIRECTIONS: XmlJsonDirection[] = ["xml-to-json", "json-to-xml"];

// ─── 1. Rendering ─────────────────────────────────────────────────────────────

describe("XmlJsonNode — rendering", () => {
  it("renders without crashing with default data", () => {
    render(<XmlJsonNode {...makeProps()} />);
    expect(screen.getByText("XML ↔ JSON")).toBeInTheDocument();
  });

  it("renders the Direction section label", () => {
    render(<XmlJsonNode {...makeProps()} />);
    expect(screen.getByText("Direction")).toBeInTheDocument();
  });

  it("renders both direction buttons", () => {
    render(<XmlJsonNode {...makeProps()} />);
    expect(screen.getByText("XML - JSON")).toBeInTheDocument();
    expect(screen.getByText("JSON - XML")).toBeInTheDocument();
  });

  it("renders the Pretty Print label", () => {
    render(<XmlJsonNode {...makeProps()} />);
    expect(screen.getByText("Pretty Print")).toBeInTheDocument();
  });

  it("does not show Root Element field when direction is xml-to-json", () => {
    render(<XmlJsonNode {...makeProps({ direction: "xml-to-json" })} />);
    expect(screen.queryByText("Root Element")).not.toBeInTheDocument();
  });

  it("shows Root Element field when direction is json-to-xml", () => {
    render(<XmlJsonNode {...makeProps({ direction: "json-to-xml" })} />);
    expect(screen.getByText("Root Element")).toBeInTheDocument();
  });

  it("Root Element input shows the configured rootElement value", () => {
    render(<XmlJsonNode {...makeProps({ direction: "json-to-xml", rootElement: "items" })} />);
    const input = screen.getByPlaceholderText("root") as HTMLInputElement;
    expect(input.value).toBe("items");
  });

  it("Root Element input shows 'root' as default value", () => {
    render(<XmlJsonNode {...makeProps({ direction: "json-to-xml" })} />);
    const input = screen.getByPlaceholderText("root") as HTMLInputElement;
    expect(input.value).toBe("root");
  });
});

// ─── 2. Header subtitle ───────────────────────────────────────────────────────

describe("XmlJsonNode — header subtitle", () => {
  it("shows 'xml - json' subtitle when direction is xml-to-json", () => {
    render(<XmlJsonNode {...makeProps({ direction: "xml-to-json" })} />);
    expect(screen.getByText("xml - json")).toBeInTheDocument();
  });

  it("shows 'json - xml' subtitle when direction is json-to-xml", () => {
    render(<XmlJsonNode {...makeProps({ direction: "json-to-xml" })} />);
    expect(screen.getByText("json - xml")).toBeInTheDocument();
  });

  it.each(ALL_DIRECTIONS)("subtitle reflects direction '%s'", (direction) => {
    render(<XmlJsonNode {...makeProps({ direction })} />);
    const expected = direction === "xml-to-json" ? "xml - json" : "json - xml";
    expect(screen.getByText(expected)).toBeInTheDocument();
  });
});

// ─── 3. Handles ───────────────────────────────────────────────────────────────

describe("XmlJsonNode — handles", () => {
  it("renders the input handle (target, left)", () => {
    render(<XmlJsonNode {...makeProps()} />);
    const h = screen.getByTestId("handle-input");
    expect(h).toHaveAttribute("data-handle-type", "target");
    expect(h).toHaveAttribute("data-position", "left");
  });

  it("renders the output handle (source, right)", () => {
    render(<XmlJsonNode {...makeProps()} />);
    const h = screen.getByTestId("handle-output");
    expect(h).toHaveAttribute("data-handle-type", "source");
    expect(h).toHaveAttribute("data-position", "right");
  });

  it("has exactly two handles regardless of direction", () => {
    for (const direction of ALL_DIRECTIONS) {
      const { unmount } = render(<XmlJsonNode {...makeProps({ direction })} />);
      expect(screen.getAllByTestId(/^handle-/)).toHaveLength(2);
      unmount();
    }
  });
});

// ─── 4. Direction button onChange ─────────────────────────────────────────────

describe("XmlJsonNode — direction onChange", () => {
  it("calls onChange({ direction: 'xml-to-json' }) when XML→JSON button clicked", () => {
    const onChange = vi.fn();
    render(<XmlJsonNode {...makeProps({ direction: "json-to-xml", onChange })} />);
    fireEvent.click(screen.getByText("XML - JSON"));
    expect(onChange).toHaveBeenCalledWith({ direction: "xml-to-json" });
  });

  it("calls onChange({ direction: 'json-to-xml' }) when JSON→XML button clicked", () => {
    const onChange = vi.fn();
    render(<XmlJsonNode {...makeProps({ onChange })} />);
    fireEvent.click(screen.getByText("JSON - XML"));
    expect(onChange).toHaveBeenCalledWith({ direction: "json-to-xml" });
  });

  it("calls onChange exactly once per direction button click", () => {
    const onChange = vi.fn();
    render(<XmlJsonNode {...makeProps({ onChange })} />);
    fireEvent.click(screen.getByText("JSON - XML"));
    expect(onChange).toHaveBeenCalledTimes(1);
  });

  it("clicking already-active direction still calls onChange", () => {
    const onChange = vi.fn();
    render(<XmlJsonNode {...makeProps({ direction: "xml-to-json", onChange })} />);
    fireEvent.click(screen.getByText("XML - JSON"));
    expect(onChange).toHaveBeenCalledWith({ direction: "xml-to-json" });
  });

  it("does not throw when direction clicked with no onChange", () => {
    expect(() => {
      render(<XmlJsonNode {...makeProps()} />);
      fireEvent.click(screen.getByText("JSON - XML"));
    }).not.toThrow();
  });
});

// ─── 5. Pretty Print toggle onChange ─────────────────────────────────────────

describe("XmlJsonNode — prettyPrint toggle onChange", () => {
  it("calls onChange({ prettyPrint: true }) when toggled from false", () => {
    const onChange = vi.fn();
    render(<XmlJsonNode {...makeProps({ prettyPrint: false, onChange })} />);
    fireEvent.click(screen.getByRole("button", { name: "" }));
    expect(onChange).toHaveBeenCalledWith({ prettyPrint: true });
  });

  it("calls onChange({ prettyPrint: false }) when toggled from true", () => {
    const onChange = vi.fn();
    render(<XmlJsonNode {...makeProps({ prettyPrint: true, onChange })} />);
    fireEvent.click(screen.getByRole("button", { name: "" }));
    expect(onChange).toHaveBeenCalledWith({ prettyPrint: false });
  });

  it("does not throw when pretty print toggled with no onChange", () => {
    expect(() => {
      render(<XmlJsonNode {...makeProps({ prettyPrint: false })} />);
      fireEvent.click(screen.getByRole("button", { name: "" }));
    }).not.toThrow();
  });
});

// ─── 6. Root Element input onChange ──────────────────────────────────────────

describe("XmlJsonNode — rootElement input onChange", () => {
  it("calls onChange({ rootElement: value }) when input changes", () => {
    const onChange = vi.fn();
    render(<XmlJsonNode {...makeProps({ direction: "json-to-xml", onChange })} />);
    const input = screen.getByPlaceholderText("root");
    fireEvent.change(input, { target: { value: "items" } });
    expect(onChange).toHaveBeenCalledWith({ rootElement: "items" });
  });

  it("calls onChange with empty string when input is cleared", () => {
    const onChange = vi.fn();
    render(<XmlJsonNode {...makeProps({ direction: "json-to-xml", rootElement: "data", onChange })} />);
    const input = screen.getByPlaceholderText("root");
    fireEvent.change(input, { target: { value: "" } });
    expect(onChange).toHaveBeenCalledWith({ rootElement: "" });
  });

  it("root input is not present when direction is xml-to-json", () => {
    render(<XmlJsonNode {...makeProps({ direction: "xml-to-json" })} />);
    expect(screen.queryByPlaceholderText("root")).not.toBeInTheDocument();
  });
});

// ─── 7. Fallback defaults ─────────────────────────────────────────────────────

describe("XmlJsonNode — fallback defaults", () => {
  it("defaults direction to xml-to-json when direction is undefined", () => {
    const props = makeProps();
    (props.data as Record<string, unknown>).direction = undefined;
    render(<XmlJsonNode {...props} />);
    expect(screen.getByText("xml - json")).toBeInTheDocument();
  });

  it("defaults prettyPrint to false when prettyPrint is undefined", () => {
    const props = makeProps();
    (props.data as Record<string, unknown>).prettyPrint = undefined;
    expect(() => render(<XmlJsonNode {...props} />)).not.toThrow();
  });

  it("does not crash when all data fields are undefined", () => {
    const props: NodeProps = {
      id: "node-1",
      data: {} as Record<string, unknown>,
      selected: false,
    } as NodeProps;
    expect(() => render(<XmlJsonNode {...props} />)).not.toThrow();
  });
});

// ─── 8. Selected state ────────────────────────────────────────────────────────

describe("XmlJsonNode — selected state", () => {
  it("renders without crashing when selected=true", () => {
    render(<XmlJsonNode {...makeProps()} selected={true} />);
    expect(screen.getByText("XML ↔ JSON")).toBeInTheDocument();
  });

  it("renders without crashing when selected=false", () => {
    render(<XmlJsonNode {...makeProps()} selected={false} />);
    expect(screen.getByText("XML ↔ JSON")).toBeInTheDocument();
  });
});
