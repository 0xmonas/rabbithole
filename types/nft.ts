export interface NFT {
  id: number
  size: number
  minSize: number
  maxSize: number
  lastGrowTime: number
  lastShrinkTime: number
  growCooldownRemaining: number
  shrinkCooldownRemaining: number
  history?: {
    action: string
    timestamp: number
    txHash: string
  }[]
}

