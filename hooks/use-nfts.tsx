"use client"

import { useState, useEffect } from "react"
import { readContract, getPublicClient } from "@wagmi/core"
import { wagmiConfig, CONTRACT_ADDRESS } from "@/config/wagmi"
import { parseAbiItem } from "viem"
import type { NFT } from "@/types/nft"
import { logger } from "@/lib/logger"

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
  {
    inputs: [{ internalType: "uint256", name: "tokenId", type: "uint256" }],
    name: "tokenURI",
    outputs: [{ internalType: "string", name: "", type: "string" }],
    stateMutability: "view",
    type: "function",
  },
] as const

// Contract constants
const DAILY_COOLDOWN = 86400 // 24 hours in seconds
const GARDEN_CONTRACT_ADDRESS = "0x2940574AF75D350BF37Ceb73CA5dE8e5ADA425c4" as `0x${string}`

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
async function fetchTokenHistory(tokenId: number): Promise<{ action: string; timestamp: number; txHash: string }[]> {
  logger.debug(`Fetching action history for token #${tokenId}`)
  
  try {
    const publicClient = getPublicClient(wagmiConfig)
    const history: { action: string; timestamp: number; blockNumber: number; txHash: string }[] = []

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
          action: `Minted to ${log.args.to.slice(0, 6)}...${log.args.to.slice(-4)}`,
          timestamp: Number(block.timestamp),
          blockNumber: Number(log.blockNumber),
          txHash: log.transactionHash
        })
      } else if (log.args.to.toLowerCase() === GARDEN_CONTRACT_ADDRESS.toLowerCase()) {
        history.push({
          action: `🌱 Planted in Garden (${log.args.from.slice(0, 6)}...${log.args.from.slice(-4)} → Garden)`,
          timestamp: Number(block.timestamp),
          blockNumber: Number(log.blockNumber),
          txHash: log.transactionHash
        })
      } else if (log.args.from.toLowerCase() === GARDEN_CONTRACT_ADDRESS.toLowerCase()) {
        history.push({
          action: `🌳 Uprooted from Garden (Garden → ${log.args.to.slice(0, 6)}...${log.args.to.slice(-4)})`,
          timestamp: Number(block.timestamp),
          blockNumber: Number(log.blockNumber),
          txHash: log.transactionHash
        })
      } else {
        history.push({
          action: `Transferred from ${log.args.from.slice(0, 6)}...${log.args.from.slice(-4)} to ${log.args.to.slice(0, 6)}...${log.args.to.slice(-4)}`,
          timestamp: Number(block.timestamp),
          blockNumber: Number(log.blockNumber),
          txHash: log.transactionHash
        })
      }
    }

    // 📊 2. Fetch CircleGrown events
    try {
      const grownLogs = await withTimeout(
        publicClient!.getLogs({
          address: CONTRACT_ADDRESS,
          event: ACTION_EVENTS.CircleGrown,
          args: { tokenId: BigInt(tokenId) },
          fromBlock: BigInt(0),
          toBlock: 'latest'
        }),
        12000
      )

      logger.debug(`Token #${tokenId}: Found ${(grownLogs as any[]).length} grow events`)
      for (const log of grownLogs as any[]) {
        const block = await publicClient!.getBlock({ blockNumber: log.blockNumber })
        history.push({
          action: `📈 Grown to size ${log.args.newSize}`,
          timestamp: Number(block.timestamp),
          blockNumber: Number(log.blockNumber),
          txHash: log.transactionHash
        })
      }
    } catch (error) {
      logger.warn(`Failed to fetch grow events for token #${tokenId}`, error)
    }

    // 📊 3. Fetch CircleShrunk events  
    try {
      const shrunkLogs = await withTimeout(
        publicClient!.getLogs({
          address: CONTRACT_ADDRESS,
          event: ACTION_EVENTS.CircleShrunk,
          args: { tokenId: BigInt(tokenId) },
          fromBlock: BigInt(0),
          toBlock: 'latest'
        }),
        12000
      )

      logger.debug(`Token #${tokenId}: Found ${(shrunkLogs as any[]).length} shrink events`)
      for (const log of shrunkLogs as any[]) {
        const block = await publicClient!.getBlock({ blockNumber: log.blockNumber })
        history.push({
          action: `📉 Shrunk to size ${log.args.newSize}`,
          timestamp: Number(block.timestamp),
          blockNumber: Number(log.blockNumber),
          txHash: log.transactionHash
        })
      }
    } catch (error) {
      logger.warn(`Failed to fetch shrink events for token #${tokenId}`, error)
    }

    // 📊 4. Fetch CirclesMerged events (as source)
    try {
      const mergedLogs = await withTimeout(
        publicClient!.getLogs({
          address: CONTRACT_ADDRESS,
          event: ACTION_EVENTS.CirclesMerged,
          fromBlock: BigInt(0),
          toBlock: 'latest'
        }),
        12000
      )

      logger.debug(`Token #${tokenId}: Found ${(mergedLogs as any[]).length} merge events to check`)
      for (const log of mergedLogs as any[]) {
        if (log.args.mergedTokenIds.includes(BigInt(tokenId))) {
          const block = await publicClient!.getBlock({ blockNumber: log.blockNumber })
          history.push({
            action: `🔄 Merged with other tokens → Token #${log.args.newTokenId}`,
            timestamp: Number(block.timestamp),
            blockNumber: Number(log.blockNumber),
            txHash: log.transactionHash
          })
        }
      }
    } catch (error) {
      logger.warn(`Failed to fetch merge events for token #${tokenId}`, error)
    }

    // 📊 5. Fetch SpecialMetadataSet events
    try {
      const metadataLogs = await withTimeout(
        publicClient!.getLogs({
          address: CONTRACT_ADDRESS,
          event: ACTION_EVENTS.SpecialMetadataSet,
          args: { tokenId: BigInt(tokenId) },
          fromBlock: BigInt(0),
          toBlock: 'latest'
        }),
        12000
      )

      logger.debug(`Token #${tokenId}: Found ${(metadataLogs as any[]).length} metadata events`)
      for (const log of metadataLogs as any[]) {
        const block = await publicClient!.getBlock({ blockNumber: log.blockNumber })
        history.push({
          action: `🎨 Special metadata set (1/1 status)`,
          timestamp: Number(block.timestamp),
          blockNumber: Number(log.blockNumber),
          txHash: log.transactionHash
        })
      }
    } catch (error) {
      logger.warn(`Failed to fetch metadata events for token #${tokenId}`, error)
    }

    // Sort by block number (chronological order)
    const sortedHistory = history.sort((a, b) => a.blockNumber - b.blockNumber)

    logger.debug(`Token #${tokenId} history: ${sortedHistory.length} actions`)
    return sortedHistory

  } catch (error) {
    logger.error(`Error fetching history for token #${tokenId}`, error)
    return []
  }
}

