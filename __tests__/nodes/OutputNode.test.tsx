import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { OutputNode } from "@/components/canvas/nodes/OutputNode";
import type { NodeProps } from "@xyflow/react";

vi.mock("@xyflow/react", () => ({
  Handle: ({ id, type, position }: { id?: string; type: string; position: string }) => (
    <div
      data-testid={id ? `handle-${id}` : "handle"}
      data-handle-type={type}
      data-position={position}
    />
  ),
  Position: { Left: "left", Right: "right" },
}));

function makeProps(): NodeProps {
  return { id: "n1", data: {}, selected: false } as NodeProps;
}

describe("OutputNode — rendering", () => {
  it("renders without crashing", () => {
    render(<OutputNode {...makeProps()} />);
    expect(screen.getByText("Output")).toBeInTheDocument();
  });

  it("shows 'API response' subtitle", () => {
    render(<OutputNode {...makeProps()} />);
    expect(screen.getByText("API response")).toBeInTheDocument();
  });

  it("renders without crashing when selected=true", () => {
    render(<OutputNode {...makeProps()} selected={true} />);
    expect(screen.getByText("Output")).toBeInTheDocument();
  });

  it("renders without crashing when selected=false", () => {
    render(<OutputNode {...makeProps()} selected={false} />);
    expect(screen.getByText("Output")).toBeInTheDocument();
  });
});

describe("OutputNode — handles", () => {
  it("renders exactly one handle", () => {
    render(<OutputNode {...makeProps()} />);
    expect(screen.getAllByTestId(/^handle/)).toHaveLength(1);
  });

  it("renders a target (input) handle", () => {
    render(<OutputNode {...makeProps()} />);
    const h = screen.getByTestId("handle");
    expect(h).toHaveAttribute("data-handle-type", "target");
  });

  it("handle is positioned on the left", () => {
    render(<OutputNode {...makeProps()} />);
    expect(screen.getByTestId("handle")).toHaveAttribute("data-position", "left");
  });
});
