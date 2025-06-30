"use client"

import { useState, useEffect } from "react"
import { readContract, writeContract, getPublicClient } from "@wagmi/core"
import { wagmiConfig } from "@/config/wagmi"
import { parseAbiItem, getAddress } from "viem"
import type { NFT } from "@/types/nft"
import { useTransactionModal } from "./use-transaction-modal"
import { logger } from "@/lib/logger"

// Garden contract address and ABI - FIXED CHECKSUM
const GARDEN_CONTRACT_ADDRESS = getAddress("0x2940574AF75D350BF37Ceb73CA5dE8e5ADA425c4")
const RH_CONTRACT_ADDRESS = getAddress("0xca38813d69409e4e50f1411a0cab2570e570c75a")

const gardenAbi = [
  {
    inputs: [{ internalType: "uint256", name: "_max", type: "uint256" }],
    name: "plant_seeds",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [],
    name: "uproot",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [{ internalType: "uint256", name: "_max", type: "uint256" }],
    name: "work_garden",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [{ internalType: "address", name: "", type: "address" }, { internalType: "uint256", name: "", type: "uint256" }],
    name: "seeds",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
] as const

const rhAbi = [
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
  {
    inputs: [{ internalType: "uint256", name: "tokenId", type: "uint256" }],
    name: "tokenURI",
    outputs: [{ internalType: "string", name: "", type: "string" }],
    stateMutability: "view",
    type: "function",
  },
] as const

// Helper function with timeout
function withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) => 
      setTimeout(() => reject(new Error(`Timeout after ${timeoutMs}ms`)), timeoutMs)
    )
  ])
}

