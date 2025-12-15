/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ['framer-motion'],
  images: {
    formats: ['image/avif', 'image/webp'],
  },
  experimental: {
    optimizePackageImports: ['lucide-react', 'recharts', '@tanstack/react-query'],
  },
  webpack(config, { isServer }) {
    // Role-based code splitting via separate chunks for admin/trainer/student heavy components
    if (!isServer) {
      config.optimization = {
        ...config.optimization,
        splitChunks: {
          chunks: 'all',
          cacheGroups: {
            // Admin-heavy libs
            adminVendor: {
              test: /[\\/]node_modules[\\/](recharts|openpyxl|xlsx|framer-motion)[\\/]/,
              name: 'admin-vendor',
              priority: 10,
            },
            // Common UI libs
            default: {
              minChunks: 2,
              priority: 5,
              reuseExistingChunk: true,
            },
          },
        },
      };
    }
    return config;
  },
};

export default nextConfig;
