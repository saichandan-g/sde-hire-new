"use client"

import { AuthLayout } from "@/components/layout/auth-layout"
import { StatsSection } from "./components/stats-section"
import { FeaturesSection } from "./components/features-section"

export default function DashboardPage() {
  return (
    <AuthLayout>
      <div className="p-6">
        <h1 className="text-3xl font-bold mb-6">Welcome to <span className="text-blue-600">Upady</span><span className="text-yellow-500">ai</span></h1>

        <StatsSection />

        <h2 className="text-xl font-semibold mb-4">Continue Learning</h2>

        <FeaturesSection />
      </div>
    </AuthLayout>
  )
}
