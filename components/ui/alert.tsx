"use client"

import * as React from "react"
import { cn } from "@/lib/utils"
import { cva } from "class-variance-authority"

const alertVariants = cva(
  "relative w-full rounded-lg border p-4 [&>svg]:h-4 [&>svg]:w-4 [&>svg+div]:translate-y-[-3px] [&:has([role=alert])]:border-destructive [&:has([role=alert])]:text-destructive",
  {
    variants: {
      variant: {
        default: "bg-background text-foreground",
        destructive: "border-destructive/50 bg-destructive text-destructive-foreground",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
)

const Alert = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & {
    variant?: "default" | "destructive"
  }
>(({ className, variant, ...props }, ref) => {
  return <div ref={ref} role="alert" className={cn(alertVariants({ variant }), className)} {...props} />
})
Alert.displayName = "Alert"

const AlertTitle = React.forwardRef<HTMLParagraphElement, React.HTMLAttributes<HTMLHeadingElement>>(
  ({ className, ...props }, ref) => {
    return <h5 ref={ref} className={cn("mb-1 font-semibold leading-none tracking-tight", className)} {...props} />
  },
)
AlertTitle.displayName = "AlertTitle"

const AlertDescription = React.forwardRef<HTMLParagraphElement, React.HTMLAttributes<HTMLParagraphElement>>(
  ({ className, ...props }, ref) => {
    return <div ref={ref} className={cn("text-sm [&:not(:first-child)]:mt-2", className)} {...props} />
  },
)
AlertDescription.displayName = "AlertDescription"

import { Circle } from "lucide-react"

const AlertCircle = Circle

export { Alert, AlertTitle, AlertDescription, AlertCircle }
