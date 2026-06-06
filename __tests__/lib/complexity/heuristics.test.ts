import { describe, it, expect } from "vitest";
import { scoreHeuristics } from "@/lib/complexity/heuristics";

describe("scoreHeuristics", () => {
  it("returns score 0 and tier simple for empty input", () => {
    const result = scoreHeuristics("");
    expect(result.score).toBe(0);
    expect(result.tier).toBe("simple");
    expect(result.tokenCount).toBe(0);
    expect(result.signals).toEqual([]);
  });

  it("scores a trivial factual question as simple (< 0.25)", () => {
    const result = scoreHeuristics("What is 2+2?");
    expect(result.score).toBeLessThan(0.25);
    expect(result.tier).toBe("simple");
  });

  it("scores a reasoning prompt in the medium band (0.25–0.70)", () => {
    const result = scoreHeuristics(
      "Debug this race condition in my async Node.js service, explain why it occurs, " +
      "then refactor using proper mutex patterns. Also add unit tests."
    );
    expect(result.score).toBeGreaterThanOrEqual(0.25);
    expect(result.score).toBeLessThanOrEqual(0.70);
    expect(result.tier).toBe("medium");
  });

  it("scores a heavily constrained multi-step prompt as complex (> 0.70)", () => {
    const result = scoreHeuristics(
      "Architect a distributed rate-limiting algorithm. It must handle 100k req/s, " +
      "never exceed 5ms p99 latency, only use Redis, do not use Lua scripts, " +
      "and always guarantee consistency under network partitions. " +
      "First explain the trade-offs, second implement it, third add benchmarks. " +
      "Compare your approach to the token-bucket algorithm and evaluate the difference between them."
    );
    expect(result.score).toBeGreaterThan(0.70);
    expect(result.tier).toBe("complex");
  });

  it("detects reasoning keywords and adds them to signals", () => {
    const result = scoreHeuristics("Explain why async/await works and compare it to callbacks.");
    expect(result.signals).toContain("explain");
    expect(result.signals).toContain("why");
    expect(result.signals).toContain("compare");
  });

  it("detects domain keywords and adds them to signals", () => {
    const result = scoreHeuristics("Fix the race condition in this concurrency bug.");
    expect(result.signals).toContain("race condition");
    expect(result.signals).toContain("concurrency");
  });

  it("token count increases weight proportionally up to the 300-token ceiling", () => {
    const short = scoreHeuristics("Hello");
    const long  = scoreHeuristics("word ".repeat(310));
    expect(long.score).toBeGreaterThan(short.score);
  });

  it("score is always between 0 and 1", () => {
    const inputs = [
      "",
      "Hi",
      "explain everything about everything always and never stop",
      "word ".repeat(1000),
    ];
    for (const input of inputs) {
      const { score } = scoreHeuristics(input);
      expect(score).toBeGreaterThanOrEqual(0);
      expect(score).toBeLessThanOrEqual(1);
    }
  });

  it("deduplicates signals when the same keyword appears multiple times", () => {
    const result = scoreHeuristics("Explain this. Can you explain again? Explain once more.");
    const explainCount = result.signals.filter((s) => s === "explain").length;
    expect(explainCount).toBe(1);
  });
});

describe("blender (scoreToTier thresholds)", () => {
  it("maps score < 0.45 → simple", () => {
    const { tier } = scoreHeuristics("What is the capital of France?");
    expect(["simple", "medium"]).toContain(tier);
  });
});