export function useNFTs(address: string | null) {
  const [nfts, setNFTs] = useState<NFT[]>([])
  const [isLoading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchNFTData = async (tokenId: number): Promise<NFT | null> => {
    try {
      // Get circle data from contract
      const tokenInfo = await withTimeout(
        readContract(wagmiConfig, {
          address: CONTRACT_ADDRESS,
          abi: rabbitHoleAbi,
          functionName: "circleData",
          args: [BigInt(tokenId)],
        }),
        5000
      )

      // Get token image from contract's tokenURI
      let imageUrl: string | undefined
      try {
        const tokenURI = await withTimeout(
          readContract(wagmiConfig, {
            address: CONTRACT_ADDRESS,
            abi: rabbitHoleAbi,
            functionName: "tokenURI",
            args: [BigInt(tokenId)],
          }),
          5000
        ) as string

        // Parse Base64-encoded JSON metadata to extract SVG
        if (tokenURI.startsWith('data:application/json;base64,')) {
          const base64Data = tokenURI.replace('data:application/json;base64,', '')
          const jsonData = atob(base64Data)
          const metadata = JSON.parse(jsonData)
          
          if (metadata.image) {
            imageUrl = metadata.image
            logger.debug(`Token #${tokenId} image extracted from contract`)
          }
        }
      } catch (error) {
        logger.warn(`Could not fetch image for token #${tokenId}`, error)
      }

      // Fetch comprehensive action history
      const history = await fetchTokenHistory(tokenId)

      const now = Math.floor(Date.now() / 1000)
      const size = Number((tokenInfo as any)[0])
      const lastGrowTime = Number((tokenInfo as any)[1])
      const lastShrinkTime = Number((tokenInfo as any)[2])

      return {
        id: tokenId,
        size: size,
        minSize: 1,
        maxSize: 1000,
        lastGrowTime: lastGrowTime,
        lastShrinkTime: lastShrinkTime,
        growCooldownRemaining: Math.max(0, (lastGrowTime + DAILY_COOLDOWN) - now),
        shrinkCooldownRemaining: Math.max(0, (lastShrinkTime + DAILY_COOLDOWN) - now),
        imageUrl,
        history
      }
    } catch (error) {
      logger.error(`Error fetching data for token #${tokenId}`, error)
      return null
    }
  }

  const fetchAllNFTs = async () => {
    logger.info("Starting professional NFT fetching using Transfer Events")
    logger.debug("Fetching for address", { address })
    
    if (!address) {
      logger.debug("No address provided")
      setNFTs([])
      setLoading(false)
      return
    }

    setLoading(true)

    try {
      logger.info("Step 1: Check balance for validation")
      
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

      logger.debug(`Balance: ${balance} NFTs`)

      if (Number(balance) === 0) {
        setNFTs([])
        setLoading(false)
        return
      }

      logger.info("Step 2: Query Transfer Events")
      
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

      logger.debug(`Found ${(transferLogs as any[]).length} Transfer events TO this address`)

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

      logger.debug(`Found ${(transferOutLogs as any[]).length} Transfer events FROM this address`)

      // Calculate current owned tokens
      const tokensReceived = new Set((transferLogs as any[]).map((log: any) => Number(log.args.tokenId)))
      const tokensSent = new Set((transferOutLogs as any[]).map((log: any) => Number(log.args.tokenId)))
      
      // Current owned = received - sent
      const ownedTokenIds = Array.from(tokensReceived).filter(tokenId => !tokensSent.has(tokenId))
      
      logger.debug(`Currently owns ${ownedTokenIds.length} tokens`, { 
        received: Array.from(tokensReceived), 
        sent: Array.from(tokensSent),
        owned: ownedTokenIds 
      })

      if (ownedTokenIds.length === 0) {
        logger.info("No tokens currently owned")
        setNFTs([])
        setLoading(false)
        return
      }

      logger.info("Step 3: Batch fetch NFT data with action history for owned tokens")
      
      // Fetch all NFT data in parallel - MUCH faster!
      const nftPromises = ownedTokenIds.map(tokenId => fetchNFTData(tokenId))
      const nftResults = await Promise.all(nftPromises)
      const validNFTs = nftResults.filter((nft): nft is NFT => nft !== null)

      logger.success(`Loaded ${validNFTs.length} NFTs with complete action history`)
      logger.debug("NFTs loaded", { nfts: validNFTs.map(nft => `#${nft.id} (size: ${nft.size}, ${nft.history?.length || 0} actions)`) })

      setNFTs(validNFTs)
      setError(null)

    } catch (error: any) {
      logger.error("Event queries might not be supported on this RPC", error)
      
      // Graceful fallback - don't break the UI
      setNFTs([])
      setError("Unable to load NFTs. Please try refreshing or check your connection.")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    logger.debug("Address changed", { newAddress: address })
    fetchAllNFTs()
  }, [address])

  return { nfts, isLoading, error, refreshNFTs: fetchAllNFTs }
}

