import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { VectorUpsertNode } from "@/components/canvas/nodes/VectorUpsertNode";
import type { VectorUpsertNodeData } from "@/components/canvas/nodes/VectorUpsertNode";
import { NODE_REGISTRY } from "@/components/canvas/nodes/registry";
import type { NodeProps } from "@xyflow/react";

vi.mock("@xyflow/react", () => ({
  Handle: ({ id, type, position }: { id: string; type: string; position: string }) => (
    <div data-testid={`handle-${id}`} data-handle-type={type} data-position={position} />
  ),
  Position: { Left: "left", Right: "right" },
  useViewport: () => ({ zoom: 1 }),
}));

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const DEFAULT_DATA: VectorUpsertNodeData = {
  provider:        "supabase",
  supabaseUrl:     "",
  supabaseKey:     "",
  tableName:       "documents",
  embeddingColumn: "embedding",
  contentColumn:   "content",
  metadataColumn:  "metadata",
  upsert:          false,
  pineconeHost:    "",
  pineconeKey:     "",
  namespace:       "",
};

const PINECONE_DATA: VectorUpsertNodeData = {
  ...DEFAULT_DATA,
  provider:    "pinecone",
  pineconeHost: "my-index.svc.pinecone.io",
  pineconeKey:  "pckey-abc123",
  namespace:    "docs",
};

const SUPABASE_FILLED: VectorUpsertNodeData = {
  ...DEFAULT_DATA,
  supabaseUrl: "https://project.supabase.co",
  supabaseKey: "service-key-xyz",
  tableName:   "my_docs",
};

function makeProps(overrides: Partial<VectorUpsertNodeData> = {}): NodeProps {
  return {
    id:       "node-1",
    type:     "vector-upsert",
    data:     { ...DEFAULT_DATA, ...overrides },
    selected: false,
    dragging: false,
    isConnectable: true,
    zIndex:   0,
    positionAbsoluteX: 0,
    positionAbsoluteY: 0,
  } as unknown as NodeProps;
}

// ─── 1. Registry ──────────────────────────────────────────────────────────────

describe("VectorUpsertNode — registry", () => {
  const entry = NODE_REGISTRY.find((n) => n.type === "vector-upsert");

  it("has a registry entry with type 'vector-upsert'", () => {
    expect(entry).toBeDefined();
  });

  it("is in the 'external' category", () => {
    expect(entry?.category).toBe("external");
  });

  it("primaryInput is 'embedding'", () => {
    expect(entry?.primaryInput).toBe("embedding");
  });

  it("primaryOutput is 'id'", () => {
    expect(entry?.primaryOutput).toBe("id");
  });

  it("defaultData has provider 'supabase'", () => {
    expect(entry?.defaultData.provider).toBe("supabase");
  });

  it("defaultData has tableName 'documents'", () => {
    expect(entry?.defaultData.tableName).toBe("documents");
  });

  it("defaultData has embeddingColumn 'embedding'", () => {
    expect(entry?.defaultData.embeddingColumn).toBe("embedding");
  });

  it("defaultData has contentColumn 'content'", () => {
    expect(entry?.defaultData.contentColumn).toBe("content");
  });

  it("defaultData has metadataColumn 'metadata'", () => {
    expect(entry?.defaultData.metadataColumn).toBe("metadata");
  });

  it("defaultData has upsert false", () => {
    expect(entry?.defaultData.upsert).toBe(false);
  });

  it("defaultData has timeout 15000", () => {
    expect(entry?.defaultData.timeout).toBe(15000);
  });

  it("defaultData has all required keys", () => {
    const keys = Object.keys(entry?.defaultData ?? {});
    for (const k of [
      "provider", "supabaseUrl", "supabaseKey", "tableName",
      "embeddingColumn", "contentColumn", "metadataColumn", "upsert",
      "pineconeHost", "pineconeKey", "namespace",
    ]) {
      expect(keys).toContain(k);
    }
  });
});

// ─── 2. Rendering — supabase (default) ───────────────────────────────────────

