"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { Eye, CheckCircle, XCircle, Clock, Target, TrendingUp } from "lucide-react"

interface InterviewDetailsModalProps {
  sessionId: string
  techStack: string
  mcqMarks: number
  completedAt: string
  evaluationData?: any
  children: React.ReactNode
}

export function InterviewDetailsModal({ 
  sessionId, 
  techStack, 
  mcqMarks, 
  completedAt, 
  evaluationData,
  children 
}: InterviewDetailsModalProps) {
  const [isOpen, setIsOpen] = useState(false)

  // Debug: Log evaluation data structure
  if (evaluationData && isOpen) {
    console.log('🔍 Interview Details Modal - Evaluation Data Structure:', {
      sessionId,
      hasMcqAnalysis: !!evaluationData.mcqAnalysis,
      hasMcqEvaluation: !!evaluationData.mcqEvaluation,
      hasStrengths: !!evaluationData.strengths,
      hasWeaknesses: !!evaluationData.weaknesses,
      hasRecommendations: !!evaluationData.recommendations,
      hasNextSteps: !!evaluationData.nextSteps,
      hasDetailedFeedback: !!evaluationData.detailedFeedback,
      evaluationDataKeys: Object.keys(evaluationData || {}),
      fullEvaluationData: evaluationData
    });
  }

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

  // Helper function to safely render text content with improved formatting
  const safeRenderText = (content: any): string => {
    if (typeof content === 'string') {
      // Clean up text formatting - remove excessive asterisks and improve readability
      return content
        .replace(/\*{2,}/g, '') // Remove multiple asterisks
        .replace(/\*([^*]+)\*/g, '$1') // Remove single asterisks around text
        .replace(/^\s*[-•]\s*/gm, '') // Remove bullet points at start of lines
        .replace(/\n\s*\n/g, '\n') // Remove excessive line breaks
        .trim()
    }
    if (typeof content === 'number') return content.toString()
    if (Array.isArray(content)) return content.join(', ')
    if (content && typeof content === 'object') {
      console.warn('⚠️ Attempting to render object as text:', content)
      return JSON.stringify(content)
    }
    return ''
  }

  // Helper function to safely get array data
  const safeGetArray = (data: any, ...paths: string[]): any[] => {
    for (const path of paths) {
      const value = data?.[path]
      if (Array.isArray(value)) return value
    }
    return []
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Eye className="h-5 w-5" />
            Interview Report Details
          </DialogTitle>
          <DialogDescription>
            Detailed analysis of your technical interview performance
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Interview Overview */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>Interview Overview</span>
                <Badge variant={getScoreBadgeVariant(mcqMarks)} className="text-lg px-3 py-1">
                  {mcqMarks}%
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Tech Stack</p>
                  <p className="text-lg font-semibold">{techStack}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Completed</p>
                  <p className="text-lg font-semibold">{formatDate(completedAt)}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Session ID</p>
                  <p className="text-sm font-mono text-muted-foreground">{sessionId}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Status</p>
                  <Badge variant={mcqMarks >= 60 ? "default" : "destructive"}>
                    {mcqMarks >= 60 ? "PASS" : "FAIL"}
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Performance Analysis */}
          {evaluationData && (() => {
            try {
              return (
                <>
              {/* MCQ Analysis */}
              {(() => {
                const mcqAnalysis = safeGetArray(evaluationData, 'mcqAnalysis', 'mcqEvaluation.mcqAnalysis')
                return mcqAnalysis.length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Target className="h-5 w-5" />
                        MCQ Analysis
                      </CardTitle>
                      <CardDescription>
                        Detailed breakdown of your multiple choice questions
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        {mcqAnalysis.map((question: any, index: number) => (
                          <div key={index} className="border rounded-lg p-4">
                            <div className="flex items-start justify-between mb-2">
                              <h4 className="font-medium">Question {index + 1}</h4>
                              {question.isCorrect ? (
                                <CheckCircle className="h-5 w-5 text-green-600" />
                              ) : (
                                <XCircle className="h-5 w-5 text-red-600" />
                              )}
                            </div>
                            <p className="text-sm mb-3">{safeRenderText(question.questionText)}</p>
                            
                            <div className="grid grid-cols-2 gap-4 text-sm">
                              <div>
                                <p className="text-muted-foreground">Your Answer:</p>
                                <p className="font-medium">{safeRenderText(question.userAnswer)}</p>
                              </div>
                              <div>
                                <p className="text-muted-foreground">Correct Answer:</p>
                                <p className="font-medium">{safeRenderText(question.correctAnswer)}</p>
                              </div>
                            </div>

                            {Array.isArray(question.options) && question.options.length > 0 && (
                              <div className="mt-3">
                                <p className="text-sm text-muted-foreground mb-2">Options:</p>
                                <div className="grid grid-cols-2 gap-2 text-xs">
                                  {question.options.map((option: any, optIndex: number) => (
                                    <div key={optIndex} className="flex items-center gap-2">
                                      <span className="font-mono">
                                        {String.fromCharCode(65 + optIndex)}:
                                      </span>
                                      <span>{safeRenderText(option)}</span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )
              })()}

              {/* Strengths & Weaknesses */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {(() => {
                  const strengths = safeGetArray(evaluationData, 'strengths')
                  return strengths.length > 0 && (
                    <Card className="border-green-200 bg-green-50/50 dark:bg-green-950/20">
                      <CardHeader className="pb-3">
                        <CardTitle className="flex items-center gap-2 text-green-700 dark:text-green-400 text-lg">
                          <CheckCircle className="h-5 w-5" />
                          Strengths
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-3">
                          {strengths.map((strength: any, index: number) => (
                            <div key={index} className="flex items-start gap-3 p-3 rounded-lg bg-white dark:bg-gray-800/50 border border-green-100 dark:border-green-800/30">
                              <CheckCircle className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                              <span className="text-sm leading-relaxed text-gray-700 dark:text-gray-300">{safeRenderText(strength)}</span>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  )
                })()}

                {(() => {
                  const weaknesses = safeGetArray(evaluationData, 'weaknesses')
                  return weaknesses.length > 0 && (
                    <Card className="border-orange-200 bg-orange-50/50 dark:bg-orange-950/20">
                      <CardHeader className="pb-3">
                        <CardTitle className="flex items-center gap-2 text-orange-700 dark:text-orange-400 text-lg">
                          <XCircle className="h-5 w-5" />
                          Areas for Improvement
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-3">
                          {weaknesses.map((weakness: any, index: number) => (
                            <div key={index} className="flex items-start gap-3 p-3 rounded-lg bg-white dark:bg-gray-800/50 border border-orange-100 dark:border-orange-800/30">
                              <XCircle className="h-4 w-4 text-orange-600 mt-0.5 flex-shrink-0" />
                              <span className="text-sm leading-relaxed text-gray-700 dark:text-gray-300">{safeRenderText(weakness)}</span>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  )
                })()}
              </div>

              {/* Recommendations */}
              {(() => {
                const recommendations = safeGetArray(evaluationData, 'recommendations', 'detailedFeedback.recommendations')
                return recommendations.length > 0 && (
                  <Card className="border-blue-200 bg-blue-50/50 dark:bg-blue-950/20">
                    <CardHeader className="pb-3">
                      <CardTitle className="flex items-center gap-2 text-blue-700 dark:text-blue-400 text-lg">
                        <TrendingUp className="h-5 w-5" />
                        Recommendations
                      </CardTitle>
                      <CardDescription className="text-blue-600 dark:text-blue-400">
                        Personalized suggestions to enhance your technical skills
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        {recommendations.map((rec: any, index: number) => (
                          <div key={index} className="flex items-start gap-3 p-4 rounded-lg bg-white dark:bg-gray-800/50 border border-blue-100 dark:border-blue-800/30 shadow-sm">
                            <div className="flex-shrink-0 w-6 h-6 bg-blue-100 dark:bg-blue-900/50 rounded-full flex items-center justify-center mt-0.5">
                              <span className="text-xs font-semibold text-blue-700 dark:text-blue-300">{index + 1}</span>
                            </div>
                            <span className="text-sm leading-relaxed text-gray-700 dark:text-gray-300">{safeRenderText(rec)}</span>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )
              })()}

              {/* Next Steps */}
              {(() => {
                const nextSteps = safeGetArray(evaluationData, 'nextSteps', 'detailedFeedback.nextSteps')
                return nextSteps.length > 0 && (
                  <Card className="border-purple-200 bg-purple-50/50 dark:bg-purple-950/20">
                    <CardHeader className="pb-3">
                      <CardTitle className="flex items-center gap-2 text-purple-700 dark:text-purple-400 text-lg">
                        <Clock className="h-5 w-5" />
                        Next Steps
                      </CardTitle>
                      <CardDescription className="text-purple-600 dark:text-purple-400">
                        Actionable steps to continue your learning journey
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        {nextSteps.map((step: any, index: number) => (
                          <div key={index} className="flex items-start gap-3 p-4 rounded-lg bg-white dark:bg-gray-800/50 border border-purple-100 dark:border-purple-800/30 shadow-sm">
                            <div className="flex-shrink-0 w-6 h-6 bg-purple-100 dark:bg-purple-900/50 rounded-full flex items-center justify-center mt-0.5">
                              <span className="text-xs font-semibold text-purple-700 dark:text-purple-300">{index + 1}</span>
                            </div>
                            <span className="text-sm leading-relaxed text-gray-700 dark:text-gray-300">{safeRenderText(step)}</span>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )
              })()}

              {/* Pro User Specific Metrics */}
              {(evaluationData.technicalAccuracy || evaluationData.practicalKnowledge || evaluationData.communicationClarity) && (
                <Card className="border-indigo-200 bg-indigo-50/50 dark:bg-indigo-950/20">
                  <CardHeader className="pb-3">
                    <CardTitle className="flex items-center gap-2 text-indigo-700 dark:text-indigo-400 text-lg">
                      <Target className="h-5 w-5" />
                      Detailed Assessment
                    </CardTitle>
                    <CardDescription className="text-indigo-600 dark:text-indigo-400">
                      AI-powered evaluation metrics for comprehensive analysis
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      {evaluationData.technicalAccuracy && (
                        <div className="text-center p-4 rounded-lg bg-white dark:bg-gray-800/50 border border-indigo-100 dark:border-indigo-800/30 shadow-sm">
                          <p className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">Technical Accuracy</p>
                          <div className="text-3xl font-bold text-blue-600 dark:text-blue-400">{evaluationData.technicalAccuracy}/10</div>
                          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 mt-2">
                            <div 
                              className="bg-blue-600 h-2 rounded-full transition-all duration-300" 
                              style={{ width: `${(evaluationData.technicalAccuracy / 10) * 100}%` }}
                            ></div>
                          </div>
                        </div>
                      )}
                      {evaluationData.practicalKnowledge && (
                        <div className="text-center p-4 rounded-lg bg-white dark:bg-gray-800/50 border border-indigo-100 dark:border-indigo-800/30 shadow-sm">
                          <p className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">Practical Knowledge</p>
                          <div className="text-3xl font-bold text-green-600 dark:text-green-400">{evaluationData.practicalKnowledge}/10</div>
                          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 mt-2">
                            <div 
                              className="bg-green-600 h-2 rounded-full transition-all duration-300" 
                              style={{ width: `${(evaluationData.practicalKnowledge / 10) * 100}%` }}
                            ></div>
                          </div>
                        </div>
                      )}
                      {evaluationData.communicationClarity && (
                        <div className="text-center p-4 rounded-lg bg-white dark:bg-gray-800/50 border border-indigo-100 dark:border-indigo-800/30 shadow-sm">
                          <p className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">Communication</p>
                          <div className="text-3xl font-bold text-purple-600 dark:text-purple-400">{evaluationData.communicationClarity}/10</div>
                          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 mt-2">
                            <div 
                              className="bg-purple-600 h-2 rounded-full transition-all duration-300" 
                              style={{ width: `${(evaluationData.communicationClarity / 10) * 100}%` }}
                            ></div>
                          </div>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              )}
                </>
              )
            } catch (error) {
              console.error('❌ Error rendering evaluation data:', error)
              return (
                <Card>
                  <CardContent className="text-center py-8">
                    <p className="text-muted-foreground">Error displaying evaluation data. Please try again.</p>
                  </CardContent>
                </Card>
              )
            }
          })()}

          {/* No Evaluation Data */}
          {!evaluationData && (
            <Card>
              <CardContent className="text-center py-8">
                <p className="text-muted-foreground">No detailed evaluation data available for this interview.</p>
              </CardContent>
            </Card>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
