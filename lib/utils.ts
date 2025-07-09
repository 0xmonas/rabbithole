import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function getOpenSeaUrl(tokenId: number): string {
  // Correct Shape L2 OpenSea format: /item/shape/CONTRACT_ADDRESS/TOKEN_ID
  const contractAddress = "0xca38813d69409e4e50f1411a0cab2570e570c75a"
  return `https://opensea.io/item/shape/${contractAddress}/${tokenId}`
}

export function getOpenSeaUserUrl(userAddress: string): string {
  // OpenSea user profile format: opensea.io/USER_ADDRESS
  return `https://opensea.io/${userAddress}`
}
