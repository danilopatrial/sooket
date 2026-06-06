import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { AuthValidatorNode } from "@/components/canvas/nodes/AuthValidatorNode";
import type { AuthValidatorNodeData, AuthClaim } from "@/components/canvas/nodes/AuthValidatorNode";
import type { NodeProps } from "@xyflow/react";

vi.mock("@xyflow/react", () => ({
  Handle: ({ id, type, position }: { id: string; type: string; position: string }) => (
    <div data-testid={`handle-${id}`} data-handle-type={type} data-position={position} />
  ),
  Position: { Left: "left", Right: "right" },
  useViewport: () => ({ zoom: 1 }),
}));

const DEFAULT_DATA: AuthValidatorNodeData = {
  mode: "jwt",
  headerName: "Authorization",
  algorithm: "HS256",
  secret: "",
  jwksUrl: "",
  claims: [],
  apiKeys: [],
};

function makeProps(overrides: Partial<AuthValidatorNodeData> = {}): NodeProps {
  const data: AuthValidatorNodeData = { ...DEFAULT_DATA, ...overrides };
  return { id: "node-1", data: data as unknown as Record<string, unknown>, selected: false } as NodeProps;
}

const PRE_CLAIMS: AuthClaim[] = [
  { id: "clm-1", name: "sub" },
  { id: "clm-2", name: "email" },
];

const PRE_KEYS = ["sk-abc123", "sk-xyz456"];

// Button layout helpers
// mode="jwt": [JWT, Key, HS256, RS256, (X per claim), Add claim]
// mode="apikey": [JWT, Key, (X per apiKey), Add key]
const getJwtTab      = () => screen.getByRole("button", { name: "JWT" });
const getKeyTab      = () => screen.getByRole("button", { name: "Key" });
const getHs256Btn    = () => screen.getByRole("button", { name: "HS256" });
const getRs256Btn    = () => screen.getByRole("button", { name: "RS256" });
const getAddClaimBtn = () => screen.getByRole("button", { name: /add claim/i });
const getAddKeyBtn   = () => screen.getByRole("button", { name: /add key/i });

// X (remove) buttons start after the fixed buttons
// mode="jwt": fixed = [JWT, Key, HS256, RS256] → X buttons at index 4+
// mode="apikey": fixed = [JWT, Key] → X buttons at index 2+
const getClaimRemoveBtn = (idx = 0) => screen.getAllByRole("button")[4 + idx];
const getKeyRemoveBtn   = (idx = 0) => screen.getAllByRole("button")[2 + idx];

// ─── 1. Rendering ─────────────────────────────────────────────────────────────

describe("AuthValidatorNode — rendering", () => {
  it("renders without crashing with defaultData (jwt, HS256, empty)", () => {
    render(<AuthValidatorNode {...makeProps()} />);
    expect(screen.getByText("Auth Validator")).toBeInTheDocument();
  });

  it("shows 'Token source' section label", () => {
    render(<AuthValidatorNode {...makeProps()} />);
    expect(screen.getByText("Token source")).toBeInTheDocument();
  });

  it("shows 'Algorithm' section label when mode=jwt", () => {
    render(<AuthValidatorNode {...makeProps()} />);
    expect(screen.getByText("Algorithm")).toBeInTheDocument();
  });

  it("shows 'Outputs' section label", () => {
    render(<AuthValidatorNode {...makeProps()} />);
    expect(screen.getByText("Outputs")).toBeInTheDocument();
  });

  it("renders 'valid' and 'error' output labels", () => {
    render(<AuthValidatorNode {...makeProps()} />);
    expect(screen.getByText("valid")).toBeInTheDocument();
    expect(screen.getByText("error")).toBeInTheDocument();
  });

  it("renders JWT and Key mode tabs", () => {
    render(<AuthValidatorNode {...makeProps()} />);
    expect(getJwtTab()).toBeInTheDocument();
    expect(getKeyTab()).toBeInTheDocument();
  });

  it("renders HS256 and RS256 algorithm buttons when mode=jwt", () => {
    render(<AuthValidatorNode {...makeProps()} />);
    expect(getHs256Btn()).toBeInTheDocument();
    expect(getRs256Btn()).toBeInTheDocument();
  });

  it("renders the headerName input with placeholder 'Authorization'", () => {
    render(<AuthValidatorNode {...makeProps()} />);
    expect(screen.getByPlaceholderText("Authorization")).toBeInTheDocument();
  });

  it("headerName input shows current value", () => {
    render(<AuthValidatorNode {...makeProps({ headerName: "X-Auth-Token" })} />);
    expect(screen.getByPlaceholderText("Authorization")).toHaveValue("X-Auth-Token");
  });
});

