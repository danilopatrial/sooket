import type { ComponentType } from "react";
import type { LucideIcon } from "lucide-react";
import {
  Hash, Gauge, SmilePlus, Sparkles, Braces, ShieldCheck, Globe, EyeOff,
  DatabaseZap, Database, FileJson, GitBranch, ArrowLeftRight,
  ShieldAlert, Link2, List, KeyRound, Clock, Type, Calculator,
  Ruler, ToggleLeft, AlignLeft, Binary, ArrowLeft, Combine,
  Regex, Shuffle, Shield, ListPlus, Merge, Bug, FileCode2, Languages, Layers, BrainCircuit,
  Webhook, RotateCcw, Timer, ScanEye, Replace, Minimize2, Dices, Bot, FileCheck2,
} from "lucide-react";
import type { NodeProps } from "@xyflow/react";
import { AnthropicNode } from "./AnthropicNode";
import { OpenAINode } from "./OpenAINode";
import { TextNode } from "./TextNode";
import { NumberNode } from "./NumberNode";
import { JsonParserNode } from "./JsonParserNode";
import { JsonBuilderNode } from "./JsonBuilderNode";
import { TemplateStringNode } from "./TemplateStringNode";
import { RouterNode } from "./RouterNode";
import { PiiRedactNode } from "./PiiRedactNode";
import { HttpRequestNode } from "./HttpRequestNode";
import { IfNode } from "./IfNode";
import { BooleanNode } from "./BooleanNode";
import { MathNode } from "./MathNode";
import { StringOpsNode } from "./StringOpsNode";
import { DateTimeNode } from "./DateTimeNode";
import { TypeCastNode } from "./TypeCastNode";
import { NullCheckNode } from "./NullCheckNode";
import { ConcatNode } from "./ConcatNode";
import { ArrayLengthNode } from "./ArrayLengthNode";
import { PickNode } from "./PickNode";
import { SizeOfNode } from "./SizeOfNode";
import { AuthValidatorNode } from "./AuthValidatorNode";
import { ResponseBuilderNode } from "./ResponseBuilderNode";
import { ComplexityNode } from "./ComplexityNode";
import { TokenCounterNode } from "./TokenCounterNode";
import { VectorSearchNode } from "./VectorSearchNode";
import { VectorUpsertNode } from "./VectorUpsertNode";
import { OutputNode } from "./OutputNode";
import { AccessListNode } from "./AccessListNode";
import { ListManagerNode } from "./ListManagerNode";
import { MergeNode } from "./MergeNode";
import { TryCatchNode } from "./TryCatchNode";
import { XmlJsonNode } from "./XmlJsonNode";
import { LanguageDetectNode } from "./LanguageDetectNode";
import { CacheNode } from "./CacheNode";
import { SemanticCacheNode } from "./SemanticCacheNode";
import { WebhookNode } from "./WebhookNode";
import { RetryNode } from "./RetryNode";
import { RateLimiterNode } from "./RateLimiterNode";
import { ContentGuardrailNode } from "./ContentGuardrailNode";
import { SchemaValidatorNode } from "./SchemaValidatorNode";
import { CustomCodeNode } from "./CustomCodeNode";
import { RegexReplaceNode } from "./RegexReplaceNode";
import { SentimentNode } from "./SentimentNode";
import { PromptCompressionNode } from "./PromptCompressionNode";
import { ABSplitNode } from "./ABSplitNode";
import { SubWorkflowNode } from "./SubWorkflowNode";

export type NodeCategory = "ai" | "request" | "external" | "format" | "logic" | "transform" | "static";

export interface NodeDef {
  type: string;
  component: ComponentType<NodeProps>;
  label: string;
  sub: string;
  color: string;
  icon: LucideIcon;
  category: NodeCategory;
  defaultData: Record<string, unknown>;
  /** Only one of this type allowed per workflow */
  singleton?: boolean;
  /**
   * Handle IDs used when auto-inserting this node into an existing edge.
   * null means the node cannot be used as that end of a split (e.g. source-only
   * nodes have primaryInput: null; nodes with no single output have primaryOutput: null).
   */
  primaryInput?: string | null;
  primaryOutput?: string | null;
  /** Override primaryOutput at runtime from the node's live data (e.g. dynamic handles). */
  getDynamicOutput?: (data: Record<string, unknown>) => string | null;
}

