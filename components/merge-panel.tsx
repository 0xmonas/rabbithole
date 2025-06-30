"use client"

import { useState, useEffect } from "react"
import type { NFT } from "@/types/nft"
import { cn } from "@/lib/utils"
import { useNFTActions } from "@/hooks/use-nft-actions"

interface MergePanelProps {
  nfts: NFT[]
  onMergeComplete: () => void
  onToggleMergeMode: () => void
  mergeMode: boolean
  selectedNFTsForMerge: number[]  // 🔥 Shared merge selection from parent
}

export function MergePanel({ 
  nfts, 
  onMergeComplete, 
  onToggleMergeMode, 
  mergeMode,
  selectedNFTsForMerge 
}: MergePanelProps) {
  const [mergePreview, setMergePreview] = useState<{ size: number; remainder: number }>({ size: 0, remainder: 0 })
  const { mergeNFTs, isActionPending, actionError } = useNFTActions()

  // Calculate the merge preview whenever selected NFTs change
  useEffect(() => {
    if (selectedNFTsForMerge.length === 0) {
      setMergePreview({ size: 0, remainder: 0 })
      return
    }

    const selectedNFTObjects = nfts.filter((nft) => selectedNFTsForMerge.includes(nft.id))
    const totalSize = selectedNFTObjects.reduce((sum, nft) => sum + nft.size, 0)
    const maxSize = 1000 // From the contract

    if (totalSize > maxSize) {
      setMergePreview({
        size: maxSize,
        remainder: totalSize - maxSize,
      })
    } else {
      setMergePreview({
        size: totalSize,
        remainder: 0,
      })
    }
  }, [selectedNFTsForMerge, nfts])

  const handleMerge = async () => {
    if (selectedNFTsForMerge.length < 2) return

    await mergeNFTs(selectedNFTsForMerge)
    onMergeComplete()
  }

  return (
    <div className="flex-1 flex flex-col">
      <div className="border-b border-black p-2 flex justify-between items-center">
        <div className="font-bold">MERGE CIRCLES</div>
        <button
          onClick={onToggleMergeMode}
          className={cn("border border-black px-3 py-1", mergeMode ? "bg-black text-white" : "hover:bg-gray-100")}
        >
          {mergeMode ? "CANCEL SELECTION" : "SELECT CIRCLES"}
        </button>
      </div>

      <div className="flex-1 p-4 overflow-y-auto">
        {!mergeMode ? (
          <div className="flex flex-col items-center justify-center h-full">
            <div className="text-center mb-8">
              <h3 className="font-bold mb-2">Merge Your Circles</h3>
              <p className="text-gray-500 max-w-md mx-auto">
                Combine multiple circles to create a new, larger circle. If the combined size exceeds 1000, a remainder
                circle will be created.
              </p>
            </div>
            <button
              onClick={onToggleMergeMode}
              className="border border-black px-4 py-2 bg-black text-white hover:bg-gray-800"
            >
              START SELECTING CIRCLES
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="border border-black">
              <div className="border-b border-black p-2 bg-gray-100">
                <div className="uppercase font-bold">SELECTED CIRCLES</div>
              </div>
              <div className="p-3">
                {selectedNFTsForMerge.length === 0 ? (
                  <div className="text-center text-gray-500 py-4">
                    No circles selected. Select at least 2 circles to merge.
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-2">
                    {selectedNFTsForMerge.map((id) => {
                      const nft = nfts.find((n) => n.id === id)
                      if (!nft) return null

                      return (
                        <div key={id} className="border border-black p-2 flex items-center justify-between">
                          <div className="flex items-center">
                            <div className="w-6 h-6 border border-black flex items-center justify-center mr-2">
                              <div
                                className="rounded-full bg-black"
                                style={{
                                  width: `${Math.max(20, (nft.size / 1000) * 100)}%`,
                                  height: `${Math.max(20, (nft.size / 1000) * 100)}%`,
                                }}
                              ></div>
                            </div>
                            <div>
                              <div className="text-[10px] font-bold">#{nft.id}</div>
                              <div className="text-[8px]">Size: {nft.size}</div>
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            </div>

            <div className="border border-black">
              <div className="border-b border-black p-2 bg-gray-100">
                <div className="uppercase font-bold">MERGE PREVIEW</div>
              </div>
              <div className="p-3">
                <div className="mb-4">
                  <div className="text-[10px] text-gray-500 mb-1">TOTAL SIZE</div>
                  <div className="text-xl font-bold">
                    {selectedNFTsForMerge.reduce((sum, id) => {
                      const nft = nfts.find((n) => n.id === id)
                      return sum + (nft?.size || 0)
                    }, 0)}
                  </div>
                </div>

                <div className="mb-4">
                  <div className="text-[10px] text-gray-500 mb-1">NEW CIRCLE SIZE</div>
                  <div className="text-xl font-bold">{mergePreview.size}</div>
                </div>

                {mergePreview.remainder > 0 && (
                  <div className="mb-4">
                    <div className="text-[10px] text-gray-500 mb-1">REMAINDER CIRCLE SIZE</div>
                    <div className="text-xl font-bold">{mergePreview.remainder}</div>
                  </div>
                )}

                <div className="mt-6">
                  <button
                    onClick={handleMerge}
                    disabled={selectedNFTsForMerge.length < 2 || isActionPending}
                    className={cn(
                      "w-full border border-black px-4 py-2",
                      selectedNFTsForMerge.length >= 2 && !isActionPending
                        ? "bg-black text-white hover:bg-gray-800"
                        : "bg-gray-200 text-gray-500 cursor-not-allowed",
                    )}
                  >
                    {isActionPending ? "MERGING..." : "MERGE SELECTED CIRCLES"}
                  </button>
                </div>

                {actionError && (
                  <div className="mt-4 p-2 border border-red-500 bg-red-50 text-red-600">{actionError}</div>
                )}
              </div>
            </div>

            <div className="md:col-span-2 border border-black">
              <div className="border-b border-black p-2 bg-gray-100">
                <div className="uppercase font-bold">VISUAL PREVIEW</div>
              </div>
              <div className="p-4 flex flex-col md:flex-row items-center justify-center gap-8">
                <div>
                  <div className="text-center mb-2 font-bold">SELECTED CIRCLES</div>
                  <div className="flex flex-wrap gap-2 justify-center">
                    {selectedNFTsForMerge.map((id) => {
                      const nft = nfts.find((n) => n.id === id)
                      if (!nft) return null

                      return (
                        <div
                          key={id}
                          className="border border-black p-2 bg-white"
                          style={{ width: "60px", height: "60px" }}
                        >
                          <div className="w-full h-full flex items-center justify-center">
                            <div
                              className="rounded-full bg-black"
                              style={{
                                width: `${(nft.size / nft.maxSize) * 100}%`,
                                height: `${(nft.size / nft.maxSize) * 100}%`,
                              }}
                            ></div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>

                {selectedNFTsForMerge.length >= 2 && (
                  <>
                    <div className="text-2xl font-bold">=</div>
                    <div>
                      <div className="text-center mb-2 font-bold">RESULT</div>
                      <div className="flex gap-4">
                        <div>
                          <div className="text-center text-[10px] mb-1">NEW CIRCLE</div>
                          <div className="border border-black p-2 bg-white" style={{ width: "80px", height: "80px" }}>
                            <div className="w-full h-full flex items-center justify-center">
                              <div
                                className="rounded-full bg-black"
                                style={{
                                  width: `${(mergePreview.size / 1000) * 100}%`,
                                  height: `${(mergePreview.size / 1000) * 100}%`,
                                }}
                              ></div>
                            </div>
                          </div>
                        </div>

                        {mergePreview.remainder > 0 && (
                          <div>
                            <div className="text-center text-[10px] mb-1">REMAINDER</div>
                            <div className="border border-black p-2 bg-white" style={{ width: "80px", height: "80px" }}>
                              <div className="w-full h-full flex items-center justify-center">
                                <div
                                  className="rounded-full bg-black"
                                  style={{
                                    width: `${(mergePreview.remainder / 1000) * 100}%`,
                                    height: `${(mergePreview.remainder / 1000) * 100}%`,
                                  }}
                                ></div>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