// ─── 2. Header subtitle ───────────────────────────────────────────────────────

describe("AuthValidatorNode — header subtitle", () => {
  it("shows 'JWT · HS256' when mode=jwt and algorithm=HS256", () => {
    render(<AuthValidatorNode {...makeProps({ mode: "jwt", algorithm: "HS256" })} />);
    expect(screen.getByText("JWT · HS256")).toBeInTheDocument();
  });

  it("shows 'JWT · RS256' when mode=jwt and algorithm=RS256", () => {
    render(<AuthValidatorNode {...makeProps({ mode: "jwt", algorithm: "RS256" })} />);
    expect(screen.getByText("JWT · RS256")).toBeInTheDocument();
  });

  it("shows 'API Key' when mode=apikey", () => {
    render(<AuthValidatorNode {...makeProps({ mode: "apikey" })} />);
    expect(screen.getByText("API Key")).toBeInTheDocument();
  });
});

// ─── 3. Handles — always present ──────────────────────────────────────────────

describe("AuthValidatorNode — always-present handles", () => {
  it("renders the token handle (target, left)", () => {
    render(<AuthValidatorNode {...makeProps()} />);
    const h = screen.getByTestId("handle-token");
    expect(h).toHaveAttribute("data-handle-type", "target");
    expect(h).toHaveAttribute("data-position", "left");
  });

  it("renders the tokenSource handle (target, left)", () => {
    render(<AuthValidatorNode {...makeProps()} />);
    const h = screen.getByTestId("handle-tokenSource");
    expect(h).toHaveAttribute("data-handle-type", "target");
    expect(h).toHaveAttribute("data-position", "left");
  });

  it("renders the valid handle (source, right)", () => {
    render(<AuthValidatorNode {...makeProps()} />);
    const h = screen.getByTestId("handle-valid");
    expect(h).toHaveAttribute("data-handle-type", "source");
    expect(h).toHaveAttribute("data-position", "right");
  });

  it("renders the error handle (source, right)", () => {
    render(<AuthValidatorNode {...makeProps()} />);
    const h = screen.getByTestId("handle-error");
    expect(h).toHaveAttribute("data-handle-type", "source");
    expect(h).toHaveAttribute("data-position", "right");
  });
});

// ─── 4. Handles — conditional: secret (jwt only) ──────────────────────────────

describe("AuthValidatorNode — secret handle (jwt only)", () => {
  it("renders the secret handle when mode=jwt", () => {
    render(<AuthValidatorNode {...makeProps({ mode: "jwt" })} />);
    expect(screen.getByTestId("handle-secret")).toBeInTheDocument();
  });

  it("does NOT render the secret handle when mode=apikey", () => {
    render(<AuthValidatorNode {...makeProps({ mode: "apikey" })} />);
    expect(screen.queryByTestId("handle-secret")).not.toBeInTheDocument();
  });

  it("has 5 handles for mode=jwt with no claims (token+tokenSource+secret+valid+error)", () => {
    render(<AuthValidatorNode {...makeProps({ mode: "jwt", claims: [] })} />);
    expect(screen.getAllByTestId(/^handle-/)).toHaveLength(5);
  });

  it("has 4 handles for mode=apikey (token+tokenSource+valid+error)", () => {
    render(<AuthValidatorNode {...makeProps({ mode: "apikey" })} />);
    expect(screen.getAllByTestId(/^handle-/)).toHaveLength(4);
  });
});

// ─── 5. Handles — per-claim source handles ────────────────────────────────────

describe("AuthValidatorNode — per-claim source handles", () => {
  it("renders a source handle for each claim with the claim's id", () => {
    render(<AuthValidatorNode {...makeProps({ claims: PRE_CLAIMS })} />);
    expect(screen.getByTestId("handle-clm-1")).toHaveAttribute("data-handle-type", "source");
    expect(screen.getByTestId("handle-clm-2")).toHaveAttribute("data-handle-type", "source");
  });

  it("has 7 handles for mode=jwt with 2 claims (5 base + 2 claim handles)", () => {
    render(<AuthValidatorNode {...makeProps({ claims: PRE_CLAIMS })} />);
    expect(screen.getAllByTestId(/^handle-/)).toHaveLength(7);
  });

  it("claim handles are not rendered when mode=apikey", () => {
    render(<AuthValidatorNode {...makeProps({ mode: "apikey", claims: PRE_CLAIMS })} />);
    expect(screen.queryByTestId("handle-clm-1")).not.toBeInTheDocument();
    expect(screen.queryByTestId("handle-clm-2")).not.toBeInTheDocument();
  });
});

