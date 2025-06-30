"use client"

import { useState, useEffect } from "react"
import { readContract, getPublicClient } from "@wagmi/core"
import { wagmiConfig, CONTRACT_ADDRESS } from "@/config/wagmi"
import { parseAbiItem } from "viem"
import type { NFT } from "@/types/nft"

// ABI for the RabbitHole contract
const rabbitHoleAbi = [
  {
    inputs: [{ internalType: "address", name: "owner", type: "address" }],
    name: "balanceOf",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
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
] as const

// Contract constants
const DAILY_COOLDOWN = 86400 // 24 hours in seconds

// 🔥 ELITE LEVEL: Action History Events
const ACTION_EVENTS = {
  Transfer: parseAbiItem('event Transfer(address indexed from, address indexed to, uint256 indexed tokenId)'),
  CircleGrown: parseAbiItem('event CircleGrown(uint256 indexed tokenId, uint256 newSize)'),
  CircleShrunk: parseAbiItem('event CircleShrunk(uint256 indexed tokenId, uint256 newSize)'),
  CirclesMerged: parseAbiItem('event CirclesMerged(uint256[] mergedTokenIds, uint256 newTokenId, uint256 remainderTokenId)'),
  SpecialMetadataSet: parseAbiItem('event SpecialMetadataSet(uint256 indexed tokenId, string metadata)'),
} as const

// Helper function with timeout
function withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) => 
      setTimeout(() => reject(new Error(`Timeout after ${timeoutMs}ms`)), timeoutMs)
    )
  ])
}

// 🎯 ELITE FUNCTION: Fetch comprehensive action history for a token
async function fetchTokenHistory(tokenId: number): Promise<{ action: string; timestamp: number }[]> {
  console.log(`🔍 Fetching action history for token #${tokenId}`)
  
  try {
    const publicClient = getPublicClient(wagmiConfig)
    const history: { action: string; timestamp: number; blockNumber: number }[] = []

    // 📊 1. Fetch Transfer events (Mint, Transfers)
    const transferLogs = await withTimeout(
      publicClient!.getLogs({
        address: CONTRACT_ADDRESS,
        event: ACTION_EVENTS.Transfer,
        args: { tokenId: BigInt(tokenId) },
        fromBlock: BigInt(0),
        toBlock: 'latest'
      }),
      8000
    )

    for (const log of transferLogs as any[]) {
      const block = await publicClient!.getBlock({ blockNumber: log.blockNumber })
      if (log.args.from === '0x0000000000000000000000000000000000000000') {
        history.push({
          action: `🎯 Minted to ${log.args.to.slice(0, 6)}...${log.args.to.slice(-4)}`,
          timestamp: Number(block.timestamp),
          blockNumber: Number(log.blockNumber)
        })
      } else {
        history.push({
          action: `📤 Transferred from ${log.args.from.slice(0, 6)}...${log.args.from.slice(-4)} to ${log.args.to.slice(0, 6)}...${log.args.to.slice(-4)}`,
          timestamp: Number(block.timestamp),
          blockNumber: Number(log.blockNumber)
        })
      }
    }

    // 📊 2. Fetch CircleGrown events
    const grownLogs = await withTimeout(
      publicClient!.getLogs({
        address: CONTRACT_ADDRESS,
        event: ACTION_EVENTS.CircleGrown,
        args: { tokenId: BigInt(tokenId) },
        fromBlock: BigInt(0),
        toBlock: 'latest'
      }),
      8000
    )

    for (const log of grownLogs as any[]) {
      const block = await publicClient!.getBlock({ blockNumber: log.blockNumber })
      history.push({
        action: `📈 Grown to size ${log.args.newSize}`,
        timestamp: Number(block.timestamp),
        blockNumber: Number(log.blockNumber)
      })
    }

    // 📊 3. Fetch CircleShrunk events
    const shrunkLogs = await withTimeout(
      publicClient!.getLogs({
        address: CONTRACT_ADDRESS,
        event: ACTION_EVENTS.CircleShrunk,
        args: { tokenId: BigInt(tokenId) },
        fromBlock: BigInt(0),
        toBlock: 'latest'
      }),
      8000
    )

    for (const log of shrunkLogs as any[]) {
      const block = await publicClient!.getBlock({ blockNumber: log.blockNumber })
      history.push({
        action: `📉 Shrunk to size ${log.args.newSize}`,
        timestamp: Number(block.timestamp),
        blockNumber: Number(log.blockNumber)
      })
    }

    // 📊 4. Fetch CirclesMerged events (where this token was created)
    const mergedLogs = await withTimeout(
      publicClient!.getLogs({
        address: CONTRACT_ADDRESS,
        event: ACTION_EVENTS.CirclesMerged,
        fromBlock: BigInt(0),
        toBlock: 'latest'
      }),
      8000
    )

    for (const log of mergedLogs as any[]) {
      // Check if this token was created from a merge
      if (Number(log.args.newTokenId) === tokenId || Number(log.args.remainderTokenId) === tokenId) {
        const block = await publicClient!.getBlock({ blockNumber: log.blockNumber })
        const mergedIds = log.args.mergedTokenIds.map((id: any) => Number(id)).join(', ')
        
        if (Number(log.args.newTokenId) === tokenId) {
          history.push({
            action: `🔄 Created by merging tokens [${mergedIds}]`,
            timestamp: Number(block.timestamp),
            blockNumber: Number(log.blockNumber)
          })
        } else {
          history.push({
            action: `🔄 Created as remainder from merging tokens [${mergedIds}]`,
            timestamp: Number(block.timestamp),
            blockNumber: Number(log.blockNumber)
          })
        }
      }
    }

    // 📊 5. Fetch SpecialMetadataSet events
    const metadataLogs = await withTimeout(
      publicClient!.getLogs({
        address: CONTRACT_ADDRESS,
        event: ACTION_EVENTS.SpecialMetadataSet,
        args: { tokenId: BigInt(tokenId) },
        fromBlock: BigInt(0),
        toBlock: 'latest'
      }),
      8000
    )

    for (const log of metadataLogs as any[]) {
      const block = await publicClient!.getBlock({ blockNumber: log.blockNumber })
      history.push({
        action: `🎨 Special metadata set (1/1 status achieved)`,
        timestamp: Number(block.timestamp),
        blockNumber: Number(log.blockNumber)
      })
    }

    // 🔥 ELITE SORTING: Sort by block number then timestamp
    const sortedHistory = history
      .sort((a, b) => a.blockNumber - b.blockNumber || a.timestamp - b.timestamp)
      .map(({ action, timestamp }) => ({ action, timestamp }))

    console.log(`📋 Token #${tokenId} history: ${sortedHistory.length} actions`)
    return sortedHistory

  } catch (error) {
    console.error(`💥 Error fetching history for token #${tokenId}:`, error)
    return []
  }
}

