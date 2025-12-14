import type React from "react"
import "./globals.css"
import type { Metadata } from "next"
import { Inter } from "next/font/google"
import { ThemeProvider } from "@/components/theme-provider"

const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "Rabbit Hole",
  description: "An onchain experiment by Monas",
  generator: 'v0.dev',
  icons: {
    icon: '/rabbithole.png',
    shortcut: '/rabbithole.png',
    apple: '/rabbithole.png',
  }
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* CSP meta tag for immediate application - wallet libs require unsafe-eval */}
        <meta 
          httpEquiv="Content-Security-Policy" 
          content="default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' 'wasm-unsafe-eval'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data: blob: https://*.walletconnect.com https://*.reown.com https://*.walletconnect.org; connect-src 'self' https://*.shape.network https://*.walletconnect.org wss://*.walletconnect.org https://*.walletconnect.com wss://*.walletconnect.com https://api.web3modal.org https://*.reown.com wss://*.reown.com https://*.coinbase.com https://cca-lite.coinbase.com https://*.alchemy.com https://*.alchemyapi.io; frame-src 'self' https://*.walletconnect.com https://*.walletconnect.org https://*.reown.com; worker-src 'self' blob:;"
        />
      </head>
      <body className={inter.className}>
        <ThemeProvider attribute="class" defaultTheme="light" enableSystem disableTransitionOnChange>
          {children}
        </ThemeProvider>
      </body>
    </html>
  )
}

