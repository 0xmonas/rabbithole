"use client"

import { useState, useEffect } from "react"
import { switchChain, getAccount } from "@wagmi/core"
import { wagmiConfig, shapeChain } from "@/config/wagmi"
import { X } from "lucide-react"
import { cn } from "@/lib/utils"

interface NetworkSwitchModalProps {
  isOpen: boolean
  onClose: () => void
  currentChainId: number | undefined
}

export function NetworkSwitchModal({ isOpen, onClose, currentChainId }: NetworkSwitchModalProps) {
  const [isSwitching, setIsSwitching] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Close modal with escape key
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose()
    }
    if (isOpen) {
    window.addEventListener("keydown", handleEsc)
    return () => window.removeEventListener("keydown", handleEsc)
    }
  }, [onClose, isOpen])

  // Handle click outside to close
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement
      if (target.id === "modal-backdrop") onClose()
    }
    if (isOpen) {
    window.addEventListener("mousedown", handleClickOutside)
    return () => window.removeEventListener("mousedown", handleClickOutside)
    }
  }, [onClose, isOpen])

  const handleSwitchNetwork = async () => {
    setIsSwitching(true)
    setError(null)

    try {
      // Check if wallet is connected using getAccount
      const account = getAccount(wagmiConfig)
      if (account.status !== "connected") {
        throw new Error("No wallet connected")
      }

      console.log("Switching to Shape network (Chain ID: 360)...")
      
      // Use the new Wagmi v2 switchChain API directly
      await switchChain(wagmiConfig, { 
        chainId: shapeChain.id 
      })
      
      console.log("Successfully switched to Shape network")
      onClose()
      
    } catch (switchError: any) {
      console.error("Network switch error:", switchError)
      
      // Handle specific error codes
      if (switchError.code === 4902 || switchError.message?.includes('Unrecognized chain')) {
        // Network not added to wallet - try adding it
        setError("Network not found in wallet. Attempting to add Shape network...")
        
        try {
          // Add Shape network to wallet
          if (typeof window !== 'undefined' && window.ethereum) {
            await window.ethereum.request({
              method: "wallet_addEthereumChain",
              params: [
                {
                  chainId: `0x${shapeChain.id.toString(16)}`, // Convert to hex
                  chainName: shapeChain.name,
                  nativeCurrency: shapeChain.nativeCurrency,
                  rpcUrls: [shapeChain.rpcUrls.default.http[0]],
                  blockExplorerUrls: shapeChain.blockExplorers?.default?.url ? [shapeChain.blockExplorers.default.url] : undefined,
                },
              ],
            })
            
            // Try switching again after adding
            await switchChain(wagmiConfig, { chainId: shapeChain.id })
            console.log("Successfully added and switched to Shape network")
            onClose()
            
          } else {
            setError("Unable to add network. Please add Shape network manually in your wallet.")
          }
        } catch (addError: any) {
            console.error("Error adding network:", addError)
          setError(`Failed to add Shape network: ${addError.message || 'Please add the network manually in your wallet.'}`)
          }
      } else if (switchError.code === 4001) {
        // User rejected request
        setError("Network switch was rejected. Please try again and approve the request.")
      } else {
        // Other errors
        setError(switchError.message || "Failed to switch network. Please try switching manually in your wallet.")
      }
    } finally {
      setIsSwitching(false)
    }
  }

  if (!isOpen) return null

  return (
    <div id="modal-backdrop" className="fixed inset-0 flex items-center justify-center z-50 bg-black/50">
      <div className="w-full max-w-md p-4 border border-black bg-[#f2f1ea]">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center">
            <h3 className="uppercase tracking-wider font-bold">WRONG NETWORK DETECTED</h3>
          </div>
          <button onClick={onClose} className="p-1 rounded-sm hover:bg-gray-200">
            <X size={14} />
          </button>
        </div>

        <div className="mb-4">
          <p className="mb-2">
            You are currently connected to {currentChainId ? `Chain ID: ${currentChainId}` : "an unsupported network"}.
          </p>
          <p className="mb-4">Rabbit Hole requires the Shape network (Chain ID: 360) to function properly.</p>

          <div className="p-3 border border-black bg-white mb-4">
            <div className="text-[10px] text-gray-500 mb-1">REQUIRED NETWORK</div>
            <div className="font-bold">Shape (L2)</div>
            <div className="text-xs text-gray-600">Chain ID: 360</div>
            <div className="text-xs text-gray-600">RPC URL: https://mainnet.shape.network</div>
            <div className="text-xs text-gray-600">Currency Symbol: ETH</div>
            <div className="text-xs text-gray-600">Explorer: https://explorer.shape.network</div>
          </div>
        </div>

        {error && (
          <div className="mb-4 p-2 border border-red-500 bg-red-50 text-red-600 text-sm">
            {error}
          </div>
        )}

        <div className="flex justify-end space-x-2">
          <button 
            type="button" 
            onClick={onClose} 
            className="px-3 py-1 border border-black hover:bg-gray-100"
            disabled={isSwitching}
          >
            CANCEL
          </button>
          <button
            type="button"
            onClick={handleSwitchNetwork}
            disabled={isSwitching}
            className={cn(
              "px-3 py-1 border border-black",
              isSwitching ? "bg-gray-300 text-gray-600" : "bg-black text-white hover:bg-gray-800",
            )}
          >
            {isSwitching ? "SWITCHING..." : "SWITCH TO SHAPE"}
          </button>
        </div>
      </div>
    </div>
  )
}

