/**
 * Shared per-node data interfaces.
 *
 * Canvas components import their *NodeData from here.
 * Executors (lib/nodes/*.ts) cast node.data to these types instead of
 * defining inline anonymous shapes, ensuring both sides stay in sync.
 *
 * UI-only fields (onChange, connectedHandles) are included because canvas
 * components spread the full data object — executors simply ignore them.
 */

import type { SentimentLabel } from "@/lib/sentiment";
import type { Tier } from "@/lib/complexity/heuristics";

// ─── Re-export library types used in node data ────────────────────────────────
export type { SentimentLabel, Tier };

// ─── AI nodes ────────────────────────────────────────────────────────────────

export interface AnthropicNodeData {
  model: string;
  systemPrompt: string;
  temperature: number;
  connectedHandles?: string[];
  onChange?: (data: Partial<AnthropicNodeData>) => void;
}

export interface OpenAINodeData {
  model: string;
  systemPrompt: string;
  temperature: number;
  /** OpenAI-compatible base URL (default https://api.openai.com/v1). */
  baseURL: string;
  connectedHandles?: string[];
  onChange?: (data: Partial<OpenAINodeData>) => void;
}

export interface ComplexityNodeData {
  testPrompt: string;
  lastScore: number | null;
  lastTier: Tier | null;
  lastSignals: string[];
  lastTokenCount: number;
  onChange?: (data: Partial<ComplexityNodeData>) => void;
  connectedHandles?: string[];
}

export interface SentimentNodeData {
  testText: string;
  positiveThreshold: number;
  negativeThreshold: number;
  lastScore: number | null;
  lastLabel: SentimentLabel | null;
  lastWordCount: number;
  lastPositiveWords: string[];
  lastNegativeWords: string[];
  onChange?: (data: Partial<SentimentNodeData>) => void;
  connectedHandles?: string[];
}

export interface TokenCounterNodeData {
  testPrompt: string;
  onChange?: (data: Partial<TokenCounterNodeData>) => void;
  connectedHandles?: string[];
}

export interface PromptCompressionNodeData {
  compressionPrompt: string;
  targetWords: number | null;
  onChange?: (data: Partial<PromptCompressionNodeData>) => void;
  connectedHandles?: string[];
}

// ─── Logic nodes ─────────────────────────────────────────────────────────────

export type IfOperator =
  | "==" | "!="
  | ">"  | "<" | ">=" | "<="
  | "contains" | "startsWith" | "endsWith"
  | "isEmpty"  | "isTruthy";

export interface IfNodeData {
  operator: IfOperator;
  compareTo: string;
  onChange?: (data: Partial<IfNodeData>) => void;
  connectedHandles?: string[];
}

export interface RouterCase {
  id: string;
  label: string;
  match: string;
}

export interface RouterNodeData {
  cases: RouterCase[];
  hasDefault: boolean;
  onChange?: (data: Partial<RouterNodeData>) => void;
  connectedHandles?: string[];
}

export interface ABSplitBranch {
  id: string;
  weight: number;
}

export interface ABSplitNodeData {
  branches: ABSplitBranch[];
  onChange?: (data: Partial<ABSplitNodeData>) => void;
  connectedHandles?: string[];
}

export interface MergeNodeData {
  mode: "first" | "join" | "object";
  inputCount: number;
  separator: string;
  slotKeys: string[];
  onChange?: (data: Partial<MergeNodeData>) => void;
  connectedHandles?: string[];
}

export interface NullCheckNodeData {
  fallback: string;
  onChange?: (data: Partial<NullCheckNodeData>) => void;
  connectedHandles?: string[];
}

export interface TryCatchNodeData {
  connectedHandles?: string[];
}

export type BackoffStrategy = "none" | "linear" | "exponential";

export interface RetryNodeData {
  maxAttempts?: number;
  backoff?: BackoffStrategy;
  baseDelayMs?: number;
  /** Upper bound (ms) on a single backoff delay. Default 30000. */
  maxDelayMs?: number;
  onChange?: (data: Partial<RetryNodeData>) => void;
  connectedHandles?: string[];
}

export interface GuardrailPattern {
  id: string;
  text: string;
}

export interface ContentGuardrailNodeData {
  patterns?: GuardrailPattern[];
  useLlm?: boolean;
  llmRules?: string;
  action?: "block" | "flag";
  onChange?: (data: Partial<ContentGuardrailNodeData>) => void;
  connectedHandles?: string[];
}

export interface SchemaValidatorNodeData {
  /** JSON Schema (draft-07 subset) text the input is validated against. */
  schema?: string;
  /** On a validation failure: "block" the valid output, or "pass" input through. */
  action?: "block" | "pass";
  onChange?: (data: Partial<SchemaValidatorNodeData>) => void;
  connectedHandles?: string[];
}

