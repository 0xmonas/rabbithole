"use client"

import { useState, useEffect } from "react"
import { readContracts } from "@wagmi/core"
import { wagmiConfig, CONTRACT_ADDRESS } from "@/config/wagmi"
import { logger } from "@/lib/logger"
import { fetchAlchemyTransfers } from "@/lib/alchemy-transfers"

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
    
    // Step 1: Get ALL Transfer events for the entire collection (following useNFTs pattern)
    logger.info("📊 Fetching all Transfer events for ownership mapping...")
    
    const allTransferLogs = await fetchAlchemyTransfers({
      contractAddress: CONTRACT_ADDRESS,
    })
    
    logger.debug(`Found ${allTransferLogs.length} total Transfer events`)
    
    // Step 2: Process ownership for each token (1-1000)
    const tokenOwnership = new Map<number, { owner: string; location: 'wallet' | 'garden' }>()
    
    // Process all transfers to determine current owners
    for (const transfer of allTransferLogs) {
      if (transfer.tokenId === null) continue
      const tokenId = transfer.tokenId
      const from = (transfer.from || "0x0000000000000000000000000000000000000000").toLowerCase()
      const to = (transfer.to || "0x0000000000000000000000000000000000000000").toLowerCase()
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
    
    // Step 3: Use Multicall to batch fetch ALL circle data in minimal RPC calls
    logger.info("🔢 Using Multicall to batch fetch circle data (optimized)...")
    
    const tokenIds = Array.from(tokenOwnership.keys())
    const MULTICALL_BATCH_SIZE = 200 // Multicall can handle large batches efficiently
    
    for (let i = 0; i < tokenIds.length; i += MULTICALL_BATCH_SIZE) {
      const batch = tokenIds.slice(i, i + MULTICALL_BATCH_SIZE)
      
      // Build multicall contracts array
      const contracts = batch.map(tokenId => ({
        address: CONTRACT_ADDRESS,
        abi: rabbitHoleAbi,
        functionName: "circleData" as const,
        args: [BigInt(tokenId)],
      }))
      
      try {
        // Single RPC call for entire batch using Multicall3!
        const results = await withTimeout(
          readContracts(wagmiConfig, { contracts }),
          15000 // 15 seconds for large batch
        )
        
        // Process results
        results.forEach((result, index) => {
          const tokenId = batch[index]
          const ownership = tokenOwnership.get(tokenId)!
          
          if (result.status === 'success') {
            const size = Number((result.result as any)[0])
            const owner = ownership.owner
            const location = ownership.location
            
            if (!userTokens.has(owner)) {
              userTokens.set(owner, [])
            }
            userTokens.get(owner)!.push({ id: tokenId, size, location })
          } else {
            logger.warn(`Failed to fetch data for token #${tokenId}`)
          }
        })
        
        logger.debug(`Multicall batch ${Math.floor(i / MULTICALL_BATCH_SIZE) + 1}/${Math.ceil(tokenIds.length / MULTICALL_BATCH_SIZE)}: ${batch.length} tokens in 1 RPC call`)
      } catch (error) {
        logger.error(`Multicall batch failed`, error)
      }
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
