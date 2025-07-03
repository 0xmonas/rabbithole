"use client"

import React, { useMemo } from 'react'
import { cn } from '@/lib/utils'
import { Sprout, Loader } from "lucide-react"

interface Token {
  id: number
  size: number
}

interface GardenCommunityVisualizerProps {
  tokens: Token[]
  isLoading: boolean
}

const GardenCommunityVisualizer: React.FC<GardenCommunityVisualizerProps> = ({ tokens, isLoading }) => {
  // Memoize positions and animation details to prevent re-calculating on every render
  const particleStyles = useMemo(() => {
    return tokens.map(() => ({
      top: `${Math.random() * 95}%`,
      left: `${Math.random() * 95}%`,
      animationDuration: `${20 + Math.random() * 20}s`,
      animationDelay: `${Math.random() * -20}s`,
    }))
  }, [tokens])

  const MAX_SIZE = 1000
  const MIN_DISPLAY_SIZE = 4 // For size 1 circles (very small)
  const MAX_DISPLAY_SIZE = 120 // For size 1000 circles (much larger for dramatic effect)

  const getVisualSize = (size: number) => {
    if (size <= 1) return MIN_DISPLAY_SIZE
    // Use exponential scaling for more dramatic size differences
    const scale = Math.pow((size - 1) / (MAX_SIZE - 1), 0.7) // 0.7 exponent makes medium sizes more visible
    return MIN_DISPLAY_SIZE + scale * (MAX_DISPLAY_SIZE - MIN_DISPLAY_SIZE)
  }

  return (
    <div className="border-l border-r border-t border-black">
      <div className="border-b border-black p-2 bg-gray-100">
        <div className="uppercase font-bold">COMMUNITY GARDEN</div>
      </div>
      <div className="relative w-full h-96 bg-gray-50 overflow-hidden p-2">
        {/* Subtle dotted garden pattern background */}
        <div className="absolute inset-0" style={{ 
          backgroundImage: 'radial-gradient(circle, #e5e7eb 1px, transparent 1px)', 
          backgroundSize: '25px 25px', 
          opacity: 0.4 
        }}></div>

        {isLoading && (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-gray-600 bg-white bg-opacity-80 z-10">
            <Loader size={24} className="animate-spin mb-2" />
            <span className="text-sm">Loading community garden...</span>
          </div>
        )}

        {!isLoading && tokens.length === 0 && (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-gray-500">
            <Sprout size={24} className="mb-2" />
            <span className="text-sm">The community garden is currently empty.</span>
          </div>
        )}

        {!isLoading && tokens.map((token, index) => {
          const visualSize = getVisualSize(token.size)
          const style = {
            width: `${visualSize}px`,
            height: `${visualSize}px`,
            ...particleStyles[index],
          }

          return (
            <div
              key={token.id}
              className="absolute bg-black rounded-full transition-all duration-500 hover:border-2 hover:border-gray-600 cursor-pointer hover:scale-110"
              style={{
                ...style,
                animationName: 'float',
                animationDuration: style.animationDuration,
                animationDelay: style.animationDelay,
                animationIterationCount: 'infinite',
                animationDirection: 'alternate',
                animationTimingFunction: 'ease-in-out',
              }}
              title={`Circle #${token.id}\nSize: ${token.size}/${MAX_SIZE}\nClick to view on OpenSea`}
              onClick={() => window.open(`https://opensea.io/assets/shape/0xca38813d69409e4e50f1411a0cab2570e570c75a/${token.id}`, '_blank')}
            />
          )
        })}
      </div>
    </div>
  )
}

export default GardenCommunityVisualizer 