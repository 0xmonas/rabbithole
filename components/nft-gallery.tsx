"use client"

import { useState } from "react"
import type { NFT } from "@/types/nft"
import { cn } from "@/lib/utils"
import { OpenSeaRedirect } from "@/components/opensea-redirect"
import { TokenImage } from "@/components/token-image"

interface NFTGalleryProps {
  nfts: NFT[]
  loading: boolean
  selectedNFT: number | null
  onSelectNFT: (id: number) => void
  mergeMode: boolean
  selectedNFTsForMerge?: number[]
  onToggleNFTForMerge?: (id: number) => void
}

export function NFTGallery({ 
  nfts, 
  loading, 
  selectedNFT, 
  onSelectNFT, 
  mergeMode,
  selectedNFTsForMerge = [],
  onToggleNFTForMerge 
}: NFTGalleryProps) {

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
      <div className="p-2">
        <OpenSeaRedirect />
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
            selectedNFTsForMerge.includes(nft.id) && mergeMode ? "bg-gray-200" : "",
          )}
          onClick={() => {
            if (mergeMode && onToggleNFTForMerge) {
              onToggleNFTForMerge(nft.id)
            } else {
              onSelectNFT(nft.id)
            }
          }}
        >
          <div className="flex items-center space-x-3">
            <div className="relative">
              <TokenImage
                tokenId={nft.id}
                imageUrl={nft.imageUrl}
                size={nft.size}
                maxSize={nft.maxSize}
                containerStyle={{
                  width: "40px",
                  height: "40px",
                  border: "1px solid black",
                  boxShadow: "2px 2px 0px 0px rgba(0,0,0,0.3)",
                }}
                previewSize="medium"
                showOpenSeaLink={!mergeMode} // Don't show OpenSea link in merge mode
              />
              {mergeMode && (
                <div
                  className={cn(
                    "absolute -top-1 -right-1 w-4 h-4 border border-black",
                    selectedNFTsForMerge.includes(nft.id) ? "bg-black" : "bg-white",
                  )}
                >
                  {selectedNFTsForMerge.includes(nft.id) && (
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

