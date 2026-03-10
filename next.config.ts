import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Allow requests from localhost and 127.0.0.1 in development
  allowedDevOrigins: ['http://localhost:3000', 'http://127.0.0.1:3000'],
  /* config options here */
};

export default nextConfig;
