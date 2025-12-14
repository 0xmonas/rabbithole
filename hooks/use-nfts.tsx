"use client"

import { useState, useEffect } from "react"
import { readContract, readContracts } from "@wagmi/core"
import { wagmiConfig, CONTRACT_ADDRESS } from "@/config/wagmi"
import type { NFT } from "@/types/nft"
import { logger } from "@/lib/logger"
import { fetchAlchemyTransfers } from "@/lib/alchemy-transfers"

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
        history: [] // History disabled due to Alchemy free tier limitations
      }
    } catch (error) {
      logger.error(`Error fetching data for token #${tokenId}`, error)
      return null
    }
  }

  const fetchAllNFTs = async () => {
    logger.info("Starting NFT fetching using Alchemy Transfer API")
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

      logger.info("Step 2: Query Alchemy Transfer API (works with free tier)")
      
      // Use Alchemy's alchemy_getAssetTransfers API - works with free tier!
      const transfersToUser = await withTimeout(
        fetchAlchemyTransfers({
          contractAddress: CONTRACT_ADDRESS,
          toAddress: address,
        }),
        15000
      )

      logger.debug(`Found ${transfersToUser.length} transfers TO this address`)

      const transfersFromUser = await withTimeout(
        fetchAlchemyTransfers({
          contractAddress: CONTRACT_ADDRESS,
          fromAddress: address,
        }),
        15000
      )

      logger.debug(`Found ${transfersFromUser.length} transfers FROM this address`)

      const addressLower = address.toLowerCase()

      // Build ownership map by replaying transfer history
      type TransferEvent = {
        tokenId: number
        direction: "in" | "out"
        blockNum: string
      }

      const transferEvents: TransferEvent[] = []

      // Track inbound transfers
      transfersToUser.forEach((transfer) => {
        if (transfer.tokenId !== null) {
          transferEvents.push({
            tokenId: transfer.tokenId,
            direction: "in",
            blockNum: transfer.blockNum
          })
        }
      })

      // Track outbound transfers (excluding garden deposits)
      transfersFromUser.forEach((transfer) => {
        if (transfer.tokenId !== null) {
          // Don't count garden deposits as "sent away"
          if (transfer.to.toLowerCase() === GARDEN_CONTRACT_ADDRESS.toLowerCase()) {
            return
          }
          // Don't count self-transfers
          if (transfer.to.toLowerCase() === addressLower) {
            return
          }
          transferEvents.push({
            tokenId: transfer.tokenId,
            direction: "out",
            blockNum: transfer.blockNum
          })
        }
      })

      // Sort by block number to replay history in order
      transferEvents.sort((a, b) => {
        const blockA = parseInt(a.blockNum, 16)
        const blockB = parseInt(b.blockNum, 16)
        return blockA - blockB
      })

      const ownedTokenSet = new Set<number>()
      transferEvents.forEach(event => {
        if (event.direction === "in") {
          ownedTokenSet.add(event.tokenId)
        } else {
          ownedTokenSet.delete(event.tokenId)
        }
      })

      const ownedTokenIds = Array.from(ownedTokenSet).sort((a, b) => a - b)

      logger.debug(`Currently owns ${ownedTokenIds.length} tokens`, {
        transferEventCount: transferEvents.length,
        owned: ownedTokenIds
      })

      if (ownedTokenIds.length === 0) {
        logger.info("No tokens currently owned")
        setNFTs([])
        setLoading(false)
        return
      }

      logger.info("Step 3: Using Multicall to batch fetch NFT data (optimized)")
      
      // Build multicall contracts for circleData and tokenURI
      const circleDataContracts = ownedTokenIds.map(tokenId => ({
        address: CONTRACT_ADDRESS,
        abi: rabbitHoleAbi,
        functionName: "circleData" as const,
        args: [BigInt(tokenId)],
      }))
      
      const tokenURIContracts = ownedTokenIds.map(tokenId => ({
        address: CONTRACT_ADDRESS,
        abi: rabbitHoleAbi,
        functionName: "tokenURI" as const,
        args: [BigInt(tokenId)],
      }))
      
      // Execute both multicalls (2 RPC calls instead of N*2)
      const [circleDataResults, tokenURIResults] = await Promise.all([
        withTimeout(readContracts(wagmiConfig, { contracts: circleDataContracts }), 10000),
        withTimeout(readContracts(wagmiConfig, { contracts: tokenURIContracts }), 10000),
      ])
      
      const now = Math.floor(Date.now() / 1000)
      const validNFTs: NFT[] = []
      
      for (let i = 0; i < ownedTokenIds.length; i++) {
        const tokenId = ownedTokenIds[i]
        const circleResult = circleDataResults[i]
        const uriResult = tokenURIResults[i]
        
        if (circleResult.status !== 'success') {
          logger.warn(`Failed to fetch circleData for token #${tokenId}`)
          continue
        }
        
        const tokenInfo = circleResult.result as any
        const size = Number(tokenInfo[0])
        const lastGrowTime = Number(tokenInfo[1])
        const lastShrinkTime = Number(tokenInfo[2])
        
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
          id: tokenId,
          size,
          minSize: 1,
          maxSize: 1000,
          lastGrowTime,
          lastShrinkTime,
          growCooldownRemaining: Math.max(0, (lastGrowTime + DAILY_COOLDOWN) - now),
          shrinkCooldownRemaining: Math.max(0, (lastShrinkTime + DAILY_COOLDOWN) - now),
          imageUrl,
          history: []
        })
      }

      logger.success(`Loaded ${validNFTs.length} NFTs in just 2 RPC calls (Multicall)`)
      logger.debug("NFTs loaded", { nfts: validNFTs.map(nft => `#${nft.id} (size: ${nft.size})`) })

      setNFTs(validNFTs)
      setError(null)

    } catch (error: any) {
      logger.error("Failed to fetch NFTs", error)
      
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
