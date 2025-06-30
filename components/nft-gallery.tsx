"use client"

import { useState } from "react"
import type { NFT } from "@/types/nft"
import { cn } from "@/lib/utils"

interface NFTGalleryProps {
  nfts: NFT[]
  loading: boolean
  selectedNFT: number | null
  onSelectNFT: (id: number) => void
  mergeMode: boolean
}

export function NFTGallery({ nfts, loading, selectedNFT, onSelectNFT, mergeMode }: NFTGalleryProps) {
  const [selectedForMerge, setSelectedForMerge] = useState<number[]>([])

  const toggleNFTForMerge = (id: number) => {
    if (selectedForMerge.includes(id)) {
      setSelectedForMerge(selectedForMerge.filter((nftId) => nftId !== id))
    } else {
      setSelectedForMerge([...selectedForMerge, id])
    }
  }

  if (loading) {
    return (
      <div className="p-4 flex flex-col items-center justify-center h-full">
        <div className="animate-pulse flex space-x-4">
          <div className="rounded-full bg-gray-200 h-12 w-12"></div>
          <div className="flex-1 space-y-4 py-1">
            <div className="h-4 bg-gray-200 rounded w-3/4"></div>
            <div className="space-y-2">
              <div className="h-4 bg-gray-200 rounded"></div>
              <div className="h-4 bg-gray-200 rounded w-5/6"></div>
            </div>
          </div>
        </div>
        <p className="mt-4 text-gray-500">Loading your circles...</p>
      </div>
    )
  }

  if (nfts.length === 0) {
    return (
      <div className="p-4 text-center">
        <p className="text-gray-500">No circles found in your wallet.</p>
      </div>
    )
  }

  return (
    <div className="divide-y divide-black">
      {nfts.map((nft) => (
        <div
          key={nft.id}
          className={cn(
            "p-3 cursor-pointer hover:bg-gray-100",
            selectedNFT === nft.id && !mergeMode ? "bg-gray-100" : "",
            selectedForMerge.includes(nft.id) && mergeMode ? "bg-gray-200" : "",
          )}
          onClick={() => {
            if (mergeMode) {
              toggleNFTForMerge(nft.id)
            } else {
              onSelectNFT(nft.id)
            }
          }}
        >
          <div className="flex items-center space-x-3">
            <div className="relative">
              <div
                className="w-10 h-10 border border-black flex items-center justify-center"
                style={{
                  boxShadow: "2px 2px 0px 0px rgba(0,0,0,0.3)",
                }}
              >
                <div
                  className="rounded-full bg-black"
                  style={{
                    width: `${Math.max(20, (nft.size / 1000) * 100)}%`,
                    height: `${Math.max(20, (nft.size / 1000) * 100)}%`,
                  }}
                ></div>
              </div>
              {mergeMode && (
                <div
                  className={cn(
                    "absolute -top-1 -right-1 w-4 h-4 border border-black",
                    selectedForMerge.includes(nft.id) ? "bg-black" : "bg-white",
                  )}
                >
                  {selectedForMerge.includes(nft.id) && (
                    <div className="text-white text-[8px] flex items-center justify-center h-full">✓</div>
                  )}
                </div>
              )}
            </div>
            <div>
              <div className="font-bold">rh #{nft.id}</div>
              <div className="text-[10px] text-gray-600">
                Size: {nft.size}/{nft.maxSize}
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

