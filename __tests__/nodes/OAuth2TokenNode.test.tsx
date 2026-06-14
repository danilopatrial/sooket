import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { OAuth2TokenNode } from "@/components/canvas/nodes/OAuth2TokenNode";
import type { OAuth2TokenNodeData } from "@/components/canvas/nodes/OAuth2TokenNode";
import type { NodeProps } from "@xyflow/react";

vi.mock("@xyflow/react", () => ({
  Handle: ({ id, type, position }: { id: string; type: string; position: string }) => (
    <div data-testid={`handle-${id}`} data-handle-type={type} data-position={position} />
  ),
  Position: { Left: "left", Right: "right" },
}));

function makeProps(overrides: Partial<OAuth2TokenNodeData> = {}): NodeProps {
  const data: OAuth2TokenNodeData = { tokenUrl: "", clientId: "", clientSecret: "", scope: "", authStyle: "body", ...overrides };
  return { id: "n1", data: data as unknown as Record<string, unknown>, selected: false } as NodeProps;
}

describe("OAuth2TokenNode — rendering", () => {
  it("renders without crashing", () => {
    render(<OAuth2TokenNode {...makeProps()} />);
    expect(screen.getByText("OAuth2 Token")).toBeInTheDocument();
  });

  it("renders only a source `token` handle (no input)", () => {
    render(<OAuth2TokenNode {...makeProps()} />);
    expect(screen.getByTestId("handle-token")).toHaveAttribute("data-handle-type", "source");
    expect(screen.queryByTestId("handle-input")).toBeNull();
  });

  it("shows the auth style in the subtitle", () => {
    render(<OAuth2TokenNode {...makeProps({ authStyle: "basic" })} />);
    expect(screen.getByText(/client_credentials · basic/)).toBeInTheDocument();
  });

  it("renders the configured token URL", () => {
    render(<OAuth2TokenNode {...makeProps({ tokenUrl: "https://issuer/token" })} />);
    expect(screen.getByDisplayValue("https://issuer/token")).toBeInTheDocument();
  });
});

describe("OAuth2TokenNode — interaction", () => {
  it("calls onChange when the token URL changes", () => {
    const onChange = vi.fn();
    render(<OAuth2TokenNode {...makeProps({ onChange })} />);
    const urlInput = screen.getByPlaceholderText("https://issuer/oauth/token");
    fireEvent.change(urlInput, { target: { value: "https://x/token" } });
    expect(onChange).toHaveBeenCalledWith({ tokenUrl: "https://x/token" });
  });

  it("calls onChange when the auth style changes", () => {
    const onChange = vi.fn();
    render(<OAuth2TokenNode {...makeProps({ onChange })} />);
    fireEvent.change(screen.getByRole("combobox"), { target: { value: "basic" } });
    expect(onChange).toHaveBeenCalledWith({ authStyle: "basic" });
  });
});
