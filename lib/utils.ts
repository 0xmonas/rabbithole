import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function getOpenSeaUrl(tokenId: number): string {
  const baseUrl = process.env.NEXT_PUBLIC_OPENSEA_URL || "https://opensea.io/collection/rabbit-hole-shape"
  return `${baseUrl}/${tokenId}`
}
