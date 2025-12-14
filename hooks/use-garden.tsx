"use client"

import { useState, useEffect } from "react"
import { readContract, readContracts, writeContract } from "@wagmi/core"
import { wagmiConfig } from "@/config/wagmi"
import { getAddress } from "viem"
import type { NFT } from "@/types/nft"
import { useTransactionModal } from "./use-transaction-modal"
import { logger } from "@/lib/logger"
import { fetchAlchemyTransfers } from "@/lib/alchemy-transfers"

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

const isValidTokenId = (value: number | null): value is number => typeof value === "number" && !Number.isNaN(value)

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
      // Get ALL transfers FROM this address (what they sent out)
      logger.debug("Querying ALL transfers FROM user...")
      const allTransfersFromUser = await fetchAlchemyTransfers({
        contractAddress: RH_CONTRACT_ADDRESS,
        fromAddress: address as `0x${string}`,
      })
      
      logger.debug(`Found ${allTransfersFromUser.length} transfers FROM user`)
      allTransfersFromUser.forEach((transfer) => {
        if (isValidTokenId(transfer.tokenId)) {
          logger.debug(`Token #${transfer.tokenId} sent to: ${transfer.to}`)
        }
      })
      
      // Get ALL transfers TO this address (what they received)
      logger.debug("Querying ALL transfers TO user...")
      const allTransfersToUser = await fetchAlchemyTransfers({
        contractAddress: RH_CONTRACT_ADDRESS,
        toAddress: address as `0x${string}`,
      })
      
      logger.debug(`Found ${allTransfersToUser.length} transfers TO user`)
      allTransfersToUser.forEach((transfer) => {
        if (isValidTokenId(transfer.tokenId)) {
          logger.debug(`Token #${transfer.tokenId} received from: ${transfer.from}`)
        }
      })
      
      // Calculate net token ownership
      const tokensReceived = new Set(
        allTransfersToUser.map((transfer) => transfer.tokenId).filter(isValidTokenId)
      )
      const tokensSent = new Set(
        allTransfersFromUser.map((transfer) => transfer.tokenId).filter(isValidTokenId)
      )
      const currentTokens = Array.from(tokensReceived).filter(tokenId => !tokensSent.has(tokenId))
      
      logger.debug("OWNERSHIP ANALYSIS:")
      logger.debug(`Tokens received: [${Array.from(tokensReceived).join(", ")}]`)
      logger.debug(`Tokens sent: [${Array.from(tokensSent).join(", ")}]`)
      logger.debug(`Should currently own: [${currentTokens.join(", ")}]`)
      
      // Now focus on garden-specific transfers
      logger.debug("Querying transfers TO garden...")
      const transfersToGarden = await fetchAlchemyTransfers({
        contractAddress: RH_CONTRACT_ADDRESS,
        fromAddress: address as `0x${string}`,
        toAddress: GARDEN_CONTRACT_ADDRESS,
      })
      
      logger.debug(`Found ${transfersToGarden.length} transfers TO garden`)

      // Get transfers FROM garden contract to user (uproot events)
      logger.debug("Querying transfers FROM garden...")
      const transfersFromGarden = await fetchAlchemyTransfers({
        contractAddress: RH_CONTRACT_ADDRESS,
        fromAddress: GARDEN_CONTRACT_ADDRESS,
        toAddress: address as `0x${string}`,
      })
      
      logger.debug(`Found ${transfersFromGarden.length} transfers FROM garden`)

      // Calculate currently planted tokens - FIXED LOGIC
      // Count net transfers for each token (how many times planted vs uprooted)
      const tokenTransferCounts = new Map<number, { planted: number, uprooted: number }>()
      
      // Count all plant transfers
      transfersToGarden.forEach((transfer) => {
        if (!isValidTokenId(transfer.tokenId)) return
        const tokenId = transfer.tokenId
        const counts = tokenTransferCounts.get(tokenId) || { planted: 0, uprooted: 0 }
        counts.planted++
        tokenTransferCounts.set(tokenId, counts)
        logger.debug(`🌱 Token planted: #${tokenId} (count: ${counts.planted})`)
      })
      
      // Count all uproot transfers  
      transfersFromGarden.forEach((transfer) => {
        if (!isValidTokenId(transfer.tokenId)) return
        const tokenId = transfer.tokenId
        const counts = tokenTransferCounts.get(tokenId) || { planted: 0, uprooted: 0 }
        counts.uprooted++
        tokenTransferCounts.set(tokenId, counts)
        logger.debug(`🌱 Token uprooted: #${tokenId} (count: ${counts.uprooted})`)
      })
      
      // Determine currently planted tokens (net positive garden transfers)
      const currentlyPlanted: number[] = []
      tokenTransferCounts.forEach((counts, tokenId) => {
        const netInGarden = counts.planted - counts.uprooted
        logger.debug(`🌱 Token #${tokenId}: ${counts.planted} planted - ${counts.uprooted} uprooted = ${netInGarden} net`)
        if (netInGarden > 0) {
          currentlyPlanted.push(tokenId)
        }
      })

      logger.debug(`🌱 ALL PLANTED TOKENS: [${Array.from(tokenTransferCounts.keys()).join(", ")}]`)
      logger.debug(`🌱 CURRENTLY PLANTED: [${currentlyPlanted.join(", ")}]`)

      if (currentlyPlanted.length === 0) {
        logger.debug("🌱 No currently planted tokens found")
        setGardenNFTs([])
        setLoading(false)
        return
      }

      // Fetch NFT data for planted tokens using Multicall (optimized)
      logger.debug(`🌱 Using Multicall to fetch data for ${currentlyPlanted.length} planted tokens...`)
      
      // Build multicall contracts for ownerOf, circleData, and tokenURI
      const ownerOfContracts = currentlyPlanted.map(tokenId => ({
        address: RH_CONTRACT_ADDRESS,
        abi: rhAbi,
        functionName: "ownerOf" as const,
        args: [BigInt(tokenId)],
      }))
      
      const circleDataContracts = currentlyPlanted.map(tokenId => ({
        address: RH_CONTRACT_ADDRESS,
        abi: rhAbi,
        functionName: "circleData" as const,
        args: [BigInt(tokenId)],
      }))
      
      const tokenURIContracts = currentlyPlanted.map(tokenId => ({
        address: RH_CONTRACT_ADDRESS,
        abi: rhAbi,
        functionName: "tokenURI" as const,
        args: [BigInt(tokenId)],
      }))
      
      // Execute all multicalls in parallel (3 RPC calls instead of N*3)
      const [ownerResults, circleDataResults, tokenURIResults] = await Promise.all([
        withTimeout(readContracts(wagmiConfig, { contracts: ownerOfContracts }), 10000),
        withTimeout(readContracts(wagmiConfig, { contracts: circleDataContracts }), 10000),
        withTimeout(readContracts(wagmiConfig, { contracts: tokenURIContracts }), 10000),
      ])
      
      const now = Math.floor(Date.now() / 1000)
      const validNFTs: NFT[] = []
      
      for (let i = 0; i < currentlyPlanted.length; i++) {
        const tokenId = currentlyPlanted[i]
        const ownerResult = ownerResults[i]
        const circleResult = circleDataResults[i]
        const uriResult = tokenURIResults[i]
        
        // Check if token is still in garden
        if (ownerResult.status !== 'success') continue
        const owner = ownerResult.result as string
        if (owner.toLowerCase() !== GARDEN_CONTRACT_ADDRESS.toLowerCase()) {
          logger.debug(`🌱 Token #${tokenId} not in garden anymore`)
          continue
        }
        
        if (circleResult.status !== 'success') continue
        const tokenInfo = circleResult.result as any
        const lastGrowTime = Number(tokenInfo[1])
        const lastShrinkTime = Number(tokenInfo[2])
        const growTimeElapsed = now - lastGrowTime
        const shrinkTimeElapsed = now - lastShrinkTime
        
        // Parse image from tokenURI if available
        let imageUrl: string | undefined
        if (uriResult.status === 'success') {
          try {
            const tokenURI = uriResult.result as string
            if (tokenURI.startsWith('data:application/json;base64,')) {
              const base64Data = tokenURI.replace('data:application/json;base64,', '')
              const jsonData = atob(base64Data)
              const metadata = JSON.parse(jsonData)
              if (metadata.image) {
                imageUrl = metadata.image
              }
            }
          } catch (e) {
            // Ignore image parsing errors
          }
        }
        
        validNFTs.push({
          id: Number(tokenId),
          size: Number(tokenInfo[0]),
          minSize: 1,
          maxSize: 1000,
          lastGrowTime,
          lastShrinkTime,
          growCooldownRemaining: lastGrowTime === 0 ? 0 : growTimeElapsed >= 86400 ? 0 : 86400 - growTimeElapsed,
          shrinkCooldownRemaining: lastShrinkTime === 0 ? 0 : shrinkTimeElapsed >= 86400 ? 0 : 86400 - shrinkTimeElapsed,
          imageUrl,
          history: [],
        })
      }
      
      logger.debug(`🌱 Loaded ${validNFTs.length} garden NFTs in 3 RPC calls (Multicall)`)

      logger.debug(`🌱 Successfully loaded ${validNFTs.length} garden NFTs:`, validNFTs.map(nft => `#${nft.id} (size: ${nft.size})`))
      setGardenNFTs(validNFTs)

    } catch (error) {
      logger.error("💥 Error fetching garden NFTs:", error)
      setGardenNFTs([])
    } finally {
      setLoading(false)
    }
  }

  // 🌱 Plant seeds (send NFTs to garden) - WITH APPROVAL HANDLING
  const plantSeeds = async (maxTokenId: number = 1100) => {
    if (!address) {
      throw new Error("No wallet connected")
    }

    // 🔥 GAS OPTIMIZATION: Default to 1100 to cover merged tokens (like #1004, #1014)
    // RabbitHole collection has merged tokens beyond 1000, so need 1100 range
    logger.debug(`🔥 Plant Seeds Gas Optimization: Using maxTokenId=${maxTokenId}`)
    
    // 🔒 APPROVAL HANDLING: Check if garden contract is approved to handle user's tokens
    logger.debug("🔒 Checking approval status for garden contract...")
    
    try {
      const isApproved = await readContract(wagmiConfig, {
        address: RH_CONTRACT_ADDRESS,
        abi: rhAbi,
        functionName: "isApprovedForAll",
        args: [address as `0x${string}`, GARDEN_CONTRACT_ADDRESS],
      }) as boolean

      logger.debug(`🔒 Garden contract approval status: ${isApproved}`)

      // If not approved, request approval first
      if (!isApproved) {
        logger.debug("🔒 Garden contract not approved. Requesting approval...")
        
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
            logger.debug(`🔒 Approval transaction hash: ${hash}`)
            return hash
          }
        )

        logger.debug("✅ Garden contract approved successfully!")
        
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
        logger.debug("✅ Garden contract already approved")
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
          logger.debug(`🌱 Planting seeds with optimized range, transaction hash: ${hash}`)
          return hash
        },
        onSuccess
      )

    } catch (error) {
      logger.error("💥 Error in plant seeds process:", error)
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
        logger.debug(`🌱 Uprooting, transaction hash: ${hash}`)
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
    
    logger.debug(`Work Garden Debug: Using maxTokenId=${optimizedMax} (covers tokens up to #1100)`)
    logger.debug(`Current garden stats before work_garden:`)
    logger.debug(`- Total tokens: ${gardenStats.totalGardenTokens}`)
    logger.debug(`- Ready to grow: ${gardenStats.readyToGrowCount}`)
    
    return await transactionModal.executeTransaction(
      `Working Garden (Max ID: ${optimizedMax})`,
      async () => {
        const hash = await writeContract(wagmiConfig, {
          address: GARDEN_CONTRACT_ADDRESS,
          abi: gardenAbi,
          functionName: "work_garden",
          args: [BigInt(optimizedMax)],
        })
        logger.debug(`Work garden transaction completed: ${hash}`)
        logger.debug(`Smart contract will check token IDs 0-${optimizedMax} and grow eligible tokens`)
        return hash
      },
      onSuccess
    )
  }

  // 🌍 Fetch Garden-Wide Statistics (Community Service Data)
  const fetchGardenWideStats = async () => {
    logger.debug("🌍 Fetching garden-wide statistics...")
    setGardenStats(prev => ({ ...prev, loading: true }))
    setIsCommunityLoading(true)

    try {
      // Get ALL transfers TO garden (from anyone)
      const allTransfersToGarden = await fetchAlchemyTransfers({
        contractAddress: RH_CONTRACT_ADDRESS,
        toAddress: GARDEN_CONTRACT_ADDRESS,
      })

      // Get ALL transfers FROM garden (to anyone)
      const allTransfersFromGarden = await fetchAlchemyTransfers({
        contractAddress: RH_CONTRACT_ADDRESS,
        fromAddress: GARDEN_CONTRACT_ADDRESS,
      })

      // Calculate currently planted tokens (entire garden)
      const gardenTokenCounts = new Map<number, { planted: number, uprooted: number }>()
      
      // Count all plant transfers
      allTransfersToGarden.forEach((transfer) => {
        if (!isValidTokenId(transfer.tokenId)) return
        const tokenId = transfer.tokenId
        const counts = gardenTokenCounts.get(tokenId) || { planted: 0, uprooted: 0 }
        counts.planted++
        gardenTokenCounts.set(tokenId, counts)
      })
      
      // Count all uproot transfers  
      allTransfersFromGarden.forEach((transfer) => {
        if (!isValidTokenId(transfer.tokenId)) return
        const tokenId = transfer.tokenId
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

      logger.debug(`🌍 Total tokens in garden: ${currentlyPlantedInGarden.length}`)

      // Use Multicall to fetch all garden token data efficiently
      logger.debug(`🌍 Using Multicall to fetch data for ${currentlyPlantedInGarden.length} garden tokens...`)
      
      const ownerOfContracts = currentlyPlantedInGarden.map(tokenId => ({
        address: RH_CONTRACT_ADDRESS,
        abi: rhAbi,
        functionName: "ownerOf" as const,
        args: [BigInt(tokenId)],
      }))
      
      const circleDataContracts = currentlyPlantedInGarden.map(tokenId => ({
        address: RH_CONTRACT_ADDRESS,
        abi: rhAbi,
        functionName: "circleData" as const,
        args: [BigInt(tokenId)],
      }))
      
      // Execute both multicalls in parallel (2 RPC calls instead of N*2)
      const [ownerResults, circleDataResults] = await Promise.all([
        withTimeout(readContracts(wagmiConfig, { contracts: ownerOfContracts }), 15000),
        withTimeout(readContracts(wagmiConfig, { contracts: circleDataContracts }), 15000),
      ])
      
      const allTokensData: {id: number, size: number, lastGrowTime: number}[] = []
      
      for (let i = 0; i < currentlyPlantedInGarden.length; i++) {
        const tokenId = currentlyPlantedInGarden[i]
        const ownerResult = ownerResults[i]
        const circleResult = circleDataResults[i]
        
        if (ownerResult.status !== 'success' || circleResult.status !== 'success') continue
        
        const owner = ownerResult.result as string
        if (owner.toLowerCase() !== GARDEN_CONTRACT_ADDRESS.toLowerCase()) continue
        
        const tokenInfo = circleResult.result as any
        allTokensData.push({
          id: tokenId,
          size: Number(tokenInfo[0]),
          lastGrowTime: Number(tokenInfo[1])
        })
      }
      
      logger.debug(`🌍 Fetched ${allTokensData.length} garden tokens in 2 RPC calls (Multicall)`)

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
      
      // Estimate work_garden timing based on growth readiness
      if (currentlyPlantedInGarden.length > 0 && readyToGrowCount < currentlyPlantedInGarden.length) {
        lastWorkGardenTime = now - 3600 // Estimate 1 hour ago
      }

      // Calculate next work garden time from already-fetched data (no extra RPC calls!)
      if (currentlyPlantedInGarden.length > readyToGrowCount) {
        let earliestNextReady = Number.MAX_SAFE_INTEGER
        
        allTokensData.forEach(token => {
          const growTimeElapsed = now - token.lastGrowTime
          // If not ready yet, calculate when it will be ready
          if (token.lastGrowTime > 0 && growTimeElapsed < 86400) {
            const nextReadyTime = token.lastGrowTime + 86400
            if (nextReadyTime < earliestNextReady) {
              earliestNextReady = nextReadyTime
            }
          }
        })
        
        if (earliestNextReady < Number.MAX_SAFE_INTEGER) {
          nextWorkGardenTime = earliestNextReady
        }
      }

      setGardenStats({
        totalGardenTokens: currentlyPlantedInGarden.length,
        readyToGrowCount,
        lastWorkGardenTime,
        nextWorkGardenTime,
        loading: false
      })

      logger.debug(`🌍 Garden stats: ${currentlyPlantedInGarden.length} total, ${readyToGrowCount} ready to grow`)

    } catch (error) {
      logger.error("💥 Error fetching garden-wide stats:", error)
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
