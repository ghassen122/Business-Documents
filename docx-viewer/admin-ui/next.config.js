/** @type {import('next').NextConfig} */
const nextConfig = {
  // Proxy all /api/* and /parse calls to the Express backend on port 4000
  async rewrites() {
    return [
      { source: '/api/:path*', destination: 'http://localhost:4000/api/:path*' },
      { source: '/parse',      destination: 'http://localhost:4000/parse' },
    ]
  },
}

module.exports = nextConfig
