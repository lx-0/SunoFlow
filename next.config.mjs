/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverComponentsExternalPackages: ["@prisma/client", "bcryptjs"],
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "cdn.sunoapi.org",
      },
    ],
  },
};

let config = nextConfig;

if (process.env.ANALYZE === "true") {
  const withBundleAnalyzer = (await import("@next/bundle-analyzer")).default;
  config = withBundleAnalyzer({ enabled: true })(nextConfig);
}

export default config;
