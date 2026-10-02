import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  poweredByHeader: false,
  // El indicador flotante de desarrollo tapa el menú lateral; los errores se siguen viendo en la consola
  devIndicators: false,
  output: 'standalone',
  serverExternalPackages: ['pg', 'exceljs'],
  experimental: {
    serverActions: { bodySizeLimit: '30mb', allowedOrigins: ['*.app.github.dev', 'localhost:3000'] },
  },
}

export default nextConfig