// ─── 6. Mode tabs onChange ────────────────────────────────────────────────────

describe("AuthValidatorNode — mode tab onChange", () => {
  it("calls onChange({ mode: 'apikey' }) when Key tab is clicked", () => {
    const onChange = vi.fn();
    render(<AuthValidatorNode {...makeProps({ onChange })} />);
    fireEvent.click(getKeyTab());
    expect(onChange).toHaveBeenCalledWith({ mode: "apikey" });
  });

  it("calls onChange({ mode: 'jwt' }) when JWT tab is clicked from apikey mode", () => {
    const onChange = vi.fn();
    render(<AuthValidatorNode {...makeProps({ mode: "apikey", onChange })} />);
    fireEvent.click(getJwtTab());
    expect(onChange).toHaveBeenCalledWith({ mode: "jwt" });
  });

  it("calls onChange exactly once per tab click", () => {
    const onChange = vi.fn();
    render(<AuthValidatorNode {...makeProps({ onChange })} />);
    fireEvent.click(getKeyTab());
    expect(onChange).toHaveBeenCalledTimes(1);
  });

  it("does not throw when mode tab clicked without onChange", () => {
    expect(() => {
      render(<AuthValidatorNode {...makeProps()} />);
      fireEvent.click(getKeyTab());
    }).not.toThrow();
  });
});

// ─── 7. Token source (headerName) onChange ────────────────────────────────────

describe("AuthValidatorNode — headerName onChange", () => {
  it("calls onChange({ headerName: 'X-API-Key' }) when headerName is changed", () => {
    const onChange = vi.fn();
    render(<AuthValidatorNode {...makeProps({ onChange })} />);
    fireEvent.change(screen.getByPlaceholderText("Authorization"), { target: { value: "X-API-Key" } });
    expect(onChange).toHaveBeenCalledWith({ headerName: "X-API-Key" });
  });

  it("calls onChange({ headerName: '' }) when headerName is cleared", () => {
    const onChange = vi.fn();
    render(<AuthValidatorNode {...makeProps({ onChange })} />);
    fireEvent.change(screen.getByPlaceholderText("Authorization"), { target: { value: "" } });
    expect(onChange).toHaveBeenCalledWith({ headerName: "" });
  });

  it("headerName input is enabled when tokenSource is not connected", () => {
    render(<AuthValidatorNode {...makeProps({ connectedHandles: [] })} />);
    expect(screen.getByPlaceholderText("Authorization")).not.toBeDisabled();
  });

  it("headerName input is disabled when tokenSource IS connected", () => {
    render(<AuthValidatorNode {...makeProps({ connectedHandles: ["tokenSource"] })} />);
    expect(screen.getByPlaceholderText("Authorization")).toBeDisabled();
  });

  it("shows 'using connected value' when tokenSource is connected", () => {
    render(<AuthValidatorNode {...makeProps({ connectedHandles: ["tokenSource"] })} />);
    expect(screen.getByText("using connected value")).toBeInTheDocument();
  });

  it("shows the default help text when tokenSource is not connected", () => {
    render(<AuthValidatorNode {...makeProps()} />);
    expect(screen.getByText("header to read the token from · connect to set dynamically")).toBeInTheDocument();
  });
});

// ─── 8. JWT / Algorithm buttons onChange ──────────────────────────────────────

describe("AuthValidatorNode — algorithm onChange", () => {
  it("calls onChange({ algorithm: 'RS256' }) when RS256 is clicked", () => {
    const onChange = vi.fn();
    render(<AuthValidatorNode {...makeProps({ onChange })} />);
    fireEvent.click(getRs256Btn());
    expect(onChange).toHaveBeenCalledWith({ algorithm: "RS256" });
  });

  it("calls onChange({ algorithm: 'HS256' }) when HS256 is clicked from RS256", () => {
    const onChange = vi.fn();
    render(<AuthValidatorNode {...makeProps({ algorithm: "RS256", onChange })} />);
    fireEvent.click(getHs256Btn());
    expect(onChange).toHaveBeenCalledWith({ algorithm: "HS256" });
  });

  it("algorithm buttons are not rendered when mode=apikey", () => {
    render(<AuthValidatorNode {...makeProps({ mode: "apikey" })} />);
    expect(screen.queryByRole("button", { name: "HS256" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "RS256" })).not.toBeInTheDocument();
  });
});

