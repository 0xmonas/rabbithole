"use client"

import { useState, useCallback } from "react"
import { waitForTransactionReceipt } from "@wagmi/core"
import { wagmiConfig } from "@/config/wagmi"
import type { TransactionStep } from "@/components/transaction-modal"
import { logger } from "@/lib/logger"

interface TransactionState {
  isOpen: boolean
  step: TransactionStep
  txHash?: string
  error?: string
  operation: string
}

export function useTransactionModal() {
  const [state, setState] = useState<TransactionState>({
    isOpen: false,
    step: "idle",
    operation: ""
  })

  const openModal = useCallback((operation: string) => {
    logger.info(`🔄 Starting transaction: ${operation}`)
    setState({
      isOpen: true,
      step: "wallet-opening",
      operation,
      txHash: undefined,
      error: undefined
    })
  }, [])

  const setStep = useCallback((step: TransactionStep, additionalData?: { txHash?: string; error?: string }) => {
    setState(prev => ({
      ...prev,
      step,
      ...additionalData
    }))
  }, [])

  const closeModal = useCallback(() => {
    logger.info(`✅ Transaction modal closed`)
    setState({
      isOpen: false,
      step: "idle",
      operation: ""
    })
  }, [])

  const autoCloseAfterSuccess = useCallback(() => {
    logger.info(`🎉 Auto-closing modal in 3 seconds...`)
    setTimeout(() => {
      closeModal()
    }, 3000)
  }, [closeModal])

  // 🚀 PROFESSIONAL: Execute transaction with full lifecycle tracking
  const executeTransaction = useCallback(async (
    operation: string,
    transactionFn: () => Promise<string>, // Function that returns transaction hash
    onSuccess?: () => void | Promise<void> // Callback for successful completion
  ): Promise<boolean> => {
    try {
      // Step 1: Open modal and show wallet opening
      openModal(operation)
      
      // Step 2: Show wallet signing step
      setStep("wallet-signing")
      
      logger.info(`🔏 Executing ${operation} transaction`)
      
      // Execute the transaction function
      const txHash = await transactionFn()
      
      logger.info(`📝 Transaction submitted: ${txHash}`)
      
      // Step 3: Show pending with transaction hash
      setStep("pending", { txHash })
      
      // Step 4: Wait for transaction confirmation
      logger.info(`⏳ Waiting for transaction confirmation: ${txHash}`)
      
      const receipt = await waitForTransactionReceipt(wagmiConfig, {
        hash: txHash as `0x${string}`,
        timeout: 120000 // 2 minutes timeout
      })
      
      if (receipt.status === "success") {
        logger.success(`✅ Transaction successful: ${txHash}`)
        setStep("success", { txHash })
        
        // 🎯 DELAYED SUCCESS CALLBACK: Wait 3 seconds before refreshing data
        // This allows users to see the success state on fast networks like Shape L2
        setTimeout(async () => {
          if (onSuccess) {
            try {
              await onSuccess()
              logger.info(`🔄 Post-transaction callback executed after delay`)
            } catch (callbackError) {
              logger.warn(`⚠️ Post-transaction callback failed`, callbackError)
              // Don't fail the whole transaction for callback errors
            }
          }
        }, 3000)
        
        // 🎯 AUTO-CLOSE AFTER SUCCESS: Show success state for 3 seconds then auto-close
        // This prevents modal from closing too quickly on fast networks like Shape L2
        autoCloseAfterSuccess()
        
        return true
      } else {
        throw new Error("Transaction failed")
      }
      
    } catch (error: any) {
      logger.error(`❌ Transaction failed: ${operation}`, error)
      
      let errorMessage = "Transaction failed"
      
      // Handle specific error types
      if (error.message?.includes("User rejected")) {
        errorMessage = "Transaction was rejected by user"
      } else if (error.message?.includes("insufficient funds")) {
        errorMessage = "Insufficient funds for transaction"
      } else if (error.message?.includes("timeout")) {
        errorMessage = "Transaction timed out"
      } else if (error.shortMessage) {
        errorMessage = error.shortMessage
      } else if (error.message) {
        errorMessage = error.message
      }
      
      setStep("error", { error: errorMessage })
      return false
    }
  }, [openModal, setStep, autoCloseAfterSuccess])

  return {
    // State
    isOpen: state.isOpen,
    step: state.step,
    txHash: state.txHash,
    error: state.error,
    operation: state.operation,
    
    // Actions
    openModal,
    closeModal,
    executeTransaction,
    setStep
  }
} 