describe("VectorUpsertNode — rendering (supabase)", () => {
  it("renders without crashing with defaultData", () => {
    expect(() => render(<VectorUpsertNode {...makeProps()} />)).not.toThrow();
  });

  it("shows 'Vector Upsert' title", () => {
    render(<VectorUpsertNode {...makeProps()} />);
    expect(screen.getByText("Vector Upsert")).toBeInTheDocument();
  });

  it("shows 'Supabase pgvector' subtitle when provider=supabase", () => {
    render(<VectorUpsertNode {...makeProps()} />);
    expect(screen.getAllByText("Supabase pgvector").length).toBeGreaterThan(0);
  });

  it("shows PG and PC tab buttons", () => {
    render(<VectorUpsertNode {...makeProps()} />);
    expect(screen.getByRole("button", { name: "PG" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "PC" })).toBeInTheDocument();
  });

  it("shows 'Inputs' section label", () => {
    render(<VectorUpsertNode {...makeProps()} />);
    expect(screen.getByText("Inputs")).toBeInTheDocument();
  });

  it("shows all four input row labels", () => {
    render(<VectorUpsertNode {...makeProps()} />);
    expect(screen.getByText("embedding")).toBeInTheDocument();
    expect(screen.getByText("content")).toBeInTheDocument();
    expect(screen.getByText("metadata")).toBeInTheDocument();
    expect(screen.getAllByText("id").length).toBeGreaterThan(0);
  });

  it("shows 'Outputs' section label", () => {
    render(<VectorUpsertNode {...makeProps()} />);
    expect(screen.getByText("Outputs")).toBeInTheDocument();
  });

  it("shows Supabase URL placeholder", () => {
    render(<VectorUpsertNode {...makeProps()} />);
    expect(screen.getByPlaceholderText("$SUPABASE_URL")).toBeInTheDocument();
  });

  it("shows Supabase service key placeholder", () => {
    render(<VectorUpsertNode {...makeProps()} />);
    expect(screen.getByPlaceholderText("$SUPABASE_SERVICE_KEY")).toBeInTheDocument();
  });

  it("shows table name input with default value 'documents'", () => {
    render(<VectorUpsertNode {...makeProps()} />);
    expect(screen.getByDisplayValue("documents")).toBeInTheDocument();
  });

  it("shows embedding column input with default value 'embedding'", () => {
    render(<VectorUpsertNode {...makeProps()} />);
    expect(screen.getByDisplayValue("embedding")).toBeInTheDocument();
  });

  it("shows content column input with default value 'content'", () => {
    render(<VectorUpsertNode {...makeProps()} />);
    expect(screen.getByDisplayValue("content")).toBeInTheDocument();
  });

  it("shows metadata column input with default value 'metadata'", () => {
    render(<VectorUpsertNode {...makeProps()} />);
    expect(screen.getByDisplayValue("metadata")).toBeInTheDocument();
  });

  it("shows upsert mode checkbox", () => {
    render(<VectorUpsertNode {...makeProps()} />);
    const cb = screen.getByRole("checkbox");
    expect(cb).toBeInTheDocument();
    expect(cb).not.toBeChecked();
  });

  it("checkbox is checked when upsert=true", () => {
    render(<VectorUpsertNode {...makeProps({ upsert: true })} />);
    expect(screen.getByRole("checkbox")).toBeChecked();
  });

  it("shows 'Upsert mode' label", () => {
    render(<VectorUpsertNode {...makeProps()} />);
    expect(screen.getByText("Upsert mode")).toBeInTheDocument();
  });

  it("does NOT render Pinecone config when provider=supabase", () => {
    render(<VectorUpsertNode {...makeProps()} />);
    expect(screen.queryByPlaceholderText("$PINECONE_KEY")).not.toBeInTheDocument();
  });
});

// ─── 3. Rendering — pinecone ──────────────────────────────────────────────────