// ─── 9. JWT / HS256 — secret input onChange ───────────────────────────────────

describe("AuthValidatorNode — JWT HS256 secret input", () => {
  it("shows the Secret section label when mode=jwt and algorithm=HS256", () => {
    render(<AuthValidatorNode {...makeProps()} />);
    expect(screen.getByText("Secret")).toBeInTheDocument();
  });

  it("hides the Secret section when algorithm=RS256", () => {
    render(<AuthValidatorNode {...makeProps({ algorithm: "RS256" })} />);
    expect(screen.queryByText("Secret")).not.toBeInTheDocument();
  });

  it("calls onChange({ secret: 'mysecret' }) when secret is typed", () => {
    const onChange = vi.fn();
    render(<AuthValidatorNode {...makeProps({ onChange })} />);
    fireEvent.change(screen.getByPlaceholderText("your-jwt-secret or $MY_SECRET"), { target: { value: "mysecret" } });
    expect(onChange).toHaveBeenCalledWith({ secret: "mysecret" });
  });

  it("secret input is disabled when secret handle is connected", () => {
    render(<AuthValidatorNode {...makeProps({ connectedHandles: ["secret"] })} />);
    expect(screen.getByPlaceholderText("your-jwt-secret or $MY_SECRET")).toBeDisabled();
  });

  it("secret input is enabled when secret handle is not connected", () => {
    render(<AuthValidatorNode {...makeProps({ connectedHandles: [] })} />);
    expect(screen.getByPlaceholderText("your-jwt-secret or $MY_SECRET")).not.toBeDisabled();
  });

  it("shows 'using connected value' for secret when secret handle is connected", () => {
    render(<AuthValidatorNode {...makeProps({ connectedHandles: ["secret"] })} />);
    expect(screen.getByText("using connected value")).toBeInTheDocument();
  });

  it("does not show 'using connected value' for secret when not connected", () => {
    render(<AuthValidatorNode {...makeProps()} />);
    expect(screen.queryByText("using connected value")).not.toBeInTheDocument();
  });
});

// ─── 10. JWT / RS256 — JWKS URL input onChange ────────────────────────────────

describe("AuthValidatorNode — JWT RS256 JWKS URL input", () => {
  it("shows the JWKS URL section when algorithm=RS256", () => {
    render(<AuthValidatorNode {...makeProps({ algorithm: "RS256" })} />);
    expect(screen.getByText("JWKS URL")).toBeInTheDocument();
  });

  it("hides JWKS URL when algorithm=HS256", () => {
    render(<AuthValidatorNode {...makeProps({ algorithm: "HS256" })} />);
    expect(screen.queryByText("JWKS URL")).not.toBeInTheDocument();
  });

  it("calls onChange({ jwksUrl: 'https://example.com/jwks' }) when URL is typed", () => {
    const onChange = vi.fn();
    render(<AuthValidatorNode {...makeProps({ algorithm: "RS256", onChange })} />);
    fireEvent.change(
      screen.getByPlaceholderText("https://your-issuer/.well-known/jwks.json"),
      { target: { value: "https://example.com/jwks" } }
    );
    expect(onChange).toHaveBeenCalledWith({ jwksUrl: "https://example.com/jwks" });
  });

  it("JWKS URL input is disabled when secret handle is connected", () => {
    render(<AuthValidatorNode {...makeProps({ algorithm: "RS256", connectedHandles: ["secret"] })} />);
    expect(screen.getByPlaceholderText("https://your-issuer/.well-known/jwks.json")).toBeDisabled();
  });

  it("JWKS URL input is enabled when secret handle is not connected", () => {
    render(<AuthValidatorNode {...makeProps({ algorithm: "RS256" })} />);
    expect(screen.getByPlaceholderText("https://your-issuer/.well-known/jwks.json")).not.toBeDisabled();
  });
});

// ─── 11. JWT mode / API Key mode — section visibility ─────────────────────────

