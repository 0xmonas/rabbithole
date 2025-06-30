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

// Helper function with timeout
function withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) => 
      setTimeout(() => reject(new Error(`Timeout after ${timeoutMs}ms`)), timeoutMs)
    )
  ])
}

export function useNFTs(address: string | null) {
  const [nfts, setNFTs] = useState<NFT[]>([])
  const [loading, setLoading] = useState(true)

  const fetchNFTData = async (tokenId: number): Promise<NFT | null> => {
    try {
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
        history: [],
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

      console.log("💎 Step 3: Batch fetch NFT data for owned tokens")
      
      // Fetch all NFT data in parallel - MUCH faster!
      const nftPromises = ownedTokenIds.map(tokenId => fetchNFTData(tokenId))
      const nftResults = await Promise.all(nftPromises)
      const validNFTs = nftResults.filter((nft): nft is NFT => nft !== null)

      console.log(`🎉 SUCCESS: Loaded ${validNFTs.length} NFTs in milliseconds!`)
      console.log("📋 NFTs:", validNFTs.map(nft => `#${nft.id} (size: ${nft.size})`).join(", "))
      
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

