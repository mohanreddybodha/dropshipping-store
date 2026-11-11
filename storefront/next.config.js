const { normalizeCatalogSlugs } = require("./src/lib/slugUtils");
const seedCatalog = require("./src/lib/seedCatalog.json");

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  serverExternalPackages: [
    "firebase",
    "@firebase/app",
    "@firebase/auth",
    "@firebase/component",
    "@firebase/util",
    "@neondatabase/serverless",
  ],
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  webpack: (config, { dev }) => {
    // 1. Disable symlink resolution to prevent Windows OneDrive NTFS reparse point EINVAL errors
    config.resolve.symlinks = false;
    // 2. High-speed in-memory Webpack cache (eliminates disk I/O lock while enabling 10x faster hot reload)
    if (dev) {
      config.cache = { type: 'memory' };
    }
    return config;
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**",
      },
      {
        protocol: "http",
        hostname: "**",
      },
    ],
  },
  async redirects() {
    const normalized = normalizeCatalogSlugs(seedCatalog);
    return normalized
      .filter((p) => p.legacy_slug && p.slug && p.legacy_slug !== p.slug)
      .map((p) => ({
        source: `/products/${p.legacy_slug}`,
        destination: `/products/${p.slug}`,
        statusCode: 301,
      }));
  },
  async rewrites() {
    return [
      {
        source: "/__/auth/:path*",
        destination: "https://domesticlab-us-store.firebaseapp.com/__/auth/:path*",
      },
      {
        source: "/__/firebase/:path*",
        destination: "https://domesticlab-us-store.firebaseapp.com/__/firebase/:path*",
      },
    ];
  },
};

module.exports = nextConfig;