describe("AuthValidatorNode — mode section visibility", () => {
  it("shows JWT-only sections when mode=jwt (Claims, Algorithm)", () => {
    render(<AuthValidatorNode {...makeProps({ mode: "jwt" })} />);
    expect(screen.getByText("Claims to extract")).toBeInTheDocument();
    expect(screen.getByText("Algorithm")).toBeInTheDocument();
  });

  it("hides JWT-only sections when mode=apikey", () => {
    render(<AuthValidatorNode {...makeProps({ mode: "apikey" })} />);
    expect(screen.queryByText("Claims to extract")).not.toBeInTheDocument();
    expect(screen.queryByText("Algorithm")).not.toBeInTheDocument();
  });

  it("shows 'Valid API keys' section when mode=apikey", () => {
    render(<AuthValidatorNode {...makeProps({ mode: "apikey" })} />);
    expect(screen.getByText("Valid API keys")).toBeInTheDocument();
  });

  it("hides 'Valid API keys' section when mode=jwt", () => {
    render(<AuthValidatorNode {...makeProps({ mode: "jwt" })} />);
    expect(screen.queryByText("Valid API keys")).not.toBeInTheDocument();
  });
});

// ─── 12. Claims — add / remove / update ──────────────────────────────────────

describe("AuthValidatorNode — JWT claims onChange", () => {
  it("calls onChange when 'Add claim' is clicked", () => {
    const onChange = vi.fn();
    render(<AuthValidatorNode {...makeProps({ onChange })} />);
    fireEvent.click(getAddClaimBtn());
    expect(onChange).toHaveBeenCalledTimes(1);
  });

  it("new claim has empty name and a non-empty id", () => {
    const onChange = vi.fn();
    render(<AuthValidatorNode {...makeProps({ onChange })} />);
    fireEvent.click(getAddClaimBtn());
    const { claims } = onChange.mock.calls[0][0];
    expect(claims).toHaveLength(1);
    expect(claims[0].name).toBe("");
    expect(claims[0].id.length).toBeGreaterThan(0);
  });

  it("preserves existing claims when adding a new one", () => {
    const onChange = vi.fn();
    render(<AuthValidatorNode {...makeProps({ claims: PRE_CLAIMS, onChange })} />);
    fireEvent.click(getAddClaimBtn());
    const { claims } = onChange.mock.calls[0][0];
    expect(claims).toHaveLength(3);
    expect(claims[0]).toEqual(PRE_CLAIMS[0]);
    expect(claims[1]).toEqual(PRE_CLAIMS[1]);
  });

  it("calls onChange with claim removed when X is clicked", () => {
    const onChange = vi.fn();
    render(<AuthValidatorNode {...makeProps({ claims: [PRE_CLAIMS[0]], onChange })} />);
    fireEvent.click(getClaimRemoveBtn(0));
    expect(onChange).toHaveBeenCalledWith({ claims: [] });
  });

  it("removes only the targeted claim when multiple exist", () => {
    const onChange = vi.fn();
    render(<AuthValidatorNode {...makeProps({ claims: PRE_CLAIMS, onChange })} />);
    fireEvent.click(getClaimRemoveBtn(0)); // removes clm-1
    const { claims } = onChange.mock.calls[0][0];
    expect(claims).toHaveLength(1);
    expect(claims[0].id).toBe("clm-2");
  });

  it("calls onChange with updated claims when a claim name is typed", () => {
    const onChange = vi.fn();
    render(<AuthValidatorNode {...makeProps({ claims: PRE_CLAIMS, onChange })} />);
    const claimInput = screen.getByDisplayValue("sub");
    fireEvent.change(claimInput, { target: { value: "userId" } });
    expect(onChange).toHaveBeenCalledWith({
      claims: [{ id: "clm-1", name: "userId" }, PRE_CLAIMS[1]],
    });
  });

  it("does not throw when Add claim clicked without onChange", () => {
    expect(() => {
      render(<AuthValidatorNode {...makeProps()} />);
      fireEvent.click(getAddClaimBtn());
    }).not.toThrow();
  });
});

// ─── 13. Claims — output labels in Outputs section ────────────────────────────

