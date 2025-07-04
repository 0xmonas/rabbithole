import { createConfig, http } from "@wagmi/core"
import { defineChain } from "viem"
import { injected, walletConnect } from "@wagmi/connectors"
import { createAppKit } from '@reown/appkit'
import { WagmiAdapter } from '@reown/appkit-adapter-wagmi'
import { logger } from "@/lib/logger"

// Define Shape L2 chain
export const shapeChain = defineChain({
  id: 360,
  name: "Shape",
  nativeCurrency: {
    name: "Ethereum",
    symbol: "ETH",
    decimals: 18,
  },
  rpcUrls: {
    default: {
      http: [process.env.NEXT_PUBLIC_RPC_URL || "https://mainnet.shape.network"],
    },
    public: {
      http: [process.env.NEXT_PUBLIC_RPC_URL || "https://mainnet.shape.network"],
    },
  },
  blockExplorers: {
    default: {
      name: "Shape Explorer",
      url: "https://explorer.shape.network",
    },
  },
  contracts: {
    multicall3: {
      address: "0xcA11bde05977b3631167028862bE2a173976CA11" as `0x${string}`,
    },
  },
})

// 1. Create Wagmi Adapter with dummy project ID to avoid API calls
const wagmiAdapter = new WagmiAdapter({
  ssr: false, // CRITICAL: Disable SSR to prevent extension conflicts
  networks: [shapeChain],
  projectId: process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || 'dummy-project-id-no-api', // Safe dummy ID
  transports: {
    [shapeChain.id]: http(process.env.NEXT_PUBLIC_RPC_URL || "https://mainnet.shape.network"),
  },
})

// 2. Create Reown AppKit with minimal features to reduce API calls
export const appKit = createAppKit({
  adapters: [wagmiAdapter],
  networks: [shapeChain],
  projectId: process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || 'dummy-project-id-no-api', // Safe dummy ID
  metadata: {
    name: 'Rabbit Hole',
    description: 'An onchain experiment by Monas',
    url: typeof window !== 'undefined' ? window.location.origin : 'https://rabbithole.app',
    icons: ['/rabbithole.png'] // Fixed icon path
  },
  features: {
    analytics: false, // Disable analytics completely
    email: false, // Disable email login
    socials: [], // Disable social logins
    emailShowWallets: false, // Disable email features
  }
})

// 3. Export wagmi config for hooks
export const wagmiConfig = wagmiAdapter.wagmiConfig

// Contract details
export const CONTRACT_ADDRESS = (process.env.NEXT_PUBLIC_CONTRACT_ADDRESS || "0xCA38813D69409E4E50F1411A0CAB2570E570C75A") as `0x${string}`

// ✅ Success! Reown AppKit initialized
logger.info("Reown AppKit initialized successfully")
logger.debug("Contract address:", CONTRACT_ADDRESS)
logger.debug("Project ID configured", { 
  hasProjectId: !!process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID 
})

