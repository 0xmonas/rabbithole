const RPC_PROXY_PATH = "/api/rpc"

function getRpcUrl() {
  if (typeof window === "undefined") {
    return process.env.ALCHEMY_RPC_URL || "https://mainnet.shape.network"
  }
  return RPC_PROXY_PATH
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

    const response = await fetch(rpcUrl, {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify(body),
    })

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
  } while (pageKey)

  return transfers
}