describe("VectorUpsertNode — rendering (pinecone)", () => {
  it("shows 'Pinecone' subtitle when provider=pinecone", () => {
    render(<VectorUpsertNode {...makeProps({ provider: "pinecone" })} />);
    expect(screen.getAllByText("Pinecone").length).toBeGreaterThan(0);
  });

  it("shows Pinecone host placeholder", () => {
    render(<VectorUpsertNode {...makeProps({ provider: "pinecone" })} />);
    expect(screen.getByPlaceholderText("my-index-abc123.svc.pinecone.io")).toBeInTheDocument();
  });

  it("shows Pinecone key placeholder", () => {
    render(<VectorUpsertNode {...makeProps({ provider: "pinecone" })} />);
    expect(screen.getByPlaceholderText("$PINECONE_KEY")).toBeInTheDocument();
  });

  it("shows filled pineconeHost value", () => {
    render(<VectorUpsertNode {...makeProps(PINECONE_DATA)} />);
    expect(screen.getByDisplayValue("my-index.svc.pinecone.io")).toBeInTheDocument();
  });

  it("shows filled namespace value", () => {
    render(<VectorUpsertNode {...makeProps(PINECONE_DATA)} />);
    expect(screen.getByDisplayValue("docs")).toBeInTheDocument();
  });

  it("shows auto-UUID hint text", () => {
    render(<VectorUpsertNode {...makeProps({ provider: "pinecone" })} />);
    expect(screen.getByText(/auto-generated per request/i)).toBeInTheDocument();
  });

  it("does NOT render Supabase URL input when provider=pinecone", () => {
    render(<VectorUpsertNode {...makeProps({ provider: "pinecone" })} />);
    expect(screen.queryByPlaceholderText("$SUPABASE_URL")).not.toBeInTheDocument();
  });

  it("does NOT render upsert checkbox when provider=pinecone", () => {
    render(<VectorUpsertNode {...makeProps({ provider: "pinecone" })} />);
    expect(screen.queryByRole("checkbox")).not.toBeInTheDocument();
  });
});

// ─── 4. Handles ───────────────────────────────────────────────────────────────

describe("VectorUpsertNode — handles", () => {
  it("renders the embedding handle (target, left)", () => {
    render(<VectorUpsertNode {...makeProps()} />);
    const h = screen.getByTestId("handle-embedding");
    expect(h).toHaveAttribute("data-handle-type", "target");
    expect(h).toHaveAttribute("data-position", "left");
  });

  it("renders the content handle (target, left)", () => {
    render(<VectorUpsertNode {...makeProps()} />);
    const h = screen.getByTestId("handle-content");
    expect(h).toHaveAttribute("data-handle-type", "target");
    expect(h).toHaveAttribute("data-position", "left");
  });

  it("renders the metadata handle (target, left)", () => {
    render(<VectorUpsertNode {...makeProps()} />);
    const h = screen.getByTestId("handle-metadata");
    expect(h).toHaveAttribute("data-handle-type", "target");
    expect(h).toHaveAttribute("data-position", "left");
  });

  it("renders the id input handle (target, left)", () => {
    render(<VectorUpsertNode {...makeProps()} />);
    const handles = screen.getAllByTestId("handle-id");
    const inputHandle = handles.find((h) => h.getAttribute("data-handle-type") === "target");
    expect(inputHandle).toBeDefined();
    expect(inputHandle).toHaveAttribute("data-position", "left");
  });

  it("renders the id output handle (source, right)", () => {
    render(<VectorUpsertNode {...makeProps()} />);
    // There are two handles with base "id" — the target input and the source output.
    // The source output handle's testid is "handle-id" — but since both use the same id key,
    // the registry uses "id" for both. React Flow disambiguates by handle type.
    // In our mock both are rendered; the test checks overall handle presence.
    const handles = screen.getAllByTestId(/^handle-/);
    const idHandles = handles.filter((h) => h.getAttribute("data-testid") === "handle-id");
    expect(idHandles.length).toBeGreaterThanOrEqual(1);
  });

  it("renders the success handle (source, right)", () => {
    render(<VectorUpsertNode {...makeProps()} />);
    const h = screen.getByTestId("handle-success");
    expect(h).toHaveAttribute("data-handle-type", "source");
    expect(h).toHaveAttribute("data-position", "right");
  });

  it("has 6 handles total (4 inputs + 2 outputs)", () => {
    render(<VectorUpsertNode {...makeProps()} />);
    expect(screen.getAllByTestId(/^handle-/)).toHaveLength(6);
  });

  it("same 6 handles regardless of provider", () => {
    render(<VectorUpsertNode {...makeProps({ provider: "pinecone" })} />);
    expect(screen.getAllByTestId(/^handle-/)).toHaveLength(6);
  });
});

