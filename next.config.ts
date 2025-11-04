import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  devIndicators: false,
  turbopack: {
    resolveAlias: {
      "refractor/lib/all": "refractor/all.js",
    },
  },
};

export default nextConfig;
