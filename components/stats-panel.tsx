"use client"

import { useMemo } from "react"
import type { NFT } from "@/types/nft"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts"

interface StatsPanelProps {
  nfts: NFT[]
}

export function StatsPanel({ nfts }: StatsPanelProps) {
  const totalCircles = nfts.length
  const totalSize = useMemo(() => nfts.reduce((sum, nft) => sum + nft.size, 0), [nfts])
  const averageSize = useMemo(
    () => (totalCircles > 0 ? Math.round(totalSize / totalCircles) : 0),
    [totalSize, totalCircles],
  )
  const largestCircle = useMemo(() => nfts.reduce((max, nft) => (nft.size > max ? nft.size : max), 0), [nfts])
  const smallestCircle = useMemo(
    () => (nfts.length > 0 ? nfts.reduce((min, nft) => (nft.size < min ? nft.size : min), nfts[0]?.size || 0) : 0),
    [nfts],
  )

  // Size distribution for chart
  const sizeDistribution = useMemo(() => {
    const ranges = [
      { name: "1-10", min: 1, max: 10, count: 0 },
      { name: "11-50", min: 11, max: 50, count: 0 },
      { name: "51-100", min: 51, max: 100, count: 0 },
      { name: "101-250", min: 101, max: 250, count: 0 },
      { name: "251-500", min: 251, max: 500, count: 0 },
      { name: "501-750", min: 501, max: 750, count: 0 },
      { name: "751-1000", min: 751, max: 1000, count: 0 },
    ]

    nfts.forEach((nft) => {
      const range = ranges.find((r) => nft.size >= r.min && nft.size <= r.max)
      if (range) range.count++
    })

    return ranges
  }, [nfts])

  return (
    <div className="flex-1 p-4 overflow-y-auto">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="border border-black">
          <div className="border-b border-black p-2 bg-gray-100">
            <div className="uppercase font-bold">CIRCLE STATISTICS</div>
          </div>
          <div className="p-3">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className="text-[10px] text-gray-500 mb-1">TOTAL CIRCLES</div>
                <div className="text-xl font-bold">{totalCircles}</div>
              </div>
              <div>
                <div className="text-[10px] text-gray-500 mb-1">TOTAL SIZE</div>
                <div className="text-xl font-bold">{totalSize}</div>
              </div>
              <div>
                <div className="text-[10px] text-gray-500 mb-1">AVERAGE SIZE</div>
                <div className="text-xl font-bold">{averageSize}</div>
              </div>
              <div>
                <div className="text-[10px] text-gray-500 mb-1">LARGEST CIRCLE</div>
                <div className="text-xl font-bold">{largestCircle}</div>
              </div>
              <div>
                <div className="text-[10px] text-gray-500 mb-1">SMALLEST CIRCLE</div>
                <div className="text-xl font-bold">{smallestCircle}</div>
              </div>
              <div>
                <div className="text-[10px] text-gray-500 mb-1">MAX SIZE CIRCLES</div>
                <div className="text-xl font-bold">{nfts.filter((nft) => nft.size === 1000).length}</div>
              </div>
            </div>
          </div>
        </div>

        <div className="border border-black">
          <div className="border-b border-black p-2 bg-gray-100">
            <div className="uppercase font-bold">SIZE DISTRIBUTION</div>
          </div>
          <div className="p-3 h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={sizeDistribution} margin={{ top: 10, right: 10, left: 0, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" angle={-45} textAnchor="end" />
                <YAxis />
                <Tooltip
                  formatter={(value) => [`${value} circles`, "Count"]}
                  contentStyle={{
                    backgroundColor: "#fff",
                    border: "1px solid #000",
                    borderRadius: "0",
                    fontFamily: "monospace",
                    fontSize: "12px",
                  }}
                />
                <Bar dataKey="count" fill="#000" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="border border-black md:col-span-2">
          <div className="border-b border-black p-2 bg-gray-100">
            <div className="uppercase font-bold">YOUR CIRCLES</div>
          </div>
          <div className="p-3 overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-black">
                  <th className="p-2">ID</th>
                  <th className="p-2">SIZE</th>
                  <th className="p-2">% OF MAX</th>
                  <th className="p-2">GROW COOLDOWN</th>
                  <th className="p-2">SHRINK COOLDOWN</th>
                </tr>
              </thead>
              <tbody>
                {nfts.map((nft) => (
                  <tr key={nft.id} className="border-b border-gray-200">
                    <td className="p-2">#{nft.id}</td>
                    <td className="p-2">{nft.size}</td>
                    <td className="p-2">{((nft.size / nft.maxSize) * 100).toFixed(1)}%</td>
                    <td className="p-2">
                      {nft.growCooldownRemaining > 0
                        ? `${Math.floor(nft.growCooldownRemaining / 3600)}h ${Math.floor((nft.growCooldownRemaining % 3600) / 60)}m`
                        : "Ready"}
                    </td>
                    <td className="p-2">
                      {nft.shrinkCooldownRemaining > 0
                        ? `${Math.floor(nft.shrinkCooldownRemaining / 3600)}h ${Math.floor((nft.shrinkCooldownRemaining % 3600) / 60)}m`
                        : "Ready"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}

