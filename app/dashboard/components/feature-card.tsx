import type React from "react"
import Link from "next/link"
import { ArrowRight } from "lucide-react"
import { Button } from "@/components/ui/button"

interface FeatureCardProps {
  title: string
  description: string
  content: string
  icon: React.ReactNode
  linkHref: string
  linkText: string
}

export function FeatureCard({ title, description, content, icon, linkHref, linkText }: FeatureCardProps) {
  return (
    <div className="rounded-lg border bg-card text-card-foreground shadow-sm">
      <div className="flex flex-col space-y-1.5 p-6">
        <h3 className="text-2xl font-semibold leading-none tracking-tight">{title}</h3>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
      <div className="p-6 pt-0">
        <p className="mb-4">{content}</p>
        <Button asChild>
          <Link href={linkHref} className="flex items-center gap-1">
            {icon}
            {linkText}
            <ArrowRight className="h-4 w-4 ml-1" />
          </Link>
        </Button>
      </div>
    </div>
  )
}
