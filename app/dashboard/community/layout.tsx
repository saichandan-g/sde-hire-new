"use client"

import type React from "react"

import { CommunityProvider } from "@/components/community/community-context"
import { AuthLayout } from "@/components/layout/auth-layout"

export default function CommunityLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthLayout>
      <CommunityProvider>{children}</CommunityProvider>
    </AuthLayout>
  )
}
