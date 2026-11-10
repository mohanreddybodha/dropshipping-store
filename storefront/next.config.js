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
