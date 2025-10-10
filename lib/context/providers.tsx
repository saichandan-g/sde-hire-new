"use client"

import type React from "react"
import { AuthProvider } from "./auth-context"
import { ProgressProvider } from "./progress-context"
import { ThemeProvider } from "./theme-context"

export function AppProviders({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider>
      <AuthProvider>
        <ProgressProvider>{children}</ProgressProvider>
      </AuthProvider>
    </ThemeProvider>
  )
}
