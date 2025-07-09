"use client"

import { useState, useEffect } from "react"
import { readContract, getPublicClient } from "@wagmi/core"
import { wagmiConfig, CONTRACT_ADDRESS } from "@/config/wagmi"
import { parseAbiItem } from "viem"
import { logger } from "@/lib/logger"

// Leaderboard types
export interface LeaderboardUser {
  address: string
  circles: number
  totalSize: number
  potentialSize: number
  walletTokens: Array<{ id: number; size: number }>
  gardenTokens: Array<{ id: number; size: number }>
  rank: number
}

export interface LeaderboardData {
  users: LeaderboardUser[]
  totalUsers: number
  totalCircles: number
  totalSize: number
  currentUserRank: number | null
  loading: boolean
  error: string | null
  lastUpdated: number
}

// Same ABI as useNFTs for consistency  
const rabbitHoleAbi = [
  {
    inputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    name: "circleData",
    outputs: [
      { internalType: "uint256", name: "size", type: "uint256" },
      { internalType: "uint256", name: "lastGrowTime", type: "uint256" },
      { internalType: "uint256", name: "lastShrinkTime", type: "uint256" },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ internalType: "uint256", name: "tokenId", type: "uint256" }],
    name: "ownerOf",
    outputs: [{ internalType: "address", name: "", type: "address" }],
    stateMutability: "view",
    type: "function",
  },
] as const

// Same garden contract address for consistency
const GARDEN_CONTRACT_ADDRESS = "0x2940574AF75D350BF37Ceb73CA5dE8e5ADA425c4" as `0x${string}`

// Same timeout helper as useNFTs
function withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) => 
      setTimeout(() => reject(new Error(`Timeout after ${timeoutMs}ms`)), timeoutMs)
    )
  ])
}

// Calculate merge potential for user's tokens
function calculateMergePotential(tokens: Array<{ id: number; size: number }>): number {
  if (tokens.length <= 1) return tokens[0]?.size || 0
  
  const totalSize = tokens.reduce((sum, token) => sum + token.size, 0)
  return totalSize // For leaderboard, we show total potential size
}

// Cache management (5-minute expiry like garden stats)
const CACHE_DURATION = 5 * 60 * 1000 // 5 minutes
const CACHE_KEY = 'leaderboard_data'

function getCachedLeaderboard(): LeaderboardData | null {
  try {
    const cached = localStorage.getItem(CACHE_KEY)
    if (!cached) return null
    
    const data = JSON.parse(cached)
    if (Date.now() - data.timestamp > CACHE_DURATION) {
      localStorage.removeItem(CACHE_KEY)
      return null
    }
    
    return data.leaderboard
  } catch (error) {
    logger.warn("Failed to read leaderboard cache", error)
    return null
  }
}

function setCachedLeaderboard(data: LeaderboardData): void {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify({
      leaderboard: data,
      timestamp: Date.now()
    }))
  } catch (error) {
    logger.warn("Failed to cache leaderboard data", error)
  }
}

