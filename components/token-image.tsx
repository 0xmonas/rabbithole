"use client"

import { useState } from "react"
import { ExternalLink } from "lucide-react"
import { cn } from "@/lib/utils"
import { getOpenSeaUrl } from "@/lib/utils"

interface TokenImageProps {
  tokenId: number
  imageUrl?: string
  size: number
  maxSize: number
  className?: string
  containerStyle?: React.CSSProperties
  showOpenSeaLink?: boolean
  previewSize?: "small" | "medium" | "large"
}

export function TokenImage({ 
  tokenId, 
  imageUrl, 
  size, 
  maxSize,
  className = "",
  containerStyle = {},
  showOpenSeaLink = true,
  previewSize = "medium"
}: TokenImageProps) {
  const [showPreview, setShowPreview] = useState(false)
  const [previewPosition, setPreviewPosition] = useState({ x: 0, y: 0 })

  const openSeaUrl = getOpenSeaUrl(tokenId)

  const previewSizes = {
    small: "w-32 h-32",
    medium: "w-48 h-48", 
    large: "w-64 h-64"
  }

  const handleMouseEnter = (e: React.MouseEvent) => {
    const rect = e.currentTarget.getBoundingClientRect()
    setPreviewPosition({
      x: rect.right + 10,
      y: rect.top
    })
    setShowPreview(true)
  }

  const handleMouseLeave = () => {
    setShowPreview(false)
  }

  const handleClick = (e: React.MouseEvent) => {
    if (showOpenSeaLink) {
      e.stopPropagation()
      window.open(openSeaUrl, '_blank', 'noopener,noreferrer')
    }
  }

  const fallbackCircle = (
    <div
      className="rounded-full bg-black"
      style={{
        width: `${Math.max(4, (size / maxSize) * 100)}%`,
        height: `${Math.max(4, (size / maxSize) * 100)}%`,
      }}
    ></div>
  )

  return (
    <>
      <div
        className={cn(
          "relative group",
          showOpenSeaLink ? "cursor-pointer" : "",
          className
        )}
        style={containerStyle}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        onClick={handleClick}
      >
        <div className="w-full h-full flex items-center justify-center relative">
          {imageUrl ? (
            <img 
              src={imageUrl} 
              alt={`rh #${tokenId}`}
              className="w-full h-full object-contain transition-transform duration-200 group-hover:scale-105"
            />
          ) : (
            fallbackCircle
          )}
          
          {/* OpenSea Link Indicator */}
          {showOpenSeaLink && (
            <div className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
              <ExternalLink size={8} className="text-gray-600" />
            </div>
          )}
        </div>

        {/* Hover Tooltip */}
        {showOpenSeaLink && (
          <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-black text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-50">
            View on OpenSea
          </div>
        )}
      </div>

      {/* Large Preview on Hover */}
      {showPreview && imageUrl && (
        <div
          className={cn(
            "fixed bg-white border-2 border-black shadow-lg z-50 pointer-events-none transition-opacity duration-200",
            previewSizes[previewSize]
          )}
          style={{
            left: `${previewPosition.x}px`,
            top: `${previewPosition.y}px`,
            transform: 'translateY(-50%)'
          }}
        >
          <div className="w-full h-full p-2">
            <img 
              src={imageUrl} 
              alt={`rh #${tokenId} preview`}
              className="w-full h-full object-contain"
            />
          </div>
          <div className="absolute bottom-1 left-1 right-1 text-center">
            <div className="text-xs font-bold">rh #{tokenId}</div>
            <div className="text-xs text-gray-600">Size: {size}/{maxSize}</div>
          </div>
        </div>
      )}
    </>
  )
} 