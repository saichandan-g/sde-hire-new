import type React from "react"
import type { Metadata } from "next"
import { Inter } from "next/font/google"
import "./globals.css"
import { AppProviders } from "@/lib/context/providers"

const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "Upadyai",
  description: "AI DSA Tutor for Software Development Engineers",
    generator: 'v0.dev'
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className}>
        <AppProviders>{children}</AppProviders>
      </body>
    </html>
  )
}
