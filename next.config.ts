import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ['@resvg/resvg-js'],
  experimental: {
    serverActions: {
      bodySizeLimit: '10mb',
    },
    proxyClientMaxBodySize: '10mb',
  },
};

export default nextConfig;