export const NODE_REGISTRY: NodeDef[] = [
  // ── AI ──────────────────────────────────────────────────────────────────
  {
    type: "token-counter",
    component: TokenCounterNode,
    label: "Token Counter",
    sub: "Count tokens via GPT tokenizer",
    color: "bg-violet-500",
    icon: Hash,
    category: "ai",
    defaultData: { testPrompt: "" },
    primaryInput: "input",
    primaryOutput: "output",
  },
  {
    type: "complexity",
    component: ComplexityNode,
    label: "Complexity Score",
    sub: "Score prompt complexity 0–1",
    color: "bg-amber-500",
    icon: Gauge,
    category: "ai",
    defaultData: { testPrompt: "", lastScore: null, lastTier: null, lastSignals: [], lastTokenCount: 0 },
    primaryInput: "prompt",
    primaryOutput: "score",
  },
  {
    type: "sentiment",
    component: SentimentNode,
    label: "Sentiment",
    sub: "Score text −1 → +1",
    color: "bg-rose-500",
    icon: SmilePlus,
    category: "ai",
    defaultData: {
      testText: "",
      positiveThreshold: 0.05,
      negativeThreshold: -0.05,
      lastScore: null,
      lastLabel: null,
      lastWordCount: 0,
      lastPositiveWords: [],
      lastNegativeWords: [],
    },
    primaryInput: "input",
    primaryOutput: "score",
  },
  {
    type: "anthropic",
    component: AnthropicNode,
    label: "Anthropic",
    sub: "Claude models",
    color: "bg-violet-500",
    icon: Sparkles,
    category: "ai",
    defaultData: { model: "claude-sonnet-4-6", systemPrompt: "You are a helpful assistant", temperature: 0.7 },
    primaryInput: "userPrompt",
    primaryOutput: "output",
  },
  {
    type: "openai",
    component: OpenAINode,
    label: "OpenAI",
    sub: "GPT & OpenAI-compatible",
    color: "bg-emerald-500",
    icon: Bot,
    category: "ai",
    defaultData: { model: "gpt-4o-mini", systemPrompt: "You are a helpful assistant", temperature: 0.7, baseURL: "https://api.openai.com/v1" },
    primaryInput: "userPrompt",
    primaryOutput: "output",
  },
  {
    type: "prompt-compression",
    component: PromptCompressionNode,
    label: "Prompt Compression",
    sub: "Compress text via Haiku before main LLM",
    color: "bg-violet-500",
    icon: Minimize2,
    category: "ai",
    defaultData: {
      compressionPrompt: "Summarize the following concisely, preserving all key information:",
      targetWords: null,
    },
    primaryInput: "input",
    primaryOutput: "output",
  },
  // ── Request ──────────────────────────────────────────────────────────────
  {
    type: "workflowOutput",
    component: OutputNode,
    label: "Output",
    sub: "API response exit point",
    color: "bg-blue-500",
    icon: ArrowLeft,
    category: "request",
    defaultData: {},
    primaryInput: "input",
    primaryOutput: null,
  },
  {
    type: "response-builder",
    component: ResponseBuilderNode,
    label: "Response Builder",
    sub: "Shape your HTTP reply",
    color: "bg-blue-500",
    icon: Braces,
    category: "request",
    defaultData: { status: 200, headers: [] },
    primaryInput: "body",
    primaryOutput: "reply",
  },
  {
    type: "list-manager",
    component: ListManagerNode,
    label: "List Manager",
    sub: "Add or remove from access list",
    color: "bg-violet-500",
    icon: ListPlus,
    category: "request",
    defaultData: { action: "add" },
    primaryInput: "value",
    primaryOutput: "value",
  },
  {
    type: "access-list",
    component: AccessListNode,
    label: "Access List",
    sub: "Whitelist or blacklist values",
    color: "bg-amber-500",
    icon: Shield,
    category: "request",
    defaultData: { mode: "whitelist" },
    primaryInput: "input",
    primaryOutput: "pass",
  },
  {
    type: "auth-validator",
    component: AuthValidatorNode,
    label: "Auth Validator",
    sub: "Validate JWT or API key",
    color: "bg-emerald-600",
    icon: ShieldCheck,
    category: "request",
    defaultData: {
      mode: "jwt",
      headerName: "Authorization",
      algorithm: "HS256",
      secret: "",
      jwksUrl: "",
      claims: [],
      apiKeys: [],
    },
    primaryInput: "tokenSource",
    primaryOutput: "valid",
  },
  // ── External ─────────────────────────────────────────────────────────────
  {
    type: "http-request",
    component: HttpRequestNode,
    label: "HTTP Request",
    sub: "Call any REST endpoint",
    color: "bg-cyan-500",
    icon: Globe,
    category: "external",
    defaultData: { method: "GET", url: "", headers: [], timeout: 10000 },
    primaryInput: "url",
    primaryOutput: "res-body",
  },
  {
    type: "vector-upsert",
    component: VectorUpsertNode,
    label: "Vector Upsert",
    sub: "Write embeddings to pgvector or Pinecone",
    color: "bg-violet-500",
    icon: DatabaseZap,
    category: "external",
    defaultData: {
      provider: "supabase",
      supabaseUrl: "",
      supabaseKey: "",
      tableName: "documents",
      embeddingColumn: "embedding",
      contentColumn: "content",
      metadataColumn: "metadata",
      upsert: false,
      pineconeHost: "",
      pineconeKey: "",
      namespace: "",
      timeout: 15000,
    },
    primaryInput: "embedding",
    primaryOutput: "id",
  },
  {
    type: "vector-search",
    component: VectorSearchNode,
    label: "Vector Search",
    sub: "Query pgvector or Pinecone",
    color: "bg-indigo-500",
    icon: Database,
    category: "external",
    defaultData: {
      provider: "supabase",
      supabaseUrl: "",
      supabaseKey: "",
      functionName: "match_documents",
      matchCount: 5,
      pineconeHost: "",
      pineconeKey: "",
      namespace: "",
      topK: 5,
      timeout: 15000,
    },
    primaryInput: "embedding",
    primaryOutput: "results",
  },
  {
    type: "webhook",
    component: WebhookNode,
    label: "Webhook",
    sub: "Fire-and-forget POST to external URL",
    color: "bg-rose-500",
    icon: Webhook,
    category: "external",
    defaultData: { mode: "action", method: "POST", url: "", headers: [], bodyTemplate: "" },
    primaryInput: "input",
    primaryOutput: "output",
  },
  // ── Format ───────────────────────────────────────────────────────────────
  {
    type: "json-parser",
    component: JsonParserNode,
    label: "JSON Parser",
    sub: "Extract body fields",
    color: "bg-sky-500",
    icon: FileJson,
    category: "format",
    defaultData: { fields: [] },
    primaryInput: "input",
    primaryOutput: null,
    getDynamicOutput: (data) => {
      const fields = data.fields as Array<{ id: string }> | undefined;
      return fields?.[0]?.id ?? null;
    },
  },
  {
    type: "json-builder",
    component: JsonBuilderNode,
    label: "JSON Builder",
    sub: "Construct JSON from inputs",
    color: "bg-amber-500",
    icon: Combine,
    category: "format",
    defaultData: { fields: [] },
    primaryInput: null,
    primaryOutput: "output",
  },
  {
    type: "xml-json",
    component: XmlJsonNode,
    label: "XML ↔ JSON",
    sub: "Convert between XML and JSON",
    color: "bg-orange-500",
    icon: FileCode2,
    category: "format",
    defaultData: { direction: "xml-to-json", rootElement: "root", prettyPrint: false },
    primaryInput: "input",
    primaryOutput: "output",
  },
  {
    type: "template-string",
    component: TemplateStringNode,
    label: "Template String",
    sub: "String interpolation with {{slot}} handles",
    color: "bg-sky-500",
    icon: Regex,
    category: "format",
    defaultData: { template: "", slots: [] },
    primaryInput: null,
    primaryOutput: "output",
  },
  // ── Logic ────────────────────────────────────────────────────────────────
  {
    type: "if",
    component: IfNode,
    label: "If",
    sub: "Branch on condition",
    color: "bg-orange-500",
    icon: GitBranch,
    category: "logic",
    defaultData: { operator: "==", compareTo: "" },
    primaryInput: "input",
    primaryOutput: "true",
  },
  {
    type: "try-catch",
    component: TryCatchNode,
    label: "Try / Catch",
    sub: "Wrap upstream chain; catch errors",
    color: "bg-orange-500",
    icon: Bug,
    category: "logic",
    defaultData: {},
    primaryInput: "try",
    primaryOutput: "result",
  },
  {
    type: "retry",
    component: RetryNode,
    label: "Retry",
    sub: "Re-run upstream up to N times with backoff",
    color: "bg-amber-500",
    icon: RotateCcw,
    category: "logic",
    defaultData: { maxAttempts: 3, backoff: "exponential", baseDelayMs: 1000, maxDelayMs: 30000 },
    primaryInput: "input",
    primaryOutput: "output",
  },
  {
    type: "content-guardrail",
    component: ContentGuardrailNode,
    label: "Content Guardrail",
    sub: "Block or flag outputs that violate rules",
    color: "bg-rose-500",
    icon: ScanEye,
    category: "logic",
    defaultData: { patterns: [], useLlm: false, llmRules: "", action: "block" },
    primaryInput: "input",
    primaryOutput: "output",
  },
  {
    type: "schema-validator",
    component: SchemaValidatorNode,
    label: "Schema Validator",
    sub: "Validate input against a JSON Schema",
    color: "bg-teal-500",
    icon: FileCheck2,
    category: "logic",
    defaultData: { schema: "", action: "block" },
    primaryInput: "input",
    primaryOutput: "valid",
  },
  {
    type: "rate-limiter",
    component: RateLimiterNode,
    label: "Rate Limiter",
    sub: "Per-IP or per-workflow request quota",
    color: "bg-orange-500",
    icon: Timer,
    category: "logic",
    defaultData: { keySource: "ip", windowSeconds: 60, limit: 100, action: "block", delayMs: 1000 },
    primaryInput: "input",
    primaryOutput: "output",
  },
  {
    type: "cache",
    component: CacheNode,
    label: "Cache",
    sub: "Check SQLite for cached result; write on miss",
    color: "bg-teal-500",
    icon: Layers,
    category: "logic",
    defaultData: { ttl: 3600 },
    primaryInput: "value",
    primaryOutput: "output",
  },
  {
    type: "semantic-cache",
    component: SemanticCacheNode,
    label: "Semantic Cache",
    sub: "Embed & match near-identical inputs",
    color: "bg-violet-500",
    icon: BrainCircuit,
    category: "logic",
    defaultData: { ttl: 3600, threshold: 0.85 },
    primaryInput: "value",
    primaryOutput: "output",
  },
  {
    type: "router",
    component: RouterNode,
    label: "Router",
    sub: "Multi-case value routing",
    color: "bg-orange-500",
    icon: Shuffle,
    category: "logic",
    defaultData: { cases: [], hasDefault: false },
    primaryInput: "input",
    primaryOutput: null,
    getDynamicOutput: (data) => {
      const cases = data.cases as Array<{ id: string }> | undefined;
      return cases?.[0]?.id ?? null;
    },
  },
  {
    type: "ab-split",
    component: ABSplitNode,
    label: "A/B Split",
    sub: "Route traffic by weighted random split",
    color: "bg-green-500",
    icon: Dices,
    category: "logic",
    defaultData: {
      branches: [
        { id: "a", weight: 50 },
        { id: "b", weight: 50 },
      ],
    },
    primaryInput: "input",
    primaryOutput: null,
    getDynamicOutput: (data) => {
      const branches = data.branches as Array<{ id: string }> | undefined;
      return branches?.[0]?.id ?? null;
    },
  },
  {
    type: "language-detect",
    component: LanguageDetectNode,
    label: "Language Detect",
    sub: "Route by detected language",
    color: "bg-sky-500",
    icon: Languages,
    category: "logic",
    defaultData: { routes: [], hasDefault: true },
    primaryInput: "input",
    primaryOutput: null,
    getDynamicOutput: (data) => {
      const routes = data.routes as Array<{ id: string }> | undefined;
      return routes?.[0]?.id ?? null;
    },
  },
  {
    type: "type-cast",
    component: TypeCastNode,
    label: "Type Cast",
    sub: "Convert type",
    color: "bg-yellow-500",
    icon: ArrowLeftRight,
    category: "transform",
    defaultData: { target: "string" },
    primaryInput: "input",
    primaryOutput: "output",
  },
  {
    type: "null-check",
    component: NullCheckNode,
    label: "Null Check",
    sub: "value ?? fallback",
    color: "bg-amber-500",
    icon: ShieldAlert,
    category: "logic",
    defaultData: { fallback: "" },
    primaryInput: "input",
    primaryOutput: "output",
  },
  {
    type: "concat",
    component: ConcatNode,
    label: "Concat",
    sub: "Join strings together",
    color: "bg-pink-500",
    icon: Link2,
    category: "transform",
    defaultData: { separator: "", inputCount: 2 },
    primaryInput: "input-0",
    primaryOutput: "output",
  },
  {
    type: "merge",
    component: MergeNode,
    label: "Merge",
    sub: "Fan-in N inputs into one",
    color: "bg-emerald-500",
    icon: Merge,
    category: "logic",
    defaultData: {
      mode: "first",
      inputCount: 2,
      separator: "",
      slotKeys: ["field0", "field1"],
    },
    primaryInput: "input-0",
    primaryOutput: "output",
  },
  {
    type: "array-length",
    component: ArrayLengthNode,
    label: "Array Length",
    sub: "Count array items",
    color: "bg-indigo-500",
    icon: List,
    category: "transform",
    defaultData: {},
    primaryInput: "input",
    primaryOutput: "output",
  },
  {
    type: "pick",
    component: PickNode,
    label: "Pick",
    sub: "Extract key from object",
    color: "bg-lime-500",
    icon: KeyRound,
    category: "transform",
    defaultData: { key: "" },
    primaryInput: "input",
    primaryOutput: "output",
  },
  {
    type: "datetime",
    component: DateTimeNode,
    label: "Date / Time",
    sub: "Timestamp or format date",
    color: "bg-violet-500",
    icon: Clock,
    category: "transform",
    defaultData: { mode: "now", formatStr: "ISO" },
    primaryInput: "input",
    primaryOutput: "output",
  },
  {
    type: "string-ops",
    component: StringOpsNode,
    label: "String Ops",
    sub: "String transformation",
    color: "bg-sky-500",
    icon: Type,
    category: "transform",
    defaultData: { op: "uppercase", separator: ",", sliceStart: 0, sliceEnd: 0, sliceEndEnabled: false },
    primaryInput: "input",
    primaryOutput: "output",
  },
  {
    type: "regex-replace",
    component: RegexReplaceNode,
    label: "Regex Replace",
    sub: "Find & replace with regex",
    color: "bg-teal-500",
    icon: Replace,
    category: "transform",
    defaultData: { pattern: "", replace: "", flags: "g" },
    primaryInput: "input",
    primaryOutput: "output",
  },
  {
    type: "math",
    component: MathNode,
    label: "Math",
    sub: "Numeric operation",
    color: "bg-purple-500",
    icon: Calculator,
    category: "transform",
    defaultData: { operator: "+", defaultA: 0, defaultB: 0 },
    primaryInput: "a",
    primaryOutput: "result",
  },
  {
    type: "size-of",
    component: SizeOfNode,
    label: "Size Of",
    sub: "Count characters in input",
    color: "bg-indigo-500",
    icon: Ruler,
    category: "transform",
    defaultData: {},
    primaryInput: "input",
    primaryOutput: "output",
  },
  {
    type: "pii-redact",
    component: PiiRedactNode,
    label: "PII Redact",
    sub: "Redact sensitive data",
    color: "bg-rose-500",
    icon: EyeOff,
    category: "transform",
    defaultData: { replacement: "", customPatterns: [] },
    primaryInput: "input",
    primaryOutput: "output",
  },
  {
    type: "custom-code",
    component: CustomCodeNode,
    label: "Custom Code",
    sub: "Run a JS snippet in a sandbox",
    color: "bg-orange-500",
    icon: FileCode2,
    category: "logic",
    defaultData: { code: "" },
    primaryInput: "input",
    primaryOutput: "output",
  },
  {
    type: "sub-workflow",
    component: SubWorkflowNode,
    label: "Sub-Workflow",
    sub: "Execute another workflow as a step",
    color: "bg-violet-500",
    icon: Layers,
    category: "logic",
    defaultData: { slug: "" },
    primaryInput: "input",
    primaryOutput: "output",
  },
  // ── Static ───────────────────────────────────────────────────────────────
  {
    type: "boolean",
    component: BooleanNode,
    label: "Boolean",
    sub: "Static true / false output",
    color: "bg-emerald-500",
    icon: ToggleLeft,
    category: "static",
    defaultData: { value: false },
    primaryInput: null, // source-only node
    primaryOutput: "output",
  },
  {
    type: "text",
    component: TextNode,
    label: "Text",
    sub: "Static text output",
    color: "bg-teal-500",
    icon: AlignLeft,
    category: "static",
    defaultData: { text: "" },
    primaryInput: null, // source-only node
    primaryOutput: "output",
  },
  {
    type: "number",
    component: NumberNode,
    label: "Number",
    sub: "Numeric value output",
    color: "bg-amber-500",
    icon: Binary,
    category: "static",
    defaultData: { fixedValue: null, value: 0.5, min: 0, max: 1 },
    primaryInput: null, // source-only node
    primaryOutput: "output",
  },
];

// ── Derived maps — import these instead of the raw arrays ────────────────

export const NODE_TYPES = Object.fromEntries(
  NODE_REGISTRY.map((n) => [n.type, n.component])
) as Record<string, ComponentType<NodeProps>>;

export const NODE_DEFAULTS = Object.fromEntries(
  NODE_REGISTRY.map((n) => [n.type, n.defaultData])
) as Record<string, Record<string, unknown>>;

export const NODE_CATEGORIES: NodeCategory[] = ["ai", "request", "external", "format", "logic", "transform", "static"];

export const CATEGORY_LABEL: Record<NodeCategory, string> = {
  ai:        "AI",
  request:   "Request",
  external:  "External",
  format:    "Format",
  logic:     "Logic",
  transform: "Transform",
  static:    "Static",
};
