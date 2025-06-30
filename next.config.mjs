let userConfig = undefined
try {
  userConfig = await import('./v0-user-next.config')
} catch (e) {
  // ignore error
}

// Security headers to prevent common vulnerabilities
const securityHeaders = [
  {
    key: 'X-Frame-Options',
    value: 'DENY', // Prevent clickjacking
  },
  {
    key: 'X-Content-Type-Options', 
    value: 'nosniff', // Prevent MIME sniffing
  },
  {
    key: 'Referrer-Policy',
    value: 'origin-when-cross-origin', // Control referrer information
  },
  {
    key: 'X-XSS-Protection',
    value: '1; mode=block', // Enable XSS filtering
  },
  {
    key: 'Permissions-Policy',
    value: 'camera=(), microphone=(), geolocation=()', // Restrict dangerous APIs
  },
  {
    key: 'Content-Security-Policy',
    value: [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval'", // Web3 requires unsafe-eval for wallet connections
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com", // Allow Google Fonts
      "font-src 'self' https://fonts.gstatic.com", // Allow Google Fonts
      "img-src 'self' data: blob:", // Allow data URLs for SVG images from contracts
      "connect-src 'self' https://*.shape.network https://*.walletconnect.org wss://*.walletconnect.org https://api.web3modal.org", // Allow Web3Modal API
      "frame-src 'none'",
    ].join('; ')
  }
]

/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  experimental: {
    webpackBuildWorker: true,
    parallelServerBuildTraces: true,
    parallelServerCompiles: true,
  },
  // Security headers
  async headers() {
    return [
      {
        // Apply security headers to all routes
        source: '/(.*)',
        headers: securityHeaders,
      },
    ]
  },
}

function mergeConfig(config, userConfig) {
  if (!userConfig?.default) {
    return config
  }
  
  return {
    ...config,
    ...userConfig.default,
  }
}

export default mergeConfig(nextConfig, userConfig)
