import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Award } from "lucide-react"

export function BadgesTab() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Badges & Achievements</CardTitle>
        <CardDescription>Badges you've earned through your coding journey</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="text-center py-8 text-muted-foreground">
          <Award className="h-12 w-12 mx-auto mb-4 opacity-20" />
          <p>No badges earned yet</p>
          <p className="text-sm">Complete challenges and solve problems to earn badges</p>
        </div>
      </CardContent>
    </Card>
  )
}
