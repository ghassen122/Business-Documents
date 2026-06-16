/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  // Proxy all /api/* calls to backend2 on port 4001
  async rewrites() {
    return {
      // Routes handled internally by Next.js — NOT proxied to backend
      beforeFiles: [],
      // All /api/* except /api/admin-login are proxied to backend2
      afterFiles: [
        {
          source: '/api/:path((?!admin-login).*)',
          destination: 'http://localhost:4001/api/:path*',
        },
      ],
      fallback: [],
    }
  },
}

module.exports = nextConfig
