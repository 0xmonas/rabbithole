import { logger } from "./logger"

const RPC_PROXY_PATH = "/api/rpc"

function getRpcUrl() {
  if (typeof window === "undefined") {
    return process.env.ALCHEMY_RPC_URL || "https://mainnet.shape.network"
  }
  return RPC_PROXY_PATH
}

// Helper to wait
async function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

// Global request queue to prevent parallel Alchemy API calls
let requestQueue: Promise<void> = Promise.resolve()
const MIN_REQUEST_INTERVAL = 200 // 200ms between requests

async function queueRequest<T>(fn: () => Promise<T>): Promise<T> {
  // Wait for previous request to complete
  const previousRequest = requestQueue
  let resolve: () => void
  requestQueue = new Promise(r => { resolve = r })
  
  await previousRequest
  
  try {
    const result = await fn()
    // Add minimum delay between requests
    await sleep(MIN_REQUEST_INTERVAL)
    return result
  } finally {
    resolve!()
  }
}

type TransferCategory = "erc20" | "erc721" | "erc1155" | "specialnft"

export interface NFTTransfer {
  from: string
  to: string
  hash: string
  blockNum: string
  tokenId: number | null
}

interface TransferFilters {
  contractAddress: `0x${string}`
  fromAddress?: `0x${string}` | string
  toAddress?: `0x${string}` | string
  category?: TransferCategory[]
  order?: "asc" | "desc"
  maxCount?: number
}

const DEFAULT_MAX_COUNT = 1000
const DEFAULT_CATEGORIES: TransferCategory[] = ["erc721"]

// In-memory cache for transfer data (5 minute expiry)
const transferCache = new Map<string, { data: NFTTransfer[], timestamp: number }>()
const CACHE_DURATION = 5 * 60 * 1000 // 5 minutes

function getCacheKey(filters: TransferFilters): string {
  return JSON.stringify({
    contract: filters.contractAddress,
    from: filters.fromAddress || '',
    to: filters.toAddress || '',
  })
}

function numberToHex(count: number) {
  return `0x${count.toString(16)}`
}

function parseTokenId(value?: string | null): number | null {
  if (!value) return null
  try {
    return Number(BigInt(value))
  } catch {
    return null
  }
}

export async function fetchAlchemyTransfers(filters: TransferFilters): Promise<NFTTransfer[]> {
  // Check cache first
  const cacheKey = getCacheKey(filters)
  const cached = transferCache.get(cacheKey)
  if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
    logger.debug(`Using cached transfers for ${cacheKey.slice(0, 50)}...`)
    return cached.data
  }

  const rpcUrl = getRpcUrl()
  if (!rpcUrl) {
    throw new Error("Alchemy RPC URL is not configured")
  }

  const {
    contractAddress,
    fromAddress,
    toAddress,
    category = DEFAULT_CATEGORIES,
    order = "asc",
    maxCount = DEFAULT_MAX_COUNT,
  } = filters

  const transfers: NFTTransfer[] = []
  let pageKey: string | undefined
  let retryCount = 0
  const MAX_RETRIES = 3

  do {
    const body = {
      id: Date.now(),
      jsonrpc: "2.0",
      method: "alchemy_getAssetTransfers",
      params: [
        {
          fromBlock: "0x0",
          toBlock: "latest",
          category,
          contractAddresses: [contractAddress],
          withMetadata: false,
          excludeZeroValue: true,
          maxCount: numberToHex(maxCount),
          order,
          fromAddress,
          toAddress,
          pageKey,
        },
      ],
    }

    try {
      // Queue the request to prevent parallel API calls that cause 429 errors
      const response = await queueRequest(() => fetch(rpcUrl, {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify(body),
      }))

      // Handle rate limiting with exponential backoff
      if (response.status === 429) {
        retryCount++
        if (retryCount > MAX_RETRIES) {
          logger.warn("Alchemy rate limit exceeded, returning partial results")
          break // Return what we have so far
        }
        const waitTime = Math.pow(2, retryCount) * 1000 // 2s, 4s, 8s
        logger.warn(`Rate limited (429), waiting ${waitTime}ms before retry ${retryCount}/${MAX_RETRIES}`)
        await sleep(waitTime)
        continue // Retry the same request
      }

      if (!response.ok) {
        throw new Error(`Alchemy request failed with status ${response.status}`)
      }

      const payload = await response.json()
      if (payload.error) {
        throw new Error(payload.error.message || "Alchemy request failed")
      }

      const chunk = payload.result?.transfers ?? []
      chunk.forEach((transfer: any) => {
        transfers.push({
          from: transfer.from || "0x0000000000000000000000000000000000000000",
          to: transfer.to || "0x0000000000000000000000000000000000000000",
          hash: transfer.hash,
          blockNum: transfer.blockNum,
          tokenId: parseTokenId(transfer.erc721TokenId || transfer.rawContract?.value),
        })
      })

      pageKey = payload.result?.pageKey
      retryCount = 0 // Reset retry count on success
      
      // Small delay between paginated requests to avoid rate limiting
      if (pageKey) {
        await sleep(100)
      }
    } catch (error) {
      retryCount++
      if (retryCount > MAX_RETRIES) {
        logger.error("Max retries exceeded for Alchemy transfers", error)
        break
      }
      const waitTime = Math.pow(2, retryCount) * 1000
      logger.warn(`Request failed, waiting ${waitTime}ms before retry ${retryCount}/${MAX_RETRIES}`)
      await sleep(waitTime)
    }
  } while (pageKey)

  // Cache the results
  transferCache.set(cacheKey, { data: transfers, timestamp: Date.now() })
  
  return transfers
}
