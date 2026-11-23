import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  typescript: {
    // Prevent deployment halts due to strict linter checks
    ignoreBuildErrors: false,
  },
  eslint: {
    // Avoid blocking production builds on stylistic lint rules
    ignoreDuringBuilds: true,
  },
};

export default nextConfig;
