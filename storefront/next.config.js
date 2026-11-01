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
  generateBuildId: async () => {
    return 'storefront-build';
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
};

module.exports = nextConfig;
