/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Docker 최적화: standalone 모드로 빌드
  output: 'standalone',
  // ESLint 오류 무시 (빌드 시)
  eslint: {
    ignoreDuringBuilds: true,
  },
  // TypeScript 오류 무시 (빌드 시)
  typescript: {
    ignoreBuildErrors: true,
  },
  experimental: {
    serverActions: {
      bodySizeLimit: '2mb',
    },
  },
  async rewrites() {
    return [
      {
        source: '/api/backend/:path*',
        // 개발환경: localhost:3000, 운영환경: Docker 네트워크에서 gonsai2-backend:3000
        destination: process.env.BACKEND_INTERNAL_URL || 'http://localhost:3000/api/:path*',
      },
    ];
  },
  webpack: (config) => {
    config.externals.push({
      'utf-8-validate': 'commonjs utf-8-validate',
      bufferutil: 'commonjs bufferutil',
    });
    return config;
  },
};

module.exports = nextConfig;
