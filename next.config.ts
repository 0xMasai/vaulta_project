import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  webpack: (config, { isServer }) => {
    // Keep your existing externals
    config.externals.push("pino-pretty", "lokijs", "encoding");

    // ⚡ Client-side fallback for Node-only modules
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        ws: false, // Ignore ws in client bundle
      };
    }

    return config;
  },
};

export default nextConfig;