export interface OAuth2TokenNodeData {
  /** Token endpoint URL (supports `$VAR` customer variables). */
  tokenUrl?: string;
  /** OAuth2 client id (supports `$VAR`). */
  clientId?: string;
  /** OAuth2 client secret — prefer a `$VAR` reference over a literal. */
  clientSecret?: string;
  /** Optional space-delimited scopes (supports `$VAR`). */
  scope?: string;
  /** Where to put credentials: form "body" (default) or HTTP "basic" auth header. */
  authStyle?: "body" | "basic";
  /** Seconds shaved off `expires_in` before the cached token is considered stale. */
  refreshSkewSeconds?: number;
  /** Token-request timeout in ms (default 10000). */
  timeout?: number;
  onChange?: (data: Partial<OAuth2TokenNodeData>) => void;
  connectedHandles?: string[];
}

export interface RateLimiterNodeData {
  keySource?: "workflow" | "ip" | "custom";
  windowSeconds?: number;
  limit?: number;
  action?: "block" | "delay";
  delayMs?: number;
  onChange?: (data: Partial<RateLimiterNodeData>) => void;
  connectedHandles?: string[];
}

export interface CacheNodeData {
  ttl?: number;
  onChange?: (data: Partial<CacheNodeData>) => void;
  connectedHandles?: string[];
}

export interface SemanticCacheNodeData {
  ttl?: number;
  threshold?: number;
  onChange?: (data: Partial<SemanticCacheNodeData>) => void;
  connectedHandles?: string[];
}

export interface CustomCodeNodeData {
  code: string;
  onChange?: (data: Partial<CustomCodeNodeData>) => void;
  connectedHandles?: string[];
}

// ─── Format nodes ─────────────────────────────────────────────────────────────

export interface JsonParserField {
  id: string;
  name: string;
  defaultValue?: string;
}

export interface JsonParserNodeData {
  fields: JsonParserField[];
  onChange?: (data: Partial<JsonParserNodeData>) => void;
  connectedHandles?: string[];
}

export interface JsonBuilderField {
  id: string;
  key: string;
  fallback?: string;
}

export interface JsonBuilderNodeData {
  fields: JsonBuilderField[];
  onChange?: (data: Partial<JsonBuilderNodeData>) => void;
  onRemoveField?: (fieldId: string) => void;
  connectedHandles?: string[];
}

export interface TemplateStringSlot {
  name: string;
  fallback: string;
}

export interface TemplateStringNodeData {
  template: string;
  slots: TemplateStringSlot[];
  onChange?: (data: Partial<TemplateStringNodeData>) => void;
  connectedHandles?: string[];
}

export type XmlJsonDirection = "xml-to-json" | "json-to-xml";

export interface XmlJsonNodeData {
  direction: XmlJsonDirection;
  rootElement: string;
  prettyPrint: boolean;
  onChange?: (data: Partial<XmlJsonNodeData>) => void;
}

// ─── Transform nodes ─────────────────────────────────────────────────────────

export type CastTarget = "string" | "number" | "boolean";

export interface TypeCastNodeData {
  target: CastTarget;
  onChange?: (data: Partial<TypeCastNodeData>) => void;
}

export interface ConcatNodeData {
  separator: string;
  inputCount: number;
  onChange?: (data: Partial<ConcatNodeData>) => void;
  connectedHandles?: string[];
}

export type MathOperator = "+" | "-" | "*" | "/" | "%" | "**" | "min" | "max" | "abs";

export interface MathNodeData {
  operator: MathOperator;
  defaultA: number;
  defaultB: number;
  onChange?: (data: Partial<MathNodeData>) => void;
  connectedHandles?: string[];
}

export interface PickNodeData {
  key: string;
  onChange?: (data: Partial<PickNodeData>) => void;
  connectedHandles?: string[];
}

export type DateTimeMode = "now" | "format";

export interface DateTimeNodeData {
  mode: DateTimeMode;
  formatStr: string;
  onChange?: (data: Partial<DateTimeNodeData>) => void;
}

export type StringOp = "uppercase" | "lowercase" | "trim" | "split" | "slice";

export interface StringOpsNodeData {
  op: StringOp;
  separator: string;
  sliceStart: number;
  sliceEnd: number;
  sliceEndEnabled: boolean;
  onChange?: (data: Partial<StringOpsNodeData>) => void;
  connectedHandles?: string[];
}

export interface RegexReplaceNodeData {
  pattern: string;
  replace: string;
  flags: string;
  onChange?: (data: Partial<RegexReplaceNodeData>) => void;
  connectedHandles?: string[];
}

export interface SizeOfNodeData {
  onChange?: (data: Partial<SizeOfNodeData>) => void;
  connectedHandles?: string[];
}

