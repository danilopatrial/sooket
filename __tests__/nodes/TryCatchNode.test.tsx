import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { TryCatchNode } from "@/components/canvas/nodes/TryCatchNode";
import type { TryCatchNodeData } from "@/components/canvas/nodes/TryCatchNode";
import type { NodeProps } from "@xyflow/react";

vi.mock("@xyflow/react", () => ({
  Handle: ({ id, type, position }: { id: string; type: string; position: string }) => (
    <div data-testid={`handle-${id}`} data-handle-type={type} data-position={position} />
  ),
  Position: { Left: "left", Right: "right" },
  useViewport: () => ({ zoom: 1 }),
}));

function makeProps(overrides: Partial<TryCatchNodeData> = {}): NodeProps {
  const data: TryCatchNodeData = { ...overrides };
  return { id: "node-1", data: data as unknown as Record<string, unknown>, selected: false } as NodeProps;
}

// ─── 1. Rendering ─────────────────────────────────────────────────────────────

describe("TryCatchNode — rendering", () => {
  it("renders without crashing with empty defaultData", () => {
    render(<TryCatchNode {...makeProps()} />);
    expect(screen.getByText("Try / Catch")).toBeInTheDocument();
  });

  it("shows the subtitle 'wrap upstream chain'", () => {
    render(<TryCatchNode {...makeProps()} />);
    expect(screen.getByText("wrap upstream chain")).toBeInTheDocument();
  });

  it("shows the 'try' input row label", () => {
    render(<TryCatchNode {...makeProps()} />);
    expect(screen.getByText("try")).toBeInTheDocument();
  });

  it("shows the 'result' output row label", () => {
    render(<TryCatchNode {...makeProps()} />);
    expect(screen.getByText("result")).toBeInTheDocument();
  });

  it("shows the 'error' output row label", () => {
    render(<TryCatchNode {...makeProps()} />);
    expect(screen.getByText("error")).toBeInTheDocument();
  });

  it("shows the 'upstream chain' hint text", () => {
    render(<TryCatchNode {...makeProps()} />);
    expect(screen.getByText("upstream chain")).toBeInTheDocument();
  });

  it("shows the 'value' output type hint", () => {
    render(<TryCatchNode {...makeProps()} />);
    expect(screen.getByText("value")).toBeInTheDocument();
  });

  it("shows the 'string' error type hint", () => {
    render(<TryCatchNode {...makeProps()} />);
    expect(screen.getByText("string")).toBeInTheDocument();
  });

  it("renders no interactive controls (no buttons or textboxes)", () => {
    render(<TryCatchNode {...makeProps()} />);
    expect(screen.queryAllByRole("button")).toHaveLength(0);
    expect(screen.queryAllByRole("textbox")).toHaveLength(0);
  });
});

// ─── 2. Handles ───────────────────────────────────────────────────────────────

describe("TryCatchNode — handles", () => {
  it("renders the 'try' handle as target on the left", () => {
    render(<TryCatchNode {...makeProps()} />);
    const h = screen.getByTestId("handle-try");
    expect(h).toHaveAttribute("data-handle-type", "target");
    expect(h).toHaveAttribute("data-position", "left");
  });

  it("renders the 'result' handle as source on the right", () => {
    render(<TryCatchNode {...makeProps()} />);
    const h = screen.getByTestId("handle-result");
    expect(h).toHaveAttribute("data-handle-type", "source");
    expect(h).toHaveAttribute("data-position", "right");
  });

  it("renders the 'error' handle as source on the right", () => {
    render(<TryCatchNode {...makeProps()} />);
    const h = screen.getByTestId("handle-error");
    expect(h).toHaveAttribute("data-handle-type", "source");
    expect(h).toHaveAttribute("data-position", "right");
  });

  it("has exactly 3 handles total (1 target + 2 sources)", () => {
    render(<TryCatchNode {...makeProps()} />);
    expect(screen.getAllByTestId(/^handle-/)).toHaveLength(3);
  });

  it("does not render any extra handles beyond try, result, error", () => {
    render(<TryCatchNode {...makeProps()} />);
    expect(screen.queryByTestId("handle-input")).not.toBeInTheDocument();
    expect(screen.queryByTestId("handle-output")).not.toBeInTheDocument();
  });
});

// ─── 3. connectedHandles ──────────────────────────────────────────────────────

describe("TryCatchNode — connectedHandles", () => {
  it("does not crash when connectedHandles is undefined", () => {
    const props = makeProps();
    (props.data as Record<string, unknown>).connectedHandles = undefined;
    expect(() => render(<TryCatchNode {...props} />)).not.toThrow();
  });

  it("does not crash when connectedHandles includes 'try'", () => {
    render(<TryCatchNode {...makeProps({ connectedHandles: ["try"] })} />);
    expect(screen.getByText("try")).toBeInTheDocument();
  });

  it("renders correctly with empty connectedHandles array", () => {
    render(<TryCatchNode {...makeProps({ connectedHandles: [] })} />);
    expect(screen.getByText("Try / Catch")).toBeInTheDocument();
  });
});

// ─── 4. Selected state ────────────────────────────────────────────────────────

describe("TryCatchNode — selected state", () => {
  it("renders without crashing when selected=true", () => {
    render(<TryCatchNode {...makeProps()} selected={true} />);
    expect(screen.getByText("Try / Catch")).toBeInTheDocument();
  });

  it("renders without crashing when selected=false", () => {
    render(<TryCatchNode {...makeProps()} selected={false} />);
    expect(screen.getByText("Try / Catch")).toBeInTheDocument();
  });

  it("still shows all three handles regardless of selected state", () => {
    render(<TryCatchNode {...makeProps()} selected={true} />);
    expect(screen.getByTestId("handle-try")).toBeInTheDocument();
    expect(screen.getByTestId("handle-result")).toBeInTheDocument();
    expect(screen.getByTestId("handle-error")).toBeInTheDocument();
  });
});

// ─── 5. Structure invariants ──────────────────────────────────────────────────

describe("TryCatchNode — structure invariants", () => {
  it("result and error handles are both on the right (source side)", () => {
    render(<TryCatchNode {...makeProps()} />);
    expect(screen.getByTestId("handle-result")).toHaveAttribute("data-position", "right");
    expect(screen.getByTestId("handle-error")).toHaveAttribute("data-position", "right");
  });

  it("only the try handle is a target (input)", () => {
    render(<TryCatchNode {...makeProps()} />);
    const allHandles = screen.getAllByTestId(/^handle-/);
    const targets = allHandles.filter(h => h.getAttribute("data-handle-type") === "target");
    expect(targets).toHaveLength(1);
    expect(targets[0]).toHaveAttribute("data-testid", "handle-try");
  });

  it("both result and error handles are sources (outputs)", () => {
    render(<TryCatchNode {...makeProps()} />);
    const allHandles = screen.getAllByTestId(/^handle-/);
    const sources = allHandles.filter(h => h.getAttribute("data-handle-type") === "source");
    expect(sources).toHaveLength(2);
  });
});