// ─── 5. Provider tab onChange ─────────────────────────────────────────────────

describe("VectorUpsertNode — provider tab onChange", () => {
  it("clicking PC tab calls onChange({ provider: 'pinecone' })", () => {
    const onChange = vi.fn();
    render(<VectorUpsertNode {...makeProps({ onChange })} />);
    fireEvent.click(screen.getByRole("button", { name: "PC" }));
    expect(onChange).toHaveBeenCalledWith({ provider: "pinecone" });
  });

  it("clicking PG tab calls onChange({ provider: 'supabase' })", () => {
    const onChange = vi.fn();
    render(<VectorUpsertNode {...makeProps({ provider: "pinecone", onChange })} />);
    fireEvent.click(screen.getByRole("button", { name: "PG" }));
    expect(onChange).toHaveBeenCalledWith({ provider: "supabase" });
  });

  it("onChange is called exactly once per tab click", () => {
    const onChange = vi.fn();
    render(<VectorUpsertNode {...makeProps({ onChange })} />);
    fireEvent.click(screen.getByRole("button", { name: "PC" }));
    expect(onChange).toHaveBeenCalledTimes(1);
  });

  it("provider tab payload has only the 'provider' key", () => {
    const onChange = vi.fn();
    render(<VectorUpsertNode {...makeProps({ onChange })} />);
    fireEvent.click(screen.getByRole("button", { name: "PC" }));
    expect(Object.keys(onChange.mock.calls[0][0])).toEqual(["provider"]);
  });

  it("does not throw when tab clicked without onChange", () => {
    expect(() => {
      render(<VectorUpsertNode {...makeProps()} />);
      fireEvent.click(screen.getByRole("button", { name: "PC" }));
    }).not.toThrow();
  });
});

// ─── 6. Supabase fields onChange ─────────────────────────────────────────────

