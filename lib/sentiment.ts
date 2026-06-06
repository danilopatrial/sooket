import Sentiment from "sentiment";

const analyzer = new Sentiment();

export type SentimentLabel = "positive" | "neutral" | "negative";

export interface SentimentResult {
  score: number;            // -1.0 to 1.0 (normalized)
  label: SentimentLabel;
  wordCount: number;        // number of scored tokens
  positiveWords: string[];
  negativeWords: string[];
}

export function analyzeSentiment(
  text: string,
  positiveThreshold = 0.05,
  negativeThreshold = -0.05,
): SentimentResult {
  if (!text.trim()) {
    return { score: 0, label: "neutral", wordCount: 0, positiveWords: [], negativeWords: [] };
  }

  const result  = analyzer.analyze(text);
  const score   = Math.max(-1, Math.min(1, result.comparative / 5));
  const safePos = Math.max(positiveThreshold, negativeThreshold + 0.001);
  const label: SentimentLabel =
    score >= safePos                ? "positive" :
    score <= negativeThreshold      ? "negative" :
                                      "neutral";

  return {
    score,
    label,
    wordCount: result.words.length,
    positiveWords: result.positive,
    negativeWords: result.negative,
  };
}
