import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  serverExternalPackages: ["@huggingface/transformers", "onnxruntime-node", "node:sqlite"],
  async rewrites() {
    return [{ source: "/v1/chat", destination: "/api/v1/chat" }];
  },
};

export default nextConfig;
