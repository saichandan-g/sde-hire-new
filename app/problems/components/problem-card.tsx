import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { CheckCircle } from "lucide-react"
import { useProgress } from "@/lib/context/progress-context"

interface ProblemCardProps {
  id: number
  index: number
  title: string
  difficulty: string
  question: string
}

export function ProblemCard({ id, index, title, difficulty, question }: ProblemCardProps) {
  const { getProblemStatus } = useProgress()
  const status = getProblemStatus(id)

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="p-6">
        <div className="flex justify-between items-start">
          <div>
            <h2 className="text-xl font-semibold mb-2 flex items-center">
              {status === "solved" && <CheckCircle className="h-4 w-4 mr-2 text-green-500" />}
              {index + 1}. {title}
            </h2>
            <p className="text-muted-foreground mb-4 line-clamp-2">{question}</p>
            <div className="flex gap-2">
              <Badge
                variant={difficulty === "Easy" ? "outline" : difficulty === "Medium" ? "secondary" : "destructive"}
              >
                {difficulty}
              </Badge>
              {status === "solved" && <Badge variant="success">Solved</Badge>}
              {status === "attempted" && (
                <Badge variant="outline" className="bg-yellow-100 text-yellow-800 border-yellow-300">
                  Attempted
                </Badge>
              )}
            </div>
          </div>
          <Button asChild>
            <Link href={`/dsa-tutor?problem=${id}`}>{status === "solved" ? "Review" : "Solve"}</Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
