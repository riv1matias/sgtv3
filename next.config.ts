import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  poweredByHeader: false,
  output: 'standalone',
  serverExternalPackages: ['pg', 'exceljs'],
  experimental: {
    serverActions: { bodySizeLimit: '30mb', allowedOrigins: ['*.app.github.dev', 'localhost:3000'] },
  },
}

export default nextConfig
