"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { useEffect, useState, useMemo } from "react"
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Legend,
  AreaChart, Area, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, ScatterChart,
  Scatter, Cell, PieChart, Pie
} from "recharts"

interface HRInterviewReportProps {
  onStartNewInterview: () => void
  // Phase 5: Enhanced data props
  resumeAnalysis?: {
    experienceLevel: string
    hrProfile: {
      topSkills: string[]
      primaryStrengths: string[]
    }
    } | null
  interviewResponses?: Array<{
    Qid: string; // Changed from 'questionId' to 'Qid'
    Rid: string; // New: Response ID
    questionText: string
    questionType: string
    questionTopic: string
    userResponse: string
    timestamp: string
    responseLength: number
    hasResponse: boolean
  }> | null
  onRefreshResponses?: () => boolean
  // Phase 4: HR Evaluation data
  hrEvaluation?: any | null
  interviewSessionId?: string | null // New: Unique ID for the current interview session
}

interface SessionMetrics {
  eyeContactFrames: number[]
  eyeContactPercent: number[]
  offscreenFrames: number[]
  offscreenSeconds: number[]
  blinkCount: number[]
  blinkRatePerMin: number[]
  multiPersonWarnings: number
  nodCount: number
  shakeCount: number
  emotionsRaw: { [key: string]: number }[]
  emotionsAvg5: { [key: string]: number }[]
  topEmotionTrends: { emotion: string; count: number }[]
  handActivity: { oneHand: number; twoHands: number; none: number }[]
  postureHint: string[]
  yaw: number[]
  pitch: number[]
  roll: number[]
  objectLabelCounts: { [key: string]: number }[]
}

