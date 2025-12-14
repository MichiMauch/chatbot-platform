import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",

  // Increase server timeout for long-running operations (60 minutes)
  serverExternalPackages: ["puppeteer"],

  experimental: {
    serverActions: {
      bodySizeLimit: "50mb",
    },
  },
};

export default nextConfig;
