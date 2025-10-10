"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Calendar, Target, TrendingUp, Award, Eye } from "lucide-react"
import { useProgress } from "@/lib/context/progress-context"
import { InterviewDetailsModal } from "./interview-details-modal"
import { useState, useEffect } from "react"

export function ReportsTab() {
  const { getInterviewStats, getInterviewHistory, state } = useProgress()
  const [evaluationData, setEvaluationData] = useState<Record<string, any>>({})
  
  // Get interview statistics
  const stats = getInterviewStats()
  const interviewHistory = getInterviewHistory()
  

  
  // Calculate additional statistics
  const highestScore = interviewHistory.length > 0 
    ? Math.max(...interviewHistory.map(interview => interview.mcqMarks || 0))
    : 0
    
  const recentScore = interviewHistory.length > 0 
    ? interviewHistory[0]?.mcqMarks || 0
    : null

  // Fetch evaluation data for interviews
  useEffect(() => {
    const fetchEvaluationData = async () => {
      if (interviewHistory.length === 0) return

      try {
        const sessionIds = interviewHistory.map(interview => interview.sessionId)
        const response = await fetch('/api/interview-evaluations', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ sessionIds }),
        })

        if (response.ok) {
          const data = await response.json()
          setEvaluationData(data.evaluations || {})
        }
      } catch (error) {
        console.error('Error fetching evaluation data:', error)
      }
    }

    fetchEvaluationData()
  }, [interviewHistory])

  // Format date for display
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }



  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Interview Reports</h2>
        <p className="text-muted-foreground">
          Track your technical interview performance and view detailed reports.
        </p>
      </div>

      {/* Statistics Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Interviews</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
            <p className="text-xs text-muted-foreground">
              Interviews completed
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Average Score</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.average}%</div>
            <p className="text-xs text-muted-foreground">
              Overall performance
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Highest Score</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{highestScore}%</div>
            <p className="text-xs text-muted-foreground">
              Best performance
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Recent Score</CardTitle>
            <Award className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{recentScore !== null ? `${recentScore}%` : '-'}</div>
            <p className="text-xs text-muted-foreground">
              Latest interview
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Interview History Table */}
      <Card>
        <CardHeader>
          <CardTitle>Interview History</CardTitle>
          <CardDescription>
            View all your technical interviews and detailed reports.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {interviewHistory.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Score</TableHead>
                  <TableHead>Tech Stack</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {interviewHistory.map((interview) => (
                  <TableRow key={interview.sessionId}>
                    <TableCell className="font-medium">
                      {formatDate(interview.completedAt)}
                    </TableCell>
                    <TableCell>
                      <Badge variant={interview.mcqMarks >= 80 ? "default" : interview.mcqMarks >= 60 ? "secondary" : "destructive"}>
                        {interview.mcqMarks}%
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {interview.techStack}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <InterviewDetailsModal
                        sessionId={interview.sessionId}
                        techStack={interview.techStack}
                        mcqMarks={interview.mcqMarks}
                        completedAt={interview.completedAt}
                        evaluationData={evaluationData[interview.sessionId]}
                      >
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0"
                        >
                          <Eye className="h-4 w-4" />
                          <span className="sr-only">View details</span>
                        </Button>
                      </InterviewDetailsModal>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <p>No interviews completed yet.</p>
              <p className="text-sm mt-2">
                Complete your first technical interview to see your reports here.
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