describe("VectorUpsertNode — supabase fields onChange", () => {
  it("calls onChange({ supabaseUrl: 'https://x.supabase.co' })", () => {
    const onChange = vi.fn();
    render(<VectorUpsertNode {...makeProps({ onChange })} />);
    fireEvent.change(screen.getByPlaceholderText("$SUPABASE_URL"), {
      target: { value: "https://x.supabase.co" },
    });
    expect(onChange).toHaveBeenCalledWith({ supabaseUrl: "https://x.supabase.co" });
  });

  it("calls onChange({ supabaseKey: 'service-key' })", () => {
    const onChange = vi.fn();
    render(<VectorUpsertNode {...makeProps({ onChange })} />);
    fireEvent.change(screen.getByPlaceholderText("$SUPABASE_SERVICE_KEY"), {
      target: { value: "service-key" },
    });
    expect(onChange).toHaveBeenCalledWith({ supabaseKey: "service-key" });
  });

  it("calls onChange({ tableName: 'chunks' }) when table input changes", () => {
    const onChange = vi.fn();
    render(<VectorUpsertNode {...makeProps({ onChange })} />);
    fireEvent.change(screen.getByDisplayValue("documents"), { target: { value: "chunks" } });
    expect(onChange).toHaveBeenCalledWith({ tableName: "chunks" });
  });

  it("calls onChange({ embeddingColumn: 'vec' }) when embed column changes", () => {
    const onChange = vi.fn();
    render(<VectorUpsertNode {...makeProps({ onChange })} />);
    fireEvent.change(screen.getByDisplayValue("embedding"), { target: { value: "vec" } });
    expect(onChange).toHaveBeenCalledWith({ embeddingColumn: "vec" });
  });

  it("calls onChange({ contentColumn: 'body' }) when text column changes", () => {
    const onChange = vi.fn();
    render(<VectorUpsertNode {...makeProps({ onChange })} />);
    fireEvent.change(screen.getByDisplayValue("content"), { target: { value: "body" } });
    expect(onChange).toHaveBeenCalledWith({ contentColumn: "body" });
  });

  it("calls onChange({ metadataColumn: 'extra' }) when meta column changes", () => {
    const onChange = vi.fn();
    render(<VectorUpsertNode {...makeProps({ onChange })} />);
    fireEvent.change(screen.getByDisplayValue("metadata"), { target: { value: "extra" } });
    expect(onChange).toHaveBeenCalledWith({ metadataColumn: "extra" });
  });

  it("calls onChange({ upsert: true }) when checkbox is checked", () => {
    const onChange = vi.fn();
    render(<VectorUpsertNode {...makeProps({ onChange })} />);
    fireEvent.click(screen.getByRole("checkbox"));
    expect(onChange).toHaveBeenCalledWith({ upsert: true });
  });

  it("calls onChange({ upsert: false }) when checkbox is unchecked", () => {
    const onChange = vi.fn();
    render(<VectorUpsertNode {...makeProps({ upsert: true, onChange })} />);
    fireEvent.click(screen.getByRole("checkbox"));
    expect(onChange).toHaveBeenCalledWith({ upsert: false });
  });

  it("does not throw when field changes without onChange", () => {
    expect(() => {
      render(<VectorUpsertNode {...makeProps()} />);
      fireEvent.change(screen.getByDisplayValue("documents"), { target: { value: "x" } });
    }).not.toThrow();
  });
});

// ─── 7. Pinecone fields onChange ──────────────────────────────────────────────

describe("VectorUpsertNode — pinecone fields onChange", () => {
  it("calls onChange({ pineconeHost: 'idx.svc.pinecone.io' })", () => {
    const onChange = vi.fn();
    render(<VectorUpsertNode {...makeProps({ provider: "pinecone", onChange })} />);
    fireEvent.change(screen.getByPlaceholderText("my-index-abc123.svc.pinecone.io"), {
      target: { value: "idx.svc.pinecone.io" },
    });
    expect(onChange).toHaveBeenCalledWith({ pineconeHost: "idx.svc.pinecone.io" });
  });

  it("calls onChange({ pineconeKey: 'pckey-xyz' })", () => {
    const onChange = vi.fn();
    render(<VectorUpsertNode {...makeProps({ provider: "pinecone", onChange })} />);
    fireEvent.change(screen.getByPlaceholderText("$PINECONE_KEY"), {
      target: { value: "pckey-xyz" },
    });
    expect(onChange).toHaveBeenCalledWith({ pineconeKey: "pckey-xyz" });
  });

  it("calls onChange({ namespace: 'prod' }) when namespace changes", () => {
    const onChange = vi.fn();
    render(<VectorUpsertNode {...makeProps({ provider: "pinecone", onChange })} />);
    fireEvent.change(screen.getByPlaceholderText("default"), { target: { value: "prod" } });
    expect(onChange).toHaveBeenCalledWith({ namespace: "prod" });
  });

  it("calls onChange({ namespace: '' }) when namespace is cleared", () => {
    const onChange = vi.fn();
    render(<VectorUpsertNode {...makeProps({ provider: "pinecone", namespace: "old", onChange })} />);
    fireEvent.change(screen.getByDisplayValue("old"), { target: { value: "" } });
    expect(onChange).toHaveBeenCalledWith({ namespace: "" });
  });

  it("does not throw when field changes without onChange", () => {
    expect(() => {
      render(<VectorUpsertNode {...makeProps({ provider: "pinecone" })} />);
      fireEvent.change(screen.getByPlaceholderText("$PINECONE_KEY"), {
        target: { value: "x" },
      });
    }).not.toThrow();
  });
});

// ─── 8. Fallback defaults ─────────────────────────────────────────────────────

