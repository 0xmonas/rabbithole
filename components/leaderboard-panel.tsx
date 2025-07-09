"use client"

import { useState, useMemo } from "react"
import { useLeaderboard, type LeaderboardUser } from "@/hooks/use-leaderboard"
import { cn, getOpenSeaUserUrl } from "@/lib/utils"
import { Trophy, Search, RefreshCw, Medal, Award, Crown, User, Wallet, Sprout } from "lucide-react"

interface LeaderboardPanelProps {
  address: string | null
}

export function LeaderboardPanel({ address }: LeaderboardPanelProps) {
  const { users, totalUsers, totalCircles, totalSize, currentUserRank, loading, error, refreshLeaderboard } = useLeaderboard(address)
  
  const [searchTerm, setSearchTerm] = useState("")
  const [sortBy, setSortBy] = useState<"rank" | "circles" | "totalSize">("rank")
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 20

  // Filter and sort users (following StatsPanel pattern for data processing)
  const filteredUsers = useMemo(() => {
    let filtered = users.filter(user => 
      user.address.toLowerCase().includes(searchTerm.toLowerCase())
    )

    // Sort by selected column
    switch (sortBy) {
      case "rank":
        filtered.sort((a, b) => a.rank - b.rank)
        break
      case "circles":
        filtered.sort((a, b) => b.circles - a.circles)
        break
      case "totalSize":
        filtered.sort((a, b) => b.totalSize - a.totalSize)
        break
    }

    return filtered
  }, [users, searchTerm, sortBy])

  // Pagination
  const totalPages = Math.ceil(filteredUsers.length / itemsPerPage)
  const paginatedUsers = filteredUsers.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  )

  // Address formatting helper
  const formatAddress = (addr: string) => `${addr.slice(0, 6)}...${addr.slice(-4)}`

  // Get rank badge for top 3 (following terminal aesthetic)
  const getRankBadge = (rank: number) => {
    switch (rank) {
      case 1:
        return <Crown size={14} className="text-yellow-600" />
      case 2:
        return <Medal size={14} className="text-gray-500" />
      case 3:
        return <Award size={14} className="text-orange-600" />
      default:
        return <span className="text-xs">#{rank}</span>
    }
  }

  // Loading skeleton (following StatsPanel pattern)
  if (loading) {
    return (
      <div className="flex-1 p-4 overflow-y-auto">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded mb-4"></div>
          <div className="space-y-3">
            {Array.from({ length: 10 }).map((_, i) => (
              <div key={i} className="h-6 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
        <p className="mt-4 text-gray-500 text-center">Loading leaderboard...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex-1 p-4 overflow-y-auto">
        <div className="text-center py-8">
          <Trophy size={48} className="mx-auto text-gray-400 mb-4" />
          <h3 className="font-bold mb-2">Failed to Load Leaderboard</h3>
          <p className="text-gray-500 mb-4">{error}</p>
          <button
            onClick={refreshLeaderboard}
            className="border border-black px-4 py-2 bg-black text-white hover:bg-gray-800"
          >
            Retry
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 p-4 overflow-y-auto">
      <div className="grid grid-cols-1 gap-6">
        
        {/* Header Statistics (following StatsPanel pattern) */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          
          {/* Overall Statistics */}
          <div className="border border-black">
            <div className="border-b border-black p-2 bg-gray-100">
              <div className="uppercase font-bold">LEADERBOARD STATS</div>
            </div>
            <div className="p-3">
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div>
                  <div className="text-gray-500">Total Users</div>
                  <div className="text-xl font-bold">{totalUsers}</div>
                </div>
                <div>
                  <div className="text-gray-500">Total Circles</div>
                  <div className="text-xl font-bold">{totalCircles}</div>
                </div>
                <div className="text-gray-500 col-span-2">Total Size</div>
                <div className="text-xl font-bold col-span-2">{totalSize.toLocaleString()}</div>
              </div>
            </div>
          </div>

          {/* Your Rank */}
          <div className="border border-black">
            <div className="border-b border-black p-2 bg-gray-100">
              <div className="uppercase font-bold">YOUR POSITION</div>
            </div>
            <div className="p-3">
              {address ? (
                currentUserRank ? (
                  <div className="text-center">
                    <div className="text-xs text-gray-500 mb-1">YOUR RANK</div>
                    <div className="text-2xl font-bold flex items-center justify-center gap-2">
                      {getRankBadge(currentUserRank)}
                      #{currentUserRank}
                    </div>
                    <div className="text-xs text-gray-500 mt-1">
                      Top {((currentUserRank / totalUsers) * 100).toFixed(1)}%
                    </div>
                  </div>
                ) : (
                  <div className="text-center text-gray-500">
                    <User size={24} className="mx-auto mb-2" />
                    <div className="text-xs">No tokens found</div>
                  </div>
                )
              ) : (
                <div className="text-center text-gray-500">
                  <User size={24} className="mx-auto mb-2" />
                  <div className="text-xs">Connect wallet to see your rank</div>
                </div>
              )}
            </div>
          </div>

          {/* Controls */}
          <div className="border border-black">
            <div className="border-b border-black p-2 bg-gray-100">
              <div className="uppercase font-bold">CONTROLS</div>
            </div>
            <div className="p-3 space-y-3">
              {/* Search */}
              <div>
                <div className="text-xs text-gray-500 mb-1">Search Address</div>
                <div className="relative">
                  <Search size={12} className="absolute left-2 top-1.5 text-gray-400" />
                  <input
                    type="text"
                    placeholder="0x..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full border border-black pl-6 pr-2 py-1 text-xs font-mono"
                  />
                </div>
              </div>
              
              {/* Refresh */}
              <button
                onClick={refreshLeaderboard}
                disabled={loading}
                className="w-full border border-black px-2 py-1 text-xs flex items-center justify-center hover:bg-gray-100 disabled:opacity-50"
              >
                <RefreshCw size={12} className="mr-1" />
                Refresh
              </button>
            </div>
          </div>
        </div>

        {/* Main Leaderboard Table */}
        <div className="border border-black">
          <div className="border-b border-black p-2 bg-gray-100">
            <div className="uppercase font-bold flex items-center justify-between">
              <div className="flex items-center">
                <Trophy size={16} className="mr-2" />
                RABBIT HOLE LEADERBOARD
              </div>
              <div className="text-xs">
                Showing {paginatedUsers.length} of {filteredUsers.length} users
              </div>
            </div>
          </div>
          
          {/* Table Controls */}
          <div className="border-b border-black p-2 bg-gray-50 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <span className="text-xs font-bold">Sort by:</span>
              {(['rank', 'circles', 'totalSize'] as const).map((column) => (
                <button
                  key={column}
                  onClick={() => setSortBy(column)}
                  className={cn(
                    "text-xs px-2 py-1 border border-black",
                    sortBy === column ? "bg-black text-white" : "hover:bg-gray-100"
                  )}
                >
                  {column === 'totalSize' ? 'Total Size' : 
                   column.charAt(0).toUpperCase() + column.slice(1)}
                </button>
              ))}
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-black">
                  <th className="p-2 text-xs">RANK</th>
                  <th className="p-2 text-xs">USER</th>
                  <th className="p-2 text-xs">CIRCLES</th>
                  <th className="p-2 text-xs">TOTAL SIZE</th>
                  <th className="p-2 text-xs">LOCATIONS</th>
                </tr>
              </thead>
              <tbody>
                {paginatedUsers.map((user) => {
                  const isCurrentUser = address && user.address.toLowerCase() === address.toLowerCase()
                  
                  return (
                    <tr 
                      key={user.address} 
                      className={cn(
                        "border-b border-gray-200 hover:bg-gray-50",
                        isCurrentUser && "bg-blue-50 font-bold"
                      )}
                    >
                      <td className="p-2">
                        <div className="flex items-center">
                          {getRankBadge(user.rank)}
                        </div>
                      </td>
                      <td className="p-2">
                        <div className="font-mono text-xs">
                          <a
                            href={getOpenSeaUserUrl(user.address)}
                            target="_blank"
                            rel="noopener noreferrer"
                            title={`View ${user.address} on OpenSea`}
                          >
                            {formatAddress(user.address)}
                          </a>
                          {isCurrentUser && (
                            <span className="ml-2 text-green-600 font-bold">(YOU)</span>
                          )}
                        </div>
                      </td>
                      <td className="p-2">
                        <div className="text-xs">{user.circles}</div>
                      </td>
                      <td className="p-2">
                        <div className="text-xs font-bold">{user.totalSize.toLocaleString()}</div>
                      </td>
                      <td className="p-2">
                        <div className="flex items-center gap-2 text-xs">
                          {user.walletTokens.length > 0 && (
                            <div className="flex items-center">
                              <Wallet size={10} className="mr-1" />
                              <span>{user.walletTokens.length}</span>
                            </div>
                          )}
                          {user.gardenTokens.length > 0 && (
                            <div className="flex items-center">
                              <Sprout size={10} className="mr-1" />
                              <span>{user.gardenTokens.length}</span>
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="border-t border-black p-2 bg-gray-50 flex items-center justify-between">
              <div className="text-xs">
                Page {currentPage} of {totalPages} • {itemsPerPage} users per page
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                  disabled={currentPage === 1}
                  className="text-xs px-2 py-1 border border-black disabled:opacity-50 hover:bg-gray-100"
                >
                  Previous
                </button>
                <button
                  onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                  disabled={currentPage === totalPages}
                  className="text-xs px-2 py-1 border border-black disabled:opacity-50 hover:bg-gray-100"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer Stats */}
        <div className="text-center text-xs text-gray-500">
          <div>Updated: {new Date().toLocaleTimeString()}</div>
          <div>Data refreshes every 5 minutes • Manual refresh available</div>
        </div>
      </div>
    </div>
  )
} 