"use client"

import dynamic from "next/dynamic"

// Make the entire app dynamic to prevent ALL SSR issues with RainbowKit/Wagmi
const RabbitHoleApp = dynamic(() => import("./RabbitHoleAppComponent"), {
  ssr: false,
  loading: () => (
    <div className="min-h-screen flex flex-col items-center justify-center font-mono text-xs bg-[#f2f1ea] text-black">
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
      <p className="mt-4 text-gray-500">Loading Rabbit Hole...</p>
    </div>
  )
})

export default RabbitHoleApp

