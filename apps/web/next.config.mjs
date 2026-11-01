/** @type {import('next').NextConfig} */
const nextConfig = {
  // Enable standalone output in Docker and Linux container environments
  output: process.env.DOCKER_BUILD === '1' || process.platform === 'linux' ? 'standalone' : undefined,
  reactStrictMode: true,
  poweredByHeader: false,
};

export default nextConfig;