export function useGarden(address: string | null, onSuccess?: () => void | Promise<void>) {
  const [gardenNFTs, setGardenNFTs] = useState<NFT[]>([])
  const [loading, setLoading] = useState(false)
  const transactionModal = useTransactionModal()

  // 🌱 Fetch Garden NFTs for user
  const fetchGardenNFTs = async () => {
    if (!address) {
      logger.debug("No address provided to fetchGardenNFTs")
      setGardenNFTs([])
      return
    }

    logger.info("Fetching Garden NFTs")
    logger.debug("Garden Contract address", { garden: GARDEN_CONTRACT_ADDRESS })
    logger.debug("RH Contract address", { rh: RH_CONTRACT_ADDRESS })
    logger.debug("Target address", { address })
    setLoading(true)

    try {
      // Get user's planted seeds using Transfer events
      const publicClient = getPublicClient(wagmiConfig)
      logger.debug("PublicClient status", { available: !!publicClient })
      
      // 🔍 DETAILED TRANSFER ANALYSIS - Let's see ALL transfers involving this address
      console.log("🔍 ANALYZING ALL TRANSFERS FOR ADDRESS:", address)
      
      // Get ALL transfers FROM this address (what they sent out)
      console.log("🔍 Querying ALL transfers FROM user...")
      const allTransfersFromUser = await withTimeout(
        publicClient!.getLogs({
          address: RH_CONTRACT_ADDRESS,
          event: parseAbiItem('event Transfer(address indexed from, address indexed to, uint256 indexed tokenId)'),
          args: {
            from: address as `0x${string}`,
          },
          fromBlock: BigInt(0),
          toBlock: 'latest'
        }),
        15000
      )
      
      console.log(`🔍 Found ${allTransfersFromUser.length} transfers FROM user:`)
      allTransfersFromUser.forEach((log: any, index) => {
        console.log(`🔍   ${index + 1}. Token #${Number(log.args.tokenId)} sent to: ${log.args.to}`)
      })
      
      // Get ALL transfers TO this address (what they received)
      console.log("🔍 Querying ALL transfers TO user...")
      const allTransfersToUser = await withTimeout(
        publicClient!.getLogs({
          address: RH_CONTRACT_ADDRESS,
          event: parseAbiItem('event Transfer(address indexed from, address indexed to, uint256 indexed tokenId)'),
          args: {
            to: address as `0x${string}`,
          },
          fromBlock: BigInt(0),
          toBlock: 'latest'
        }),
        15000
      )
      
      console.log(`🔍 Found ${allTransfersToUser.length} transfers TO user:`)
      allTransfersToUser.forEach((log: any, index) => {
        console.log(`🔍   ${index + 1}. Token #${Number(log.args.tokenId)} received from: ${log.args.from}`)
      })
      
      // Calculate net token ownership
      const tokensReceived = new Set(allTransfersToUser.map((log: any) => Number(log.args.tokenId)))
      const tokensSent = new Set(allTransfersFromUser.map((log: any) => Number(log.args.tokenId)))
      const currentTokens = Array.from(tokensReceived).filter(tokenId => !tokensSent.has(tokenId))
      
      console.log(`🔍 OWNERSHIP ANALYSIS:`)
      console.log(`🔍   Tokens received: [${Array.from(tokensReceived).join(", ")}]`)
      console.log(`🔍   Tokens sent: [${Array.from(tokensSent).join(", ")}]`)
      console.log(`🔍   Should currently own: [${currentTokens.join(", ")}]`)
      
      // Now focus on garden-specific transfers
      console.log("🌱 Querying transfers TO garden...")
      const transfersToGarden = await withTimeout(
        publicClient!.getLogs({
          address: RH_CONTRACT_ADDRESS,
          event: parseAbiItem('event Transfer(address indexed from, address indexed to, uint256 indexed tokenId)'),
          args: {
            from: address as `0x${string}`,
            to: GARDEN_CONTRACT_ADDRESS,
          },
          fromBlock: BigInt(0),
          toBlock: 'latest'
        }),
        10000
      )
      
      console.log(`🌱 Found ${(transfersToGarden as any[]).length} transfers TO garden:`, transfersToGarden)

      // Get transfers FROM garden contract to user (uproot events)
      console.log("🌱 Querying transfers FROM garden...")
      const transfersFromGarden = await withTimeout(
        publicClient!.getLogs({
          address: RH_CONTRACT_ADDRESS,
          event: parseAbiItem('event Transfer(address indexed from, address indexed to, uint256 indexed tokenId)'),
          args: {
            from: GARDEN_CONTRACT_ADDRESS,
            to: address as `0x${string}`,
          },
          fromBlock: BigInt(0),
          toBlock: 'latest'
        }),
        10000
      )
      
      console.log(`🌱 Found ${(transfersFromGarden as any[]).length} transfers FROM garden:`, transfersFromGarden)

      // Calculate currently planted tokens - FIXED LOGIC
      // Count net transfers for each token (how many times planted vs uprooted)
      const tokenTransferCounts = new Map<number, { planted: number, uprooted: number }>()
      
      // Count all plant transfers
      ;(transfersToGarden as any[]).forEach((log: any) => {
        const tokenId = Number(log.args.tokenId)
        const counts = tokenTransferCounts.get(tokenId) || { planted: 0, uprooted: 0 }
        counts.planted++
        tokenTransferCounts.set(tokenId, counts)
        console.log(`🌱 Token planted: #${tokenId} (count: ${counts.planted})`)
      })
      
      // Count all uproot transfers  
      ;(transfersFromGarden as any[]).forEach((log: any) => {
        const tokenId = Number(log.args.tokenId)
        const counts = tokenTransferCounts.get(tokenId) || { planted: 0, uprooted: 0 }
        counts.uprooted++
        tokenTransferCounts.set(tokenId, counts)
        console.log(`🌱 Token uprooted: #${tokenId} (count: ${counts.uprooted})`)
      })
      
      // Determine currently planted tokens (net positive garden transfers)
      const currentlyPlanted: number[] = []
      tokenTransferCounts.forEach((counts, tokenId) => {
        const netInGarden = counts.planted - counts.uprooted
        console.log(`🌱 Token #${tokenId}: ${counts.planted} planted - ${counts.uprooted} uprooted = ${netInGarden} net`)
        if (netInGarden > 0) {
          currentlyPlanted.push(tokenId)
        }
      })

      console.log(`🌱 ALL PLANTED TOKENS: [${Array.from(tokenTransferCounts.keys()).join(", ")}]`)
      console.log(`🌱 CURRENTLY PLANTED: [${currentlyPlanted.join(", ")}]`)

      if (currentlyPlanted.length === 0) {
        console.log("🌱 No currently planted tokens found")
        setGardenNFTs([])
        setLoading(false)
        return
      }

      // Fetch NFT data for planted tokens
      console.log(`🌱 Fetching data for ${currentlyPlanted.length} planted tokens...`)
      const nftPromises = currentlyPlanted.map(async (tokenId) => {
        try {
          console.log(`🌱 Checking owner of token #${tokenId}...`)
          
          // Verify token is actually in garden
          const owner = await withTimeout(
            readContract(wagmiConfig, {
              address: RH_CONTRACT_ADDRESS,
              abi: rhAbi,
              functionName: "ownerOf",
              args: [BigInt(tokenId)],
            }),
            5000
          ) as string

          console.log(`🌱 Token #${tokenId} owner: ${owner}`)
          console.log(`🌱 Garden contract: ${GARDEN_CONTRACT_ADDRESS}`)
          console.log(`🌱 Owner matches garden: ${owner.toLowerCase() === GARDEN_CONTRACT_ADDRESS.toLowerCase()}`)

          if (owner.toLowerCase() !== GARDEN_CONTRACT_ADDRESS.toLowerCase()) {
            console.log(`🌱 Token #${tokenId} not in garden anymore (owner: ${owner})`)
            return null // Token not in garden anymore
          }

          console.log(`🌱 Fetching circle data for token #${tokenId}...`)
          
          // Get circle data
          const tokenInfo = await withTimeout(
            readContract(wagmiConfig, {
              address: RH_CONTRACT_ADDRESS,
              abi: rhAbi,
              functionName: "circleData",
              args: [BigInt(tokenId)],
            }),
            5000
          )

          // Get token image
          let imageUrl: string | undefined
          try {
            const tokenURI = await withTimeout(
              readContract(wagmiConfig, {
                address: RH_CONTRACT_ADDRESS,
                abi: rhAbi,
                functionName: "tokenURI",
                args: [BigInt(tokenId)],
              }),
              5000
            ) as string

            // Parse Base64-encoded JSON metadata
            if (tokenURI.startsWith('data:application/json;base64,')) {
              const base64Data = tokenURI.replace('data:application/json;base64,', '')
              const jsonData = atob(base64Data)
              const metadata = JSON.parse(jsonData)
              
              if (metadata.image) {
                imageUrl = metadata.image
                console.log(`🌱 Token #${tokenId} image extracted from contract`)
              }
            }
          } catch (error) {
            console.warn(`⚠️ Could not fetch garden image for token #${tokenId}:`, error)
          }

          console.log(`🌱 Token #${tokenId} data:`, {
            size: Number((tokenInfo as any)[0]),
            lastGrowTime: Number((tokenInfo as any)[1]),
            lastShrinkTime: Number((tokenInfo as any)[2])
          })

          const now = Math.floor(Date.now() / 1000)
          const lastGrowTime = Number((tokenInfo as any)[1])
          const lastShrinkTime = Number((tokenInfo as any)[2])
          const growTimeElapsed = now - lastGrowTime
          const shrinkTimeElapsed = now - lastShrinkTime

          return {
            id: Number(tokenId),
            size: Number((tokenInfo as any)[0]),
            minSize: 1,
            maxSize: 1000,
            lastGrowTime: lastGrowTime,
            lastShrinkTime: lastShrinkTime,
            growCooldownRemaining: lastGrowTime === 0 ? 0 : growTimeElapsed >= 86400 ? 0 : 86400 - growTimeElapsed,
            shrinkCooldownRemaining: lastShrinkTime === 0 ? 0 : shrinkTimeElapsed >= 86400 ? 0 : 86400 - shrinkTimeElapsed,
            imageUrl: imageUrl, // 🎯 REAL CONTRACT-GENERATED IMAGE!
            history: [], // Garden history can be added later
          } as NFT
        } catch (error) {
          console.error(`💥 Error fetching garden token ${tokenId}:`, error)
          return null
        }
      })

      const nftResults = await Promise.all(nftPromises)
      const validNFTs = nftResults.filter((nft): nft is NFT => nft !== null)

      console.log(`🌱 Successfully loaded ${validNFTs.length} garden NFTs:`, validNFTs.map(nft => `#${nft.id} (size: ${nft.size})`))
      setGardenNFTs(validNFTs)

    } catch (error) {
      console.error("💥 Error fetching garden NFTs:", error)
      setGardenNFTs([])
    } finally {
      setLoading(false)
    }
  }

  // 🌱 Plant seeds (send NFTs to garden)
  const plantSeeds = async (maxTokenId: number = 10000) => {
    return await transactionModal.executeTransaction(
      "Planting Seeds in Garden",
      async () => {
        const hash = await writeContract(wagmiConfig, {
          address: GARDEN_CONTRACT_ADDRESS,
          abi: gardenAbi,
          functionName: "plant_seeds",
          args: [BigInt(maxTokenId)],
        })
        console.log(`🌱 Planting seeds, transaction hash: ${hash}`)
        return hash
      },
      onSuccess
    )
  }

  // 🌱 Uproot (get NFTs back from garden)
  const uproot = async () => {
    return await transactionModal.executeTransaction(
      "Uprooting Seeds from Garden",
      async () => {
        const hash = await writeContract(wagmiConfig, {
          address: GARDEN_CONTRACT_ADDRESS,
          abi: gardenAbi,
          functionName: "uproot",
          args: [],
        })
        console.log(`🌱 Uprooting, transaction hash: ${hash}`)
        return hash
      },
      onSuccess
    )
  }

  // 🌱 Work garden (auto-grow planted NFTs)
  const workGarden = async (maxTokenId: number = 10000) => {
    return await transactionModal.executeTransaction(
      "Working Garden (Auto-Growth)",
      async () => {
        const hash = await writeContract(wagmiConfig, {
          address: GARDEN_CONTRACT_ADDRESS,
          abi: gardenAbi,
          functionName: "work_garden",
          args: [BigInt(maxTokenId)],
        })
        console.log(`🌱 Working garden, transaction hash: ${hash}`)
        return hash
      },
      onSuccess
    )
  }

  // Fetch garden NFTs when address changes
  useEffect(() => {
    fetchGardenNFTs()
  }, [address])

  return {
    gardenNFTs,
    loading,
    plantSeeds,
    uproot,
    workGarden,
    refreshGarden: fetchGardenNFTs,
    transactionModal,
  }
} 