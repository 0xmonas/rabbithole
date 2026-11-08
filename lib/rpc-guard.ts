// What /api/rpc passes on to Alchemy: only the reads this site makes, from its own pages, at a person's pace.
// Before 2026-11-08 it forwarded any body from anyone, so anyone could spend the key through it.
const ALLOWED = new Set([
  "eth_chainId",
  "net_version",
  "eth_blockNumber",
  "eth_call",
  "eth_getBalance",
  "eth_getCode",
  "eth_estimateGas",
  "eth_gasPrice",
  "eth_maxPriorityFeePerGas",
  "eth_feeHistory",
  "eth_getTransactionCount",
  "eth_getTransactionReceipt",
  "eth_getTransactionByHash",
  "eth_getBlockByNumber",
  "alchemy_getAssetTransfers",
])
export const MAX_BODY = 64 * 1024
const MAX_BATCH = 20

export function badBody(text: string): string | null {
  if (text.length > MAX_BODY) return "Request too large"
  let body: unknown
  try {
    body = JSON.parse(text)
  } catch {
    return "Not JSON"
  }
  const calls = Array.isArray(body) ? body : [body]
  if (calls.length === 0 || calls.length > MAX_BATCH) return "Batch size not allowed"
  for (const c of calls) {
    const method = (c as { method?: unknown } | null)?.method
    if (typeof method !== "string" || !ALLOWED.has(method)) return "Method not allowed"
  }
  return null
}

export function sameSite(origin: string | null, host: string | null): boolean {
  if (!origin || !host) return false
  try {
    return new URL(origin).host === host
  } catch {
    return false
  }
}

// ponytail: counted per server instance; a shared counter (e.g. Upstash) if abuse spreads over many instances
const WINDOW_MS = 60_000
const PER_WINDOW = 120
const MAX_CALLERS = 10_000
const seen = new Map<string, { at: number; n: number }>()

export function allow(ip: string, now = Date.now()): boolean {
  const s = seen.get(ip)
  if (s && now - s.at < WINDOW_MS) return ++s.n <= PER_WINDOW
  if (!s && seen.size >= MAX_CALLERS) {
    for (const [k, v] of seen) if (now - v.at >= WINDOW_MS) seen.delete(k)
    // Still full inside one minute: refuse newcomers rather than grow or forget the counts.
    if (seen.size >= MAX_CALLERS) return false
  }
  seen.set(ip, { at: now, n: 1 })
  return true
}
