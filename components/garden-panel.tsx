"use client"

import { useState, useEffect } from "react"
import type { NFT } from "@/types/nft"
import { cn } from "@/lib/utils"
import { useGarden } from "@/hooks/use-garden"
import { TransactionModal } from "@/components/transaction-modal"
import { TokenImage } from "@/components/token-image"
import GardenCommunityVisualizer from "@/components/garden-community-visualizer"
import { Sprout, ArrowUpFromLine, ArrowDownToLine, Zap, Clock, Leaf, Shield, ShieldCheck } from "lucide-react"
import { readContract } from "@wagmi/core"
import { wagmiConfig } from "@/config/wagmi"
import { getAddress } from "viem"
import { logger } from "@/lib/logger"

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
    transactionModal,
    gardenStats,
    fetchGardenWideStats,
    communityTokens,
    isCommunityLoading,
  } = useGarden(address, async () => {
    // Refresh both garden and user NFTs after successful transaction
    await refreshGarden()
    await fetchGardenWideStats() // Also refresh community stats
    onRefreshUserNFTs()
  })
  
  const [selectedAction, setSelectedAction] = useState<"plant" | "uproot" | "work">("plant")
  const [approvalInfo, setApprovalInfo] = useState<{
    isChecking: boolean
    isApproved: boolean | null
    lastChecked: number
  }>({
    isChecking: false,
    isApproved: null,
    lastChecked: 0
  })

  // Contract addresses - must match garden hook
  const RH_CONTRACT_ADDRESS = getAddress("0xca38813d69409e4e50f1411a0cab2570e570c75a")
  const GARDEN_CONTRACT_ADDRESS = getAddress("0x2940574AF75D350BF37Ceb73CA5dE8e5ADA425c4")

  // ABI for approval checking
  const rhAbi = [
    {
      inputs: [{ internalType: "address", name: "owner", type: "address" }, { internalType: "address", name: "operator", type: "address" }],
      name: "isApprovedForAll",
      outputs: [{ internalType: "bool", name: "", type: "bool" }],
      stateMutability: "view",
      type: "function",
    },
  ] as const

  // Check approval status
  const checkApprovalStatus = async () => {
    if (!address) {
      setApprovalInfo(prev => ({ ...prev, isApproved: null }))
      return
    }

    setApprovalInfo(prev => ({ ...prev, isChecking: true }))
    
    try {
      const isApproved = await readContract(wagmiConfig, {
        address: RH_CONTRACT_ADDRESS,
        abi: rhAbi,
        functionName: "isApprovedForAll",
        args: [address as `0x${string}`, GARDEN_CONTRACT_ADDRESS],
      }) as boolean

      setApprovalInfo({
        isChecking: false,
        isApproved,
        lastChecked: Date.now()
      })
      
      logger.debug(`🔒 Approval status for ${address}: ${isApproved}`)
    } catch (error) {
      logger.error("❌ Error checking approval status:", error)
      setApprovalInfo(prev => ({ 
        ...prev, 
        isChecking: false,
        isApproved: null 
      }))
    }
  }

  // Check approval status when address changes or when needed
  useEffect(() => {
    checkApprovalStatus()
  }, [address])

  const handlePlantSeeds = async () => {
    try {
      // GAS OPTIMIZATION: Use increased range to match work garden capability  
      // Found tokens like #1004, #1014, so need to check beyond 1000
      await plantSeeds(1100) // Increased from 1000 to 1100 to match work garden range
      
      // Refresh approval status after planting (might have changed during approval process)
      setTimeout(() => {
        checkApprovalStatus()
      }, 2000)
    } catch (error) {
      logger.error("❌ Plant seeds failed:", error)
      // Refresh approval status in case it changed during failed attempt
      checkApprovalStatus()
    }
  }

  const handleUproot = async () => {
    await uproot()
  }

  const handleWorkGarden = async () => {
    // 🔥 GAS OPTIMIZATION: Let the hook determine optimal range
    // 👤 WALLET VALIDATION: Ensure wallet is connected
    if (!address) {
      logger.error("❌ Cannot work garden: No wallet connected")
      return
    }
    
    logger.debug(`🌍 Working garden from address: ${address}`)
    await workGarden() // No parameter = smart optimization
  }

  const isTransactionPending = transactionModal.isOpen && transactionModal.step !== "idle"

  const formatCooldown = (seconds: number) => {
    if (seconds === 0) return "Ready"
    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    return `${hours}h ${minutes}m`
  }

  const formatTimestamp = (timestamp: number) => {
    if (timestamp === 0) return "Never"
    const date = new Date(timestamp * 1000)
    const now = new Date()
    const diff = now.getTime() - date.getTime()
    const hours = Math.floor(diff / (1000 * 60 * 60))
    if (hours < 24) {
      return `${hours}h ago`
    }
    const days = Math.floor(hours / 24)
    return `${days}d ago`
  }

  const formatCountdown = (timestamp: number) => {
    if (timestamp === 0) return "Unknown"
    const now = Math.floor(Date.now() / 1000)
    const diff = timestamp - now
    
    if (diff <= 0) return "Ready now"
    
    const hours = Math.floor(diff / 3600)
    const minutes = Math.floor((diff % 3600) / 60)
    
    if (hours > 0) {
      return `${hours}h ${minutes}m`
    }
    return `${minutes}m`
  }

  // Calculate garden stats
  const totalGardenSize = gardenNFTs.reduce((sum, nft) => sum + nft.size, 0)
  const readyToGrow = gardenNFTs.filter(nft => nft.growCooldownRemaining === 0).length
  const avgSize = gardenNFTs.length > 0 ? Math.round(totalGardenSize / gardenNFTs.length) : 0

  // 🌍 COMMUNITY SERVICE: Work Garden should be enabled when ANY garden tokens are ready
  const canWorkGarden = gardenStats.readyToGrowCount > 0 && !isTransactionPending

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
                
                <div className="text-gray-500 flex items-center justify-between">
                  <span>Garden Approval</span>
                  <button
                    onClick={checkApprovalStatus}
                    disabled={approvalInfo.isChecking}
                    className="text-blue-600 hover:text-blue-800 underline text-xs disabled:opacity-50 disabled:cursor-not-allowed"
                    title="Refresh approval status"
                  >
                    Refresh
                  </button>
                </div>
                <div className="flex items-center">
                  {approvalInfo.isChecking ? (
                    <div className="flex items-center">
                      <div className="w-3 h-3 bg-gray-300 animate-pulse mr-1"></div>
                      <span className="text-xs text-gray-500">Checking...</span>
                    </div>
                  ) : approvalInfo.isApproved === true ? (
                    <div className="flex items-center">
                      <ShieldCheck size={12} className="text-green-600 mr-1" />
                      <span className="text-xs text-green-600 font-medium">Approved</span>
                    </div>
                  ) : approvalInfo.isApproved === false ? (
                    <div className="flex items-center">
                      <Shield size={12} className="text-red-600 mr-1" />
                      <span className="text-xs text-red-600 font-medium">Not Approved</span>
                    </div>
                  ) : (
                    <span className="text-xs text-gray-400">Unknown</span>
                  )}
                </div>
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
                title={approvalInfo.isApproved === false 
                  ? "Garden contract needs approval first (will request when clicked)" 
                  : `Plant ${userNFTs.length} NFTs in the garden for automated growth`
                }
              >
                <ArrowDownToLine size={12} className="mr-2" />
                {approvalInfo.isApproved === false ? (
                  `APPROVE & PLANT (${userNFTs.length})`
                ) : (
                  `PLANT ALL (${userNFTs.length})`
                )}
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
                disabled={!canWorkGarden || gardenStats.loading}
                className={cn(
                  "w-full border border-black px-3 py-2 text-xs flex items-center justify-center",
                  canWorkGarden && !gardenStats.loading ? "bg-blue-500 text-white hover:bg-blue-600" : "bg-gray-200 text-gray-500 cursor-not-allowed"
                )}
                title={gardenStats.loading 
                  ? "Loading garden statistics..."
                  : gardenStats.readyToGrowCount > 0 
                    ? `Gas Optimized: Will grow ${gardenStats.readyToGrowCount} circles. Checks max 1100 tokens (covers all garden tokens)` 
                    : "No circles ready to grow"
                }
              >
                <Zap size={12} className="mr-2" />
                {gardenStats.loading ? (
                  <>
                    WORK GARDEN (
                    <div className="w-4 h-3 bg-gray-400 animate-pulse mx-1"></div>
                    )
                  </>
                ) : (
                  `WORK GARDEN (${gardenStats.readyToGrowCount})`
                )}
              </button>
              
              {/* Community Service Info */}
              {gardenStats.totalGardenTokens > 0 || gardenStats.loading ? (
                <div className="mt-2 p-2 border border-black bg-blue-50 text-xs">
                  <div className="font-bold mb-1 flex items-center justify-between">
                    <div className="flex items-center">
                      <Zap size={10} className="mr-1" />
                      COMMUNITY SERVICE
                    </div>
                    <button
                      onClick={fetchGardenWideStats}
                      disabled={gardenStats.loading}
                      className="text-blue-600 hover:text-blue-800 underline text-xs disabled:opacity-50 disabled:cursor-not-allowed"
                      title="Refresh garden-wide statistics"
                    >
                      Refresh
                    </button>
                  </div>
                  
                  {gardenStats.loading ? (
                    <div className="space-y-1 text-gray-600">
                      <div className="flex justify-between">
                        <span>Total Garden:</span>
                        <div className="w-12 h-3 bg-gray-300 animate-pulse"></div>
                      </div>
                      <div className="flex justify-between">
                        <span>Ready to Grow:</span>
                        <div className="w-8 h-3 bg-gray-300 animate-pulse"></div>
                      </div>
                      <div className="flex justify-between">
                        <span>Last Worked:</span>
                        <div className="w-16 h-3 bg-gray-300 animate-pulse"></div>
                      </div>
                      <div className="w-full h-3 bg-blue-200 animate-pulse"></div>
                      <div className="text-blue-600 font-medium">
                        Loading garden statistics...
                      </div>
                    </div>
                  ) : gardenStats.totalGardenTokens === 0 ? (
                    <div className="text-gray-600">
                      <div className="text-center py-2">
                        No tokens found in community garden
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-1 text-gray-600">
                      <div>Total Garden: {gardenStats.totalGardenTokens} circles</div>
                      <div>Ready to Grow: {gardenStats.readyToGrowCount} circles</div>
                      <div>Last Worked: {formatTimestamp(gardenStats.lastWorkGardenTime)}</div>
                      
                      {gardenStats.readyToGrowCount === 0 && gardenStats.nextWorkGardenTime > 0 && (
                        <div className="text-green-600 font-medium">
                          Next tokens ready: {formatCountdown(gardenStats.nextWorkGardenTime)}
                        </div>
                      )}
                      
                      {gardenStats.readyToGrowCount > 0 && (
                        <div className="text-red-600 font-medium">
                          WARNING: {gardenStats.readyToGrowCount} tokens ready but not grown - check console for debug info
                        </div>
                      )}
                      
                      <div className="text-blue-600 font-medium">
                        Gas Optimized: Checks max 1100 tokens (covers all garden tokens)
                      </div>
                      
                      {gardenStats.readyToGrowCount === 0 && gardenStats.totalGardenTokens > 0 && (
                        <div className="text-yellow-600 font-medium">
                          All garden circles are cooling down
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ) : null}

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

        {/* Community Garden Visualizer */}
        <div className="mt-6">
          <GardenCommunityVisualizer 
            tokens={communityTokens} 
            isLoading={isCommunityLoading} 
          />
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
                <strong>Community Service Function!</strong> Anyone can call this to automatically grow ALL eligible circles in the entire garden (not just yours). 
                Grows any circle that has waited 24+ hours since last growth. This is an altruistic action that helps the entire community grow their tokens faster. 
                You don't need to own any tokens in the garden to help others!
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