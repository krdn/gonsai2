/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // 외부 도메인에서 개발 서버 접근 허용
  allowedDevOrigins: ['http://krdn.iptime.org:3002', 'http://192.168.0.50:3002'],
  experimental: {
    serverActions: {
      bodySizeLimit: '2mb',
    },
  },
  async rewrites() {
    return [
      {
        source: '/api/backend/:path*',
        destination: 'http://localhost:4000/api/:path*',
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
