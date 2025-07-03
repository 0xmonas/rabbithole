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
  {
    inputs: [{ internalType: "address", name: "owner", type: "address" }, { internalType: "address", name: "operator", type: "address" }],
    name: "isApprovedForAll",
    outputs: [{ internalType: "bool", name: "", type: "bool" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ internalType: "address", name: "operator", type: "address" }, { internalType: "bool", name: "approved", type: "bool" }],
    name: "setApprovalForAll",
    outputs: [],
    stateMutability: "nonpayable",
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
  const [gardenStats, setGardenStats] = useState({
    totalGardenTokens: 0,
    readyToGrowCount: 0,
    lastWorkGardenTime: 0,
    nextWorkGardenTime: 0,
    loading: true
  })
  const [communityTokens, setCommunityTokens] = useState<Array<{ id: number; size: number }>>([])
  const [isCommunityLoading, setIsCommunityLoading] = useState(true)
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

  // 🌱 Plant seeds (send NFTs to garden) - WITH APPROVAL HANDLING
  const plantSeeds = async (maxTokenId: number = 1000) => {
    if (!address) {
      throw new Error("No wallet connected")
    }

    // 🔥 GAS OPTIMIZATION: Default to 1000 instead of 10,000
    // RabbitHole collection has 1000 NFTs max, so this is sufficient
    console.log(`🔥 Plant Seeds Gas Optimization: Using maxTokenId=${maxTokenId}`)
    
    // 🔒 APPROVAL HANDLING: Check if garden contract is approved to handle user's tokens
    console.log("🔒 Checking approval status for garden contract...")
    
    try {
      const isApproved = await readContract(wagmiConfig, {
        address: RH_CONTRACT_ADDRESS,
        abi: rhAbi,
        functionName: "isApprovedForAll",
        args: [address as `0x${string}`, GARDEN_CONTRACT_ADDRESS],
      }) as boolean

      console.log(`🔒 Garden contract approval status: ${isApproved}`)

      // If not approved, request approval first
      if (!isApproved) {
        console.log("🔒 Garden contract not approved. Requesting approval...")
        
        // Execute approval transaction
        await transactionModal.executeTransaction(
          "Approving Garden Contract",
          async () => {
            const hash = await writeContract(wagmiConfig, {
              address: RH_CONTRACT_ADDRESS,
              abi: rhAbi,
              functionName: "setApprovalForAll",
              args: [GARDEN_CONTRACT_ADDRESS, true],
            })
            console.log(`🔒 Approval transaction hash: ${hash}`)
            return hash
          }
        )

        console.log("✅ Garden contract approved successfully!")
        
        // Verify approval was successful
        const isNowApproved = await readContract(wagmiConfig, {
          address: RH_CONTRACT_ADDRESS,
          abi: rhAbi,
          functionName: "isApprovedForAll",
          args: [address as `0x${string}`, GARDEN_CONTRACT_ADDRESS],
        }) as boolean

        if (!isNowApproved) {
          throw new Error("Approval verification failed - garden contract is still not approved")
        }
      } else {
        console.log("✅ Garden contract already approved")
      }

      // Now plant the seeds
      return await transactionModal.executeTransaction(
        `Planting Seeds (Max ID: ${maxTokenId})`,
        async () => {
          const hash = await writeContract(wagmiConfig, {
            address: GARDEN_CONTRACT_ADDRESS,
            abi: gardenAbi,
            functionName: "plant_seeds",
            args: [BigInt(maxTokenId)],
          })
          console.log(`🌱 Planting seeds with optimized range, transaction hash: ${hash}`)
          return hash
        },
        onSuccess
      )

    } catch (error) {
      console.error("💥 Error in plant seeds process:", error)
      throw error
    }
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

  // 🌱 Work garden (auto-grow planted NFTs) - OPTIMIZED FOR GAS
  const workGarden = async (maxTokenId?: number) => {
    // 🔥 GAS OPTIMIZATION: Account for tokens above 1000 (like #1004, #1014)
    let optimizedMax = maxTokenId
    
    if (!optimizedMax) {
      // RabbitHole collection has tokens beyond 1000 (found #1004, #1014)
      // Use a reasonable upper bound that covers actual token range
      optimizedMax = 1100 // Increased from 1000 to cover tokens like #1004, #1014
    }
    
    console.log(`Work Garden Debug: Using maxTokenId=${optimizedMax} (covers tokens up to #1100)`)
    console.log(`Current garden stats before work_garden:`)
    console.log(`- Total tokens: ${gardenStats.totalGardenTokens}`)
    console.log(`- Ready to grow: ${gardenStats.readyToGrowCount}`)
    
    return await transactionModal.executeTransaction(
      `Working Garden (Max ID: ${optimizedMax})`,
      async () => {
        const hash = await writeContract(wagmiConfig, {
          address: GARDEN_CONTRACT_ADDRESS,
          abi: gardenAbi,
          functionName: "work_garden",
          args: [BigInt(optimizedMax)],
        })
        console.log(`Work garden transaction completed: ${hash}`)
        console.log(`Smart contract will check token IDs 0-${optimizedMax} and grow eligible tokens`)
        return hash
      },
      onSuccess
    )
  }

  // 🌍 Fetch Garden-Wide Statistics (Community Service Data)
  const fetchGardenWideStats = async () => {
    console.log("🌍 Fetching garden-wide statistics...")
    setGardenStats(prev => ({ ...prev, loading: true }))
    setIsCommunityLoading(true)

    try {
      const publicClient = getPublicClient(wagmiConfig)
      
      // Get ALL transfers TO garden (from anyone)
      const allTransfersToGarden = await withTimeout(
        publicClient!.getLogs({
          address: RH_CONTRACT_ADDRESS,
          event: parseAbiItem('event Transfer(address indexed from, address indexed to, uint256 indexed tokenId)'),
          args: {
            to: GARDEN_CONTRACT_ADDRESS,
          },
          fromBlock: BigInt(0),
          toBlock: 'latest'
        }),
        15000
      )

      // Get ALL transfers FROM garden (to anyone)
      const allTransfersFromGarden = await withTimeout(
        publicClient!.getLogs({
          address: RH_CONTRACT_ADDRESS,
          event: parseAbiItem('event Transfer(address indexed from, address indexed to, uint256 indexed tokenId)'),
          args: {
            from: GARDEN_CONTRACT_ADDRESS,
          },
          fromBlock: BigInt(0),
          toBlock: 'latest'
        }),
        15000
      )

      // Calculate currently planted tokens (entire garden)
      const gardenTokenCounts = new Map<number, { planted: number, uprooted: number }>()
      
      // Count all plant transfers
      ;(allTransfersToGarden as any[]).forEach((log: any) => {
        const tokenId = Number(log.args.tokenId)
        const counts = gardenTokenCounts.get(tokenId) || { planted: 0, uprooted: 0 }
        counts.planted++
        gardenTokenCounts.set(tokenId, counts)
      })
      
      // Count all uproot transfers  
      ;(allTransfersFromGarden as any[]).forEach((log: any) => {
        const tokenId = Number(log.args.tokenId)
        const counts = gardenTokenCounts.get(tokenId) || { planted: 0, uprooted: 0 }
        counts.uprooted++
        gardenTokenCounts.set(tokenId, counts)
      })
      
      // Determine currently planted tokens (net positive garden transfers)
      const currentlyPlantedInGarden: number[] = []
      gardenTokenCounts.forEach((counts, tokenId) => {
        const netInGarden = counts.planted - counts.uprooted
        if (netInGarden > 0) {
          currentlyPlantedInGarden.push(tokenId)
        }
      })

      console.log(`🌍 Total tokens in garden: ${currentlyPlantedInGarden.length}`)

      // Fetch full data for all garden tokens in parallel
      const tokenDataPromises = currentlyPlantedInGarden.map(async (tokenId) => {
        try {
          const owner = await withTimeout(
            readContract(wagmiConfig, {
              address: RH_CONTRACT_ADDRESS,
              abi: rhAbi,
              functionName: "ownerOf",
              args: [BigInt(tokenId)],
            }),
            3000
          ) as string

          if (owner.toLowerCase() !== GARDEN_CONTRACT_ADDRESS.toLowerCase()) {
            return null // No longer in garden
          }

          const tokenInfo = await withTimeout(
            readContract(wagmiConfig, {
              address: RH_CONTRACT_ADDRESS,
              abi: rhAbi,
              functionName: "circleData",
              args: [BigInt(tokenId)],
            }),
            3000
          )
          
          return {
            id: tokenId,
            size: Number((tokenInfo as any)[0]),
            lastGrowTime: Number((tokenInfo as any)[1])
          }
        } catch (error) {
          console.warn(`Could not check token #${tokenId} data for community view:`, error)
          return null
        }
      })

      const allTokensData = (await Promise.all(tokenDataPromises)).filter((t): t is {id: number, size: number, lastGrowTime: number} => t !== null)

      // Set community tokens for visualizer
      setCommunityTokens(allTokensData.map(t => ({id: t.id, size: t.size})))

      // Check which tokens are ready to grow (24h cooldown passed)
      let readyToGrowCount = 0
      const now = Math.floor(Date.now() / 1000)
      const readyTokenDetails: Array<{id: number, lastGrowTime: number, timeElapsed: number}> = []
      
      allTokensData.forEach(token => {
        const growTimeElapsed = now - token.lastGrowTime
        if (token.lastGrowTime === 0 || growTimeElapsed >= 86400) {
          readyToGrowCount++
          readyTokenDetails.push({
            id: token.id,
            lastGrowTime: token.lastGrowTime,
            timeElapsed: growTimeElapsed
          })
        }
      })
      
      // Get last work_garden call time from transaction events
      // Look for work_garden transactions to the garden contract
      let lastWorkGardenTime = 0
      let nextWorkGardenTime = 0
      
      try {
        // Get transaction logs for garden contract interactions
        const gardenTransactions = await withTimeout(
          publicClient!.getLogs({
            address: GARDEN_CONTRACT_ADDRESS,
            fromBlock: BigInt(0),
            toBlock: 'latest'
          }),
          10000
        )

        // For now, estimate based on last grow events in garden
        if (currentlyPlantedInGarden.length > 0 && readyToGrowCount < currentlyPlantedInGarden.length) {
          // If some tokens have grown recently, estimate work_garden was called
          lastWorkGardenTime = now - 3600 // Estimate 1 hour ago
        }

        // Calculate when next tokens will be ready
        if (currentlyPlantedInGarden.length > readyToGrowCount) {
          // Find the token that will be ready soonest
          let earliestNextReady = Number.MAX_SAFE_INTEGER
          
          for (const tokenId of currentlyPlantedInGarden) {
            try {
              const owner = await withTimeout(
                readContract(wagmiConfig, {
                  address: RH_CONTRACT_ADDRESS,
                  abi: rhAbi,
                  functionName: "ownerOf",
                  args: [BigInt(tokenId)],
                }),
                3000
              ) as string

              if (owner.toLowerCase() === GARDEN_CONTRACT_ADDRESS.toLowerCase()) {
                const tokenInfo = await withTimeout(
                  readContract(wagmiConfig, {
                    address: RH_CONTRACT_ADDRESS,
                    abi: rhAbi,
                    functionName: "circleData",
                    args: [BigInt(tokenId)],
                  }),
                  3000
                )

                const lastGrowTime = Number((tokenInfo as any)[1])
                const growTimeElapsed = now - lastGrowTime
                
                // If not ready yet, calculate when it will be ready
                if (lastGrowTime > 0 && growTimeElapsed < 86400) {
                  const nextReadyTime = lastGrowTime + 86400
                  if (nextReadyTime < earliestNextReady) {
                    earliestNextReady = nextReadyTime
                  }
                }
              }
            } catch (error) {
              // Skip this token
            }
          }
          
          if (earliestNextReady < Number.MAX_SAFE_INTEGER) {
            nextWorkGardenTime = earliestNextReady
          }
        }
      } catch (error) {
        console.warn("Could not fetch work_garden timing:", error)
      }

      setGardenStats({
        totalGardenTokens: currentlyPlantedInGarden.length,
        readyToGrowCount,
        lastWorkGardenTime,
        nextWorkGardenTime,
        loading: false
      })

      console.log(`🌍 Garden stats: ${currentlyPlantedInGarden.length} total, ${readyToGrowCount} ready to grow`)

    } catch (error) {
      console.error("💥 Error fetching garden-wide stats:", error)
      setGardenStats(prev => ({ ...prev, loading: false }))
    } finally {
      setIsCommunityLoading(false)
    }
  }

  // Fetch garden NFTs when address changes
  useEffect(() => {
    fetchGardenNFTs()
    fetchGardenWideStats() // Also fetch community stats
  }, [address])

  return {
    gardenNFTs,
    loading,
    plantSeeds,
    uproot,
    workGarden,
    refreshGarden: fetchGardenNFTs,
    transactionModal,
    gardenStats,
    fetchGardenWideStats,
    communityTokens,
    isCommunityLoading,
  }
} 