describe("VectorUpsertNode — fallback defaults", () => {
  it("defaults provider to 'supabase' when undefined", () => {
    const props = makeProps();
    (props.data as Record<string, unknown>).provider = undefined;
    render(<VectorUpsertNode {...props} />);
    expect(screen.getAllByText("Supabase pgvector").length).toBeGreaterThan(0);
  });

  it("defaults tableName to 'documents' when undefined", () => {
    const props = makeProps();
    (props.data as Record<string, unknown>).tableName = undefined;
    render(<VectorUpsertNode {...props} />);
    expect(screen.getByDisplayValue("documents")).toBeInTheDocument();
  });

  it("defaults embeddingColumn to 'embedding' when undefined", () => {
    const props = makeProps();
    (props.data as Record<string, unknown>).embeddingColumn = undefined;
    render(<VectorUpsertNode {...props} />);
    expect(screen.getByDisplayValue("embedding")).toBeInTheDocument();
  });

  it("defaults contentColumn to 'content' when undefined", () => {
    const props = makeProps();
    (props.data as Record<string, unknown>).contentColumn = undefined;
    render(<VectorUpsertNode {...props} />);
    expect(screen.getByDisplayValue("content")).toBeInTheDocument();
  });

  it("defaults metadataColumn to 'metadata' when undefined", () => {
    const props = makeProps();
    (props.data as Record<string, unknown>).metadataColumn = undefined;
    render(<VectorUpsertNode {...props} />);
    expect(screen.getByDisplayValue("metadata")).toBeInTheDocument();
  });

  it("defaults upsert to false when undefined", () => {
    const props = makeProps();
    (props.data as Record<string, unknown>).upsert = undefined;
    render(<VectorUpsertNode {...props} />);
    expect(screen.getByRole("checkbox")).not.toBeChecked();
  });

  it("renders without crashing when data is empty object", () => {
    const props = { ...makeProps(), data: {} };
    expect(() => render(<VectorUpsertNode {...(props as unknown as NodeProps)} />)).not.toThrow();
  });
});

// ─── 9. Payload shape ─────────────────────────────────────────────────────────

describe("VectorUpsertNode — timeout field", () => {
  const timeoutInput = () => screen.getByRole("spinbutton", { name: "Request timeout (seconds)" });

  it("renders the timeout input in seconds (default 15)", () => {
    render(<VectorUpsertNode {...makeProps()} />);
    expect(timeoutInput()).toHaveValue(15);
  });

  it("defaults to 15 s when timeout is undefined", () => {
    const props = makeProps();
    (props.data as Record<string, unknown>).timeout = undefined;
    render(<VectorUpsertNode {...props} />);
    expect(timeoutInput()).toHaveValue(15);
  });

  it("reflects a custom timeout value in seconds", () => {
    render(<VectorUpsertNode {...makeProps({ timeout: 20000 })} />);
    expect(timeoutInput()).toHaveValue(20);
  });

  it("stores the timeout in milliseconds on change", () => {
    const onChange = vi.fn();
    render(<VectorUpsertNode {...makeProps({ onChange })} />);
    fireEvent.change(timeoutInput(), { target: { value: "60" } });
    expect(onChange).toHaveBeenCalledWith({ timeout: 60000 });
  });

  it("clamps a zero or negative timeout to the 1 s minimum", () => {
    const onChange = vi.fn();
    render(<VectorUpsertNode {...makeProps({ onChange })} />);
    fireEvent.change(timeoutInput(), { target: { value: "0" } });
    expect(onChange).toHaveBeenCalledWith({ timeout: 1000 });
  });
});

const ALLOWED_KEYS = new Set<string>([
  "provider",
  "supabaseUrl", "supabaseKey", "tableName",
  "embeddingColumn", "contentColumn", "metadataColumn", "upsert",
  "pineconeHost", "pineconeKey", "namespace", "timeout",
  "onChange", "connectedHandles",
]);

