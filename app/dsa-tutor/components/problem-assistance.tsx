"use client"

import { useState } from "react"
import { RefreshCw, HelpCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription } from "@/components/ui/alert"
import type { ProblemAssistance } from "../types"

interface ProblemAssistanceTabProps {
  problemAssistance: ProblemAssistance
  fetchProblemAssistance: (forceRefresh?: boolean) => Promise<void>
  refreshExplanation: () => void
}

export function ProblemAssistanceTab({
  problemAssistance,
  fetchProblemAssistance,
  refreshExplanation,
}: ProblemAssistanceTabProps) {
  const [isRefreshing, setIsRefreshing] = useState(false)

  const handleRefresh = async () => {
    setIsRefreshing(true)
    try {
      await refreshExplanation()
    } finally {
      setIsRefreshing(false)
    }
  }

  const handleGenerate = async () => {
    setIsRefreshing(true)
    try {
      await fetchProblemAssistance(true)
    } finally {
      setIsRefreshing(false)
    }
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex justify-between items-center mb-4">
        <div className="flex items-center gap-2">
          <HelpCircle className="h-4 w-4" />
          <span className="font-medium">Problem Assistance</span>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={handleRefresh}
          disabled={problemAssistance.isLoading || isRefreshing}
          className="flex items-center gap-1"
        >
          <RefreshCw className={`h-3 w-3 ${problemAssistance.isLoading || isRefreshing ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      <div className="flex-1 overflow-auto">
        {problemAssistance.isLoading ? (
          <div className="flex items-center justify-center h-full">
            <div className="flex flex-col items-center gap-2">
              <RefreshCw className="h-5 w-5 animate-spin" />
              <p className="text-sm text-muted-foreground">Loading problem assistance...</p>
              {problemAssistance.streamingText && (
                <div className="mt-4 w-full">
                  <div className="prose prose-sm max-w-none dark:prose-invert">
                    <div className="whitespace-pre-wrap">{problemAssistance.streamingText}</div>
                  </div>
                </div>
              )}
            </div>
          </div>
        ) : problemAssistance.error ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <Alert variant="destructive" className="mb-4">
                <AlertDescription>{problemAssistance.error}</AlertDescription>
              </Alert>
              <Button variant="outline" size="sm" onClick={handleGenerate}>
                Try Again
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            {problemAssistance.explaining && (
              <div>
                <h3 className="text-lg font-semibold mb-2">Problem Explanation</h3>
                <div className="prose prose-sm max-w-none dark:prose-invert">
                  <div className="whitespace-pre-wrap">{problemAssistance.explaining}</div>
                </div>
              </div>
            )}

            {problemAssistance.solution && (
              <div>
                <h3 className="text-lg font-semibold mb-2">Key DSA Topics</h3>
                <div className="prose prose-sm max-w-none dark:prose-invert">
                  <div className="whitespace-pre-wrap">{problemAssistance.solution}</div>
                </div>
              </div>
            )}

            {problemAssistance.stepByStep && (
              <div>
                <h3 className="text-lg font-semibold mb-2">Step-by-Step Approach</h3>
                <div className="prose prose-sm max-w-none dark:prose-invert">
                  <div className="whitespace-pre-wrap">{problemAssistance.stepByStep}</div>
                </div>
              </div>
            )}

            {!problemAssistance.explaining && !problemAssistance.solution && !problemAssistance.stepByStep && (
              <div className="flex items-center justify-center h-full">
                <div className="text-center">
                  <p className="text-muted-foreground mb-2">No problem assistance available.</p>
                  <Button variant="outline" size="sm" onClick={handleGenerate}>
                    Generate Assistance
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
