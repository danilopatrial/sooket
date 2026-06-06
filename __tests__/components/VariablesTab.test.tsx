/**
 * Regression test for UX-03: deleting a variable must require a two-step
 * inline confirmation, not fire the DELETE request on the first click.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";

vi.mock("@/lib/variables-context", () => ({
  useVariables: () => ({ names: [], refresh: vi.fn() }),
}));

vi.mock("sonner", () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

import { VariablesTab } from "@/components/workflow-config/VariablesTab";

interface FetchOpts { method?: string }
let fetchMock: ReturnType<typeof vi.fn>;

function deleteCalls(): unknown[] {
  return fetchMock.mock.calls.filter(([, opts]) => (opts as FetchOpts | undefined)?.method === "DELETE");
}

beforeEach(() => {
  fetchMock = vi.fn((_url: string, opts?: FetchOpts) => {
    if (opts?.method === "DELETE") {
      return Promise.resolve({ ok: true, json: async () => ({}) });
    }
    // initial GET load
    return Promise.resolve({
      ok: true,
      json: async () => [{ name: "MY_KEY", created_at: "2026-01-01T00:00:00.000Z" }],
    });
  });
  vi.stubGlobal("fetch", fetchMock);
});

describe("VariablesTab — delete confirmation (UX-03)", () => {
  it("does not delete on the first trash click; shows inline confirmation", async () => {
    render(<VariablesTab slug="wf-slug" />);
    await screen.findByText("MY_KEY");

    fireEvent.click(screen.getByTitle("Delete $MY_KEY"));

    // Inline confirmation appears, no DELETE request yet
    expect(screen.getByText("Delete?")).toBeInTheDocument();
    expect(screen.getByText("Yes")).toBeInTheDocument();
    expect(screen.getByText("No")).toBeInTheDocument();
    expect(deleteCalls()).toHaveLength(0);
  });

  it("sends the DELETE only after clicking Yes", async () => {
    render(<VariablesTab slug="wf-slug" />);
    await screen.findByText("MY_KEY");

    fireEvent.click(screen.getByTitle("Delete $MY_KEY"));
    fireEvent.click(screen.getByText("Yes"));

    await waitFor(() => expect(deleteCalls()).toHaveLength(1));
    const [url, opts] = deleteCalls()[0] as [string, FetchOpts];
    expect(url).toContain("/variables?name=MY_KEY");
    expect(opts.method).toBe("DELETE");
  });

  it("cancels with No — no DELETE and confirmation disappears", async () => {
    render(<VariablesTab slug="wf-slug" />);
    await screen.findByText("MY_KEY");

    fireEvent.click(screen.getByTitle("Delete $MY_KEY"));
    fireEvent.click(screen.getByText("No"));

    expect(screen.queryByText("Delete?")).not.toBeInTheDocument();
    expect(deleteCalls()).toHaveLength(0);
    // Trash button is back
    expect(screen.getByTitle("Delete $MY_KEY")).toBeInTheDocument();
  });
});
