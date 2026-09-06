import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Allow requests from localhost and 127.0.0.1 in development
  allowedDevOrigins: ['http://localhost:3000', 'http://127.0.0.1:3000'],
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'img.clerk.com' },
      { protocol: 'https', hostname: 'cdn.discordapp.com' },
      { protocol: 'https', hostname: '*.convex.cloud' },
      { protocol: 'https', hostname: '*.convex.site' },
    ],
  },
};

export default nextConfig;