export interface CustomPattern {
  id: string;
  label: string;
  regex: string;
}

export interface PiiRedactNodeData {
  replacement: string;
  customPatterns: CustomPattern[];
  onChange?: (data: Partial<PiiRedactNodeData>) => void;
  connectedHandles?: string[];
}

// ─── External / Request nodes ─────────────────────────────────────────────────

export interface HttpHeader {
  id: string;
  key: string;
  value: string;
}

export type HttpMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

export interface HttpRequestNodeData {
  method: HttpMethod;
  url: string;
  headers: HttpHeader[];
  timeout: number;
  onChange?: (data: Partial<HttpRequestNodeData>) => void;
  connectedHandles?: string[];
}

export interface WebhookHeader {
  id: string;
  key: string;
  value: string;
}

export type WebhookMethod = "POST" | "PUT" | "PATCH" | "GET";

/** `mode` controls whether this node receives inbound requests (trigger)
 *  or fires outbound fire-and-forget requests (action). */
export type WebhookMode = "action" | "trigger";

export interface WebhookNodeData {
  mode: WebhookMode;
  method: WebhookMethod;
  url: string;
  headers: WebhookHeader[];
  bodyTemplate: string;
  onChange?: (data: Partial<WebhookNodeData>) => void;
  connectedHandles?: string[];
}

export type VectorProvider = "supabase" | "pinecone";

export interface VectorUpsertNodeData {
  provider: VectorProvider;
  supabaseUrl: string;
  supabaseKey: string;
  tableName: string;
  embeddingColumn: string;
  contentColumn: string;
  metadataColumn: string;
  upsert: boolean;
  pineconeHost: string;
  pineconeKey: string;
  namespace: string;
  /** Request timeout in milliseconds before the fetch is aborted. Default 15000. */
  timeout?: number;
  onChange?: (data: Partial<VectorUpsertNodeData>) => void;
  connectedHandles?: string[];
}

export interface VectorSearchNodeData {
  provider: VectorProvider;
  supabaseUrl: string;
  supabaseKey: string;
  functionName: string;
  matchCount: number;
  pineconeHost: string;
  pineconeKey: string;
  namespace: string;
  topK: number;
  /** Request timeout in milliseconds before the fetch is aborted. Default 15000. */
  timeout?: number;
  onChange?: (data: Partial<VectorSearchNodeData>) => void;
  connectedHandles?: string[];
}

export interface ResponseHeader {
  id: string;
  key: string;
  value: string;
}

export interface ResponseBuilderNodeData {
  status: number;
  headers: ResponseHeader[];
  onChange?: (data: Partial<ResponseBuilderNodeData>) => void;
  connectedHandles?: string[];
}

export type AccessListMode = "whitelist" | "blacklist";

export interface AccessListNodeData {
  mode: AccessListMode;
  onChange?: (data: Partial<AccessListNodeData>) => void;
}

export interface AuthClaim {
  id: string;
  name: string;
}

export interface AuthValidatorNodeData {
  mode: "jwt" | "apikey";
  headerName: string;
  algorithm: "HS256" | "RS256";
  secret: string;
  jwksUrl: string;
  claims: AuthClaim[];
  apiKeys: string[];
  onChange?: (data: Partial<AuthValidatorNodeData>) => void;
  connectedHandles?: string[];
}

export type ListManagerAction = "add" | "remove";
export type ListManagerEntryType = "value" | "ip" | "cidr" | "header";

export interface ListManagerNodeData {
  action: ListManagerAction;
  entryType?: ListManagerEntryType;
  onChange?: (data: Partial<ListManagerNodeData>) => void;
  connectedHandles?: string[];
}

// ─── Static nodes ─────────────────────────────────────────────────────────────

export interface BooleanNodeData {
  value: boolean;
  onChange?: (data: Partial<BooleanNodeData>) => void;
}

export interface TextNodeData {
  text: string;
  onChange?: (data: Partial<TextNodeData>) => void;
}

export interface NumberNodeData {
  fixedValue: number | null;
  value: number;
  min: number;
  max: number;
  onChange?: (data: Partial<NumberNodeData>) => void;
}

// ─── Sub-workflow node ────────────────────────────────────────────────────────

export interface SubWorkflowNodeData {
  slug: string;
  onChange?: (data: Partial<SubWorkflowNodeData>) => void;
  connectedHandles?: string[];
}

// ─── Language detect ─────────────────────────────────────────────────────────

export interface LangRoute {
  id: string;
  lang: string; // ISO 639-3 code, e.g. "eng"
}

export interface LanguageDetectNodeData {
  routes: LangRoute[];
  hasDefault: boolean;
  onChange?: (data: Partial<LanguageDetectNodeData>) => void;
  connectedHandles?: string[];
}
