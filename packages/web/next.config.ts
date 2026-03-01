import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  output: "standalone",
  outputFileTracingRoot: path.join(__dirname, "../../"),
  transpilePackages: ["@subnetter/core"],
  serverExternalPackages: ["better-sqlite3"],
  webpack: (config, { isServer }) => {
    if (!isServer) {
      // @subnetter/core exports modules that use Node's fs (csv-writer, loader).
      // Client components only import configSchema (browser-safe), but webpack
      // can't tree-shake CJS re-exports, so we stub fs for the client bundle.
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        path: false,
      };
    }
    return config;
  },
};

export default nextConfig;
