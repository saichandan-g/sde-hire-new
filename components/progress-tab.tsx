import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Code } from "lucide-react"
import { useProgress } from "@/lib/context/progress-context"

export function ProgressTab() {
  const { getProgressByDifficulty } = useProgress()

  const easyProgress = getProgressByDifficulty("easy")
  const mediumProgress = getProgressByDifficulty("medium")
  const hardProgress = getProgressByDifficulty("hard")

  const calculatePercentage = (solved: number, total: number) => {
    if (total === 0) return 0
    return Math.round((solved / total) * 100)
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Problem Solving Progress</CardTitle>
          <CardDescription>Track your progress across different difficulty levels</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            <div>
              <div className="flex justify-between mb-1">
                <span className="text-sm font-medium flex items-center">
                  <Badge variant="outline" className="mr-2">
                    Easy
                  </Badge>
                  {easyProgress.solved}/{easyProgress.total} solved
                </span>
                <span className="text-sm font-medium">
                  {calculatePercentage(easyProgress.solved, easyProgress.total)}%
                </span>
              </div>
              <div className="w-full h-2 bg-secondary rounded-full overflow-hidden">
                <div
                  className="h-full bg-primary"
                  style={{ width: `${calculatePercentage(easyProgress.solved, easyProgress.total)}%` }}
                ></div>
              </div>
            </div>

            <div>
              <div className="flex justify-between mb-1">
                <span className="text-sm font-medium flex items-center">
                  <Badge variant="secondary" className="mr-2">
                    Medium
                  </Badge>
                  {mediumProgress.solved}/{mediumProgress.total} solved
                </span>
                <span className="text-sm font-medium">
                  {calculatePercentage(mediumProgress.solved, mediumProgress.total)}%
                </span>
              </div>
              <div className="w-full h-2 bg-secondary rounded-full overflow-hidden">
                <div
                  className="h-full bg-primary"
                  style={{ width: `${calculatePercentage(mediumProgress.solved, mediumProgress.total)}%` }}
                ></div>
              </div>
            </div>

            <div>
              <div className="flex justify-between mb-1">
                <span className="text-sm font-medium flex items-center">
                  <Badge variant="destructive" className="mr-2">
                    Hard
                  </Badge>
                  {hardProgress.solved}/{hardProgress.total} solved
                </span>
                <span className="text-sm font-medium">
                  {calculatePercentage(hardProgress.solved, hardProgress.total)}%
                </span>
              </div>
              <div className="w-full h-2 bg-secondary rounded-full overflow-hidden">
                <div
                  className="h-full bg-primary"
                  style={{ width: `${calculatePercentage(hardProgress.solved, hardProgress.total)}%` }}
                ></div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Recent Submissions</CardTitle>
          <CardDescription>Your most recent problem submissions</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <Code className="h-12 w-12 mx-auto mb-4 opacity-20" />
            <p>No submissions yet</p>
            <p className="text-sm">Start solving problems to see your submissions here</p>
          </div>
        </CardContent>
      </Card>
    </>
  )
}
