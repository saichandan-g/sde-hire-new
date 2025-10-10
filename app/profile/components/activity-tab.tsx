import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Calendar, TrendingUp } from "lucide-react"
import { useProgress } from "@/lib/context/progress-context"
import { useAuth } from "@/lib/context/auth-context"
import { useEffect, useState } from "react"

interface ActivityData {
  date: string
  count: number
  solved: number
}

export function ActivityTab() {
  const { state: progressState } = useProgress()
  const { user } = useAuth()
  const [activityData, setActivityData] = useState<ActivityData[]>([])
  const [currentStreak, setCurrentStreak] = useState(0)
  const [maxStreak, setMaxStreak] = useState(0)

  useEffect(() => {
    if (progressState.problemsProgress) {
      generateActivityData()
    }
  }, [progressState.problemsProgress])

  const generateActivityData = () => {
    const activityMap = new Map<string, { count: number; solved: number }>()
    
    // Get the last 365 days
    const today = new Date()
    const oneYearAgo = new Date(today.getTime() - 365 * 24 * 60 * 60 * 1000)
    
    // Initialize all dates with 0 activity
    for (let d = new Date(oneYearAgo); d <= today; d.setDate(d.getDate() + 1)) {
      const dateStr = d.toISOString().split('T')[0]
      activityMap.set(dateStr, { count: 0, solved: 0 })
    }

    // Fill in actual activity data
    Object.values(progressState.problemsProgress).forEach((problem) => {
      if (problem.lastAttempted) {
        const dateStr = problem.lastAttempted.split('T')[0]
        const existing = activityMap.get(dateStr) || { count: 0, solved: 0 }
        existing.count += 1
        if (problem.status === 'solved') {
          existing.solved += 1
        }
        activityMap.set(dateStr, existing)
      }
    })

    const sortedData = Array.from(activityMap.entries())
      .map(([date, data]) => ({ date, ...data }))
      .sort((a, b) => a.date.localeCompare(b.date))

    setActivityData(sortedData)
    calculateStreaks(sortedData)
  }

  const calculateStreaks = (data: ActivityData[]) => {
    let current = 0
    let max = 0
    let tempStreak = 0

    for (let i = data.length - 1; i >= 0; i--) {
      if (data[i].count > 0) {
        tempStreak++
        if (tempStreak > max) {
          max = tempStreak
        }
        if (i === data.length - 1) {
          current = tempStreak
        }
      } else {
        tempStreak = 0
      }
    }

    setCurrentStreak(current)
    setMaxStreak(max)
  }

  // GitHub-style activity colors
  const getActivityColor = (count: number) => {
    if (count === 0) return 'bg-[#ebedf0] dark:bg-[#161b22]'
    if (count <= 2) return 'bg-[#9be9a8] dark:bg-[#0e4429]'
    if (count <= 4) return 'bg-[#40c463] dark:bg-[#006d32]'
    if (count <= 6) return 'bg-[#30a14e] dark:bg-[#26a641]'
    return 'bg-[#216e39] dark:bg-[#39d353]'
  }

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', { 
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }

  // Generate weeks data for GitHub-style layout
  const generateWeeks = () => {
    const weeks: ActivityData[][] = []
    const today = new Date()
    const oneYearAgo = new Date(today.getTime() - 365 * 24 * 60 * 60 * 1000)
    
    // Start from the first Sunday of the year view
    const firstSunday = new Date(oneYearAgo)
    const dayOfWeek = firstSunday.getDay()
    firstSunday.setDate(firstSunday.getDate() - dayOfWeek)
    
    let currentDate = new Date(firstSunday)
    let currentWeek: ActivityData[] = []
    
    while (currentDate <= today) {
      const dateStr = currentDate.toISOString().split('T')[0]
      const activity = activityData.find(d => d.date === dateStr) || { date: dateStr, count: 0, solved: 0 }
      
      currentWeek.push(activity)
      
      if (currentWeek.length === 7) {
        weeks.push(currentWeek)
        currentWeek = []
      }
      
      currentDate.setDate(currentDate.getDate() + 1)
    }
    
    // Add remaining days if any
    if (currentWeek.length > 0) {
      weeks.push(currentWeek)
    }
    
    return weeks
  }

  // Get month labels
  const getMonthLabels = () => {
    const months: { month: string; weekIndex: number }[] = []
    const weeks = generateWeeks()
    
    let currentMonth = ''
    weeks.forEach((week, weekIndex) => {
      const firstDayOfWeek = week.find(day => day.date)
      if (firstDayOfWeek) {
        const month = new Date(firstDayOfWeek.date).toLocaleDateString('en-US', { month: 'short' })
        if (month !== currentMonth) {
          months.push({ month, weekIndex })
          currentMonth = month
        }
      }
    })
    
    return months
  }

  const weeks = generateWeeks()
  const monthLabels = getMonthLabels()

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-green-500" />
              <span className="text-sm font-medium">Current Streak</span>
            </div>
            <p className="text-2xl font-bold mt-1">{currentStreak} days</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-blue-500" />
              <span className="text-sm font-medium">Max Streak</span>
            </div>
            <p className="text-2xl font-bold mt-1">{maxStreak} days</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-purple-500" />
              <span className="text-sm font-medium">Active Days</span>
            </div>
            <p className="text-2xl font-bold mt-1">
              {activityData.filter(d => d.count > 0).length}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* GitHub-style Heatmap Calendar */}
      <Card>
        <CardHeader>
          <CardTitle>Activity Heatmap</CardTitle>
          <CardDescription>Your coding activity over the past year</CardDescription>
        </CardHeader>
        <CardContent>
          {activityData.length > 0 ? (
            <div className="space-y-4">
              {/* Legend */}
              <div className="flex items-center justify-center gap-4 text-sm">
                <span className="text-muted-foreground">Less</span>
                <div className="flex gap-1">
                  <div className="w-3 h-3 bg-[#ebedf0] dark:bg-[#161b22]"></div>
                  <div className="w-3 h-3 bg-[#9be9a8] dark:bg-[#0e4429]"></div>
                  <div className="w-3 h-3 bg-[#40c463] dark:bg-[#006d32]"></div>
                  <div className="w-3 h-3 bg-[#30a14e] dark:bg-[#26a641]"></div>
                  <div className="w-3 h-3 bg-[#216e39] dark:bg-[#39d353]"></div>
                </div>
                <span className="text-muted-foreground">More</span>
              </div>

              {/* GitHub-style Calendar Grid */}
              <div className="flex justify-center w-full">
                <div className="relative transform scale-75 origin-center" style={{ 
                  width: '666px', 
                  height: '114px'
                }}>
                  {/* Month labels */}
                  <div className="absolute top-0 left-0 right-0 h-6 flex items-end">
                    {monthLabels.map(({ month, weekIndex }) => (
                      <div
                        key={month + weekIndex}
                        className="text-xs text-muted-foreground font-medium"
                        style={{
                          position: 'absolute',
                          left: `${30 + weekIndex * 12}px`,
                          transform: 'translateX(-50%)',
                          bottom: '2px'
                        }}
                      >
                        {month}
                      </div>
                    ))}
                  </div>

                  {/* Day labels */}
                  <div className="absolute top-6 left-0 w-8 h-20 flex flex-col justify-between">
                    {['Mon', 'Wed', 'Fri'].map((day, index) => (
                      <div
                        key={day}
                        className="text-xs text-muted-foreground font-medium"
                        style={{
                          height: '12px',
                          lineHeight: '12px',
                          marginTop: index === 0 ? '0' : index === 1 ? '12px' : '24px'
                        }}
                      >
                        {day}
                      </div>
                    ))}
                  </div>

                  {/* Activity grid */}
                  <div 
                    className="absolute top-6 left-8"
                    style={{ 
                      width: '636px', 
                      height: '84px',
                      display: 'grid',
                      gridTemplateColumns: 'repeat(53, 12px)',
                      gridTemplateRows: 'repeat(7, 12px)',
                      gap: '2px'
                    }}
                  >
                    {weeks.flat().map((day, index) => (
                      <div
                        key={index}
                        className={`
                          w-[10px] h-[10px] 
                          ${day.date ? getActivityColor(day.count) : 'bg-transparent'}
                          ${day.count > 0 ? 'cursor-pointer hover:ring-2 hover:ring-gray-300 dark:hover:ring-gray-600' : ''}
                          transition-all duration-150
                          flex items-center justify-center
                        `}
                        title={day.date ? `${formatDate(day.date)}: ${day.count} attempts, ${day.solved} solved` : ''}
                      />
                    ))}
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <Calendar className="h-12 w-12 mx-auto mb-4 opacity-20" />
              <p>No activity yet</p>
              <p className="text-sm">Your activity will be shown here once you start solving problems</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
