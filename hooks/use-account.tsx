"use client"

import { useState, useEffect, useCallback } from "react"
import { getAccount, connect, disconnect, watchAccount } from "@wagmi/core"
import { injected } from "@wagmi/connectors"
import { wagmiConfig } from "@/config/wagmi"

export function useAccount() {
  const [address, setAddress] = useState<string | null>(null)
  const [isConnected, setIsConnected] = useState(false)

  // Update state based on Wagmi account
  const updateAccountState = useCallback(() => {
    try {
      const account = getAccount(wagmiConfig)
      console.log("Account state:", account)
      setAddress(account.address || null)
      setIsConnected(account.status === "connected")
    } catch (error) {
      console.error("Error updating account state:", error)
      setAddress(null)
      setIsConnected(false)
    }
  }, [])

  // Check if wallet is already connected on mount
  useEffect(() => {
    // Initialize account state
    const initializeAccount = async () => {
      try {
        // In Wagmi v2, we just check the current account state
        // No need to manually initialize connector
        const account = getAccount(wagmiConfig)  
        if (account.status === "disconnected" && window.ethereum) {
          console.log("Wallet available but not connected")
        }
      } catch (error) {
        console.error("Error checking account:", error)
      } finally {
        updateAccountState()
      }
    }

    initializeAccount()

    // Subscribe to account changes
    const unwatch = watchAccount(wagmiConfig, {
      onChange: (account) => {
        console.log("Account changed:", account)
        setAddress(account.address || null)
        setIsConnected(account.status === "connected")
      },
    })

    return () => {
      unwatch()
    }
  }, [updateAccountState])

  // Connect wallet function
  const connectWallet = useCallback(async () => {
    try {
      console.log("Connecting wallet...")
      await connect(wagmiConfig, {
        connector: injected(),
      })
      updateAccountState()
      return address
    } catch (error) {
      console.error("Connection error:", error)
      return null
    }
  }, [address, updateAccountState])

  // Disconnect wallet function
  const disconnectWallet = useCallback(async () => {
    try {
      console.log("Disconnecting wallet...")
      await disconnect(wagmiConfig)
      updateAccountState()
    } catch (error) {
      console.error("Disconnect error:", error)
    }
  }, [updateAccountState])

  return {
    address,
    isConnected,
    connect: connectWallet,
    disconnect: disconnectWallet,
  }
}

