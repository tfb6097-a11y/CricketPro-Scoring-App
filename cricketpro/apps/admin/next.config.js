/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ["@crickpro/ui"],
  typescript: {
    ignoreBuildErrors: true,
  },
};

export default nextConfig;