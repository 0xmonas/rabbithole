// node --test lib/rpc-guard.test.mjs
import { test } from "node:test"
import assert from "node:assert/strict"
import { allow, badBody, sameSite, MAX_BODY } from "./rpc-guard.ts"

const call = (method) => JSON.stringify({ jsonrpc: "2.0", id: 1, method, params: [] })

test("only the reads this site makes go through", () => {
  for (const m of ["eth_call", "eth_blockNumber", "eth_getTransactionReceipt", "alchemy_getAssetTransfers"]) {
    assert.equal(badBody(call(m)), null, m)
  }
  assert.equal(badBody(JSON.stringify([{ method: "eth_call" }, { method: "eth_chainId" }])), null)
  for (const m of ["eth_getLogs", "debug_traceTransaction", "trace_block", "eth_sendRawTransaction", "alchemy_getTokenBalances"]) {
    assert.ok(badBody(call(m)), m)
  }
  assert.ok(badBody(JSON.stringify([{ method: "eth_call" }, { method: "debug_traceTransaction" }])), "one bad call in a batch")
  assert.ok(badBody(JSON.stringify(Array(21).fill({ method: "eth_call" }))), "batch too long")
  assert.ok(badBody("[]"), "empty batch")
  assert.ok(badBody("null"))
  assert.ok(badBody("not json"))
  assert.ok(badBody(" ".repeat(MAX_BODY + 1)), "too large")
})

test("only this site's own pages may ask", () => {
  assert.equal(sameSite("https://hellorabbit.vercel.app", "hellorabbit.vercel.app"), true)
  assert.equal(sameSite("http://localhost:3000", "localhost:3000"), true)
  assert.equal(sameSite("https://evil.example", "hellorabbit.vercel.app"), false)
  assert.equal(sameSite(null, "hellorabbit.vercel.app"), false)
  assert.equal(sameSite("null", "hellorabbit.vercel.app"), false)
})

test("one caller gets 120 a minute, then waits for the next minute", () => {
  const t = 1_000_000
  for (let i = 0; i < 120; i++) assert.equal(allow("203.0.113.7", t + i), true, `call ${i + 1}`)
  assert.equal(allow("203.0.113.7", t + 500), false)
  assert.equal(allow("198.51.100.2", t + 500), true, "another caller is counted apart")
  assert.equal(allow("203.0.113.7", t + 60_000), true)
})
