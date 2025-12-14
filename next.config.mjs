import fs from 'node:fs'
import path from 'node:path'
import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)

let userConfig = undefined
try {
  userConfig = await import('./v0-user-next.config')
} catch (e) {
  // ignore error
}

function resolveBaseAccountModule() {
  try {
    return path.dirname(require.resolve('@base-org/account/package.json'))
  } catch {
    const fallback = path.resolve(process.cwd(), 'node_modules/wagmi/node_modules/@base-org/account')
    return fs.existsSync(fallback) ? fallback : null
  }
}

const baseAccountPath = resolveBaseAccountModule()

// Security headers to prevent common vulnerabilities
const RPC_URL = process.env.ALCHEMY_RPC_URL

const connectSrc = [
  "'self'",
  "https://*.shape.network",
  "https://*.walletconnect.org",
  "wss://*.walletconnect.org",
  "https://*.walletconnect.com",
  "wss://*.walletconnect.com",
  "https://api.web3modal.org",
  "https://*.reown.com",
  "wss://*.reown.com",
  "https://*.coinbase.com",
  "https://cca-lite.coinbase.com",
  "https://*.alchemy.com",
  "https://*.alchemyapi.io",
]

if (RPC_URL) {
  try {
    const parsed = new URL(RPC_URL)
    connectSrc.push(parsed.origin)
    if (parsed.protocol === "https:") {
      connectSrc.push(`wss://${parsed.host}`)
    } else if (parsed.protocol === "http:") {
      connectSrc.push(`ws://${parsed.host}`)
    }
  } catch {
    // ignore invalid URLs
  }
}

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
      "script-src 'self' 'unsafe-inline' 'unsafe-eval' 'wasm-unsafe-eval'", // Web3/wallet libs require eval + wasm
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com", // Allow Google Fonts
      "font-src 'self' https://fonts.gstatic.com", // Allow Google Fonts
      "img-src 'self' data: blob: https://*.walletconnect.com https://*.reown.com https://*.walletconnect.org", // Allow wallet provider images
      `connect-src ${connectSrc.join(' ')}`, // Allow Web3Modal, Reown, Coinbase, RPC providers
      "frame-src 'self' https://*.walletconnect.com https://*.walletconnect.org https://*.reown.com",
      "worker-src 'self' blob:", // Allow web workers used by wallet libs
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
  webpack(config) {
    if (baseAccountPath) {
      config.resolve = config.resolve || {}
      config.resolve.alias = config.resolve.alias || {}
      config.resolve.alias['@base-org/account'] = baseAccountPath
    }
    return config
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
