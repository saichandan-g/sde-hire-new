import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Code } from "lucide-react"

export function ProblemHeader() {
  return (
    <div className="flex justify-between items-center mb-6">
      <h1 className="text-3xl font-bold">Problem List</h1>
      <Button asChild>
        <Link href="/dsa-tutor">
          <Code className="h-4 w-4 mr-2" />
          Open DSA Tutor
        </Link>
      </Button>
    </div>
  )
}
