"use client"

import { useState } from "react"
import type { NFT } from "@/types/nft"
import { ArrowUp, ArrowDown, Clock, Activity, Send, Zap, Palette, ExternalLink } from "lucide-react"
import { cn } from "@/lib/utils"
import { useNFTActions } from "@/hooks/use-nft-actions"
import { TokenImage } from "@/components/token-image"

interface NFTDetailProps {
  nft: NFT | undefined
  onGrow: () => void
  onShrink: () => void
}

// 🎯 ELITE UI: Action icons mapping with consistent colors
const getActionIcon = (action: string) => {
  if (action.includes('📈') || action.includes('Grown')) return <ArrowUp size={12} className="mr-2 text-green-600" />
  if (action.includes('📉') || action.includes('Shrunk')) return <ArrowDown size={12} className="mr-2 text-red-600" />
  if (action.includes('Minted')) return <Zap size={12} className="mr-2 text-blue-600" />
  if (action.includes('🌱') || action.includes('Planted')) return <div className="mr-2 text-green-500 text-xs">🌱</div>
  if (action.includes('🌳') || action.includes('Uprooted')) return <div className="mr-2 text-brown-600 text-xs">🌳</div>
  if (action.includes('Transferred')) return <Send size={12} className="mr-2 text-blue-500" />
  if (action.includes('🔄') || action.includes('Merged') || action.includes('merging')) return <Activity size={12} className="mr-2 text-purple-600" />
  if (action.includes('🎨') || action.includes('Special metadata')) return <Palette size={12} className="mr-2 text-yellow-600" />
  return <Activity size={12} className="mr-2 text-gray-600" />
}

// 🔗 ShapeScan transaction link
const getShapeScanUrl = (txHash: string) => {
  return `https://shapescan.xyz/tx/${txHash}`
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
              <TokenImage
                tokenId={nft.id}
                imageUrl={nft.imageUrl}
                size={nft.size}
                maxSize={nft.maxSize}
                containerStyle={{
                  width: "300px",
                  height: "300px",
                  border: "2px solid black",
                  borderRadius: "4px",
                  padding: "16px",
                  backgroundColor: "white",
                }}
                previewSize="large"
                showOpenSeaLink={true}
              />
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

            {/* 🔥 ELITE ACTION HISTORY DISPLAY with ShapeScan Links */}
            <div className="border border-black md:col-span-2">
              <div className="border-b border-black p-2 bg-gray-100 flex justify-between items-center">
                <div className="uppercase font-bold">ON-CHAIN ACTION HISTORY</div>
                <div className="text-xs text-gray-600">
                  {nft.history?.length || 0} events
                </div>
              </div>
              <div className="p-3 max-h-80 overflow-y-auto">
                {nft.history && nft.history.length > 0 ? (
                  <div className="space-y-2">
                    {/* 🎯 REVERSE ORDER: Most recent first */}
                    {[...nft.history].reverse().map((event, index) => (
                      <div 
                        key={index} 
                        className="flex items-start justify-between p-2 border border-gray-200 rounded hover:bg-gray-50 transition-colors group"
                      >
                        <div className="flex items-start flex-1">
                          {getActionIcon(event.action)}
                          <div className="flex-1">
                            <div className="text-sm text-gray-900">{event.action}</div>
                          </div>
                        </div>
                        <div className="flex items-center ml-4 space-x-2">
                          <div className="text-xs text-gray-500 text-right">
                            <div>{new Date(event.timestamp * 1000).toLocaleDateString()}</div>
                            <div className="text-[10px]">{new Date(event.timestamp * 1000).toLocaleTimeString()}</div>
                          </div>
                          {/* 🔗 ShapeScan Link */}
                          <a 
                            href={getShapeScanUrl(event.txHash)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-gray-200 rounded"
                            title="View on ShapeScan"
                          >
                            <ExternalLink size={12} className="text-gray-600 hover:text-black" />
                          </a>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center text-gray-500 py-8">
                    <Activity size={24} className="mx-auto mb-2 opacity-50" />
                    <div className="font-medium">No action history available</div>
                    <div className="text-xs">This circle hasn't performed any actions yet</div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

