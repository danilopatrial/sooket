import { encode } from "gpt-tokenizer";

export type Tier = "simple" | "medium" | "complex";

export interface HeuristicResult {
  score: number;
  tier: Tier;
  tokenCount: number;
  signals: string[];
}

const REASONING_KEYWORDS = [
  "explain", "why", "how does", "compare", "analyze", "evaluate",
  "debug", "refactor", "architect", "design", "step by step",
  "trade-off", "trade off", "pros and cons", "optimize",
  "difference between",
];

const DOMAIN_KEYWORDS = [
  "algorithm", "regex", "concurrency", "async", "race condition",
  "legal", "financial", "differential", "neural", "quantum",
  "trademark", "udrp", "compliance", "vulnerability", "cryptograph",
  "theorem", "calculus", "recursion", "distributed", "Byzantine",
];

const CONSTRAINT_PATTERN = /\b(must|require[sd]?|only|except|do not|never|always|if .+then)\b/gi;
const MULTI_PART_PATTERN  = /(\n\s*[-*\d]\.?\s|\b(first|second|third|then|finally|also)\b)/gi;

function clampRatio(hits: number, ceiling: number): number {
  return Math.min(hits / ceiling, 1);
}

export function scoreHeuristics(prompt: string): HeuristicResult {
  if (!prompt.trim()) {
    return { score: 0, tier: "simple", tokenCount: 0, signals: [] };
  }

  const lower      = prompt.toLowerCase();
  const tokens     = encode(prompt);
  const tokenCount = tokens.length;
  const signals: string[] = [];

  // Token length — 20% weight, ceiling at 300 tokens
  const tokenScore = clampRatio(tokenCount, 300) * 0.20;

  // Reasoning keywords — 30% weight, ceiling at 4 hits
  const reasoningHits = REASONING_KEYWORDS.filter((kw) => lower.includes(kw));
  if (reasoningHits.length) signals.push(...reasoningHits);
  const reasoningScore = clampRatio(reasoningHits.length, 4) * 0.30;

  // Domain keywords — 20% weight, ceiling at 3 hits
  const domainHits = DOMAIN_KEYWORDS.filter((kw) => lower.includes(kw));
  if (domainHits.length) signals.push(...domainHits);
  const domainScore = clampRatio(domainHits.length, 3) * 0.20;

  // Constraint density — 15% weight, ceiling at 4 hits normalised by token count
  const constraintMatches = (prompt.match(CONSTRAINT_PATTERN) ?? []).length;
  const constraintDensity = tokenCount > 0 ? constraintMatches / tokenCount * 100 : 0;
  if (constraintMatches) signals.push(`${constraintMatches} constraint(s)`);
  const constraintScore = clampRatio(constraintDensity, 4) * 0.15;

  // Multi-part structure — 15% weight, ceiling at 5 hits
  const multiPartMatches = (prompt.match(MULTI_PART_PATTERN) ?? []).length;
  if (multiPartMatches) signals.push(`${multiPartMatches} part(s)`);
  const multiPartScore = clampRatio(multiPartMatches, 5) * 0.15;

  const score = parseFloat(
    (tokenScore + reasoningScore + domainScore + constraintScore + multiPartScore).toFixed(4)
  );

  const tier: Tier =
    score < 0.25 ? "simple" :
    score > 0.70 ? "complex" :
    "medium";

  return { score, tier, tokenCount, signals: [...new Set(signals)] };
}
