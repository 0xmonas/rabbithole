"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog"
import { Loader2, CheckCircle, XCircle, Wallet } from "lucide-react"
import { Button } from "@/components/ui/button"

export type TransactionStep = 
  | "idle"
  | "wallet-opening" 
  | "wallet-signing"
  | "pending"
  | "success"
  | "error"

interface TransactionModalProps {
  isOpen: boolean
  onClose: () => void
  step: TransactionStep
  txHash?: string
  error?: string
  operation: string // "Growing Circle", "Merging Circles", "Planting Seeds", etc.
}

export function TransactionModal({ 
  isOpen, 
  onClose, 
  step, 
  txHash, 
  error, 
  operation 
}: TransactionModalProps) {
  const [countdown, setCountdown] = useState(3)

  // Countdown for success state
  useEffect(() => {
    if (step === "success") {
      setCountdown(3)
      const timer = setInterval(() => {
        setCountdown(prev => {
          if (prev <= 1) {
            clearInterval(timer)
            return 0
          }
          return prev - 1
        })
      }, 1000)
      
      return () => clearInterval(timer)
    }
  }, [step])
  const getStepContent = () => {
    switch (step) {
      case "wallet-opening":
        return {
          icon: <Wallet className="w-8 h-8 text-black animate-pulse" />,
          title: "Opening Wallet",
          message: "Please open your wallet to continue...",
          showSpinner: true
        }
      
      case "wallet-signing":
        return {
          icon: <Wallet className="w-8 h-8 text-black animate-bounce" />,
          title: "Sign Transaction",
          message: `Please sign the ${operation.toLowerCase()} transaction in your wallet`,
          showSpinner: true
        }
      
      case "pending":
        return {
          icon: <Loader2 className="w-8 h-8 text-black animate-spin" />,
          title: "Transaction Pending",
          message: `Your ${operation.toLowerCase()} transaction is being processed...`,
          showSpinner: false
        }
      
      case "success":
        return {
          icon: <CheckCircle className="w-8 h-8 text-green-600" />,
          title: "Transaction Successful!",
          message: countdown > 0 
            ? `${operation} completed successfully. Closing in ${countdown}...`
            : `${operation} completed successfully`,
          showSpinner: false
        }
      
      case "error":
        return {
          icon: <XCircle className="w-8 h-8 text-red-600" />,
          title: "Transaction Failed",
          message: error || "Transaction was rejected or failed",
          showSpinner: false
        }
      
      default:
        return null
    }
  }

  const content = getStepContent()
  if (!content) return null

  const canClose = step === "success" || step === "error"

  return (
    <Dialog open={isOpen} onOpenChange={canClose ? onClose : undefined}>
      <DialogContent 
        className="bg-white border-black border-2 max-w-md"
      >
        <div className="p-6 text-center space-y-6">
          {/* Header */}
          <div className="flex flex-col items-center space-y-4">
            {content.icon}
            <DialogTitle className="text-xl font-mono text-black tracking-wider">
              {content.title}
            </DialogTitle>
          </div>

          {/* Message */}
          <div className="space-y-3">
            <p className="text-gray-600 font-mono text-sm leading-relaxed">
              {content.message}
            </p>
            
            {content.showSpinner && (
              <div className="flex justify-center">
                <Loader2 className="w-5 h-5 text-black animate-spin" />
              </div>
            )}
          </div>

          {/* Transaction Hash */}
          {txHash && (
            <div className="space-y-2">
              <p className="text-gray-500 font-mono text-xs">Transaction Hash:</p>
              <div className="bg-gray-100 border border-gray-300 rounded p-2">
                <code className="text-black text-xs break-all font-mono">
                  {txHash}
                </code>
              </div>
              <a
                href={`https://shapescan.xyz/tx/${txHash}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-block text-blue-600 hover:text-blue-800 text-xs font-mono underline"
              >
                View on Explorer →
              </a>
            </div>
          )}

          {/* Progress Steps */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs font-mono">
              <span className={step === "wallet-opening" ? "text-black font-bold" : step === "wallet-signing" || step === "pending" || step === "success" ? "text-gray-500" : "text-gray-400"}>
                1. Open Wallet
              </span>
              <span className={step === "wallet-opening" ? "text-black" : step === "wallet-signing" || step === "pending" || step === "success" ? "text-gray-500" : "text-gray-400"}>
                {step === "wallet-opening" ? "●" : step === "wallet-signing" || step === "pending" || step === "success" ? "✓" : "○"}
              </span>
            </div>
            
            <div className="flex items-center justify-between text-xs font-mono">
              <span className={step === "wallet-signing" ? "text-black font-bold" : step === "pending" || step === "success" ? "text-gray-500" : "text-gray-400"}>
                2. Sign Transaction
              </span>
              <span className={step === "wallet-signing" ? "text-black" : step === "pending" || step === "success" ? "text-gray-500" : "text-gray-400"}>
                {step === "wallet-signing" ? "●" : step === "pending" || step === "success" ? "✓" : "○"}
              </span>
            </div>
            
            <div className="flex items-center justify-between text-xs font-mono">
              <span className={step === "pending" ? "text-black font-bold" : step === "success" ? "text-gray-500" : "text-gray-400"}>
                3. Processing
              </span>
              <span className={step === "pending" ? "text-black" : step === "success" ? "text-gray-500" : "text-gray-400"}>
                {step === "pending" ? "●" : step === "success" ? "✓" : "○"}
              </span>
            </div>
            
            <div className="flex items-center justify-between text-xs font-mono">
              <span className={step === "success" ? "text-green-600 font-bold" : "text-gray-400"}>
                4. Complete
              </span>
              <span className={step === "success" ? "text-green-600" : "text-gray-400"}>
                {step === "success" ? "✓" : "○"}
              </span>
            </div>
          </div>

          {/* Actions */}
          {canClose && (
            <div className="pt-4">
              <Button
                onClick={onClose}
                disabled={step === "success" && countdown > 0}
                className="w-full bg-black hover:bg-gray-800 text-white font-mono border border-black disabled:bg-gray-400 disabled:cursor-not-allowed"
              >
                {step === "success" && countdown > 0 
                  ? `Auto-closing in ${countdown}s...`
                  : step === "success" 
                  ? "Continue" 
                  : "Close"}
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
} 