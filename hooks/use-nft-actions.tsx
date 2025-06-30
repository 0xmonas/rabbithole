"use client"

import { useState } from "react"
import { writeContract } from "@wagmi/core"
import { wagmiConfig, CONTRACT_ADDRESS } from "@/config/wagmi"

// ABI for the RabbitHole contract actions
const rabbitHoleActionsAbi = [
  {
    inputs: [{ internalType: "uint256", name: "tokenId", type: "uint256" }],
    name: "grow",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [{ internalType: "uint256", name: "tokenId", type: "uint256" }],
    name: "shrink",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [{ internalType: "uint256[]", name: "tokenIds", type: "uint256[]" }],
    name: "mergeTokens",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
] as const

export function useNFTActions() {
  const [isActionPending, setIsActionPending] = useState(false)
  const [actionError, setActionError] = useState<string | null>(null)

  const growNFT = async (tokenId: number) => {
    setIsActionPending(true)
    setActionError(null)

    try {
      const hash = await writeContract(wagmiConfig, {
        address: CONTRACT_ADDRESS,
        abi: rabbitHoleActionsAbi,
        functionName: "grow",
        args: [BigInt(tokenId)],
      })

      console.log(`Growing NFT #${tokenId}, transaction hash: ${hash}`)
      return true
    } catch (error: any) {
      console.error("Error growing NFT:", error)
      setActionError(error?.message || "Failed to grow circle. Please try again.")
      return false
    } finally {
      setIsActionPending(false)
    }
  }

  const shrinkNFT = async (tokenId: number) => {
    setIsActionPending(true)
    setActionError(null)

    try {
      const hash = await writeContract(wagmiConfig, {
        address: CONTRACT_ADDRESS,
        abi: rabbitHoleActionsAbi,
        functionName: "shrink",
        args: [BigInt(tokenId)],
      })

      console.log(`Shrinking NFT #${tokenId}, transaction hash: ${hash}`)
      return true
    } catch (error: any) {
      console.error("Error shrinking NFT:", error)
      setActionError(error?.message || "Failed to shrink circle. Please try again.")
      return false
    } finally {
      setIsActionPending(false)
    }
  }

  const mergeNFTs = async (tokenIds: number[]) => {
    setIsActionPending(true)
    setActionError(null)

    try {
      const hash = await writeContract(wagmiConfig, {
        address: CONTRACT_ADDRESS,
        abi: rabbitHoleActionsAbi,
        functionName: "mergeTokens",
        args: [tokenIds.map((id) => BigInt(id))],
      })

      console.log(`Merging NFTs: ${tokenIds.join(", ")}, transaction hash: ${hash}`)
      return true
    } catch (error: any) {
      console.error("Error merging NFTs:", error)
      setActionError(error?.message || "Failed to merge circles. Please try again.")
      return false
    } finally {
      setIsActionPending(false)
    }
  }

  return {
    growNFT,
    shrinkNFT,
    mergeNFTs,
    isActionPending,
    actionError,
  }
}

