/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
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
    // 2. Disable Webpack filesystem pack caching to prevent OneDrive file-locking ENOENT pack corruption
    if (dev) {
      config.cache = false;
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
