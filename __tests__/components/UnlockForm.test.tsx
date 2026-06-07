import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { UnlockForm } from "@/components/unlock/UnlockForm";

let fetchMock: ReturnType<typeof vi.fn>;
let assignMock: ReturnType<typeof vi.fn>;
const origLocation = window.location;

beforeEach(() => {
  assignMock = vi.fn();
  // jsdom's window.location is non-configurable to reassign wholesale; stub assign.
  Object.defineProperty(window, "location", {
    configurable: true,
    value: { ...origLocation, assign: assignMock },
  });
});

afterEach(() => {
  Object.defineProperty(window, "location", { configurable: true, value: origLocation });
  vi.unstubAllGlobals();
});

describe("UnlockForm", () => {
  it("disables submit until a token is entered", () => {
    render(<UnlockForm next="/workflow" />);
    const button = screen.getByRole("button", { name: /unlock/i });
    expect(button).toBeDisabled();
    fireEvent.change(screen.getByLabelText(/access token/i), { target: { value: "secret" } });
    expect(button).not.toBeDisabled();
  });

  it("navigates to `next` on a successful unlock", async () => {
    fetchMock = vi.fn(async () => ({ ok: true, json: async () => ({ ok: true }) }));
    vi.stubGlobal("fetch", fetchMock);

    render(<UnlockForm next="/workflow/abc" />);
    fireEvent.change(screen.getByLabelText(/access token/i), { target: { value: "secret" } });
    fireEvent.click(screen.getByRole("button", { name: /unlock/i }));

    await waitFor(() => expect(assignMock).toHaveBeenCalledWith("/workflow/abc"));
    const [, opts] = fetchMock.mock.calls[0];
    expect(opts.method).toBe("POST");
    expect(JSON.parse(opts.body as string)).toEqual({ token: "secret" });
  });

  it("shows the server error and does not navigate on failure", async () => {
    fetchMock = vi.fn(async () => ({ ok: false, json: async () => ({ error: "Invalid token" }) }));
    vi.stubGlobal("fetch", fetchMock);

    render(<UnlockForm next="/workflow" />);
    fireEvent.change(screen.getByLabelText(/access token/i), { target: { value: "nope" } });
    fireEvent.click(screen.getByRole("button", { name: /unlock/i }));

    await waitFor(() => expect(screen.getByText("Invalid token")).toBeInTheDocument());
    expect(assignMock).not.toHaveBeenCalled();
  });
});
