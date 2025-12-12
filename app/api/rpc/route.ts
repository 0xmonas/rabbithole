import { NextRequest, NextResponse } from "next/server"

const ALCHEMY_RPC_URL = process.env.ALCHEMY_RPC_URL

async function forwardRpcRequest(request: NextRequest) {
  if (!ALCHEMY_RPC_URL) {
    return NextResponse.json(
      { error: "Alchemy RPC URL is not configured on the server" },
      { status: 500 },
    )
  }

  const requestBody = await request.text()

  try {
    const upstreamResponse = await fetch(ALCHEMY_RPC_URL, {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: requestBody,
      cache: "no-store",
    })

    const upstreamBody = await upstreamResponse.text()
    const response = new NextResponse(upstreamBody, { status: upstreamResponse.status })

    response.headers.set("content-type", upstreamResponse.headers.get("content-type") ?? "application/json")
    response.headers.set("cache-control", "no-store")

    return response
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to reach Alchemy RPC" },
      { status: 502 },
    )
  }
}

export async function POST(request: NextRequest) {
  return forwardRpcRequest(request)
}

export function GET() {
  return NextResponse.json({ error: "Method not allowed" }, { status: 405 })
}

export function OPTIONS() {
  return NextResponse.json(
    {},
    {
      status: 204,
      headers: {
        Allow: "POST",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "content-type",
      },
    },
  )
}
