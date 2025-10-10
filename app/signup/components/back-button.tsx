import Link from "next/link"
import { ArrowLeft } from "lucide-react"

export function BackButton() {
  return (
    <Link href="/" className="inline-flex items-center text-sm font-medium text-muted-foreground hover:text-foreground">
      <ArrowLeft className="mr-2 h-4 w-4" />
      Back to home
    </Link>
  )
}
