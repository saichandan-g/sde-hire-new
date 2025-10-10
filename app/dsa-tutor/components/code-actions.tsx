"use client"

import { Button } from "@/components/ui/button"
import { Play, Send, Clock } from "lucide-react"
import type { Language, Question } from "../types"

interface CodeActionsProps {
  selectedLanguage: Language
  handleLanguageChange: (value: string) => void
  handleRunCode: () => void
  isRunning: boolean
  handleSubmitCode: () => void
  isSubmitting: boolean
  isMobile?: boolean
  solveTime: number
  currentQuestion: Question | null
}

// Helper function to format seconds into MM:SS format
const formatTime = (seconds: number): string => {
  const minutes = Math.floor(seconds / 60)
  const remainingSeconds = seconds % 60
  return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`
}

// Helper function to calculate optimal time ratio
const calculateOptimalRatio = (solveTimeSeconds: number, expectedMinutes?: number): string => {
  if (!expectedMinutes || expectedMinutes <= 0) return "N/A"
  
  const solveTimeMinutes = solveTimeSeconds / 60
  const ratio = (solveTimeMinutes / expectedMinutes) * 100
  
  // Cap at 999% to avoid extremely large numbers
  const cappedRatio = Math.min(ratio, 999)
  return `${Math.round(cappedRatio)}%`
}

export function CodeActions({
  selectedLanguage,
  handleLanguageChange,
  handleRunCode,
  isRunning,
  handleSubmitCode,
  isSubmitting,
  isMobile = false,
  solveTime,
  currentQuestion,
}: CodeActionsProps) {
  const expectedSolveTime = currentQuestion?.metadata?.expected_solve_time_minutes
  const optimalRatio = calculateOptimalRatio(solveTime, expectedSolveTime)

  return (
    <div className="flex items-center gap-4">
      {/* Timer Display */}
      <div className="flex items-center gap-2 px-3 py-1 bg-blue-50 dark:bg-blue-950/30 rounded-md border border-blue-200 dark:border-blue-800">
        <Clock className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
        <div className="flex flex-col items-start">
          <span className="text-xs font-mono font-medium text-blue-700 dark:text-blue-300">
            {formatTime(solveTime)}
          </span>
          {expectedSolveTime && (
            <span className="text-[10px] text-blue-600 dark:text-blue-400">
              Optimal: {optimalRatio}
            </span>
          )}
        </div>
      </div>

      {/* Action Buttons */}
    <div className="flex items-center gap-2">
      <Button
        variant="outline"
        size="sm"
        onClick={handleRunCode}
        disabled={isRunning}
        className="h-8 px-3 gap-1 dark:border-green-500 dark:neon-border-green"
      >
        <Play className="h-3.5 w-3.5" />
        Run
      </Button>
      <Button
        variant="outline"
        size="sm"
        onClick={handleSubmitCode}
        disabled={isSubmitting}
        className="h-8 px-3 gap-1 dark:border-blue-500 dark:neon-border-blue"
      >
        <Send className="h-3.5 w-3.5" />
        Submit
      </Button>
      </div>
    </div>
  )
}