export function useNFTs(address: string | null) {
  const [nfts, setNFTs] = useState<NFT[]>([])
  const [loading, setLoading] = useState(true)

  const fetchNFTData = async (tokenId: number): Promise<NFT | null> => {
    try {
      // 1. Fetch basic token data
      const tokenInfo = await withTimeout(
        readContract(wagmiConfig, {
          address: CONTRACT_ADDRESS,
          abi: rabbitHoleAbi,
          functionName: "circleData",
          args: [BigInt(tokenId)],
        }),
        5000
      )

      // Calculate cooldowns
      const now = Math.floor(Date.now() / 1000)
      const lastGrowTime = Number(tokenInfo[1])
      const lastShrinkTime = Number(tokenInfo[2])
      const growTimeElapsed = now - lastGrowTime
      const shrinkTimeElapsed = now - lastShrinkTime

      // 2. 🔥 ELITE FEATURE: Fetch comprehensive action history
      const history = await fetchTokenHistory(tokenId)

      return {
        id: Number(tokenId),
        size: Number(tokenInfo[0]),
        minSize: 1,
        maxSize: 1000,
        lastGrowTime: lastGrowTime,
        lastShrinkTime: lastShrinkTime,
        growCooldownRemaining:
          lastGrowTime === 0 ? 0 : growTimeElapsed >= DAILY_COOLDOWN ? 0 : DAILY_COOLDOWN - growTimeElapsed,
        shrinkCooldownRemaining:
          lastShrinkTime === 0 ? 0 : shrinkTimeElapsed >= DAILY_COOLDOWN ? 0 : DAILY_COOLDOWN - shrinkTimeElapsed,
        history: history, // 🎯 REAL ACTION HISTORY!
      }
    } catch (error) {
      console.error(`💥 Error fetching data for token ${tokenId}:`, error)
      return null
    }
  }

  const fetchNFTs = async () => {
    console.log("🚀 PROFESSIONAL NFT FETCHING - Using Transfer Events")
    console.log("🔍 Address:", address)
    console.log("🔍 Contract:", CONTRACT_ADDRESS)
    
    if (!address) {
      console.log("❌ No address provided")
      setNFTs([])
      setLoading(false)
      return
    }

    setLoading(true)

    try {
      console.log("⚡ Step 1: Check balance for validation")
      
      // Quick balance check for validation
      const balance = await withTimeout(
        readContract(wagmiConfig, {
          address: CONTRACT_ADDRESS,
          abi: rabbitHoleAbi,
          functionName: "balanceOf",
          args: [address as `0x${string}`],
        }),
        5000
      )

      console.log(`✅ Balance: ${balance} NFTs`)

      if (Number(balance) === 0) {
        setNFTs([])
        setLoading(false)
        return
      }

      console.log("🔥 Step 2: PROFESSIONAL APPROACH - Query Transfer Events")
      
      // Query Transfer events - this is how REAL NFT dApps work!
      // Transfer(address from, address to, uint256 tokenId)
      const publicClient = getPublicClient(wagmiConfig)
      
      const transferLogs = await withTimeout(
        publicClient!.getLogs({
          address: CONTRACT_ADDRESS,
          event: parseAbiItem('event Transfer(address indexed from, address indexed to, uint256 indexed tokenId)'),
          args: {
            to: address as `0x${string}`, // Tokens transferred TO this address
          },
          fromBlock: BigInt(0), // From contract deployment
          toBlock: 'latest'
        }),
        10000 // 10 seconds for all logs
      )

      console.log(`📊 Found ${(transferLogs as any[]).length} Transfer events TO this address`)

      // Get tokens that were transferred OUT of this address  
      const transferOutLogs = await withTimeout(
        publicClient!.getLogs({
          address: CONTRACT_ADDRESS,
          event: parseAbiItem('event Transfer(address indexed from, address indexed to, uint256 indexed tokenId)'),
          args: {
            from: address as `0x${string}`, // Tokens transferred FROM this address
          },
          fromBlock: BigInt(0),
          toBlock: 'latest'
        }),
        10000
      )

      console.log(`📊 Found ${(transferOutLogs as any[]).length} Transfer events FROM this address`)

      // Calculate current owned tokens
      const tokensReceived = new Set((transferLogs as any[]).map((log: any) => Number(log.args.tokenId)))
      const tokensSent = new Set((transferOutLogs as any[]).map((log: any) => Number(log.args.tokenId)))
      
      // Current owned = received - sent
      const ownedTokenIds = Array.from(tokensReceived).filter(tokenId => !tokensSent.has(tokenId))
      
      console.log(`🎯 RESULT: Currently owns ${ownedTokenIds.length} tokens: [${ownedTokenIds.join(", ")}]`)
      console.log(`📈 Received: [${Array.from(tokensReceived).join(", ")}]`)
      console.log(`📉 Sent: [${Array.from(tokensSent).join(", ")}]`)

      if (ownedTokenIds.length === 0) {
        console.log("❌ No tokens currently owned")
        setNFTs([])
        setLoading(false)
        return
      }

      console.log("💎 Step 3: Batch fetch NFT data + ELITE ACTION HISTORY for owned tokens")
      
      // Fetch all NFT data in parallel - MUCH faster!
      const nftPromises = ownedTokenIds.map(tokenId => fetchNFTData(tokenId))
      const nftResults = await Promise.all(nftPromises)
      const validNFTs = nftResults.filter((nft): nft is NFT => nft !== null)

      console.log(`🎉 SUCCESS: Loaded ${validNFTs.length} NFTs with complete action history!`)
      console.log("📋 NFTs:", validNFTs.map(nft => `#${nft.id} (size: ${nft.size}, ${nft.history?.length || 0} actions)`).join(", "))
      
      setNFTs(validNFTs)

    } catch (error) {
      console.error("💥 Error in professional NFT fetching:", error)
      console.log("🔄 Fallback: Event queries might not be supported on this RPC")
      setNFTs([])
    } finally {
      setLoading(false)
    }
  }

  // Fetch NFTs when address changes
  useEffect(() => {
    console.log("🔄 Address changed to:", address)
    setNFTs([])
    fetchNFTs()
  }, [address])

  return { nfts, loading, refreshNFTs: fetchNFTs }
}

