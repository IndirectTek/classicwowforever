import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  cacheComponents: true,
  partialPrefetching: true,
  // Files read with fs at runtime (the planner prompt, the OG image font).
  // Tracing usually finds them; this makes sure they ship with every function.
  outputFileTracingIncludes: {
    "/*": ["./lib/prompts/**/*", "./assets/fonts/**/*"],
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
