import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { InputNode } from "@/components/canvas/nodes/InputNode";
import type { NodeProps } from "@xyflow/react";

vi.mock("@xyflow/react", () => ({
  Handle: ({ id, type, position }: { id: string; type: string; position: string }) => (
    <div data-testid={`handle-${id}`} data-handle-type={type} data-position={position} />
  ),
  Position: { Left: "left", Right: "right" },
  useViewport: () => ({ zoom: 1 }),
}));

function makeProps(): NodeProps {
  return { id: "n1", data: {}, selected: false } as NodeProps;
}

describe("InputNode — rendering", () => {
  it("renders without crashing", () => {
    render(<InputNode {...makeProps()} />);
    expect(screen.getByText("Input")).toBeInTheDocument();
  });

  it("shows 'API Request' subtitle", () => {
    render(<InputNode {...makeProps()} />);
    expect(screen.getByText("API Request")).toBeInTheDocument();
  });

  it("shows all 6 slot labels", () => {
    render(<InputNode {...makeProps()} />);
    for (const label of ["body", "headers", "query", "method", "raw", "ip"]) {
      expect(screen.getByText(label)).toBeInTheDocument();
    }
  });

  it("shows slot descriptions", () => {
    render(<InputNode {...makeProps()} />);
    expect(screen.getByText("parsed JSON")).toBeInTheDocument();
    expect(screen.getByText("request headers")).toBeInTheDocument();
    expect(screen.getByText("HTTP method")).toBeInTheDocument();
  });
});

describe("InputNode — handles", () => {
  it("has no input (target) handle", () => {
    render(<InputNode {...makeProps()} />);
    const handles = screen.getAllByTestId(/^handle-/);
    for (const h of handles) {
      expect(h).toHaveAttribute("data-handle-type", "source");
    }
  });

  it("renders source handles for all 6 slots", () => {
    render(<InputNode {...makeProps()} />);
    for (const id of ["body", "headers", "query", "method", "raw", "ip"]) {
      expect(screen.getByTestId(`handle-${id}`)).toHaveAttribute("data-handle-type", "source");
    }
  });

  it("has exactly 6 handles", () => {
    render(<InputNode {...makeProps()} />);
    expect(screen.getAllByTestId(/^handle-/)).toHaveLength(6);
  });

  it("all handles have position right", () => {
    render(<InputNode {...makeProps()} />);
    for (const h of screen.getAllByTestId(/^handle-/)) {
      expect(h).toHaveAttribute("data-position", "right");
    }
  });
});

describe("InputNode — selected state", () => {
  it("renders without crashing when selected=true", () => {
    render(<InputNode {...makeProps()} selected={true} />);
    expect(screen.getByText("Input")).toBeInTheDocument();
  });
});
