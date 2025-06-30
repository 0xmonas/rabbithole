"use client"

import { writeContract } from "@wagmi/core"
import { wagmiConfig, CONTRACT_ADDRESS } from "@/config/wagmi"
import { useTransactionModal } from "./use-transaction-modal"
import { logger } from "@/lib/logger"

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

export function useNFTActions(onSuccess?: () => void | Promise<void>) {
  const transactionModal = useTransactionModal()

  const growNFT = async (tokenId: number) => {
    return await transactionModal.executeTransaction(
      `Growing Circle #${tokenId}`,
      async () => {
        const hash = await writeContract(wagmiConfig, {
          address: CONTRACT_ADDRESS,
          abi: rabbitHoleActionsAbi,
          functionName: "grow",
          args: [BigInt(tokenId)],
        })
        logger.success(`Growing NFT #${tokenId}`)
        return hash
      },
      onSuccess
    )
  }

  const shrinkNFT = async (tokenId: number) => {
    return await transactionModal.executeTransaction(
      `Shrinking Circle #${tokenId}`,
      async () => {
        const hash = await writeContract(wagmiConfig, {
          address: CONTRACT_ADDRESS,
          abi: rabbitHoleActionsAbi,
          functionName: "shrink",
          args: [BigInt(tokenId)],
        })
        logger.success(`Shrinking NFT #${tokenId}`)
        return hash
      },
      onSuccess
    )
  }

  const mergeNFTs = async (tokenIds: number[]) => {
    return await transactionModal.executeTransaction(
      `Merging Circles #${tokenIds.join(", ")}`,
      async () => {
        const hash = await writeContract(wagmiConfig, {
          address: CONTRACT_ADDRESS,
          abi: rabbitHoleActionsAbi,
          functionName: "mergeTokens",
          args: [tokenIds.map((id) => BigInt(id))],
        })
        logger.success(`Merging NFTs: ${tokenIds.join(", ")}`)
        return hash
      },
      onSuccess
    )
  }

  return {
    growNFT,
    shrinkNFT,
    mergeNFTs,
    transactionModal,
  }
}

