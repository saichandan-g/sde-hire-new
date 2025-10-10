"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Calendar, Users, TrendingUp, Award, Eye, FileText } from "lucide-react"
import { useState, useEffect } from "react"
import { HRInterviewDetailsModal } from "./hr-interview-details-modal"

interface HRReport {
  id: string
  session_id: string
  resume_analysis: any
  interview_responses: any[]
  hr_evaluation: any
  behavioral_metrics: any
  created_at: string
}

export function HRReportsTab() {
  const [hrReports, setHrReports] = useState<HRReport[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Fetch HR reports from API
  useEffect(() => {
    const fetchHRReports = async () => {
      try {
        setLoading(true)
        const response = await fetch('/api/hr-reports')
        
        if (!response.ok) {
          throw new Error('Failed to fetch HR reports')
        }

        const data = await response.json()
        setHrReports(data.reports || [])
      } catch (error) {
        console.error('Error fetching HR reports:', error)
        setError('Failed to load HR reports')
      } finally {
        setLoading(false)
      }
    }

    fetchHRReports()
  }, [])

  // Calculate statistics
  const totalReports = hrReports.length
  const avgOverallScore = hrReports.length > 0 
    ? Math.round(hrReports.reduce((sum, report) => {
        const score = report.behavioral_metrics?.overallScore || 0
        return sum + score
      }, 0) / hrReports.length)
    : 0

  const highestScore = hrReports.length > 0 
    ? Math.max(...hrReports.map(report => report.behavioral_metrics?.overallScore || 0))
    : 0

  const recentScore = hrReports.length > 0 
    ? hrReports[0]?.behavioral_metrics?.overallScore || 0
    : null

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

  // Get score badge variant
  const getScoreVariant = (score: number) => {
    if (score >= 80) return "default"
    if (score >= 60) return "secondary"
    return "destructive"
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">HR Interview Reports</h2>
          <p className="text-muted-foreground">
            Track your HR interview performance and view detailed reports.
          </p>
        </div>
        <div className="text-center py-8">
          <p className="text-muted-foreground">Loading HR reports...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">HR Interview Reports</h2>
          <p className="text-muted-foreground">
            Track your HR interview performance and view detailed reports.
          </p>
        </div>
        <div className="text-center py-8 text-red-500">
          <p>{error}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold tracking-tight">HR Interview Reports</h2>
        <p className="text-muted-foreground">
          Track your HR interview performance and view detailed reports.
        </p>
      </div>

      {/* Statistics Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total HR Interviews</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalReports}</div>
            <p className="text-xs text-muted-foreground">
              HR interviews completed
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Average Score</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{avgOverallScore}%</div>
            <p className="text-xs text-muted-foreground">
              Overall performance
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Highest Score</CardTitle>
            <Award className="h-4 w-4 text-muted-foreground" />
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
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{recentScore !== null ? `${recentScore}%` : '-'}</div>
            <p className="text-xs text-muted-foreground">
              Latest interview
            </p>
          </CardContent>
        </Card>
      </div>

      {/* HR Reports Table */}
      <Card>
        <CardHeader>
          <CardTitle>HR Interview History</CardTitle>
          <CardDescription>
            View all your HR interviews and detailed reports.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {hrReports.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Overall Score</TableHead>
                  <TableHead>Confidence</TableHead>
                  <TableHead>Questions</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {hrReports.map((report) => (
                  <TableRow key={report.id}>
                    <TableCell className="font-medium">
                      {formatDate(report.created_at)}
                    </TableCell>
                    <TableCell>
                      <Badge variant={getScoreVariant(report.behavioral_metrics?.overallScore || 0)}>
                        {report.behavioral_metrics?.overallScore || 0}%
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {report.behavioral_metrics?.confidenceLevel || 0}%
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary">
                        {report.interview_responses?.length || 0} questions
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <HRInterviewDetailsModal report={report}>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0"
                        >
                          <Eye className="h-4 w-4" />
                          <span className="sr-only">View details</span>
                        </Button>
                      </HRInterviewDetailsModal>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <FileText className="h-12 w-12 mx-auto mb-4 opacity-20" />
              <p>No HR interviews completed yet.</p>
              <p className="text-sm mt-2">
                Complete your first HR interview to see your reports here.
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
