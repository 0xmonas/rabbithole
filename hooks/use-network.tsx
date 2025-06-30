"use client"

import { useState, useEffect } from "react"
import { watchChainId, getAccount, watchAccount } from "@wagmi/core"
import { wagmiConfig, shapeChain } from "@/config/wagmi"

export function useNetwork() {
  const [chainId, setChainId] = useState<number | undefined>(undefined)
  const [isCorrectNetwork, setIsCorrectNetwork] = useState<boolean>(false)
  const [isLoading, setIsLoading] = useState(true)

  const updateNetworkState = (account: any) => {
    console.log("Network update - Account:", account)
    
    if (account.status !== "connected") {
      console.log("Account not connected, clearing network state")
      setChainId(undefined)
      setIsCorrectNetwork(false)
      setIsLoading(false)
      return
    }

    const currentChainId = account.chainId
    console.log("Network update - Chain ID:", currentChainId)
    
    setChainId(currentChainId)
    setIsCorrectNetwork(currentChainId === shapeChain.id)
    setIsLoading(false)
  }

  useEffect(() => {
    // Get initial state
    const account = getAccount(wagmiConfig)
    updateNetworkState(account)

    // Watch account changes (connection, disconnection, chain switches)
    const unwatchAccount = watchAccount(wagmiConfig, {
      onChange: updateNetworkState,
    })

    // Also watch chain changes separately for extra reliability
    const unwatchChain = watchChainId(wagmiConfig, {
      onChange: (newChainId) => {
        console.log("Direct chain change to:", newChainId)
        setChainId(newChainId)
        setIsCorrectNetwork(newChainId === shapeChain.id)
      },
    })

    return () => {
      unwatchAccount()
      unwatchChain()
    }
  }, [])

  return {
    chainId,
    isCorrectNetwork,
    isNetworkLoading: isLoading,
  }
}

