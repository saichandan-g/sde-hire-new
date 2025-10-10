"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { Eye, Users, FileText, TrendingUp, Target, Award, Calendar, MessageSquare } from "lucide-react"

interface HRInterviewDetailsModalProps {
  report: {
    id: string
    session_id: string
    resume_analysis: any
    interview_responses: any[]
    hr_evaluation: any
    behavioral_metrics: any
    created_at: string
  }
  children: React.ReactNode
}

export function HRInterviewDetailsModal({ 
  report, 
  children 
}: HRInterviewDetailsModalProps) {
  const [isOpen, setIsOpen] = useState(false)

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const getScoreColor = (score: number) => {
    if (score >= 80) return "text-green-600"
    if (score >= 60) return "text-yellow-600"
    return "text-red-600"
  }

  const getScoreBadgeVariant = (score: number) => {
    if (score >= 80) return "default"
    if (score >= 60) return "secondary"
    return "destructive"
  }

  const getOverallScore = () => {
    return report.behavioral_metrics?.overallScore || 0
  }

  const getConfidenceLevel = () => {
    return report.behavioral_metrics?.confidenceLevel || 0
  }

  const getAttentionSpan = () => {
    return report.behavioral_metrics?.attentionSpan || 0
  }

  const getProfessionalismScore = () => {
    return report.behavioral_metrics?.professionalismScore || 0
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Eye className="h-5 w-5" />
            HR Interview Report Details
          </DialogTitle>
          <DialogDescription>
            Detailed analysis of your HR interview performance
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Interview Overview */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>Interview Overview</span>
                <Badge variant={getScoreBadgeVariant(getOverallScore())} className="text-lg px-3 py-1">
                  {getOverallScore()}%
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Interview Type</p>
                  <p className="text-lg font-semibold">HR Interview</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Completed</p>
                  <p className="text-lg font-semibold">{formatDate(report.created_at)}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Session ID</p>
                  <p className="text-sm font-mono text-muted-foreground">{report.session_id}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Status</p>
                  <Badge variant={getOverallScore() >= 60 ? "default" : "destructive"}>
                    {getOverallScore() >= 60 ? "PASS" : "NEEDS IMPROVEMENT"}
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Performance Metrics */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                Performance Metrics
              </CardTitle>
              <CardDescription>
                Behavioral analysis and performance indicators
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center p-4 bg-muted rounded-lg">
                  <div className="text-2xl font-bold text-primary">{getOverallScore()}%</div>
                  <div className="text-sm text-muted-foreground">Overall Score</div>
                </div>
                <div className="text-center p-4 bg-muted rounded-lg">
                  <div className="text-2xl font-bold text-blue-600">{getConfidenceLevel()}%</div>
                  <div className="text-sm text-muted-foreground">Confidence Level</div>
                </div>
                <div className="text-center p-4 bg-muted rounded-lg">
                  <div className="text-2xl font-bold text-green-600">{getAttentionSpan()}%</div>
                  <div className="text-sm text-muted-foreground">Attention Span</div>
                </div>
                <div className="text-center p-4 bg-muted rounded-lg">
                  <div className="text-2xl font-bold text-purple-600">{getProfessionalismScore()}%</div>
                  <div className="text-sm text-muted-foreground">Professionalism</div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Resume Analysis */}
          {report.resume_analysis && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Resume Analysis
                </CardTitle>
                <CardDescription>
                  AI analysis of your resume for interview preparation
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Experience Level</p>
                    <p className="text-lg font-semibold">
                      {report.resume_analysis.experienceLevel || 'Not specified'}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Questions Generated</p>
                    <p className="text-lg font-semibold">
                      {report.interview_responses?.length || 0} Personalized Questions
                    </p>
                  </div>
                </div>
                
                {report.resume_analysis.hrProfile?.primaryStrengths && (
                  <div>
                    <p className="text-sm font-medium text-muted-foreground mb-2">Primary Strengths Identified</p>
                    <div className="flex flex-wrap gap-2">
                      {report.resume_analysis.hrProfile.primaryStrengths.map((strength: string, index: number) => (
                        <Badge key={index} variant="secondary">
                          {strength}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Interview Q&A */}
          {report.interview_responses && report.interview_responses.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MessageSquare className="h-5 w-5" />
                  Interview Questions & Answers
                </CardTitle>
                <CardDescription>
                  Your responses to HR interview questions
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {report.interview_responses.map((response, index) => (
                  <div key={response.questionId || index} className="border rounded-lg p-4">
                    <div className="flex items-start justify-between mb-3">
                      <h4 className="font-medium text-lg">Question {index + 1}</h4>
                      <Badge variant={response.hasResponse ? "default" : "secondary"}>
                        {response.hasResponse ? "Answered" : "No Response"}
                      </Badge>
                    </div>
                    
                    <div className="space-y-3">
                      <div>
                        <p className="text-sm font-medium text-muted-foreground mb-1">Question:</p>
                        <p className="text-sm bg-muted p-3 rounded-md">
                          {response.questionText || 'Question text not available'}
                        </p>
                      </div>
                      
                      <div>
                        <p className="text-sm font-medium text-muted-foreground mb-1">Your Response:</p>
                        <p className="text-sm bg-muted p-3 rounded-md">
                          {response.userResponse && response.userResponse.trim() 
                            ? response.userResponse 
                            : '[No response recorded]'
                          }
                        </p>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-4 text-xs text-muted-foreground">
                        <div>
                          <span className="font-medium">Timestamp:</span> {response.timestamp ? new Date(response.timestamp).toLocaleString() : 'N/A'}
                        </div>
                        <div>
                          <span className="font-medium">Length:</span> {response.responseLength || 0} words
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {/* HR Evaluation */}
          {report.hr_evaluation && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Award className="h-5 w-5" />
                  HR Q&A Evaluation
                </CardTitle>
                <CardDescription>
                  AI evaluation of your interview responses
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Overall Score */}
                <div className="text-center">
                  <div className="inline-flex items-center justify-center w-24 h-24 rounded-full bg-gradient-to-r from-blue-500 to-purple-600 text-white text-2xl font-bold mb-4">
                    {report.hr_evaluation.overallScore?.toFixed(1) || 'N/A'}
                  </div>
                  <p className="text-lg font-semibold text-gray-800 dark:text-gray-200">
                    Overall Performance Score
                  </p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {report.hr_evaluation.overallFeedback || 'No feedback available'}
                  </p>
                </div>

                {/* Strengths and Areas for Improvement */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-3">
                    <h4 className="font-semibold text-green-700 dark:text-green-400 text-lg">
                      Strengths Identified
                    </h4>
                    <ul className="space-y-2">
                      {report.hr_evaluation.strengths?.map((strength: string, index: number) => (
                        <li key={index} className="flex items-start text-sm text-gray-700 dark:text-gray-200">
                          <span className="text-green-500 mr-2">✓</span>
                          {strength}
                        </li>
                      )) || <li className="text-sm text-gray-500 dark:text-gray-400">No specific strengths identified</li>}
                    </ul>
                  </div>
                  <div className="space-y-3">
                    <h4 className="font-semibold text-amber-700 dark:text-amber-400 text-lg">
                      Areas for Improvement
                    </h4>
                    <ul className="space-y-2">
                      {report.hr_evaluation.areasForImprovement?.map((area: string, index: number) => (
                        <li key={index} className="flex items-start text-sm text-gray-700 dark:text-gray-200">
                          <span className="text-amber-500 mr-2">•</span>
                          {area}
                        </li>
                      )) || <li className="text-sm text-gray-500 dark:text-gray-400">No specific areas identified</li>}
                    </ul>
                  </div>
                </div>

                {/* Individual Question Evaluations */}
                {report.hr_evaluation.questionEvaluations && report.hr_evaluation.questionEvaluations.length > 0 && (
                  <div className="space-y-4">
                    <h4 className="font-semibold text-gray-800 dark:text-gray-200 text-lg">
                      Question-by-Question Analysis
                    </h4>
                    <div className="space-y-4">
                      {report.hr_evaluation.questionEvaluations.map((qEval: any, index: number) => (
                        <div key={index} className="border border-gray-200 dark:border-slate-600 rounded-lg p-4">
                          <div className="flex justify-between items-start mb-3">
                            <div>
                              <h5 className="font-medium text-gray-800 dark:text-gray-200">
                                Question {qEval.questionNumber}
                              </h5>
                              <p className="text-sm text-gray-600 dark:text-gray-400">
                                {qEval.questionType} • {qEval.questionTopic}
                              </p>
                            </div>
                            <div className="text-right">
                              <div className="text-lg font-bold text-blue-600 dark:text-blue-400">
                                {qEval.score?.toFixed(1) || 'N/A'}/10
                              </div>
                            </div>
                          </div>
                          <p className="text-sm text-gray-700 dark:text-gray-200 mb-3">
                            {qEval.feedback || 'No specific feedback available'}
                          </p>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                            {qEval.strengths && qEval.strengths.length > 0 && (
                              <div>
                                <span className="font-medium text-green-700 dark:text-green-400">Strengths:</span>
                                <ul className="mt-1">
                                  {qEval.strengths.map((strength: string, sIndex: number) => (
                                    <li key={sIndex} className="text-green-600 dark:text-green-300">• {strength}</li>
                                  ))}
                                </ul>
                              </div>
                            )}
                            {qEval.improvements && qEval.improvements.length > 0 && (
                              <div>
                                <span className="font-medium text-amber-700 dark:text-amber-400">Improvements:</span>
                                <ul className="mt-1">
                                  {qEval.improvements.map((improvement: string, iIndex: number) => (
                                    <li key={iIndex} className="text-amber-600 dark:text-amber-300">• {improvement}</li>
                                  ))}
                                </ul>
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Recommendations */}
                {report.hr_evaluation.recommendations && (
                  <div className="bg-gray-50 dark:bg-slate-700 rounded-lg p-4">
                    <h4 className="font-semibold text-gray-800 dark:text-gray-200 text-lg mb-3">
                      Recommendations
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                      <div>
                        <span className="font-medium text-gray-700 dark:text-gray-300">Hire Recommendation:</span>
                        <p className="text-gray-600 dark:text-gray-400 mt-1">
                          {report.hr_evaluation.recommendations.hireRecommendation || 'Not specified'}
                        </p>
                      </div>
                      <div>
                        <span className="font-medium text-gray-700 dark:text-gray-300">Confidence Level:</span>
                        <p className="text-gray-600 dark:text-gray-400 mt-1">
                          {report.hr_evaluation.recommendations.confidence || 'Not specified'}
                        </p>
                      </div>
                      <div className="md:col-span-1">
                        <span className="font-medium text-gray-700 dark:text-gray-300">Next Steps:</span>
                        <p className="text-gray-600 dark:text-gray-400 mt-1">
                          {report.hr_evaluation.recommendations.nextSteps || 'No specific next steps'}
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Behavioral Analysis Details */}
          {report.behavioral_metrics && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Target className="h-5 w-5" />
                  Detailed Behavioral Analysis
                </CardTitle>
                <CardDescription>
                  Comprehensive analysis of your interview behavior
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div className="flex justify-between items-center p-3 bg-muted rounded-lg">
                      <span className="text-sm font-medium">Eye Contact</span>
                      <span className="font-bold">{report.behavioral_metrics.avgEyeContact || 0}%</span>
                    </div>
                    <div className="flex justify-between items-center p-3 bg-muted rounded-lg">
                      <span className="text-sm font-medium">Stability Score</span>
                      <span className="font-bold">{Math.round((report.behavioral_metrics.stabilityScore || 0) * 100) / 100}%</span>
                    </div>
                    <div className="flex justify-between items-center p-3 bg-muted rounded-lg">
                      <span className="text-sm font-medium">Emotional Range</span>
                      <span className="font-bold">{Math.round((report.behavioral_metrics.emotionalRange || 0) * 100) / 100}%</span>
                    </div>
                  </div>
                  
                  <div className="space-y-4">
                    <div className="flex justify-between items-center p-3 bg-muted rounded-lg">
                      <span className="text-sm font-medium">Tech Quality</span>
                      <span className="font-bold">{report.behavioral_metrics.techQuality || 0}%</span>
                    </div>
                    <div className="flex justify-between items-center p-3 bg-muted rounded-lg">
                      <span className="text-sm font-medium">Attention Span</span>
                      <span className="font-bold">{report.behavioral_metrics.attentionSpan || 0}%</span>
                    </div>
                    <div className="flex justify-between items-center p-3 bg-muted rounded-lg">
                      <span className="text-sm font-medium">Professionalism</span>
                      <span className="font-bold">{report.behavioral_metrics.professionalismScore || 0}%</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
