import type { Tier } from "./heuristics";

export function blendScores(heuristic: number, embedding: number): number {
  return parseFloat((heuristic * 0.4 + embedding * 0.6).toFixed(4));
}

export function scoreToTier(score: number): Tier {
  if (score < 0.45) return "simple";
  if (score < 0.70) return "medium";
  return "complex";
}