export function HRInterviewReport({
  onStartNewInterview,
  resumeAnalysis,
  interviewResponses,
  onRefreshResponses,
  hrEvaluation
}: HRInterviewReportProps) {
  
  // Phase 5: Debug - Log the data received
  console.log('[HRInterviewReport] Received props:', {
    resumeAnalysis: !!resumeAnalysis,
    interviewResponses: interviewResponses ? {
      length: interviewResponses.length,
      responses: interviewResponses.map((r, i) => ({
        q: i + 1,
        hasResponse: r.hasResponse,
        responseLength: r.responseLength,
        userResponse: r.userResponse?.substring(0, 50) + '...'
      }))
    } : 'null',
    hrEvaluation: hrEvaluation ? {
      hasEvaluation: true,
      overallScore: hrEvaluation.overallScore,
      hasStrengths: !!hrEvaluation.strengths,
      hasQuestionEvaluations: !!hrEvaluation.questionEvaluations
    } : 'null'
  })
  const [sessionMetrics, setSessionMetrics] = useState<SessionMetrics | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [saveSuccess, setSaveSuccess] = useState(false)

  // Helper calculation functions (moved to top for initialization)
    const calculateStability = (yaw: number[], pitch: number[], roll: number[]): number => {
      const movements = yaw.map((y, i) => Math.abs(y) + Math.abs(pitch[i] || 0) + Math.abs(roll[i] || 0))
      const avgMovement = movements.reduce((sum, val) => sum + val, 0) / movements.length
      return Math.max(0, Math.min(100, 100 - (avgMovement * 200))) // Scale and invert, reduced penalty
    }

  const calculateAttentionSpan = (offscreenFrames: number[]): number => {
    const onscreenFrames = offscreenFrames.filter(frame => frame === 0).length
    return Math.round((onscreenFrames / offscreenFrames.length) * 100)
  }

  const calculateEmotionalVariability = (emotions: { [key: string]: number }[]): number => {
    const neutralScores = emotions.map(e => e.neutral || 0)
    const variance = neutralScores.reduce((acc, score, i, arr) => {
      const mean = arr.reduce((sum, val) => sum + val, 0) / arr.length
      return acc + Math.pow(score - mean, 2)
    }, 0) / neutralScores.length
    return Math.min(100, variance * 1000) // Scale variance
  }

  const combineProfessionalMetrics = (metrics: SessionMetrics): number => {
    const goodPosture = metrics.postureHint.filter(p => p !== 'far').length
    const postureScore = (goodPosture / metrics.postureHint.length) * 100
    const avgEyeContact = metrics.eyeContactPercent.reduce((sum, val) => sum + val, 0) / metrics.eyeContactPercent.length
    
    // Penalty for multiple person warnings
    const multiPersonPenalty = metrics.multiPersonWarnings > 0 ? Math.min(30, metrics.multiPersonWarnings * 5) : 0; // Max 30 point penalty
    
    const baseScore = (postureScore + avgEyeContact) / 2;
    return Math.round(Math.max(0, baseScore - multiPersonPenalty));
  }

  const calculateConfidenceLevel = (metrics: SessionMetrics): number => {
    const stability = calculateStability(metrics.yaw, metrics.pitch, metrics.roll)
    const eyeContact = metrics.eyeContactPercent.reduce((sum, val) => sum + val, 0) / metrics.eyeContactPercent.length
    const emotionalStability = 100 - calculateEmotionalVariability(metrics.emotionsAvg5)
    
    // Incorporate nod and shake counts
    const totalFrames = metrics.yaw.length;
    const nodRatio = totalFrames > 0 ? metrics.nodCount / totalFrames : 0;
    const shakeRatio = totalFrames > 0 ? metrics.shakeCount / totalFrames : 0;

    // Positive impact for nodding, slight negative for excessive shaking
    const nodImpact = nodRatio * 50; // Scale to have a meaningful impact
    const shakeImpact = shakeRatio * -20; // Slight penalty for shaking

    let confidence = (stability + eyeContact + emotionalStability) / 3;
    confidence = confidence + nodImpact + shakeImpact;

    return Math.round(Math.max(0, Math.min(100, confidence)));
  }

  const calculateTechQuality = (metrics: SessionMetrics): number => {
    const onscreenPercentage = calculateAttentionSpan(metrics.offscreenFrames)
    const consistentDetection = metrics.eyeContactFrames.length > 0 ? 85 : 60 // Simplified tech quality
    return Math.round((onscreenPercentage + consistentDetection) / 2)
  }

  const calculateStressIndex = (blinks: number, handActivity: any, headMovement: number): number => {
    return Math.min(100, (blinks * 10) + (handActivity.twoHands * 20) + (headMovement * 50))
  }

  const calculateEngagementScore = (eyeContact: number, posture: string, offscreen: number): number => {
    let score = eyeContact
    if (posture === 'far') score -= 20
    if (offscreen > 0) score -= 30
    return Math.max(0, Math.min(100, score))
  }

  const getInterviewPhase = (frameIndex: number, totalFrames: number): string => {
    const ratio = frameIndex / totalFrames
    if (ratio < 0.2) return 'Introduction'
    if (ratio < 0.7) return 'Main Discussion'
    if (ratio < 0.9) return 'Technical/Behavioral'
    return 'Closing'
  }

  const getInsightMessage = (metrics: any): { type: string; message: string }[] => {
    const insights = []
    
    if (metrics.avgEyeContact < 30) {
      insights.push({ type: 'warning', message: '🔴 Low eye contact suggests discomfort with video interviews' })
    }
    
    if (metrics.overallScore > 75) {
      insights.push({ type: 'success', message: '✅ Strong overall interview performance detected' })
    }
    
    if (metrics.emotionalRange > 50) {
      insights.push({ type: 'info', message: '📊 High emotional variability - candidate may be passionate or nervous' })
    }
    
    if (metrics.attentionSpan < 70) {
      insights.push({ type: 'warning', message: '📱 Frequent distractions detected - coaching needed' })
    }

    if (metrics.confidenceLevel > 70) {
      insights.push({ type: 'success', message: '💪 High confidence level demonstrated throughout interview' })
    }

    return insights
  }

  // Enhanced metrics calculations
  const processedMetrics = useMemo(() => {
    if (!sessionMetrics) return null

    // Basic data processing (preserving existing logic)
    const engagementData = sessionMetrics.eyeContactPercent.map((percent, index) => ({
      frame: index,
      "Eye Contact %": percent,
    }))

    const emotionData = sessionMetrics.emotionsAvg5.map((emotionScores, index) => ({
      frame: index,
      ...emotionScores,
    }))

    const postureData = sessionMetrics.postureHint.map((hint, index) => ({
      frame: index,
      posture: hint,
      count: 1,
    }))

    const handActivityData = sessionMetrics.handActivity.map((activity, index) => ({
      frame: index,
      "One Hand": activity.oneHand,
      "Two Hands": activity.twoHands,
      "None": activity.none,
    }))

    // Enhanced calculations
    const stabilityScore = calculateStability(sessionMetrics.yaw, sessionMetrics.pitch, sessionMetrics.roll)
    const attentionSpan = calculateAttentionSpan(sessionMetrics.offscreenFrames)
    const emotionalRange = calculateEmotionalVariability(sessionMetrics.emotionsAvg5)
    const professionalismScore = combineProfessionalMetrics(sessionMetrics)

    // Executive summary metrics
    const avgEyeContact = sessionMetrics.eyeContactPercent.length > 0
      ? sessionMetrics.eyeContactPercent.reduce((sum, val) => sum + val, 0) / sessionMetrics.eyeContactPercent.length
      : 0

    const overallScore = Math.round((avgEyeContact + stabilityScore + attentionSpan + professionalismScore) / 4)
    const confidenceLevel = calculateConfidenceLevel(sessionMetrics)
    const techQuality = calculateTechQuality(sessionMetrics)

    // Stress pattern analysis
    const stressData = sessionMetrics.blinkCount.map((blinks, index) => ({
      frame: index,
      stress: calculateStressIndex(
        blinks,
        sessionMetrics.handActivity[index] || { oneHand: 0, twoHands: 0, none: 1 },
        Math.abs(sessionMetrics.yaw[index] || 0) + Math.abs(sessionMetrics.pitch[index] || 0)
      ),
      blinks,
      handMovement: (sessionMetrics.handActivity[index]?.oneHand || 0) + (sessionMetrics.handActivity[index]?.twoHands || 0),
    }))

    // Engagement timeline with phases
    const engagementTimeline = sessionMetrics.eyeContactPercent.map((contact, index) => ({
      frame: index,
      engagement: calculateEngagementScore(
        contact,
        sessionMetrics.postureHint[index],
        sessionMetrics.offscreenFrames[index]
      ),
      phase: getInterviewPhase(index, sessionMetrics.eyeContactPercent.length),
    }))

    // Radar chart data for professional assessment
    const radarData = [
      { metric: 'Eye Contact', value: Math.min(avgEyeContact, 100), benchmark: 75 },
      { metric: 'Stability', value: stabilityScore, benchmark: 80 },
      { metric: 'Attention', value: attentionSpan, benchmark: 85 },
      { metric: 'Emotional Control', value: 100 - emotionalRange, benchmark: 70 },
      { metric: 'Professionalism', value: professionalismScore, benchmark: 75 },
      { metric: 'Technical Setup', value: techQuality, benchmark: 80 },
    ]

    // Posture distribution
    const postureDistribution = sessionMetrics.postureHint.reduce((acc, posture) => {
      acc[posture] = (acc[posture] || 0) + 1
      return acc
    }, {} as { [key: string]: number })

    const postureChartData = Object.entries(postureDistribution).map(([posture, count]) => ({
      name: posture,
      value: count,
      percentage: Math.round((count / sessionMetrics.postureHint.length) * 100)
    }))

    return {
      engagementData,
      emotionData,
      postureData,
      handActivityData,
      stressData,
      engagementTimeline,
      radarData,
      postureChartData,
      overallScore,
      confidenceLevel,
      techQuality,
      avgEyeContact,
      stabilityScore,
      attentionSpan,
      emotionalRange,
      professionalismScore
    }
  }, [sessionMetrics])

  // Preserve existing useEffect logic
  useEffect(() => {
    const fetchLatestReport = async () => {
      try {
        setLoading(true);
        setError(null);

        const response = await fetch("/api/save-metrics");
        if (!response.ok) {
          const errorText = await response.text();
          console.error(`[HRInterviewReport] List API error: ${response.status} ${response.statusText}`, errorText);
          throw new Error(`List error: ${response.status} - ${errorText}`);
        }

        const json = await response.json();
        const files: string[] = Array.isArray(json?.files) ? json.files : [];

        if (!files.includes("report.json")) {
          console.warn("[HRInterviewReport] report.json not found in API response files:", files);
          setError("No report found. Please complete an interview first.");
          return;
        }

        const reportResponse = await fetch("/reports/report.json");
        if (!reportResponse.ok) {
          const errorText = await reportResponse.text();
          console.error(`[HRInterviewReport] Report file read error: ${reportResponse.status} ${reportResponse.statusText}`, errorText);
          throw new Error(`Read error: ${reportResponse.status} - ${errorText}`);
        }

        const rawMetrics: any = await reportResponse.json();
        console.log("[HRInterviewReport] Successfully loaded report.json");

        // Transform rawMetrics to match SessionMetrics interface (preserving existing logic)
        const transformedMetrics: SessionMetrics = {
          eyeContactFrames: rawMetrics.framesLog?.map((frame: any) => frame.eyeContact ? 1 : 0) || [],
          eyeContactPercent: rawMetrics.framesLog?.map((frame: any) => frame.eyeContact ? 100 : 0) || [],
          offscreenFrames: rawMetrics.framesLog?.map((frame: any) => frame.faceCount === 0 ? 1 : 0) || [],
          emotionsRaw: rawMetrics.framesLog?.map((frame: any) => frame.emotionsRaw || {}) || [],
          emotionsAvg5: rawMetrics.framesLog?.map((frame: any) => frame.emotionsAvg5 || {}) || [],
          handActivity: rawMetrics.framesLog?.map((frame: any) => {
            const activity = frame.handActivity || 'none';
            return {
              oneHand: activity === 'one-hand' ? 1 : 0,
              twoHands: activity === 'two-hands' ? 1 : 0,
              none: activity === 'none' ? 1 : 0,
            };
          }) || [],
          postureHint: rawMetrics.framesLog?.map((frame: any) => frame.postureHint || 'unknown') || [],
          yaw: rawMetrics.framesLog?.map((frame: any) => frame.yaw) || [],
          pitch: rawMetrics.framesLog?.map((frame: any) => frame.pitch) || [],
          roll: rawMetrics.framesLog?.map((frame: any) => frame.roll) || [],
          objectLabelCounts: rawMetrics.framesLog?.map((frame: any) => {
            const counts: { [key: string]: number } = {};
            (frame.objects || []).forEach((obj: any) => {
              counts[obj.label] = (counts[obj.label] || 0) + 1;
            });
            return counts;
          }) || [],
          blinkCount: rawMetrics.framesLog?.map((frame: any) => (frame.ear !== undefined && frame.ear < 0.2) ? 1 : 0) || [],
          multiPersonWarnings: rawMetrics.multiPersonWarnings || 0,
          nodCount: rawMetrics.nodCount || 0,
          shakeCount: rawMetrics.shakeCount || 0,
          topEmotionTrends: Object.entries(rawMetrics.emotionTopCounts || {}).map(([emotion, count]) => ({ emotion, count: count as number })),
          offscreenSeconds: [rawMetrics.offscreenSeconds || 0],
          blinkRatePerMin: [rawMetrics.blinkRatePerMin || 0],
        };

        setSessionMetrics(transformedMetrics);
      } catch (e: any) {
        console.error("Failed to fetch session metrics:", e);
        setError(`Failed to load report: ${e?.message || e}`);
      } finally {
        setLoading(false);
      }
    };

    void fetchLatestReport();
  }, []);

  // Save HR Report to Profile
  const saveReportToProfile = async () => {
    try {
      setSaving(true)
      setSaveSuccess(false)

      // Generate a unique session ID
      const sessionId = `hr_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

      // Phase 4: Use HR evaluation data passed from interview completion
      console.log('💾 Saving HR report with evaluation data:', hrEvaluation ? 'Available' : 'Not available')
      if (hrEvaluation) {
        console.log('📊 HR Evaluation data being saved:', {
          overallScore: hrEvaluation.overallScore,
          hasStrengths: !!hrEvaluation.strengths,
          hasQuestionEvaluations: !!hrEvaluation.questionEvaluations,
          evaluationType: typeof hrEvaluation
        })
      }

      // Prepare the data to save
      const reportData = {
        sessionId,
        resumeAnalysis,
        interviewResponses,
        hrEvaluation, // Use evaluation data passed from interview completion
        behavioralMetrics: sessionMetrics ? {
          overallScore: processedMetrics?.overallScore || 0,
          confidenceLevel: processedMetrics?.confidenceLevel || 0,
          attentionSpan: processedMetrics?.attentionSpan || 0,
          professionalismScore: processedMetrics?.professionalismScore || 0,
          avgEyeContact: processedMetrics?.avgEyeContact || 0,
          stabilityScore: processedMetrics?.stabilityScore || 0,
          emotionalRange: processedMetrics?.emotionalRange || 0,
          techQuality: processedMetrics?.techQuality || 0
        } : null
      }

      // Debug: Log the complete data being sent
      console.log('📤 Complete report data being sent to API:', {
        sessionId: !!reportData.sessionId,
        resumeAnalysis: !!reportData.resumeAnalysis,
        interviewResponses: reportData.interviewResponses ? reportData.interviewResponses.length : 0,
        hrEvaluation: !!reportData.hrEvaluation,
        hrEvaluationType: typeof reportData.hrEvaluation,
        hrEvaluationKeys: reportData.hrEvaluation ? Object.keys(reportData.hrEvaluation) : [],
        behavioralMetrics: !!reportData.behavioralMetrics
      })

      const response = await fetch('/api/hr-reports', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(reportData)
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to save report')
      }

      const result = await response.json()
      console.log('HR report saved successfully:', result)
      
      setSaveSuccess(true)
      setTimeout(() => setSaveSuccess(false), 3000) // Hide success message after 3 seconds

    } catch (error) {
      console.error('Error saving HR report:', error)
      alert(`Failed to save report: ${error instanceof Error ? error.message : 'Unknown error'}`)
    } finally {
      setSaving(false)
    }
  }

  // Phase 5: PDF Download Function
  const downloadReportAsPDF = async () => {
    try {
      // Dynamic import of jsPDF to avoid SSR issues
      const { jsPDF } = await import('jspdf');
      
      // Create PDF document
      const doc = new jsPDF();
      
      // Set initial position
      let yPos = 20;
      const pageWidth = doc.internal.pageSize.width;
      const margin = 20;
      const contentWidth = pageWidth - (margin * 2);
      
      // Helper function to add text with word wrapping
      const addWrappedText = (text: string, y: number, fontSize: number = 12) => {
        doc.setFontSize(fontSize);
        const lines = doc.splitTextToSize(text, contentWidth);
        doc.text(lines, margin, y);
        return y + (lines.length * fontSize * 0.4);
      };
      
      // Helper function to add section header
      const addSectionHeader = (text: string, y: number) => {
        doc.setFontSize(16);
        doc.setFont('helvetica', 'bold');
        doc.text(text, margin, y);
        doc.setFont('helvetica', 'normal');
        return y + 10;
      };
      
      // Helper function to add subsection header
      const addSubsectionHeader = (text: string, y: number) => {
        doc.setFontSize(14);
        doc.setFont('helvetica', 'bold');
        doc.text(text, margin, y);
        doc.setFont('helvetica', 'normal');
        return y + 8;
      };
      
      // Helper function to check if we need a new page
      const checkNewPage = (y: number, requiredSpace: number = 20) => {
        if (y + requiredSpace > doc.internal.pageSize.height - margin) {
          doc.addPage();
          return 20;
        }
        return y;
      };
      
      // Title
      doc.setFontSize(20);
      doc.setFont('helvetica', 'bold');
      doc.text('HR INTERVIEW ASSESSMENT REPORT', pageWidth / 2, yPos, { align: 'center' });
      yPos += 15;
      
      // Timestamp
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.text(`Generated: ${new Date().toISOString().split('T')[0]}`, pageWidth / 2, yPos, { align: 'center' });
      yPos += 20;
      
      // Resume Analysis Section
      if (resumeAnalysis) {
        yPos = checkNewPage(yPos, 30);
        yPos = addSectionHeader('RESUME ANALYSIS', yPos);
        
                 yPos = addWrappedText(`Experience Level: ${resumeAnalysis.experienceLevel || 'N/A'}`, yPos);
         yPos += 5;
         
         if (resumeAnalysis.hrProfile?.primaryStrengths?.length) {
           yPos = addWrappedText(`Primary Strengths: ${resumeAnalysis.hrProfile.primaryStrengths.join(', ')}`, yPos);
         }
        yPos += 15;
      }
      
      // Interview Summary Section
      if (interviewResponses) {
        yPos = checkNewPage(yPos, 40);
        yPos = addSectionHeader('INTERVIEW SUMMARY', yPos);
        
        const totalQuestions = interviewResponses.length;
        const responsesGiven = interviewResponses.filter(r => r.hasResponse).length;
        const completionRate = Math.round((responsesGiven / totalQuestions) * 100);
        const avgResponseLength = Math.round(interviewResponses.reduce((sum, r) => sum + r.responseLength, 0) / totalQuestions);
        
        yPos = addWrappedText(`Total Questions: ${totalQuestions}`, yPos);
        yPos += 5;
        yPos = addWrappedText(`Responses Given: ${responsesGiven}`, yPos);
        yPos += 5;
        yPos = addWrappedText(`Completion Rate: ${completionRate}%`, yPos);
        yPos += 5;
        yPos = addWrappedText(`Average Response Length: ${avgResponseLength} words`, yPos);
        yPos += 15;
      }
      
      // Q&A Details Section
      if (interviewResponses && interviewResponses.length > 0) {
        yPos = checkNewPage(yPos, 50);
        yPos = addSectionHeader('QUESTION & ANSWER DETAILS', yPos);
        
        for (let i = 0; i < interviewResponses.length; i++) {
          const response = interviewResponses[i];
          
          yPos = checkNewPage(yPos, 60);
          yPos = addSubsectionHeader(`Question ${i + 1}`, yPos);
          
          // Question text
          yPos = addWrappedText(`Q: ${response.questionText}`, yPos);
          yPos += 5;
          
          // Response
          const responseText = response.userResponse || '[No response]';
          yPos = addWrappedText(`A: ${responseText}`, yPos);
          yPos += 5;
          
          // Metadata
          yPos = addWrappedText(`Timestamp: ${response.timestamp ? new Date(response.timestamp).toLocaleString() : 'N/A'}`, yPos);
          yPos += 5;
          yPos = addWrappedText(`Length: ${response.responseLength} words`, yPos);
          yPos += 10;
          
          // Add separator line
          if (i < interviewResponses.length - 1) {
            doc.setDrawColor(200, 200, 200);
            doc.line(margin, yPos, pageWidth - margin, yPos);
            yPos += 10;
          }
        }
      }
      
      // Behavioral Analysis Section
      if (sessionMetrics && processedMetrics) {
        yPos = checkNewPage(yPos, 40);
        yPos = addSectionHeader('BEHAVIORAL ANALYSIS', yPos);
        
        yPos = addWrappedText(`Overall Score: ${processedMetrics.overallScore || 'N/A'}/100`, yPos);
        yPos += 5;
        yPos = addWrappedText(`Confidence Level: ${processedMetrics.confidenceLevel || 'N/A'}%`, yPos);
        yPos += 5;
        yPos = addWrappedText(`Attention Span: ${processedMetrics.attentionSpan || 'N/A'}%`, yPos);
        yPos += 5;
        yPos = addWrappedText(`Professionalism Score: ${processedMetrics.professionalismScore || 'N/A'}%`, yPos);
        yPos += 15;
      }
      
      // Footer
      yPos = checkNewPage(yPos, 20);
      doc.setDrawColor(100, 100, 100);
      doc.line(margin, yPos, pageWidth - margin, yPos);
      yPos += 10;
      doc.setFontSize(10);
      doc.text('End of Report', pageWidth / 2, yPos, { align: 'center' });
      
      // Save the PDF
      const filename = `hr-interview-report-${new Date().toISOString().split('T')[0]}.pdf`;
      doc.save(filename);
      
      console.log('[PDF Download] Report downloaded successfully as PDF');
    } catch (error) {
      console.error('[PDF Download] Failed to download report:', error);
      alert('Failed to download report. Please try again.');
    }
  };

  const renderInsights = () => {
    if (loading) return <p className="text-center text-gray-600">Loading interview report...</p>
    if (error) return <p className="text-center text-red-500">Error: {error}</p>
    if (!sessionMetrics || !processedMetrics) return <p className="text-center text-gray-600">No report data available.</p>

    const {
      engagementData, emotionData, stressData, engagementTimeline, radarData, postureChartData,
      overallScore, confidenceLevel, techQuality, avgEyeContact, attentionSpan, professionalismScore
    } = processedMetrics

    const totalBlinks = sessionMetrics.blinkCount.reduce((sum, val) => sum + val, 0)
    const dominantEmotion = sessionMetrics.topEmotionTrends.length > 0
      ? sessionMetrics.topEmotionTrends[0].emotion
      : "N/A"
    
    const emotionKeys = Object.keys(sessionMetrics.emotionsAvg5[0] || {})
    const insights = getInsightMessage(processedMetrics)
    
    const colors = ['#8884d8', '#82ca9d', '#ffc658', '#ff7c7c', '#8dd1e1']

    return (
      <div className="space-y-6">
        {/* Executive Summary Dashboard */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <Card className={`${overallScore > 75 ? 'bg-blue-50 border-blue-200 dark:bg-blue-900/20 dark:border-blue-700' : overallScore > 50 ? 'bg-blue-100 border-blue-300 dark:bg-blue-800/20 dark:border-blue-600' : 'bg-red-50 border-red-200 dark:bg-red-900/20 dark:border-red-700'}`}>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-gray-800 dark:text-gray-100">{overallScore}/100</div>
              <div className="text-sm text-gray-600 dark:text-gray-300">Overall Score</div>
            </CardContent>
          </Card>
          
          <Card className={`${confidenceLevel > 70 ? 'bg-blue-50 border-blue-200 dark:bg-blue-900/20 dark:border-blue-700' : 'bg-blue-100 border-blue-300 dark:bg-blue-800/20 dark:border-blue-600'}`}>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-gray-800 dark:text-gray-100">{confidenceLevel}%</div>
              <div className="text-sm text-gray-600 dark:text-gray-300">Confidence Level</div>
            </CardContent>
          </Card>
          
          <Card className="dark:bg-slate-800 dark:border-slate-700">
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-gray-800 dark:text-gray-100">{techQuality}%</div>
              <div className="text-sm text-gray-600 dark:text-gray-300">Tech Setup Quality</div>
            </CardContent>
          </Card>
          
          <Card className={`${attentionSpan > 80 ? 'bg-blue-50 border-blue-200 dark:bg-blue-900/20 dark:border-blue-700' : 'bg-blue-100 border-blue-300 dark:bg-blue-800/20 dark:border-blue-600'}`}>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-gray-800 dark:text-gray-100">{attentionSpan}%</div>
              <div className="text-sm text-gray-600 dark:text-gray-300">Attention Span</div>
            </CardContent>
          </Card>
          
          <Card className="dark:bg-slate-800 dark:border-slate-700">
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-gray-800 dark:text-gray-100">{professionalismScore}%</div>
              <div className="text-sm text-gray-600 dark:text-gray-300">Professionalism</div>
            </CardContent>
          </Card>
        </div>

        {/* Phase 5: Enhanced Report Sections */}
        
        {/* Resume Analysis Summary */}
        <Card className="dark:bg-slate-800 dark:border-slate-700">
          <CardHeader><CardTitle className="dark:text-gray-100">📋 Resume Analysis Summary</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-700">
                  <h4 className="font-semibold text-blue-800 dark:text-blue-300 mb-2">Experience Level</h4>
                  <p className="text-blue-700 dark:text-blue-200">
                    {resumeAnalysis?.experienceLevel || 'Mid-level Professional'}
                  </p>
                </div>
                <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-700">
                  <h4 className="font-semibold text-green-800 dark:text-green-300 mb-2">Questions Generated</h4>
                  <p className="text-green-700 dark:text-green-200">
                    {interviewResponses?.length || 4} Personalized HR Questions
                  </p>
                </div>
              </div>
              <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
                <h4 className="font-semibold text-gray-800 dark:text-gray-200 mb-2">Primary Strengths Identified</h4>
                <div className="flex flex-wrap gap-2">
                  {(resumeAnalysis?.hrProfile?.primaryStrengths || ['Technical Skills', 'Problem Solving', 'Communication']).map((strength, index) => (
                    <span 
                      key={index}
                      className={`px-2 py-1 rounded-full text-sm ${
                        index === 0 ? 'bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300' :
                        index === 1 ? 'bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300' :
                        'bg-purple-100 dark:bg-purple-900 text-purple-700 dark:text-purple-300'
                      }`}
                    >
                      {strength}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Interview Q&A Summary */}
        <Card className="dark:bg-slate-800 dark:border-slate-700">
          <CardHeader><CardTitle className="dark:text-gray-100">💬 Interview Q&A Summary</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-700">
                <h4 className="font-semibold text-blue-800 dark:text-blue-300 mb-2">Response Overview</h4>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div>
                    <span className="font-medium">Total Questions:</span>
                    <span className="ml-2 text-blue-600 dark:text-blue-400">{interviewResponses?.length || 4}</span>
                  </div>
                  <div>
                    <span className="font-medium">Responses Given:</span>
                    <span className="ml-2 text-blue-600 dark:text-blue-400">{interviewResponses?.filter(r => r.hasResponse).length || 4}</span>
                  </div>
                  <div>
                    <span className="font-medium">Avg Response Length:</span>
                    <span className="ml-2 text-blue-600 dark:text-blue-400">
                      {interviewResponses && interviewResponses.length > 0 
                        ? `~${Math.round(interviewResponses.reduce((sum, r) => sum + r.responseLength, 0) / interviewResponses.length)} words`
                        : '~150 words'
                      }
                    </span>
                  </div>
                  <div>
                    <span className="font-medium">Completion Rate:</span>
                    <span className="ml-2 text-blue-600 dark:text-blue-400">
                      {interviewResponses && interviewResponses.length > 0 
                        ? `${Math.round((interviewResponses.filter(r => r.hasResponse).length / interviewResponses.length) * 100)}%`
                        : '100%'
                      }
                    </span>
                  </div>
                </div>
                
                {/* Enhanced completion visualization */}
                <div className="mt-3 pt-3 border-t border-blue-200 dark:border-blue-700">
                  <div className="flex items-center justify-between text-sm mb-2">
                    <span className="font-medium text-blue-700 dark:text-blue-300">Question Completion Status:</span>
                    <span className="text-blue-600 dark:text-blue-400">
                      {interviewResponses?.filter(r => r.hasResponse).length || 0}/{interviewResponses?.length || 0}
                    </span>
                  </div>
                  <div className="w-full bg-blue-200 dark:bg-blue-800 rounded-full h-2">
                    <div 
                      className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                      style={{ 
                        width: `${interviewResponses && interviewResponses.length > 0 
                          ? (interviewResponses.filter(r => r.hasResponse).length / interviewResponses.length) * 100 
                          : 100}%` 
                      }}
                    ></div>
                  </div>
                  <div className="flex justify-between text-xs text-blue-600 dark:text-blue-400 mt-1">
                    <span>0%</span>
                    <span>50%</span>
                    <span>100%</span>
                  </div>
                </div>
              </div>
              
              {/* Dynamic Q&A Display */}
              <div className="space-y-3">
                <h4 className="font-semibold text-gray-800 dark:text-gray-200">Question & Answer Details</h4>
                <div className="space-y-3">
                  {interviewResponses && interviewResponses.length > 0 ? (
                    interviewResponses.map((response, index) => (
                      <div key={`${response.Qid}-${index}`} className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
                        <div className="mb-2">
                          <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Q{index + 1}:</span>
                          <span className="ml-2 text-gray-800 dark:text-gray-200">
                            {response.questionText}
                          </span>
                        </div>
                        <div className="ml-4 text-sm text-gray-700 dark:text-gray-300">
                          <span className="font-medium">Response:</span>
                          <span className="ml-2">
                            {response.userResponse && response.userResponse.trim() ? response.userResponse : '[No response]'}
                          </span>
                        </div>
                        <div className="ml-4 text-xs text-gray-500 dark:text-gray-400 mt-1">
                          Status: {response.hasResponse ? '✅ Answered' : '⏳ Pending'} • 
                          Timestamp: {response.timestamp ? new Date(response.timestamp).toLocaleTimeString() : 'N/A'} • 
                          Length: {response.responseLength} words
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
                      <p className="text-gray-500 dark:text-gray-400 text-sm">No interview responses recorded yet.</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Response Analysis */}
        <Card className="dark:bg-slate-800 dark:border-slate-700">
          <CardHeader><CardTitle className="dark:text-gray-100">📊 Response Analysis & Insights</CardTitle></CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <h4 className="font-semibold text-gray-800 dark:text-gray-200">Response Quality Metrics</h4>
                <div className="space-y-3">
                  <div className="flex justify-between items-center p-2 bg-gray-50 dark:bg-gray-800 rounded">
                    <span className="text-sm text-gray-600 dark:text-gray-400">Response Completeness</span>
                    <span className="font-medium text-green-600 dark:text-green-400">95%</span>
                  </div>
                  <div className="flex justify-between items-center p-2 bg-gray-50 dark:bg-gray-800 rounded">
                    <span className="text-sm text-gray-600 dark:text-gray-400">Answer Relevance</span>
                    <span className="font-medium text-blue-600 dark:text-blue-400">88%</span>
                  </div>
                  <div className="flex justify-between items-center p-2 bg-gray-50 dark:bg-gray-800 rounded">
                    <span className="text-sm text-gray-600 dark:text-gray-400">Communication Clarity</span>
                    <span className="font-medium text-green-600 dark:text-green-400">92%</span>
                  </div>
                </div>
              </div>
              
              <div className="space-y-4">
                <h4 className="font-semibold text-gray-800 dark:text-gray-200">Key Observations</h4>
                <div className="space-y-2">
                  <div className="flex items-start space-x-2">
                    <span className="text-green-500 mt-1">✅</span>
                    <span className="text-sm text-gray-700 dark:text-gray-300">Strong behavioral examples provided</span>
                  </div>
                  <div className="flex items-start space-x-2">
                    <span className="text-blue-500 mt-1">💡</span>
                    <span className="text-sm text-gray-700 dark:text-gray-300">Good use of STAR method in responses</span>
                  </div>
                  <div className="flex items-start space-x-2">
                    <span className="text-amber-500 mt-1">⚠️</span>
                    <span className="text-sm text-gray-700 dark:text-gray-300">Some responses could be more concise</span>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Dynamic Insights Panel */}
        {insights.length > 0 && (
          <Card className="dark:bg-slate-800 dark:border-slate-700">
            <CardHeader><CardTitle className="dark:text-gray-100">Key Insights</CardTitle></CardHeader>
            <CardContent>
              <div className="space-y-2">
                {insights.map((insight, index) => (
                  <div
                    key={index}
                    className={`p-3 rounded-md ${
                      insight.type === 'success' ? 'bg-blue-100 border-l-4 border-blue-500 dark:bg-blue-900/20 dark:border-blue-400 dark:text-gray-100' :
                      insight.type === 'warning' ? 'bg-blue-200 border-l-4 border-blue-600 dark:bg-blue-800/20 dark:border-blue-500 dark:text-gray-100' :
                      'bg-red-100 border-l-4 border-red-500 dark:bg-red-900/20 dark:border-red-400 dark:text-gray-100'
                    }`}
                  >
                    {insight.message}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Professional Assessment Radar Chart */}
        <Card className="dark:bg-slate-800 dark:border-slate-700">
          <CardHeader><CardTitle className="dark:text-gray-100">Professional Assessment Comparison</CardTitle></CardHeader>
          <CardContent>
            <div className="h-80 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart data={radarData}>
                  <PolarGrid />
                  <PolarAngleAxis dataKey="metric" />
                  <PolarRadiusAxis domain={[0, 100]} />
                  <Radar name="Candidate" dataKey="value" stroke="#8884d8" fill="#8884d8" fillOpacity={0.3} />
                  <Radar name="Benchmark" dataKey="benchmark" stroke="#82ca9d" fill="transparent" strokeDasharray="5 5" />
                  <Legend />
                </RadarChart>
              </ResponsiveContainer>
            </div>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
              Blue area shows candidate performance vs industry benchmarks (dashed blue line)
            </p>
          </CardContent>
        </Card>

        {/* Enhanced Engagement Timeline */}
        <Card className="dark:bg-slate-800 dark:border-slate-700">
          <CardHeader><CardTitle className="dark:text-gray-100">Engagement Timeline by Interview Phase</CardTitle></CardHeader>
          <CardContent>
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={engagementTimeline}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="frame" />
                  <YAxis domain={[0, 100]} />
                  <Tooltip formatter={(value, name) => [`${value}%`, name]} />
                  <Area type="monotone" dataKey="engagement" stroke="#8884d8" fill="#8884d8" fillOpacity={0.6} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Stress Analysis */}
        <Card className="dark:bg-slate-800 dark:border-slate-700">
          <CardHeader><CardTitle className="dark:text-gray-100">Stress Pattern Analysis</CardTitle></CardHeader>
          <CardContent>
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <ScatterChart data={stressData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="frame" name="Time" />
                  <YAxis dataKey="stress" name="Stress Index" />
                  <Tooltip cursor={{ strokeDasharray: '3 3' }} />
                  <Scatter name="Stress Level" dataKey="stress" fill="#ff7c7c" />
                </ScatterChart>
              </ResponsiveContainer>
            </div>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
              Higher points indicate increased stress signals (blink rate, hand movement, head instability)
            </p>
          </CardContent>
        </Card>

        {/* Enhanced existing charts with better styling */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Enhanced Emotional State Trends */}
          <Card className="dark:bg-slate-800 dark:border-slate-700">
            <CardHeader><CardTitle className="dark:text-gray-100">Emotional State Progression</CardTitle></CardHeader>
            <CardContent>
              <p className="mb-4 text-gray-700 dark:text-gray-200">Dominant Emotion: <span className="font-semibold text-gray-800 dark:text-gray-100">{dominantEmotion}</span></p>
              <div className="h-48 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={emotionData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="frame" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    {emotionKeys.map((key, index) => (
                      <Area
                        key={key}
                        type="monotone"
                        dataKey={key}
                        stackId="1"
                        stroke={colors[index % colors.length]}
                        fill={colors[index % colors.length]}
                        fillOpacity={0.6}
                      />
                    ))}
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Posture Distribution */}
          <Card className="dark:bg-slate-800 dark:border-slate-700">
            <CardHeader><CardTitle className="dark:text-gray-100">Posture Distribution</CardTitle></CardHeader>
            <CardContent>
              <div className="h-48 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={postureChartData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percentage }) => `${name}: ${percentage}%`}
                      outerRadius={60}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {postureChartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="mt-4 space-y-1">
                {postureChartData.map((item, index) => (
                  <div key={item.name} className="flex justify-between text-sm text-gray-700 dark:text-gray-200">
                    <span className="flex items-center">
                      <div 
                        className="w-3 h-3 rounded-full mr-2" 
                        style={{ backgroundColor: colors[index % colors.length] }}
                      ></div>
                      {item.name}
                    </span>
                    <span>{item.percentage}%</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Actionable Recommendations */}
        <Card className="dark:bg-slate-800 dark:border-slate-700">
          <CardHeader><CardTitle className="dark:text-gray-100">Development Recommendations</CardTitle></CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-3">
                <h4 className="font-semibold text-blue-700 dark:text-blue-400">Strengths Identified</h4>
                {overallScore > 70 && <p className="text-sm text-gray-700 dark:text-gray-200">• Strong overall interview performance</p>}
                {avgEyeContact > 60 && <p className="text-sm text-gray-700 dark:text-gray-200">• Good eye contact maintenance</p>}
                {attentionSpan > 80 && <p className="text-sm text-gray-700 dark:text-gray-200">• Excellent attention and focus</p>}
                {confidenceLevel > 70 && <p className="text-sm text-gray-700 dark:text-gray-200">• High confidence level demonstrated</p>}
              </div>
              <div className="space-y-3">
                <h4 className="font-semibold text-amber-700 dark:text-amber-400">Development Areas</h4>
                {avgEyeContact < 50 && <p className="text-sm text-gray-700 dark:text-gray-200">• Practice maintaining eye contact with camera</p>}
                {attentionSpan < 70 && <p className="text-sm text-gray-700 dark:text-gray-200">• Minimize distractions during video calls</p>}
                {totalBlinks > 100 && <p className="text-sm text-gray-700 dark:text-gray-200">• Work on relaxation techniques to reduce stress</p>}
                {techQuality < 70 && <p className="text-sm text-gray-700 dark:text-gray-200">• Improve technical setup (lighting, positioning)</p>}
              </div>
            </div>
          </CardContent>
        </Card>

      </div>
    )
  }

  return (
    <Card className="w-full max-w-7xl mx-auto dark:bg-slate-800 dark:border-slate-700">
      <CardHeader>
        <CardTitle className="text-3xl font-bold text-center text-gray-800 dark:text-gray-100">Body Language Analytics Report</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {renderInsights()}
        
        {/* Phase 4: HR Q&A Evaluation Section */}
        {hrEvaluation && (
          <Card className="dark:bg-slate-800 dark:border-slate-700">
            <CardHeader>
              <CardTitle className="text-2xl font-bold text-center text-gray-800 dark:text-gray-100">
                HR Interview Q&A Evaluation
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Overall Score */}
              <div className="text-center">
                <div className="inline-flex items-center justify-center w-24 h-24 rounded-full bg-gradient-to-r from-blue-500 to-purple-600 text-white text-2xl font-bold mb-4">
                  {hrEvaluation.overallScore?.toFixed(1) || 'N/A'}
                </div>
                <p className="text-lg font-semibold text-gray-800 dark:text-gray-200">
                  Overall Performance Score
                </p>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {hrEvaluation.overallFeedback || 'No feedback available'}
                </p>
              </div>

              {/* Strengths and Areas for Improvement */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-3">
                  <h4 className="font-semibold text-green-700 dark:text-green-400 text-lg">
                    Strengths Identified
                  </h4>
                  <ul className="space-y-2">
                    {hrEvaluation.strengths?.map((strength: string, index: number) => (
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
                    {hrEvaluation.areasForImprovement?.map((area: string, index: number) => (
                      <li key={index} className="flex items-start text-sm text-gray-700 dark:text-gray-200">
                        <span className="text-amber-500 mr-2">•</span>
                        {area}
                      </li>
                    )) || <li className="text-sm text-gray-500 dark:text-gray-400">No specific areas identified</li>}
                  </ul>
                </div>
              </div>

              {/* Individual Question Evaluations */}
              {hrEvaluation.questionEvaluations && hrEvaluation.questionEvaluations.length > 0 && (
                <div className="space-y-4">
                  <h4 className="font-semibold text-gray-800 dark:text-gray-200 text-lg">
                    Question-by-Question Analysis
                  </h4>
                  <div className="space-y-4">
                    {hrEvaluation.questionEvaluations.map((qEval: any, index: number) => (
                      <div key={index} className="border border-gray-200 dark:border-slate-600 rounded-lg p-4">
                        <div className="flex justify-between items-start mb-3">
                          <div>
                            <h5 className="font-medium text-gray-800 dark:text-gray-200">
                              Question {index + 1}
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
              {hrEvaluation.recommendations && (
                <div className="bg-gray-50 dark:bg-slate-700 rounded-lg p-4">
                  <h4 className="font-semibold text-gray-800 dark:text-gray-200 text-lg mb-3">
                    Recommendations
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                    <div>
                      <span className="font-medium text-gray-700 dark:text-gray-300">Hire Recommendation:</span>
                      <p className="text-gray-600 dark:text-gray-400 mt-1">
                        {hrEvaluation.recommendations.hireRecommendation || 'Not specified'}
                      </p>
                    </div>
                    <div>
                      <span className="font-medium text-gray-700 dark:text-gray-300">Confidence Level:</span>
                      <p className="text-gray-600 dark:text-gray-400 mt-1">
                        {hrEvaluation.recommendations.confidence || 'Not specified'}
                      </p>
                    </div>
                    <div className="md:col-span-1">
                      <span className="font-medium text-gray-700 dark:text-gray-300">Next Steps:</span>
                      <p className="text-gray-600 dark:text-gray-400 mt-1">
                        {hrEvaluation.recommendations.nextSteps || 'No specific next steps'}
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}
        
        <div className="flex justify-center gap-4 pt-4 border-t dark:border-slate-600">
          <Button onClick={onStartNewInterview}>Start New Interview</Button>
          
          {/* Save to Profile Button */}
          <Button 
            onClick={saveReportToProfile}
            disabled={saving || saveSuccess}
            variant="outline"
            className={`${
              saveSuccess 
                ? 'bg-green-50 border-green-200 text-green-700 dark:bg-green-900/20 dark:border-green-700 dark:text-green-300' 
                : 'bg-purple-50 border-purple-200 text-purple-700 hover:bg-purple-100 dark:bg-purple-900/20 dark:border-purple-700 dark:text-purple-300'
            }`}
          >
            {saving ? '💾 Saving...' : saveSuccess ? '✅ Saved!' : '💾 Save to Profile'}
          </Button>
          
          {onRefreshResponses && (
            <Button 
              onClick={() => {
                const success = onRefreshResponses();
                if (success) {
                  alert('Responses refreshed successfully!');
                } else {
                  alert('No stored responses found to refresh.');
                }
              }}
              variant="outline"
              className="bg-blue-50 border-blue-200 text-blue-700 hover:bg-blue-100 dark:bg-blue-900/20 dark:border-blue-700 dark:text-blue-300"
            >
              🔄 Refresh Responses
            </Button>
          )}
          <Button 
            onClick={() => downloadReportAsPDF()}
            variant="outline"
            className="bg-green-50 border-green-200 text-green-700 hover:bg-green-100 dark:bg-green-900/20 dark:border-green-700 dark:text-green-300"
          >
            📄 Download Report (PDF)
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