describe("AuthValidatorNode — claim output labels", () => {
  it("shows claim name in outputs when name is non-empty", () => {
    render(<AuthValidatorNode {...makeProps({ claims: [{ id: "c1", name: "sub" }] })} />);
    // "sub" appears in the claim input and also in the outputs section
    expect(screen.getAllByText("sub").length).toBeGreaterThanOrEqual(1);
  });

  it("shows '…' in outputs when claim name is empty", () => {
    render(<AuthValidatorNode {...makeProps({ claims: [{ id: "c1", name: "" }] })} />);
    expect(screen.getByText("…")).toBeInTheDocument();
  });

  it("claim output labels are not shown when mode=apikey", () => {
    render(<AuthValidatorNode {...makeProps({ mode: "apikey", claims: PRE_CLAIMS })} />);
    expect(screen.queryByText("sub")).not.toBeInTheDocument();
  });
});

// ─── 14. API Keys — add / remove / update ────────────────────────────────────

describe("AuthValidatorNode — API key onChange", () => {
  it("calls onChange when 'Add key' is clicked", () => {
    const onChange = vi.fn();
    render(<AuthValidatorNode {...makeProps({ mode: "apikey", onChange })} />);
    fireEvent.click(getAddKeyBtn());
    expect(onChange).toHaveBeenCalledTimes(1);
  });

  it("new api key is empty string", () => {
    const onChange = vi.fn();
    render(<AuthValidatorNode {...makeProps({ mode: "apikey", onChange })} />);
    fireEvent.click(getAddKeyBtn());
    const { apiKeys } = onChange.mock.calls[0][0];
    expect(apiKeys).toHaveLength(1);
    expect(apiKeys[0]).toBe("");
  });

  it("preserves existing apiKeys when adding a new one", () => {
    const onChange = vi.fn();
    render(<AuthValidatorNode {...makeProps({ mode: "apikey", apiKeys: PRE_KEYS, onChange })} />);
    fireEvent.click(getAddKeyBtn());
    const { apiKeys } = onChange.mock.calls[0][0];
    expect(apiKeys).toHaveLength(3);
    expect(apiKeys[0]).toBe("sk-abc123");
    expect(apiKeys[1]).toBe("sk-xyz456");
  });

  it("calls onChange with key removed when X is clicked", () => {
    const onChange = vi.fn();
    render(<AuthValidatorNode {...makeProps({ mode: "apikey", apiKeys: ["sk-abc123"], onChange })} />);
    fireEvent.click(getKeyRemoveBtn(0));
    expect(onChange).toHaveBeenCalledWith({ apiKeys: [] });
  });

  it("removes only the targeted key when multiple exist", () => {
    const onChange = vi.fn();
    render(<AuthValidatorNode {...makeProps({ mode: "apikey", apiKeys: PRE_KEYS, onChange })} />);
    fireEvent.click(getKeyRemoveBtn(0)); // removes index 0
    const { apiKeys } = onChange.mock.calls[0][0];
    expect(apiKeys).toHaveLength(1);
    expect(apiKeys[0]).toBe("sk-xyz456");
  });

  it("calls onChange with updated apiKeys when a key value is typed", () => {
    const onChange = vi.fn();
    render(<AuthValidatorNode {...makeProps({ mode: "apikey", apiKeys: ["sk-abc123"], onChange })} />);
    const keyInput = screen.getByPlaceholderText("sk-… or $MY_API_KEY");
    fireEvent.change(keyInput, { target: { value: "sk-newkey" } });
    expect(onChange).toHaveBeenCalledWith({ apiKeys: ["sk-newkey"] });
  });

  it("does not throw when Add key clicked without onChange", () => {
    expect(() => {
      render(<AuthValidatorNode {...makeProps({ mode: "apikey" })} />);
      fireEvent.click(getAddKeyBtn());
    }).not.toThrow();
  });
});

// ─── 15. Fallback defaults ────────────────────────────────────────────────────

