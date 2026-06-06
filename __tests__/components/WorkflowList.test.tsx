import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { WorkflowList } from "@/components/workflow/WorkflowList";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: vi.fn(), push: vi.fn() }),
}));

vi.mock("next/link", () => ({
  default: ({ href, children, ...rest }: { href: string; children: React.ReactNode }) => (
    <a href={href} {...rest}>{children}</a>
  ),
}));

interface Workflow {
  id: number;
  name: string;
  slug: string;
  is_active: number;
  created_at: string;
}

function makeWorkflow(overrides: Partial<Workflow> = {}): Workflow {
  return {
    id: 1,
    name: "Demo Workflow",
    slug: "demo-slug",
    is_active: 0,
    created_at: "2026-01-01T00:00:00.000Z",
    ...overrides,
  };
}

// ─── Empty state (DASH-05) ────────────────────────────────────────────────────

describe("WorkflowList — empty state", () => {
  it("renders 'No workflows yet.' when the list is empty", () => {
    render(<WorkflowList workflows={[]} />);
    expect(screen.getByText("No workflows yet.")).toBeInTheDocument();
  });

  it("renders the 'Create your first workflow to get started.' helper line", () => {
    render(<WorkflowList workflows={[]} />);
    expect(
      screen.getByText("Create your first workflow to get started.")
    ).toBeInTheDocument();
  });

  it("does not render any workflow rows when empty", () => {
    render(<WorkflowList workflows={[]} />);
    expect(screen.queryByRole("listitem")).not.toBeInTheDocument();
    expect(screen.queryByRole("list")).not.toBeInTheDocument();
  });

  it("does not throw when rendered with an empty list", () => {
    expect(() => render(<WorkflowList workflows={[]} />)).not.toThrow();
  });
});

// ─── Non-empty state (boundary) ───────────────────────────────────────────────

describe("WorkflowList — non-empty state", () => {
  it("hides the empty-state text when at least one workflow exists", () => {
    render(<WorkflowList workflows={[makeWorkflow()]} />);
    expect(screen.queryByText("No workflows yet.")).not.toBeInTheDocument();
    expect(
      screen.queryByText("Create your first workflow to get started.")
    ).not.toBeInTheDocument();
  });

  it("renders a row with the workflow name and slug", () => {
    render(<WorkflowList workflows={[makeWorkflow({ name: "My Flow", slug: "abc123" })]} />);
    expect(screen.getByText("My Flow")).toBeInTheDocument();
    expect(screen.getByText("abc123")).toBeInTheDocument();
  });
});
