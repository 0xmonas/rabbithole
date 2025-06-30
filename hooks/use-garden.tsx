"use client"

import { useState, useEffect } from "react"
import { readContract, writeContract, getPublicClient } from "@wagmi/core"
import { wagmiConfig } from "@/config/wagmi"
import { parseAbiItem } from "viem"
import type { NFT } from "@/types/nft"

// Garden contract address and ABI
const GARDEN_CONTRACT_ADDRESS = "0x2940574AF75D350BF37Ceb73CA5dE8e5ADA425c4" as const
const RH_CONTRACT_ADDRESS = "0xCA38813D69409E4E50F1411A0CAB2570E570C75A" as const

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

export function useGarden(address: string | null) {
  const [gardenNFTs, setGardenNFTs] = useState<NFT[]>([])
  const [loading, setLoading] = useState(false)
  const [isActionPending, setIsActionPending] = useState(false)
  const [actionError, setActionError] = useState<string | null>(null)

  // 🌱 Fetch Garden NFTs for user
  const fetchGardenNFTs = async () => {
    if (!address) {
      console.log("🌱 No address provided to fetchGardenNFTs")
      setGardenNFTs([])
      return
    }

    console.log("🌱 Fetching Garden NFTs for:", address)
    console.log("🌱 Garden Contract:", GARDEN_CONTRACT_ADDRESS)
    console.log("🌱 RH Contract:", RH_CONTRACT_ADDRESS)
    setLoading(true)

    try {
      // Get user's planted seeds using Transfer events
      const publicClient = getPublicClient(wagmiConfig)
      console.log("🌱 PublicClient:", publicClient ? "Available" : "Not available")
      
      // Get transfers TO garden contract from user
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

      // Calculate currently planted tokens
      const plantedTokenIds = new Set((transfersToGarden as any[]).map((log: any) => {
        const tokenId = Number(log.args.tokenId)
        console.log(`🌱 Token planted: #${tokenId}`)
        return tokenId
      }))
      
      const uprootedTokenIds = new Set((transfersFromGarden as any[]).map((log: any) => {
        const tokenId = Number(log.args.tokenId) 
        console.log(`🌱 Token uprooted: #${tokenId}`)
        return tokenId
      }))
      
      const currentlyPlanted = Array.from(plantedTokenIds).filter(tokenId => !uprootedTokenIds.has(tokenId))

      console.log(`🌱 Planted tokens: [${Array.from(plantedTokenIds).join(", ")}]`)
      console.log(`🌱 Uprooted tokens: [${Array.from(uprootedTokenIds).join(", ")}]`)
      console.log(`🌱 Currently planted: [${currentlyPlanted.join(", ")}]`)

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
          )

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

          console.log(`🌱 Token #${tokenId} data:`, {
            size: Number(tokenInfo[0]),
            lastGrowTime: Number(tokenInfo[1]),
            lastShrinkTime: Number(tokenInfo[2])
          })

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
            growCooldownRemaining: lastGrowTime === 0 ? 0 : growTimeElapsed >= 86400 ? 0 : 86400 - growTimeElapsed,
            shrinkCooldownRemaining: lastShrinkTime === 0 ? 0 : shrinkTimeElapsed >= 86400 ? 0 : 86400 - shrinkTimeElapsed,
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
    setIsActionPending(true)
    setActionError(null)

    try {
      const hash = await writeContract(wagmiConfig, {
        address: GARDEN_CONTRACT_ADDRESS,
        abi: gardenAbi,
        functionName: "plant_seeds",
        args: [BigInt(maxTokenId)],
      })

      console.log(`🌱 Planting seeds, transaction hash: ${hash}`)
      return true
    } catch (error: any) {
      console.error("💥 Error planting seeds:", error)
      setActionError(error?.message || "Failed to plant seeds. Please try again.")
      return false
    } finally {
      setIsActionPending(false)
    }
  }

  // 🌱 Uproot (get NFTs back from garden)
  const uproot = async () => {
    setIsActionPending(true)
    setActionError(null)

    try {
      const hash = await writeContract(wagmiConfig, {
        address: GARDEN_CONTRACT_ADDRESS,
        abi: gardenAbi,
        functionName: "uproot",
        args: [],
      })

      console.log(`🌱 Uprooting, transaction hash: ${hash}`)
      return true
    } catch (error: any) {
      console.error("💥 Error uprooting:", error)
      setActionError(error?.message || "Failed to uproot. Please try again.")
      return false
    } finally {
      setIsActionPending(false)
    }
  }

  // 🌱 Work garden (auto-grow planted NFTs)
  const workGarden = async (maxTokenId: number = 10000) => {
    setIsActionPending(true)
    setActionError(null)

    try {
      const hash = await writeContract(wagmiConfig, {
        address: GARDEN_CONTRACT_ADDRESS,
        abi: gardenAbi,
        functionName: "work_garden",
        args: [BigInt(maxTokenId)],
      })

      console.log(`🌱 Working garden, transaction hash: ${hash}`)
      return true
    } catch (error: any) {
      console.error("💥 Error working garden:", error)
      setActionError(error?.message || "Failed to work garden. Please try again.")
      return false
    } finally {
      setIsActionPending(false)
    }
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
    isActionPending,
    actionError,
  }
} 