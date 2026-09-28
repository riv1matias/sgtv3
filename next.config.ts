import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  poweredByHeader: false,
  serverExternalPackages: ['pg', 'exceljs'],
  experimental: {
    serverActions: { bodySizeLimit: '30mb' },
  },
}

export default nextConfig
