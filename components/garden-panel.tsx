"use client"

import { useState } from "react"
import type { NFT } from "@/types/nft"
import { cn } from "@/lib/utils"
import { useGarden } from "@/hooks/use-garden"
import { Sprout, ArrowUpFromLine, ArrowDownToLine, Zap, Clock, Leaf } from "lucide-react"

interface GardenPanelProps {
  address: string | null
  userNFTs: NFT[]
  onRefreshUserNFTs: () => void
}

export function GardenPanel({ address, userNFTs, onRefreshUserNFTs }: GardenPanelProps) {
  const { 
    gardenNFTs, 
    loading, 
    plantSeeds, 
    uproot, 
    workGarden, 
    refreshGarden, 
    isActionPending, 
    actionError 
  } = useGarden(address)
  
  const [selectedAction, setSelectedAction] = useState<"plant" | "uproot" | "work">("plant")

  const handlePlantSeeds = async () => {
    const success = await plantSeeds(10000) // Check up to token ID 10000
    if (success) {
      await refreshGarden()
      onRefreshUserNFTs() // Refresh user NFTs since they'll be transferred
    }
  }

  const handleUproot = async () => {
    const success = await uproot()
    if (success) {
      await refreshGarden()
      onRefreshUserNFTs() // Refresh user NFTs since they'll be transferred back
    }
  }

  const handleWorkGarden = async () => {
    const success = await workGarden(10000)
    if (success) {
      await refreshGarden()
    }
  }

  const formatCooldown = (seconds: number) => {
    if (seconds === 0) return "Ready"
    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    return `${hours}h ${minutes}m`
  }

  // Calculate garden stats
  const totalGardenSize = gardenNFTs.reduce((sum, nft) => sum + nft.size, 0)
  const readyToGrow = gardenNFTs.filter(nft => nft.growCooldownRemaining === 0).length
  const avgSize = gardenNFTs.length > 0 ? Math.round(totalGardenSize / gardenNFTs.length) : 0

  return (
    <div className="flex-1 flex flex-col">
      <div className="border-b border-black p-2 flex justify-between items-center">
        <div className="font-bold flex items-center">
          <Sprout size={16} className="mr-2" />
          RABBIT HOLE GARDEN
        </div>
        <div className="text-xs text-gray-600">
          Contract: 0x2940...5c4
        </div>
      </div>

      <div className="flex-1 p-4 overflow-y-auto">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
          
          {/* Garden Statistics */}
          <div className="border border-black">
            <div className="border-b border-black p-2 bg-gray-100">
              <div className="uppercase font-bold">GARDEN STATS</div>
            </div>
            <div className="p-3">
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="text-gray-500">Planted Circles</div>
                <div className="font-mono">{gardenNFTs.length}</div>

                <div className="text-gray-500">Total Size</div>
                <div className="font-mono">{totalGardenSize}</div>

                <div className="text-gray-500">Avg Size</div>
                <div className="font-mono">{avgSize}</div>

                <div className="text-gray-500">Ready to Grow</div>
                <div className="font-mono text-green-600">{readyToGrow}</div>
              </div>
            </div>
          </div>

          {/* User Wallet Stats */}
          <div className="border border-black">
            <div className="border-b border-black p-2 bg-gray-100">
              <div className="uppercase font-bold">WALLET STATS</div>
            </div>
            <div className="p-3">
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="text-gray-500">In Wallet</div>
                <div className="font-mono">{userNFTs.length}</div>

                <div className="text-gray-500">In Garden</div>
                <div className="font-mono">{gardenNFTs.length}</div>

                <div className="text-gray-500">Total Owned</div>
                <div className="font-mono">{userNFTs.length + gardenNFTs.length}</div>

                <div className="text-gray-500">Garden %</div>
                <div className="font-mono">
                  {userNFTs.length + gardenNFTs.length > 0 
                    ? Math.round((gardenNFTs.length / (userNFTs.length + gardenNFTs.length)) * 100)
                    : 0}%
                </div>
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="border border-black">
            <div className="border-b border-black p-2 bg-gray-100">
              <div className="uppercase font-bold">QUICK ACTIONS</div>
            </div>
            <div className="p-3 space-y-2">
              <button
                onClick={handlePlantSeeds}
                disabled={userNFTs.length === 0 || isActionPending}
                className={cn(
                  "w-full border border-black px-3 py-2 text-xs flex items-center justify-center",
                  userNFTs.length > 0 && !isActionPending
                    ? "bg-green-500 text-white hover:bg-green-600"
                    : "bg-gray-200 text-gray-500 cursor-not-allowed"
                )}
              >
                <ArrowDownToLine size={12} className="mr-2" />
                PLANT ALL ({userNFTs.length})
              </button>

              <button
                onClick={handleUproot}
                disabled={gardenNFTs.length === 0 || isActionPending}
                className={cn(
                  "w-full border border-black px-3 py-2 text-xs flex items-center justify-center",
                  gardenNFTs.length > 0 && !isActionPending
                    ? "bg-orange-500 text-white hover:bg-orange-600"
                    : "bg-gray-200 text-gray-500 cursor-not-allowed"
                )}
              >
                <ArrowUpFromLine size={12} className="mr-2" />
                UPROOT ALL ({gardenNFTs.length})
              </button>

              <button
                onClick={handleWorkGarden}
                disabled={readyToGrow === 0 || isActionPending}
                className={cn(
                  "w-full border border-black px-3 py-2 text-xs flex items-center justify-center",
                  readyToGrow > 0 && !isActionPending
                    ? "bg-blue-500 text-white hover:bg-blue-600"
                    : "bg-gray-200 text-gray-500 cursor-not-allowed"
                )}
              >
                <Zap size={12} className="mr-2" />
                WORK GARDEN ({readyToGrow})
              </button>
            </div>
          </div>
        </div>

        {/* Action Error */}
        {actionError && (
          <div className="mb-6 p-3 border border-red-500 bg-red-50 text-red-600 text-xs">
            {actionError}
          </div>
        )}

        {/* Garden NFTs Display */}
        <div className="border border-black">
          <div className="border-b border-black p-2 bg-gray-100">
            <div className="uppercase font-bold flex items-center">
              <Leaf size={14} className="mr-2" />
              PLANTED CIRCLES ({gardenNFTs.length})
            </div>
          </div>
          <div className="p-3">
            {loading ? (
              <div className="text-center text-gray-500 py-8">
                <div className="animate-pulse flex justify-center mb-2">
                  <Sprout size={24} className="opacity-50" />
                </div>
                <div className="font-medium">Loading garden...</div>
                <div className="text-xs">Checking planted circles</div>
              </div>
            ) : gardenNFTs.length === 0 ? (
              <div className="text-center text-gray-500 py-8">
                <Sprout size={24} className="mx-auto mb-2 opacity-50" />
                <div className="font-medium">No circles planted</div>
                <div className="text-xs">Plant your circles to start auto-growing them</div>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {gardenNFTs.map((nft) => (
                  <div key={nft.id} className="border border-black p-3 bg-green-50">
                    <div className="flex items-center justify-between mb-2">
                      <div className="font-bold text-xs">rh #{nft.id}</div>
                      <div className="text-xs text-gray-600">Size: {nft.size}</div>
                    </div>

                    {/* Visual Circle */}
                    <div className="mb-3 flex justify-center">
                      <div
                        className="border border-black bg-white"
                        style={{ width: "60px", height: "60px" }}
                      >
                        <div className="w-full h-full flex items-center justify-center">
                          <div
                            className="rounded-full bg-black transition-all duration-500"
                            style={{
                              width: `${(nft.size / nft.maxSize) * 100}%`,
                              height: `${(nft.size / nft.maxSize) * 100}%`,
                            }}
                          ></div>
                        </div>
                      </div>
                    </div>

                    {/* Status */}
                    <div className="text-xs">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-gray-500">Growth Status</span>
                        <div className="flex items-center">
                          <Clock size={10} className="mr-1" />
                          <span className={cn(
                            nft.growCooldownRemaining === 0 ? "text-green-600 font-bold" : "text-gray-600"
                          )}>
                            {formatCooldown(nft.growCooldownRemaining)}
                          </span>
                        </div>
                      </div>
                      
                      <div className="w-full bg-gray-200 h-1 border border-black">
                        <div 
                          className={cn(
                            "h-full transition-all duration-500",
                            nft.growCooldownRemaining === 0 ? "bg-green-500" : "bg-yellow-500"
                          )}
                          style={{ width: `${(nft.size / nft.maxSize) * 100}%` }}
                        ></div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Garden Info */}
        <div className="mt-6 border border-black">
          <div className="border-b border-black p-2 bg-gray-100">
            <div className="uppercase font-bold">HOW GARDEN WORKS</div>
          </div>
          <div className="p-4 text-xs space-y-3">
            <div>
              <div className="font-bold mb-1">🌱 PLANT SEEDS</div>
              <p className="text-gray-600">
                Transfer your circles to the Garden contract for automated growth. Your circles will be safely stored and you can retrieve them anytime.
              </p>
            </div>
            
            <div>
              <div className="font-bold mb-1">⚡ WORK GARDEN</div>
              <p className="text-gray-600">
                Automatically grow all eligible circles in the garden (those past their 24h cooldown). Anyone can call this function to help the community!
              </p>
            </div>
            
            <div>
              <div className="font-bold mb-1">🔄 UPROOT</div>
              <p className="text-gray-600">
                Retrieve all your planted circles back to your wallet. They'll return with any growth that happened while in the garden.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
} 