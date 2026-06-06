import { NextResponse } from "next/server";
import { scoreEmbedding } from "@/lib/complexity/embedder";

// Upper bound on the prompt length this canvas-preview route will embed. Set to
// the practical maximum for a single LLM prompt so the preview score matches what
// the executor computes for any realistic prompt, instead of silently truncating
// a long system prompt to its first ~2 000 tokens (the old 8 000-char cap).
const MAX_PROMPT_CHARS = 32000;

export async function POST(req: Request) {
  let prompt: string;
  try {
    const body = await req.json();
    prompt = typeof body?.prompt === "string" ? body.prompt.slice(0, MAX_PROMPT_CHARS) : "";
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (!prompt.trim()) {
    return NextResponse.json({ embeddingScore: 0 });
  }

  try {
    const embeddingScore = await scoreEmbedding(prompt);
    return NextResponse.json({ embeddingScore }, { headers: { "X-Layer": "embedding" } });
  } catch (err) {
    console.error("[complexity] embedding failed:", err);
    return NextResponse.json({ embeddingScore: null });
  }
}