describe("AuthValidatorNode — fallback defaults", () => {
  it("defaults mode to 'jwt' when undefined", () => {
    const props = makeProps();
    (props.data as Record<string, unknown>).mode = undefined;
    render(<AuthValidatorNode {...props} />);
    expect(screen.getByText("JWT · HS256")).toBeInTheDocument();
  });

  it("defaults headerName to 'Authorization' when undefined", () => {
    const props = makeProps();
    (props.data as Record<string, unknown>).headerName = undefined;
    render(<AuthValidatorNode {...props} />);
    expect(screen.getByPlaceholderText("Authorization")).toHaveValue("Authorization");
  });

  it("defaults algorithm to 'HS256' when undefined", () => {
    const props = makeProps();
    (props.data as Record<string, unknown>).algorithm = undefined;
    render(<AuthValidatorNode {...props} />);
    expect(screen.getByText("Secret")).toBeInTheDocument(); // HS256 shows Secret section
  });

  it("defaults claims to [] when undefined — no claim rows", () => {
    const props = makeProps();
    (props.data as Record<string, unknown>).claims = undefined;
    render(<AuthValidatorNode {...props} />);
    expect(screen.queryByPlaceholderText("e.g. sub, email, roles")).not.toBeInTheDocument();
  });

  it("defaults apiKeys to [] when undefined — no api key rows", () => {
    const props = makeProps({ mode: "apikey" });
    (props.data as Record<string, unknown>).apiKeys = undefined;
    render(<AuthValidatorNode {...props} />);
    expect(screen.queryByPlaceholderText("sk-…")).not.toBeInTheDocument();
  });

  it("defaults connectedHandles to [] — no disabled inputs, no 'using connected value'", () => {
    const props = makeProps();
    (props.data as Record<string, unknown>).connectedHandles = undefined;
    render(<AuthValidatorNode {...props} />);
    expect(screen.getByPlaceholderText("Authorization")).not.toBeDisabled();
    expect(screen.queryByText("using connected value")).not.toBeInTheDocument();
  });
});

// ─── 16. onChange payload shape ───────────────────────────────────────────────

describe("AuthValidatorNode — onChange payload shape", () => {
  const ALLOWED_KEYS = new Set<string>([
    "mode", "headerName", "algorithm", "secret", "jwksUrl",
    "claims", "apiKeys", "onChange", "connectedHandles",
  ]);

  it("mode tab payload contains only allowed keys", () => {
    const onChange = vi.fn();
    render(<AuthValidatorNode {...makeProps({ onChange })} />);
    fireEvent.click(getKeyTab());
    for (const key of Object.keys(onChange.mock.calls[0][0])) {
      expect(ALLOWED_KEYS.has(key)).toBe(true);
    }
  });

  it("algorithm button payload contains only allowed keys", () => {
    const onChange = vi.fn();
    render(<AuthValidatorNode {...makeProps({ onChange })} />);
    fireEvent.click(getRs256Btn());
    for (const key of Object.keys(onChange.mock.calls[0][0])) {
      expect(ALLOWED_KEYS.has(key)).toBe(true);
    }
  });

  it("headerName input payload contains only allowed keys", () => {
    const onChange = vi.fn();
    render(<AuthValidatorNode {...makeProps({ onChange })} />);
    fireEvent.change(screen.getByPlaceholderText("Authorization"), { target: { value: "X-Key" } });
    for (const key of Object.keys(onChange.mock.calls[0][0])) {
      expect(ALLOWED_KEYS.has(key)).toBe(true);
    }
  });

  it("secret input payload contains only allowed keys", () => {
    const onChange = vi.fn();
    render(<AuthValidatorNode {...makeProps({ onChange })} />);
    fireEvent.change(screen.getByPlaceholderText("your-jwt-secret or $MY_SECRET"), { target: { value: "s3cr3t" } });
    for (const key of Object.keys(onChange.mock.calls[0][0])) {
      expect(ALLOWED_KEYS.has(key)).toBe(true);
    }
  });

  it("addClaim payload contains only allowed keys", () => {
    const onChange = vi.fn();
    render(<AuthValidatorNode {...makeProps({ onChange })} />);
    fireEvent.click(getAddClaimBtn());
    for (const key of Object.keys(onChange.mock.calls[0][0])) {
      expect(ALLOWED_KEYS.has(key)).toBe(true);
    }
  });

  it("addApiKey payload contains only allowed keys", () => {
    const onChange = vi.fn();
    render(<AuthValidatorNode {...makeProps({ mode: "apikey", onChange })} />);
    fireEvent.click(getAddKeyBtn());
    for (const key of Object.keys(onChange.mock.calls[0][0])) {
      expect(ALLOWED_KEYS.has(key)).toBe(true);
    }
  });
});

// ─── 17. Selected state ───────────────────────────────────────────────────────

describe("AuthValidatorNode — selected state", () => {
  it("renders without crashing when selected=true", () => {
    render(<AuthValidatorNode {...makeProps()} selected={true} />);
    expect(screen.getByText("Auth Validator")).toBeInTheDocument();
  });

  it("renders without crashing when selected=false", () => {
    render(<AuthValidatorNode {...makeProps()} selected={false} />);
    expect(screen.getByText("Auth Validator")).toBeInTheDocument();
  });
});
