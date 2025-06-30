"use client"

import { useState } from "react"
import type { NFT } from "@/types/nft"
import { ArrowUp, ArrowDown, Clock } from "lucide-react"
import { cn } from "@/lib/utils"
import { useNFTActions } from "@/hooks/use-nft-actions"

interface NFTDetailProps {
  nft: NFT | undefined
  onGrow: () => void
  onShrink: () => void
}

export function NFTDetail({ nft, onGrow, onShrink }: NFTDetailProps) {
  const [activeTab, setActiveTab] = useState<"VISUAL" | "DATA">("VISUAL")
  const { growNFT, shrinkNFT, isActionPending, actionError } = useNFTActions()

  const handleGrow = async () => {
    if (!nft) return
    await growNFT(nft.id)
    onGrow()
  }

  const handleShrink = async () => {
    if (!nft) return
    await shrinkNFT(nft.id)
    onShrink()
  }

  const canGrow = nft && nft.size < nft.maxSize && nft.growCooldownRemaining === 0
  const canShrink = nft && nft.size > nft.minSize && nft.shrinkCooldownRemaining === 0

  const formatCooldown = (seconds: number) => {
    if (seconds === 0) return "Ready"

    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)

    return `${hours}h ${minutes}m`
  }

  if (!nft) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center p-6">
          <div className="mb-4">
            <div className="w-24 h-24 rounded-full border-2 border-dashed border-gray-300 mx-auto flex items-center justify-center">
              <span className="text-gray-400">?</span>
            </div>
          </div>
          <h3 className="font-bold mb-2">No Circle Selected</h3>
          <p className="text-gray-500">Select a circle from the gallery to view details and interact with it.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 flex flex-col">
      <div className="border-b border-black p-2 flex">
        <div
          className={cn(
            "px-4 py-1 cursor-pointer",
            activeTab === "VISUAL" ? "bg-black text-white" : "hover:bg-gray-100",
          )}
          onClick={() => setActiveTab("VISUAL")}
        >
          VISUAL
        </div>
        <div
          className={cn("px-4 py-1 cursor-pointer", activeTab === "DATA" ? "bg-black text-white" : "hover:bg-gray-100")}
          onClick={() => setActiveTab("DATA")}
        >
          DATA
        </div>
      </div>

      <div className="flex-1 p-4 overflow-y-auto">
        {activeTab === "VISUAL" ? (
          <div className="flex flex-col items-center justify-center h-full">
            <div className="mb-6">
              <div className="text-center mb-2 font-bold">rh #{nft.id}</div>
              <div
                className="border-2 border-black rounded-sm p-4 bg-white"
                style={{ width: "300px", height: "300px" }}
              >
                <div className="w-full h-full flex items-center justify-center">
                  <div
                    className="rounded-full bg-black transition-all duration-500"
                    style={{
                      width: `${(nft.size / nft.maxSize) * 100}%`,
                      height: `${(nft.size / nft.maxSize) * 100}%`,
                      maxWidth: "100%",
                      maxHeight: "100%",
                    }}
                  ></div>
                </div>
              </div>
            </div>

            <div className="flex space-x-4 mb-4">
              <button
                onClick={handleGrow}
                disabled={!canGrow || isActionPending}
                className={cn(
                  "border border-black px-4 py-2 flex items-center",
                  canGrow && !isActionPending
                    ? "bg-black text-white hover:bg-gray-800"
                    : "bg-gray-200 text-gray-500 cursor-not-allowed",
                )}
              >
                <ArrowUp size={14} className="mr-2" /> GROW
              </button>
              <button
                onClick={handleShrink}
                disabled={!canShrink || isActionPending}
                className={cn(
                  "border border-black px-4 py-2 flex items-center",
                  canShrink && !isActionPending
                    ? "bg-black text-white hover:bg-gray-800"
                    : "bg-gray-200 text-gray-500 cursor-not-allowed",
                )}
              >
                <ArrowDown size={14} className="mr-2" /> SHRINK
              </button>
            </div>

            <div className="grid grid-cols-2 gap-4 w-full max-w-md">
              <div className="border border-black p-2">
                <div className="text-[10px] text-gray-500 mb-1">GROW COOLDOWN</div>
                <div className="flex items-center">
                  <Clock size={12} className="mr-1" />
                  <span>{formatCooldown(nft.growCooldownRemaining)}</span>
                </div>
              </div>
              <div className="border border-black p-2">
                <div className="text-[10px] text-gray-500 mb-1">SHRINK COOLDOWN</div>
                <div className="flex items-center">
                  <Clock size={12} className="mr-1" />
                  <span>{formatCooldown(nft.shrinkCooldownRemaining)}</span>
                </div>
              </div>
            </div>

            {actionError && (
              <div className="mt-4 p-2 border border-red-500 bg-red-50 text-red-600 max-w-md">{actionError}</div>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="border border-black">
              <div className="border-b border-black p-2 bg-gray-100">
                <div className="uppercase font-bold">CIRCLE PROPERTIES</div>
              </div>
              <div className="p-3">
                <div className="grid grid-cols-2 gap-2">
                  <div className="text-gray-500">ID</div>
                  <div className="font-mono">{nft.id}</div>

                  <div className="text-gray-500">Size</div>
                  <div className="font-mono">{nft.size}</div>

                  <div className="text-gray-500">Min Size</div>
                  <div className="font-mono">{nft.minSize}</div>

                  <div className="text-gray-500">Max Size</div>
                  <div className="font-mono">{nft.maxSize}</div>

                  <div className="text-gray-500">Last Grown</div>
                  <div className="font-mono">
                    {nft.lastGrowTime ? new Date(nft.lastGrowTime * 1000).toLocaleString() : "Never"}
                  </div>

                  <div className="text-gray-500">Last Shrunk</div>
                  <div className="font-mono">
                    {nft.lastShrinkTime ? new Date(nft.lastShrinkTime * 1000).toLocaleString() : "Never"}
                  </div>
                </div>
              </div>
            </div>

            <div className="border border-black">
              <div className="border-b border-black p-2 bg-gray-100">
                <div className="uppercase font-bold">PROGRESS</div>
              </div>
              <div className="p-3">
                <div className="mb-4">
                  <div className="text-[10px] text-gray-500 mb-1 flex justify-between">
                    <span>SIZE PROGRESS</span>
                    <span>
                      {nft.size}/{nft.maxSize}
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 h-2 border border-black">
                    <div className="bg-black h-full" style={{ width: `${(nft.size / nft.maxSize) * 100}%` }}></div>
                  </div>
                </div>

                <div className="mb-4">
                  <div className="text-[10px] text-gray-500 mb-1">SIZE PERCENTAGE</div>
                  <div className="text-xl font-bold">{((nft.size / nft.maxSize) * 100).toFixed(1)}%</div>
                </div>

                <div>
                  <div className="text-[10px] text-gray-500 mb-1">REMAINING TO MAX</div>
                  <div className="text-xl font-bold">{nft.maxSize - nft.size}</div>
                </div>
              </div>
            </div>

            <div className="border border-black md:col-span-2">
              <div className="border-b border-black p-2 bg-gray-100">
                <div className="uppercase font-bold">ACTIONS HISTORY</div>
              </div>
              <div className="p-3 max-h-40 overflow-y-auto">
                {nft.history && nft.history.length > 0 ? (
                  <div className="divide-y divide-gray-200">
                    {nft.history.map((event, index) => (
                      <div key={index} className="py-2 flex justify-between">
                        <div className="flex items-center">
                          {event.action === "grow" ? (
                            <ArrowUp size={12} className="mr-1" />
                          ) : (
                            <ArrowDown size={12} className="mr-1" />
                          )}
                          <span className="capitalize">{event.action}</span>
                        </div>
                        <div className="text-[10px] text-gray-500">
                          {new Date(event.timestamp * 1000).toLocaleString()}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center text-gray-500 py-4">No action history available</div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

