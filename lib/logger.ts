/**
 * Security-focused logger utility for Rabbit Hole dApp
 * Prevents information leakage in production environment
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error'

interface LogData {
  [key: string]: any
}

class SecurityLogger {
  private isDevelopment = process.env.NODE_ENV === 'development'
  
  /**
   * Debug logging - only in development
   * Use for user addresses, transaction details, sensitive data
   */
  debug(message: string, data?: LogData | unknown): void {
    if (this.isDevelopment) {
      console.log(`🔍 [DEBUG] ${message}`, data || '')
    }
  }
  
  /**
   * Info logging - safe for production  
   * Use for general application flow, non-sensitive events
   */
  info(message: string, data?: LogData | unknown): void {
    if (this.isDevelopment) {
      console.log(`ℹ️ [INFO] ${message}`, data || '')
    } else {
      // In production, only log sanitized info
      console.log(`[INFO] ${this.sanitizeMessage(message)}`)
    }
  }
  
  /**
   * Warning logging - always shown but sanitized
   * Use for recoverable errors, validation failures
   */
  warn(message: string, data?: LogData | unknown): void {
    const sanitizedMessage = this.sanitizeMessage(message)
    if (this.isDevelopment) {
      console.warn(`⚠️ [WARN] ${message}`, data || '')
    } else {
      console.warn(`[WARN] ${sanitizedMessage}`)
    }
  }
  
  /**
   * Error logging - always shown but sanitized
   * Use for unrecoverable errors, system failures
   */
  error(message: string, error?: any): void {
    const sanitizedMessage = this.sanitizeMessage(message)
    if (this.isDevelopment) {
      console.error(`💥 [ERROR] ${message}`, error)
    } else {
      // In production, only log error message without sensitive details
      console.error(`[ERROR] ${sanitizedMessage}`, error?.message || 'Unknown error')
    }
  }
  
  /**
   * Success logging - safe for production
   * Use for completed operations, successful transactions
   */
  success(message: string): void {
    if (this.isDevelopment) {
      console.log(`✅ [SUCCESS] ${message}`)
    } else {
      console.log(`[SUCCESS] ${this.sanitizeMessage(message)}`)
    }
  }
  
  /**
   * Sanitize sensitive information from log messages
   */
  private sanitizeMessage(message: string): string {
    return message
      // Remove wallet addresses (0x followed by 40 hex characters)
      .replace(/0x[a-fA-F0-9]{40}/g, '0x***')
      // Remove transaction hashes (0x followed by 64 hex characters)  
      .replace(/0x[a-fA-F0-9]{64}/g, '0x***')
      // Remove potential private keys or long hex strings
      .replace(/0x[a-fA-F0-9]{32,}/g, '0x***')
      // Remove email addresses
      .replace(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g, '***@***.***')
      // Remove IP addresses
      .replace(/\b(?:[0-9]{1,3}\.){3}[0-9]{1,3}\b/g, '***.***.***.***')
  }
}

// Export singleton instance
export const logger = new SecurityLogger()

// Export types for TypeScript
export type { LogLevel, LogData } 