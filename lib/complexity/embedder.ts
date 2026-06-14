import "server-only";
// Type-only import: erased at compile time, so it does NOT load the native
// onnxruntime at module load. The runtime `pipeline` is imported lazily inside
// getEmbedder() (see below) so `next build`'s page-data collection never pulls
// in onnxruntime-node — its prebuilt .so is glibc-only and breaks otherwise.
import type { FeatureExtractionPipeline } from "@huggingface/transformers";

const SIMPLE_EXAMPLES = [
  "What is the capital of France?",
  "Translate hello to Spanish.",
  "What does HTTP stand for?",
  "What is 2 + 2?",
  "Who wrote Romeo and Juliet?",
  "What year did World War II end?",
  "Convert 100 Celsius to Fahrenheit.",
  "What is the boiling point of water?",
  "How many days are in a leap year?",
  "What color is the sky?",
  "Is JavaScript a compiled language?",
  "What does CPU stand for?",
  "Define the word 'ephemeral'.",
  "What is the plural of 'mouse'?",
  "List the primary colors.",
];

const COMPLEX_EXAMPLES = [
  "Debug this race condition in my async Node.js service, explain why it occurs, then refactor using proper mutex patterns. Add unit tests covering all edge cases.",
  "Compare the trade-offs between microservices and a monolith for a high-traffic financial system. Consider latency, deployment complexity, team structure, and regulatory compliance.",
  "Design a distributed rate-limiting system that works across multiple regions. It must handle 100k req/s, be consistent under network partitions, and gracefully degrade.",
  "Analyze this SQL query for performance bottlenecks, explain the query plan, then rewrite it using CTEs and proper indexing strategy.",
  "Explain how PBKDF2 key derivation works, why it is resistant to brute-force, and implement it using the Web Crypto API with AES-GCM encryption.",
  "Architect a real-time collaborative text editor. Explain the operational transformation vs CRDT trade-offs and implement conflict resolution.",
  "Refactor this class hierarchy to use composition over inheritance. Justify each decision with SOLID principles.",
  "Why does this React component cause infinite re-renders? Debug step by step and fix it without breaking the existing API.",
  "Implement a priority queue in TypeScript with O(log n) insert and extract-min. Include full JSDoc and property-based tests.",
  "Explain the Byzantine Generals problem and how Raft consensus solves it. Compare with Paxos on failure handling.",
  "Given these three legal contract clauses, identify any conflicting obligations and propose resolution language that satisfies all parties.",
  "Write a regex that matches valid IPv6 addresses including compressed forms. Explain each capturing group.",
  "Design a neural network architecture for time-series anomaly detection. Compare LSTM, Transformer, and CNN approaches on latency and accuracy.",
  "Audit this authentication middleware for security vulnerabilities. Identify each vulnerability, its CVE class, and provide a patched implementation.",
  "Explain quantum entanglement and its implications for quantum cryptography, then compare BB84 and E91 protocols.",
];

let embedderInstance: FeatureExtractionPipeline | null = null;
let simpleEmbeddings: number[][] | null = null;
let complexEmbeddings: number[][] | null = null;

async function getEmbedder(): Promise<FeatureExtractionPipeline> {
  if (!embedderInstance) {
    const { pipeline } = await import("@huggingface/transformers");
    embedderInstance = await pipeline("feature-extraction", "Xenova/all-MiniLM-L6-v2", {
      dtype: "fp32",
    });
  }
  return embedderInstance;
}

async function embed(texts: string[]): Promise<number[][]> {
  const pipe = await getEmbedder();
  const results: number[][] = [];
  for (const text of texts) {
    const output = await pipe(text, { pooling: "mean", normalize: true });
    results.push(Array.from(output.data as Float32Array));
  }
  return results;
}

function cosine(a: number[], b: number[]): number {
  let dot = 0, magA = 0, magB = 0;
  for (let i = 0; i < a.length; i++) {
    dot  += a[i] * b[i];
    magA += a[i] * a[i];
    magB += b[i] * b[i];
  }
  const denom = Math.sqrt(magA) * Math.sqrt(magB);
  return denom === 0 ? 0 : dot / denom;
}

function avgSimilarity(embedding: number[], bucket: number[][]): number {
  if (!bucket.length) return 0;
  const sum = bucket.reduce((acc, b) => acc + cosine(embedding, b), 0);
  return sum / bucket.length;
}

async function warmBuckets(): Promise<void> {
  if (!simpleEmbeddings)  simpleEmbeddings  = await embed(SIMPLE_EXAMPLES);
  if (!complexEmbeddings) complexEmbeddings = await embed(COMPLEX_EXAMPLES);
}

export async function embedText(text: string): Promise<number[]> {
  const [embedding] = await embed([text]);
  return embedding;
}

export async function scoreEmbedding(prompt: string): Promise<number> {
  await warmBuckets();

  const [promptEmbedding] = await embed([prompt]);

  const avgSimple  = avgSimilarity(promptEmbedding, simpleEmbeddings!);
  const avgComplex = avgSimilarity(promptEmbedding, complexEmbeddings!);

  const total = avgSimple + avgComplex;
  if (total === 0) return 0.5;

  return parseFloat((avgComplex / total).toFixed(4));
}

export async function warmEmbedder(): Promise<void> {
  await warmBuckets();
}