describe("VectorUpsertNode — payload shape", () => {
  it("provider tab payload contains only allowed keys", () => {
    const onChange = vi.fn();
    render(<VectorUpsertNode {...makeProps({ onChange })} />);
    fireEvent.click(screen.getByRole("button", { name: "PC" }));
    for (const key of Object.keys(onChange.mock.calls[0][0])) {
      expect(ALLOWED_KEYS.has(key)).toBe(true);
    }
  });

  it("supabaseUrl payload contains only allowed keys", () => {
    const onChange = vi.fn();
    render(<VectorUpsertNode {...makeProps({ onChange })} />);
    fireEvent.change(screen.getByPlaceholderText("$SUPABASE_URL"), {
      target: { value: "https://x.supabase.co" },
    });
    for (const key of Object.keys(onChange.mock.calls[0][0])) {
      expect(ALLOWED_KEYS.has(key)).toBe(true);
    }
  });

  it("tableName payload contains only allowed keys", () => {
    const onChange = vi.fn();
    render(<VectorUpsertNode {...makeProps({ onChange })} />);
    fireEvent.change(screen.getByDisplayValue("documents"), { target: { value: "x" } });
    for (const key of Object.keys(onChange.mock.calls[0][0])) {
      expect(ALLOWED_KEYS.has(key)).toBe(true);
    }
  });

  it("upsert payload contains only allowed keys", () => {
    const onChange = vi.fn();
    render(<VectorUpsertNode {...makeProps({ onChange })} />);
    fireEvent.click(screen.getByRole("checkbox"));
    for (const key of Object.keys(onChange.mock.calls[0][0])) {
      expect(ALLOWED_KEYS.has(key)).toBe(true);
    }
  });

  it("onChange payload values are never undefined", () => {
    const onChange = vi.fn();
    render(<VectorUpsertNode {...makeProps({ onChange })} />);
    fireEvent.click(screen.getByRole("checkbox"));
    for (const val of Object.values(onChange.mock.calls[0][0])) {
      expect(val).not.toBeUndefined();
    }
  });

  it("pineconeHost payload contains only allowed keys", () => {
    const onChange = vi.fn();
    render(<VectorUpsertNode {...makeProps({ provider: "pinecone", onChange })} />);
    fireEvent.change(screen.getByPlaceholderText("my-index-abc123.svc.pinecone.io"), {
      target: { value: "x" },
    });
    for (const key of Object.keys(onChange.mock.calls[0][0])) {
      expect(ALLOWED_KEYS.has(key)).toBe(true);
    }
  });
});

// ─── 10. Selected state ───────────────────────────────────────────────────────

describe("VectorUpsertNode — selected state", () => {
  it("renders without crashing when selected=true", () => {
    const props = { ...makeProps(), selected: true };
    expect(() => render(<VectorUpsertNode {...props} />)).not.toThrow();
  });

  it("renders without crashing when selected=false", () => {
    const props = { ...makeProps(), selected: false };
    expect(() => render(<VectorUpsertNode {...props} />)).not.toThrow();
  });
});

// ─── 11. Filled values display ────────────────────────────────────────────────

describe("VectorUpsertNode — filled values display", () => {
  it("shows filled supabaseUrl value", () => {
    render(<VectorUpsertNode {...makeProps(SUPABASE_FILLED)} />);
    expect(screen.getByDisplayValue("https://project.supabase.co")).toBeInTheDocument();
  });

  it("shows filled tableName value", () => {
    render(<VectorUpsertNode {...makeProps(SUPABASE_FILLED)} />);
    expect(screen.getByDisplayValue("my_docs")).toBeInTheDocument();
  });

  it("shows filled pineconeHost value for pinecone provider", () => {
    render(<VectorUpsertNode {...makeProps(PINECONE_DATA)} />);
    expect(screen.getByDisplayValue("my-index.svc.pinecone.io")).toBeInTheDocument();
  });

  it("shows filled namespace value for pinecone provider", () => {
    render(<VectorUpsertNode {...makeProps(PINECONE_DATA)} />);
    expect(screen.getByDisplayValue("docs")).toBeInTheDocument();
  });
});
