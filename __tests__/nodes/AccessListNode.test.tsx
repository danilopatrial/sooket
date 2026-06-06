import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { AccessListNode } from "@/components/canvas/nodes/AccessListNode";
import type { AccessListNodeData } from "@/components/canvas/nodes/AccessListNode";
import type { NodeProps } from "@xyflow/react";

vi.mock("@xyflow/react", () => ({
  Handle: ({ id, type, position }: { id: string; type: string; position: string }) => (
    <div data-testid={`handle-${id}`} data-handle-type={type} data-position={position} />
  ),
  Position: { Left: "left", Right: "right" },
  useViewport: () => ({ zoom: 1 }),
}));

function makeProps(overrides: Partial<AccessListNodeData> = {}): NodeProps {
  const data: AccessListNodeData = { mode: "whitelist", ...overrides };
  return { id: "n1", data: data as unknown as Record<string, unknown>, selected: false } as NodeProps;
}

describe("AccessListNode — rendering", () => {
  it("renders without crashing", () => {
    render(<AccessListNode {...makeProps()} />);
    expect(screen.getByText("Access List")).toBeInTheDocument();
  });

  it("shows 'filter by stored values' subtitle", () => {
    render(<AccessListNode {...makeProps()} />);
    expect(screen.getByText("filter by stored values")).toBeInTheDocument();
  });

  it("shows 'allow' badge in whitelist mode", () => {
    render(<AccessListNode {...makeProps({ mode: "whitelist" })} />);
    expect(screen.getByText("allow")).toBeInTheDocument();
  });

  it("shows 'deny' badge in blacklist mode", () => {
    render(<AccessListNode {...makeProps({ mode: "blacklist" })} />);
    expect(screen.getByText("deny")).toBeInTheDocument();
  });
});

describe("AccessListNode — handles", () => {
  it("renders input handle (target, left)", () => {
    render(<AccessListNode {...makeProps()} />);
    const h = screen.getByTestId("handle-input");
    expect(h).toHaveAttribute("data-handle-type", "target");
    expect(h).toHaveAttribute("data-position", "left");
  });

  it("renders pass handle (source, right)", () => {
    render(<AccessListNode {...makeProps()} />);
    expect(screen.getByTestId("handle-pass")).toHaveAttribute("data-handle-type", "source");
  });

  it("renders block handle (source, right)", () => {
    render(<AccessListNode {...makeProps()} />);
    expect(screen.getByTestId("handle-block")).toHaveAttribute("data-handle-type", "source");
  });

  it("renders match handle (source, right)", () => {
    render(<AccessListNode {...makeProps()} />);
    expect(screen.getByTestId("handle-match")).toHaveAttribute("data-handle-type", "source");
  });

  it("renders exactly 4 handles", () => {
    render(<AccessListNode {...makeProps()} />);
    expect(screen.getAllByTestId(/^handle-/)).toHaveLength(4);
  });
});

describe("AccessListNode — mode toggle", () => {
  it("calls onChange({ mode: 'blacklist' }) when blacklist button clicked", () => {
    const onChange = vi.fn();
    render(<AccessListNode {...makeProps({ onChange })} />);
    fireEvent.click(screen.getByRole("button", { name: /blacklist/i }));
    expect(onChange).toHaveBeenCalledWith({ mode: "blacklist" });
  });

  it("calls onChange({ mode: 'whitelist' }) when whitelist button clicked", () => {
    const onChange = vi.fn();
    render(<AccessListNode {...makeProps({ mode: "blacklist", onChange })} />);
    fireEvent.click(screen.getByRole("button", { name: /whitelist/i }));
    expect(onChange).toHaveBeenCalledWith({ mode: "whitelist" });
  });

  it("does not throw when onChange is not provided and button is clicked", () => {
    render(<AccessListNode {...makeProps()} />);
    expect(() => fireEvent.click(screen.getByRole("button", { name: /blacklist/i }))).not.toThrow();
  });
});
