"use client"

import { useState, useEffect } from "react"
import Image from "next/image"
import { ConnectButton } from "@/components/connect-button"
import { NFTGallery } from "@/components/nft-gallery"
import { NFTDetail } from "@/components/nft-detail"
import { MergePanel } from "@/components/merge-panel"
import { GardenPanel } from "@/components/garden-panel"
import { StatsPanel } from "@/components/stats-panel"
import { OpenSeaRedirect } from "@/components/opensea-redirect"
import { NetworkSwitchModal } from "@/components/network-switch-modal"
import { useAccount, useChainId } from "wagmi"
import { useNFTs } from "@/hooks/use-nfts"
import { shapeChain } from "@/config/wagmi"
import { Providers } from "./providers"
import { ExternalLink } from "lucide-react"

// Main app component that uses wagmi hooks
function RabbitHoleAppInner() {
  const { address, isConnected } = useAccount()
  const chainId = useChainId()
  const { nfts, isLoading, error, refreshNFTs } = useNFTs(address || null)
  const [selectedNFT, setSelectedNFT] = useState<number | null>(null)
  const [activeSection, setActiveSection] = useState("GALLERY")
  const [mergeMode, setMergeMode] = useState(false)
  const [showNetworkModal, setShowNetworkModal] = useState(false)
  const [selectedNFTsForMerge, setSelectedNFTsForMerge] = useState<number[]>([])

  // Calculate network status
  const isCorrectNetwork = chainId === shapeChain.id
  const isNetworkLoading = false // With RainbowKit, network status is immediate

  // Check if we need to show the network switch modal
  useEffect(() => {
    if (isConnected && !isNetworkLoading && !isCorrectNetwork) {
      console.log(
        "Showing network modal. Connected:",
        isConnected,
        "Network loading:",
        isNetworkLoading,
        "Correct network:",
        isCorrectNetwork,
        "Chain ID:",
        chainId,
      )
      setShowNetworkModal(true)
    } else {
      setShowNetworkModal(false)
    }
  }, [isConnected, isNetworkLoading, isCorrectNetwork, chainId])

  // Debug network status
  useEffect(() => {
    console.log("Network status:", {
      isConnected,
      chainId,
      isCorrectNetwork,
      isNetworkLoading,
    })
  }, [isConnected, chainId, isCorrectNetwork, isNetworkLoading])

  // Sections for the main navigation
  const sections = [
    { id: "GALLERY", name: "GALLERY [S0.1]" },
    { id: "STATS", name: "STATS [S0.2]" },
    { id: "MERGE", name: "MERGE [S0.3]" },
    { id: "GARDEN", name: "GARDEN [S0.4]" },
    { id: "ABOUT", name: "ABOUT [S0.5]" },
  ]

  // Toggle NFT selection for merge
  const toggleNFTForMerge = (id: number) => {
    if (selectedNFTsForMerge.includes(id)) {
      setSelectedNFTsForMerge(selectedNFTsForMerge.filter((nftId) => nftId !== id))
    } else {
      setSelectedNFTsForMerge([...selectedNFTsForMerge, id])
    }
  }

  // Clear merge selection when exiting merge mode
  const handleToggleMergeMode = () => {
    setMergeMode(!mergeMode)
    if (mergeMode) {
      setSelectedNFTsForMerge([]) // Clear selection when exiting merge mode
    }
  }

  // Network status indicator
  const NetworkStatus = () => (
    <div className="flex items-center space-x-2">
      <div className={`w-2 h-2 rounded-full ${isCorrectNetwork ? "bg-green-500" : "bg-red-500"}`}></div>
      <span className="text-xs">
        {isNetworkLoading
          ? "Checking network..."
          : isCorrectNetwork
            ? "Shape Network"
            : `Wrong Network (ID: ${chainId || "Unknown"})`}
      </span>
      {isConnected && !isCorrectNetwork && (
        <button onClick={() => setShowNetworkModal(true)} className="text-xs underline">
          Switch
        </button>
      )}
    </div>
  )

  return (
    <div className="min-h-screen flex flex-col font-mono text-xs bg-[#f2f1ea] text-black">
      {/* Network Switch Modal */}
      <NetworkSwitchModal
        isOpen={showNetworkModal}
        onClose={() => setShowNetworkModal(false)}
        currentChainId={chainId}
      />

      {/* Header */}
      <header className="border-b border-black p-4">
        <div className="container mx-auto flex justify-between items-center">
          <div className="flex items-center space-x-3">
            <h1 className="text-2xl font-bold">RABBIT HOLE</h1>
            <div className="hidden md:block">
              <Image
                src="/rabbithole.png"
                alt="Rabbit Hole Logo"
                width={32}
                height={32}
                className="object-contain"
              />
            </div>
          </div>

          <div className="flex items-center space-x-4">
            {isConnected && <NetworkStatus />}
            <ConnectButton />
            <span className="text-xs">V.1.0.0</span>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 container mx-auto p-4 md:p-8">
        {!isConnected ? (
          <div className="flex flex-col items-center justify-center h-[70vh] border border-black p-8">
            <div className="text-center mb-8">
              <h2 className="text-xl font-bold mb-4">WELCOME TO RABBIT HOLE</h2>
              <p className="max-w-md mx-auto">
                Connect your wallet to manage your circle NFTs. Grow, shrink, and merge your circles to discover what
                lies at the end of the rabbit hole.
              </p>
            </div>
            <ConnectButton large />
          </div>
        ) : !isCorrectNetwork ? (
          <div className="flex flex-col items-center justify-center h-[70vh] border border-black p-8">
            <div className="text-center mb-8">
              <h2 className="text-xl font-bold mb-4">WRONG NETWORK</h2>
              <p className="max-w-md mx-auto">
                Please switch to the Shape network (Chain ID: 360) to interact with Rabbit Hole.
              </p>
              <p className="mt-4 text-sm text-gray-600">
                Current Network: {chainId ? `Chain ID: ${chainId}` : "Unknown"}
              </p>
            </div>
            <button
              onClick={() => setShowNetworkModal(true)}
              className="border border-black px-6 py-3 text-sm bg-black text-white hover:bg-gray-800"
            >
              SWITCH NETWORK
            </button>
          </div>
        ) : isLoading ? (
          <div className="flex flex-col items-center justify-center h-[70vh] border border-black p-8">
            <div className="animate-pulse flex space-x-4">
              <div className="rounded-full bg-gray-200 h-12 w-12"></div>
              <div className="flex-1 space-y-4 py-1">
                <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                <div className="space-y-2">
                  <div className="h-4 bg-gray-200 rounded"></div>
                  <div className="h-4 bg-gray-200 rounded w-5/6"></div>
                </div>
              </div>
            </div>
            <p className="mt-4 text-gray-500">Loading your circles...</p>
          </div>
        ) : (
          <div className="border border-black rounded-sm overflow-hidden">
            <div className="flex flex-col h-[calc(100vh-12rem)] md:h-[calc(100vh-16rem)]">
              {/* Sections Navigation */}
              <div className="flex border-b border-black">
                <div className="border-r border-black p-2 w-64">YOUR CIRCLES</div>
                <div className="flex-1 flex">
                  {sections.map((section) => (
                    <div
                      key={section.id}
                      className={`border-r border-black p-2 flex-1 text-center cursor-pointer ${
                        activeSection === section.id ? "bg-black text-white" : "hover:bg-gray-100"
                      }`}
                      onClick={() => {
                        setActiveSection(section.id)
                        if (section.id !== "MERGE") {
                          setMergeMode(false)
                          setSelectedNFTsForMerge([]) // Clear selection when leaving merge
                        }
                      }}
                    >
                      {section.name}
                    </div>
                  ))}
                </div>
              </div>

              {/* Main Content Area */}
              <div className="flex-1 flex overflow-hidden">
                {/* Left Sidebar - NFT Gallery */}
                <div className="w-64 border-r border-black flex flex-col">
                  <div className="flex-1 overflow-y-auto">
                    <NFTGallery
                      nfts={nfts}
                      loading={isLoading}
                      selectedNFT={selectedNFT}
                      onSelectNFT={setSelectedNFT}
                      mergeMode={mergeMode}
                      selectedNFTsForMerge={selectedNFTsForMerge}
                      onToggleNFTForMerge={toggleNFTForMerge}
                    />
                  </div>
                </div>

                {/* Main Content Area */}
                <div className="flex-1 flex flex-col overflow-hidden">
                  {activeSection === "GALLERY" && (
                    <NFTDetail
                      nft={nfts.find((nft) => nft.id === selectedNFT)}
                      onGrow={refreshNFTs}
                      onShrink={refreshNFTs}
                    />
                  )}

                  {activeSection === "STATS" && <StatsPanel nfts={nfts} address={address || null} />}

                  {activeSection === "MERGE" && (
                    <MergePanel
                      nfts={nfts}
                      onMergeComplete={refreshNFTs}
                      onToggleMergeMode={handleToggleMergeMode}
                      mergeMode={mergeMode}
                      selectedNFTsForMerge={selectedNFTsForMerge}
                    />
                  )}

                  {activeSection === "GARDEN" && (
                    <GardenPanel 
                      address={address || null}
                      userNFTs={nfts}
                      onRefreshUserNFTs={refreshNFTs}
                    />
                  )}

                  {activeSection === "ABOUT" && (
                    <div className="p-6 overflow-y-auto">
                      <h2 className="text-xl font-bold mb-4">ABOUT RABBIT HOLE</h2>
                      <div className="border border-black mb-4">
                        <div className="border-b border-black p-2 bg-gray-100">
                          <div className="uppercase font-bold">PROJECT INFO</div>
                        </div>
                        <div className="p-4">
                          <p className="mb-4">
                            Rabbit Hole is an on-chain experiment where each NFT is a circle that can grow or shrink.
                          </p>
                          <p className="mb-4">
                            Every day, you can grow or shrink your circle by 1 unit. The minimum size is 1, and the
                            maximum size is 1000.
                          </p>
                          <p>
                            You can also merge multiple circles together to create a new, larger circle. If the combined
                            size exceeds 1000, a remainder circle will be created.
                          </p>
                        </div>
                      </div>

                      <div className="border border-black mb-4">
                        <div className="border-b border-black p-2 bg-gray-100">
                          <div className="uppercase font-bold">HOW TO PLAY?</div>
                        </div>
                        <div className="p-4">
                          <div className="mb-6">
                            <p className="font-bold mb-2">COLLECT!</p>
                            <p className="mb-4">
                              Explore secondary markets to get your Rabbit Hole NFTs:
                            </p>
                            <div className="ml-4 mb-4">
                              <div className="mb-2">
                                <a 
                                  href="https://opensea.io/collection/rabbit-hole-shape" 
                                  target="_blank" 
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center text-blue-600 hover:text-blue-800 underline"
                                >
                                  OpenSea Marketplace <ExternalLink size={12} className="ml-1" />
                                </a>
                              </div>
                              <div className="mb-2">
                                <a 
                                  href="https://highlight.xyz" 
                                  target="_blank" 
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center text-blue-600 hover:text-blue-800 underline"
                                >
                                  Highlight.xyz <ExternalLink size={12} className="ml-1" />
                                </a>
                              </div>
                              <div className="mb-2">
                                <span>Or any other </span>
                                <a 
                                  href="https://twitter.com/SHAPE_L2" 
                                  target="_blank" 
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center text-blue-600 hover:text-blue-800 underline"
                                >
                                  @SHAPE_L2 <ExternalLink size={12} className="ml-1" />
                                </a>
                                <span> marketplace</span>
                              </div>
                            </div>
                            <p className="mb-4">
                              For bridging assets to Shape L2, we recommend:{" "}
                              <a 
                                href="https://relay.link/bridge" 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="inline-flex items-center text-blue-600 hover:text-blue-800 underline"
                              >
                                Relay Bridge <ExternalLink size={12} className="ml-1" />
                              </a>
                              {" "}or visit{" "}
                              <a 
                                href="https://shape.network" 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="inline-flex items-center text-blue-600 hover:text-blue-800 underline"
                              >
                                Shape.network <ExternalLink size={12} className="ml-1" />
                              </a>
                              {" "}for more options.
                            </p>
                          </div>

                          <div className="mb-6">
                            <p className="font-bold mb-2">GROW & SHRINK</p>
                            <p className="mb-4">
                              Each token can grow or shrink once per day:
                              <br />
                              ⚫️5 → ⚫️6 or ⚫️6 → ⚫️5
                              <br />
                              (Min size: 1, Max size: 1000)
                            </p>
                            <p className="mb-4">
                              Usage: Use the Grow/Shrink buttons in the Gallery or call the contract functions directly.
                            </p>
                          </div>

                          <div className="mb-6">
                            <p className="font-bold mb-2">MERGE</p>
                            <p className="mb-4">
                              Smaller tokens merge into larger ones and are burned in the process:
                              <br />
                              ⚫️3 + ⚫️2 = ⚫️5 (⚪️🔥 ⚪️🔥)
                            </p>
                            <p className="mb-4">
                              If the combined size exceeds 1000, a new token will be created for the overflow:
                              <br />
                              ⚫️800 + ⚫️400 = ⚫️1000 and ⚫️200
                            </p>
                            <p className="mb-4">
                              Usage: Go to the Merge [S0.3] tab, select multiple tokens, and click the merge button.
                            </p>
                          </div>

                          <div className="mb-6">
                            <p className="font-bold mb-2">GARDEN</p>
                            <p className="mb-4">
                              Plant your tokens in the community garden for automated growing:
                              <br />
                              🌱 Plant → 🌿 Community grows → 🌳 Harvest
                            </p>
                            <p className="mb-4">
                              Usage: Go to the Garden [S0.4] tab to plant, work, and uproot your tokens.
                            </p>
                          </div>

                          <div className="mb-6">
                            <p className="font-bold mb-2">1/1 ACHIEVEMENT</p>
                            <p className="mb-4">
                              When a token reaches size 1000, it becomes a 1/1, unlocking the ability to add unique metadata:
                              <br />
                              ⚫️1000 = 🎨 ("You've hit max capacity—time to make it truly one of a kind!")
                            </p>
                          </div>

                          <div>
                            <p className="font-bold mb-2">STAY SAFE</p>
                            <p className="mb-2">
                              Always make sure you're connected to the correct contract:
                            </p>
                            <div className="ml-4">
                              <a 
                                href="https://explorer.shape.network/address/0xCA38813D69409E4E50F1411A0CAB2570E570C75A" 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="inline-flex items-center text-blue-600 hover:text-blue-800 underline font-mono text-xs"
                              >
                                0xCA38813D69409E4E50F1411A0CAB2570E570C75A <ExternalLink size={12} className="ml-1" />
                              </a>
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="border border-black">
                        <div className="border-b border-black p-2 bg-gray-100">
                          <div className="uppercase font-bold">CREDITS</div>
                        </div>
                        <div className="p-4 space-y-3">
                          <div>
                            <p className="font-bold mb-1">ORIGINAL PROJECT</p>
                            <p>
                              Created by{" "}
                              <a 
                                href="https://twitter.com/0xmonas" 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="inline-flex items-center text-blue-600 hover:text-blue-800 underline"
                              >
                                @0xmonas <ExternalLink size={12} className="ml-1" />
                              </a>
                            </p>
                          </div>
                          <div>
                            <p className="font-bold mb-1">GARDEN CONTRACT</p>
                            <p>
                              Special thanks to{" "}
                              <a 
                                href="https://twitter.com/takenstheorem" 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="inline-flex items-center text-blue-600 hover:text-blue-800 underline"
                              >
                                @takenstheorem <ExternalLink size={12} className="ml-1" />
                              </a>
                              {" "}for creating the Garden contract and their invaluable contributions to the Rabbit Hole community.
                            </p>
                          </div>
                          <div>
                            <p className="font-bold mb-1">SHAPE L2 ECOSYSTEM</p>
                            <p>
                              Built on{" "}
                              <a 
                                href="https://shape.network" 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="inline-flex items-center text-blue-600 hover:text-blue-800 underline"
                              >
                                Shape Network <ExternalLink size={12} className="ml-1" />
                              </a>
                              {" "}— Follow{" "}
                              <a 
                                href="https://twitter.com/SHAPE_L2" 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="inline-flex items-center text-blue-600 hover:text-blue-800 underline"
                              >
                                @SHAPE_L2 <ExternalLink size={12} className="ml-1" />
                              </a>
                              {" "}for updates
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-black p-4">
        <div className="container mx-auto flex justify-between items-center">
          <div className="text-xs">© 2025 Rabbit Hole. All rights reserved.</div>
          <div className="flex space-x-4">
            <a href="#" className="text-xs hover:underline">
              Terms
            </a>
            <a href="#" className="text-xs hover:underline">
              Privacy
            </a>
            <a href="#" className="text-xs hover:underline">
              Support
            </a>
          </div>
        </div>
      </footer>
    </div>
  )
}

// Main export with providers wrapper
export default function RabbitHoleAppComponent() {
  return (
    <Providers>
      <RabbitHoleAppInner />
    </Providers>
  )
} 