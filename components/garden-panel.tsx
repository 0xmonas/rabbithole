"use client"

import { useState } from "react"
import type { NFT } from "@/types/nft"
import { cn } from "@/lib/utils"
import { useGarden } from "@/hooks/use-garden"
import { TransactionModal } from "@/components/transaction-modal"
import { TokenImage } from "@/components/token-image"
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
    transactionModal 
  } = useGarden(address, async () => {
    // Refresh both garden and user NFTs after successful transaction
    await refreshGarden()
    onRefreshUserNFTs()
  })
  
  const [selectedAction, setSelectedAction] = useState<"plant" | "uproot" | "work">("plant")

  const handlePlantSeeds = async () => {
    await plantSeeds(10000) // Check up to token ID 10000
  }

  const handleUproot = async () => {
    await uproot()
  }

  const handleWorkGarden = async () => {
    await workGarden(10000)
  }

  const isTransactionPending = transactionModal.isOpen && transactionModal.step !== "idle"

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
                <div className="text-gray-500">Your Planted</div>
                <div className="font-mono">{gardenNFTs.length}</div>

                <div className="text-gray-500">Your Total Size</div>
                <div className="font-mono">{totalGardenSize}</div>

                <div className="text-gray-500">Your Avg Size</div>
                <div className="font-mono">{avgSize}</div>

                <div className="text-gray-500">Your Ready to Grow</div>
                <div className="font-mono text-green-600">{readyToGrow}</div>
              </div>
              
              {/* Garden Status Message */}
              {gardenNFTs.length > 0 && userNFTs.length === 0 && (
                <div className="mt-2 p-2 border border-black bg-gray-50 text-xs">
                  <div className="flex items-center">
                    <Sprout size={12} className="mr-2" />
                    <span>Your NFTs are safely growing in the garden</span>
                  </div>
                </div>
              )}
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
                disabled={userNFTs.length === 0 || isTransactionPending}
                className={cn(
                  "w-full border border-black px-3 py-2 text-xs flex items-center justify-center",
                  userNFTs.length > 0 && !isTransactionPending
                    ? "bg-green-500 text-white hover:bg-green-600"
                    : "bg-gray-200 text-gray-500 cursor-not-allowed"
                )}
              >
                <ArrowDownToLine size={12} className="mr-2" />
                PLANT ALL ({userNFTs.length})
              </button>

              <button
                onClick={handleUproot}
                disabled={gardenNFTs.length === 0 || isTransactionPending}
                className={cn(
                  "w-full border border-black px-3 py-2 text-xs flex items-center justify-center",
                  gardenNFTs.length > 0 && !isTransactionPending
                    ? "bg-orange-500 text-white hover:bg-orange-600"
                    : "bg-gray-200 text-gray-500 cursor-not-allowed"
                )}
              >
                <ArrowUpFromLine size={12} className="mr-2" />
                UPROOT ALL ({gardenNFTs.length})
              </button>

              <button
                onClick={handleWorkGarden}
                disabled={readyToGrow === 0 || isTransactionPending}
                className={cn(
                  "w-full border border-black px-3 py-2 text-xs flex items-center justify-center",
                  readyToGrow > 0 && !isTransactionPending
                    ? "bg-blue-500 text-white hover:bg-blue-600"
                    : readyToGrow === 0 && gardenNFTs.length > 0
                      ? "bg-yellow-200 text-yellow-800 cursor-not-allowed"
                      : "bg-gray-200 text-gray-500 cursor-not-allowed"
                )}
              >
                <Zap size={12} className="mr-2" />
                WORK GARDEN
              </button>
              
              {/* Help Message */}
              {userNFTs.length === 0 && gardenNFTs.length === 0 && (
                <div className="mt-3 p-2 border border-black bg-gray-50 text-xs">
                  <div className="flex items-center">
                    <ArrowDownToLine size={12} className="mr-2" />
                    <span>Buy NFTs from marketplace to start using Garden</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Transaction Modal handles error display */}

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
                      <TokenImage
                        tokenId={nft.id}
                        imageUrl={nft.imageUrl}
                        size={nft.size}
                        maxSize={nft.maxSize}
                        containerStyle={{
                          width: "60px",
                          height: "60px",
                          border: "1px solid black",
                          backgroundColor: "white",
                        }}
                        previewSize="medium"
                        showOpenSeaLink={true}
                      />
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
              <div className="font-bold mb-1 flex items-center">
                <ArrowDownToLine size={12} className="mr-2" />
                PLANT SEEDS
              </div>
              <p className="text-gray-600">
                Transfer your circles to the Garden contract for automated growth. Your circles will be safely stored and you can retrieve them anytime.
              </p>
            </div>
            
            <div>
              <div className="font-bold mb-1 flex items-center">
                <Zap size={12} className="mr-2" />
                WORK GARDEN
              </div>
              <p className="text-gray-600">
                Community service function! Automatically grows ALL eligible tokens in the garden (any token past its 24h cooldown), not just yours. Anyone can call this to help the entire community grow their tokens faster.
              </p>
            </div>
            
            <div>
              <div className="font-bold mb-1 flex items-center">
                <ArrowUpFromLine size={12} className="mr-2" />
                UPROOT
              </div>
              <p className="text-gray-600">
                Retrieve all your planted circles back to your wallet. They'll return with any growth that happened while in the garden.
              </p>
            </div>
          </div>
        </div>
      </div>
      
      {/* Transaction Modal */}
      <TransactionModal
        isOpen={transactionModal.isOpen}
        onClose={transactionModal.closeModal}
        step={transactionModal.step}
        txHash={transactionModal.txHash}
        error={transactionModal.error}
        operation={transactionModal.operation}
      />
    </div>
  )
} 