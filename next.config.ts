import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  devIndicators: false,
};

module.exports = {
  compress: true,
  reactStrictMode: true,
};

export default nextConfig;
