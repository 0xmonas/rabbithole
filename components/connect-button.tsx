"use client"

import { useState } from "react"
import { useAccount, useDisconnect } from 'wagmi'
import { appKit } from '@/config/wagmi'

interface ConnectButtonProps {
  large?: boolean
}

export function ConnectButton({ large = false }: ConnectButtonProps) {
  const { address, isConnected } = useAccount()
  const { disconnect } = useDisconnect()
  const [isConnecting, setIsConnecting] = useState(false)

  const handleConnect = async () => {
    setIsConnecting(true)
    try {
      // Open Reown AppKit modal for wallet selection
      await appKit.open()
    } catch (error) {
      logger.error("Connection error:", error)
    } finally {
      setIsConnecting(false)
    }
  }

  const handleDisconnect = () => {
    disconnect()
  }

  const formatAddress = (addr: string) => {
    return `${addr.substring(0, 6)}...${addr.substring(addr.length - 4)}`
  }

  return (
    <div>
      {isConnected ? (
        <div className="flex items-center space-x-2">
          <div className="text-xs border border-black px-2 py-1 bg-gray-100">{formatAddress(address || "")}</div>
          <button
            onClick={handleDisconnect}
            className={`border border-black px-2 py-1 hover:bg-gray-100 ${large ? "px-4 py-2 text-sm" : ""}`}
          >
            DISCONNECT
          </button>
        </div>
      ) : (
        <button
          onClick={handleConnect}
          disabled={isConnecting}
          className={`border border-black px-2 py-1 bg-black text-white hover:bg-gray-800 ${
            large ? "px-6 py-3 text-sm" : ""
          }`}
        >
          {isConnecting ? "CONNECTING..." : "CONNECT WALLET"}
        </button>
      )}
    </div>
  )
}