export function useLeaderboard(currentUserAddress?: string | null) {
  const [leaderboard, setLeaderboard] = useState<LeaderboardData>(() => {
    // Try to load cached data on initialization
    const cached = getCachedLeaderboard()
    return cached || {
      users: [],
      totalUsers: 0,
      totalCircles: 0,
      totalSize: 0,
      currentUserRank: null,
      loading: true,
      error: null,
      lastUpdated: 0
    }
  })

  const fetchAllTokenOwnership = async (): Promise<Map<string, Array<{ id: number; size: number; location: 'wallet' | 'garden' }>>> => {
    logger.info("🏆 Starting professional leaderboard data fetching")
    
    const userTokens = new Map<string, Array<{ id: number; size: number; location: 'wallet' | 'garden' }>>()
    const publicClient = getPublicClient(wagmiConfig)
    
    // Step 1: Get ALL Transfer events for the entire collection (following useNFTs pattern)
    logger.info("📊 Fetching all Transfer events for ownership mapping...")
    
    const allTransferLogs = await withTimeout(
      publicClient!.getLogs({
        address: CONTRACT_ADDRESS,
        event: parseAbiItem('event Transfer(address indexed from, address indexed to, uint256 indexed tokenId)'),
        fromBlock: BigInt(0),
        toBlock: 'latest'
      }),
      20000 // 20 seconds for all transfers
    )
    
    logger.debug(`Found ${(allTransferLogs as any[]).length} total Transfer events`)
    
    // Step 2: Process ownership for each token (1-1000)
    const tokenOwnership = new Map<number, { owner: string; location: 'wallet' | 'garden' }>()
    
    // Process all transfers to determine current owners
    for (const log of allTransferLogs as any[]) {
      const tokenId = Number(log.args.tokenId)
      const from = log.args.from.toLowerCase()
      const to = log.args.to.toLowerCase()
      const gardenAddress = GARDEN_CONTRACT_ADDRESS.toLowerCase()
      
      // Determine location and owner
      if (to === gardenAddress) {
        // Token is in garden
        tokenOwnership.set(tokenId, { owner: from, location: 'garden' })
      } else if (from === gardenAddress) {
        // Token moved from garden to wallet
        tokenOwnership.set(tokenId, { owner: to, location: 'wallet' })
      } else if (from === '0x0000000000000000000000000000000000000000') {
        // Mint event
        tokenOwnership.set(tokenId, { owner: to, location: 'wallet' })
      } else {
        // Regular transfer
        tokenOwnership.set(tokenId, { owner: to, location: 'wallet' })
      }
    }
    
    logger.debug(`Processed ownership for ${tokenOwnership.size} tokens`)
    
    // Step 3: Batch fetch circle data for all tokens (following useNFTs batch pattern)
    logger.info("🔢 Batch fetching circle data for all tokens...")
    
    const tokenIds = Array.from(tokenOwnership.keys())
    const batchSize = 50 // Process in batches for performance
    
    for (let i = 0; i < tokenIds.length; i += batchSize) {
      const batch = tokenIds.slice(i, i + batchSize)
      
      const batchPromises = batch.map(async (tokenId) => {
        try {
          const ownership = tokenOwnership.get(tokenId)!
          
          const tokenInfo = await withTimeout(
            readContract(wagmiConfig, {
              address: CONTRACT_ADDRESS,
              abi: rabbitHoleAbi,
              functionName: "circleData",
              args: [BigInt(tokenId)],
            }),
            3000
          )
          
          const size = Number((tokenInfo as any)[0])
          const owner = ownership.owner
          const location = ownership.location
          
          // Add token to user's collection
          if (!userTokens.has(owner)) {
            userTokens.set(owner, [])
          }
          
          userTokens.get(owner)!.push({ id: tokenId, size, location })
          
          return { tokenId, owner, size, location }
        } catch (error) {
          logger.warn(`Failed to fetch data for token #${tokenId}`, error)
          return null
        }
      })
      
      const batchResults = await Promise.all(batchPromises)
      const validResults = batchResults.filter(r => r !== null)
      
      logger.debug(`Batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(tokenIds.length / batchSize)}: ${validResults.length}/${batch.length} tokens processed`)
    }
    
    logger.success(`Leaderboard data collection complete: ${userTokens.size} unique holders found`)
    return userTokens
  }

  const fetchLeaderboard = async () => {
    logger.info("🏆 Fetching leaderboard data...")
    
    setLeaderboard(prev => ({ ...prev, loading: true, error: null }))
    
    try {
      const userTokensMap = await fetchAllTokenOwnership()
      
      // Convert to leaderboard format
      const leaderboardUsers: LeaderboardUser[] = []
      
      userTokensMap.forEach((tokens, address) => {
        const walletTokens = tokens.filter(t => t.location === 'wallet')
        const gardenTokens = tokens.filter(t => t.location === 'garden')
        
        const totalSize = tokens.reduce((sum, token) => sum + token.size, 0)
        const potentialSize = calculateMergePotential(tokens)
        
        leaderboardUsers.push({
          address,
          circles: tokens.length,
          totalSize,
          potentialSize,
          walletTokens: walletTokens.map(t => ({ id: t.id, size: t.size })),
          gardenTokens: gardenTokens.map(t => ({ id: t.id, size: t.size })),
          rank: 0 // Will be set after sorting
        })
      })
      
      // Sort by total size (descending) and assign ranks
      leaderboardUsers.sort((a, b) => b.totalSize - a.totalSize)
      leaderboardUsers.forEach((user, index) => {
        user.rank = index + 1
      })
      
      // Calculate statistics
      const totalCircles = leaderboardUsers.reduce((sum, user) => sum + user.circles, 0)
      const totalSize = leaderboardUsers.reduce((sum, user) => sum + user.totalSize, 0)
      
      // Find current user rank
      let currentUserRank: number | null = null
      if (currentUserAddress) {
        const userEntry = leaderboardUsers.find(u => u.address.toLowerCase() === currentUserAddress.toLowerCase())
        currentUserRank = userEntry?.rank || null
      }
      
      const newLeaderboard: LeaderboardData = {
        users: leaderboardUsers,
        totalUsers: leaderboardUsers.length,
        totalCircles,
        totalSize,
        currentUserRank,
        loading: false,
        error: null,
        lastUpdated: Date.now()
      }
      
      setLeaderboard(newLeaderboard)
      setCachedLeaderboard(newLeaderboard)
      
      logger.success(`Leaderboard loaded: ${leaderboardUsers.length} users, ${totalCircles} total circles`)
      
    } catch (error: any) {
      logger.error("Failed to fetch leaderboard data", error)
      setLeaderboard(prev => ({
        ...prev,
        loading: false,
        error: error.message || "Failed to load leaderboard data"
      }))
    }
  }

  // Auto-fetch on mount (like useNFTs pattern)
  useEffect(() => {
    // Only fetch if we don't have cached data
    if (leaderboard.users.length === 0 || Date.now() - leaderboard.lastUpdated > CACHE_DURATION) {
      fetchLeaderboard()
    }
  }, [])

  // Refresh when current user address changes
  useEffect(() => {
    if (currentUserAddress && leaderboard.users.length > 0) {
      // Update current user rank without refetching
      const userEntry = leaderboard.users.find(u => u.address.toLowerCase() === currentUserAddress.toLowerCase())
      const currentUserRank = userEntry?.rank || null
      
      if (currentUserRank !== leaderboard.currentUserRank) {
        setLeaderboard(prev => ({ ...prev, currentUserRank }))
      }
    }
  }, [currentUserAddress, leaderboard.users])

  return {
    ...leaderboard,
    refreshLeaderboard: fetchLeaderboard
  }
} 