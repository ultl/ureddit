/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ["@repo/db", "@repo/ui"],
  turbopack: {},
};

export default nextConfig;
