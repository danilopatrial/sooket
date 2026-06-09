import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Standalone output is for the Docker image only. The npm package ships a
  // regular `.next` build served by `next start` (`next start` refuses to run
  // when output is "standalone", and npm strips the bundled node_modules the
  // standalone server depends on).
  output: process.env.SOOKET_STANDALONE === "1" ? "standalone" : undefined,
  serverExternalPackages: ["@huggingface/transformers", "onnxruntime-node", "node:sqlite"],
  async rewrites() {
    return [{ source: "/v1/chat", destination: "/api/v1/chat" }];
  },
};

export default nextConfig;
