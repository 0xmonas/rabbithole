"use client"

import { OPENSEA_URL } from "@/config/wagmi"

interface OpenSeaRedirectProps {
  large?: boolean
}

export function OpenSeaRedirect({ large = false }: OpenSeaRedirectProps) {
  return (
    <div className="flex flex-col items-center justify-center h-[70vh] border border-black p-8">
      <div className="text-center mb-8">
        <h2 className="text-xl font-bold mb-4">NO CIRCLES FOUND</h2>
        <p className="max-w-md mx-auto">
          You don't have any Rabbit Hole circles in your wallet. The mint is sold out, but you can still get circles on
          the secondary market.
        </p>
      </div>
      <a
        href={OPENSEA_URL}
        target="_blank"
        rel="noopener noreferrer"
        className={`border border-black px-4 py-2 bg-black text-white hover:bg-gray-800 ${
          large ? "px-6 py-3 text-sm" : ""
        }`}
      >
        BUY ON OPENSEA
      </a>
    </div>
  )
}

