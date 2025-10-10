import type React from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"

interface StatsCardProps {
  title: string
  description: string
  value: string | number
  icon: React.ReactNode
  linkHref?: string   // made optional
  linkText?: string   // made optional
}

export function StatsCard({ title, description, value, icon, linkHref, linkText }: StatsCardProps) {
  return (
    <div className="rounded-lg border bg-card text-card-foreground shadow-sm">
      <div className="pb-2 pt-6 px-6">
        <div className="text-lg font-medium">{title}</div>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
      <div className="p-6 pt-0">
        <div className="flex justify-between items-center">
          <div className="text-3xl font-bold">{value}</div>
          {linkHref && linkText && (   // only show button if both exist
            <Button variant="outline" size="sm" asChild>
              <Link href={linkHref} className="flex items-center gap-1">
                {icon}
                {linkText}
              </Link>
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}
