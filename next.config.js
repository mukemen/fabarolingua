/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: { optimizePackageImports: [] },
  images: { unoptimized: true }, // keep simple for Vercel free tier & PWA
};

module.exports = nextConfig;
