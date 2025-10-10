"use client"

import { HRInterviewReport } from "@/components/hr-interview-report"
import { useRouter } from "next/navigation"
import { useState, useEffect, useCallback } from "react"

interface HRQuestion {
  Qid: string;
  question_type: string;
  question_text: string;
  difficulty_level: string;
  topic: string;
  focus_area: string;
}

interface InterviewResponse {
  Qid: string;
  Rid: string;
  questionText: string;
  questionType: string;
  questionTopic: string;
  userResponse: string;
  timestamp: string;
  responseLength: number;
  hasResponse: boolean;
}

interface HRResumeAnalysis {
  experienceLevel: string
  hrProfile: {
    topSkills: string[]
    primaryStrengths: string[]
    hasLeadershipExperience: boolean
    hasStrongCommunication: boolean
  }
  skills: Array<{
    name: string
    category: string
    score: number
  }>
  projectTypes: string[]
  industryExperience: string[]
  leadershipExperience: any
  communicationEvidence: any
  resultsAndImpact: string[]
  recommendedQuestionFocus: any
}

export default function ReportPage() {
  const router = useRouter()
  const [hrResumeAnalysis, setHRResumeAnalysis] = useState<HRResumeAnalysis | null>(null)
  const [interviewResponses, setInterviewResponses] = useState<InterviewResponse[]>([])
  const [hrEvaluation, setHrEvaluation] = useState<any>(null)
  const [allQuestions, setAllQuestions] = useState<HRQuestion[]>([]) // Needed for refreshResponsesFromStorage

  useEffect(() => {
    try {
      const storedAnalysis = sessionStorage.getItem("hrResumeAnalysis")
      if (storedAnalysis) {
        setHRResumeAnalysis(JSON.parse(storedAnalysis))
      }
      const storedResponses = localStorage.getItem("hr_interview_responses")
      if (storedResponses) {
        setInterviewResponses(JSON.parse(storedResponses))
      }
    } catch (e) {
      console.error("Failed to load data from storage:", e)
    }
  }, [])

  const handleStartNewInterview = () => {
    localStorage.removeItem("hr_interview_responses")
    sessionStorage.removeItem("hrResumeAnalysis")
    router.push("/hr-interview/hr-mode-selection")
  }

  const refreshResponsesFromStorage = useCallback(() => {
    try {
      const storedResponses = localStorage.getItem("hr_interview_responses");
      if (storedResponses) {
        const parsed = JSON.parse(storedResponses);
        // Assuming allQuestions is available or can be derived if needed for length check
        if (Array.isArray(parsed)) { // Simplified check for now
          setInterviewResponses(parsed);
          return true;
        }
      }
    } catch (e) {
      console.error("[Manual Refresh] Failed to refresh from localStorage:", e);
    }
    return false;
  }, []);


  return (
    <div className="flex items-center justify-center min-h-[calc(100vh-200px)]">
      <HRInterviewReport
        onStartNewInterview={handleStartNewInterview}
        resumeAnalysis={hrResumeAnalysis}
        interviewResponses={interviewResponses}
        onRefreshResponses={refreshResponsesFromStorage}
        hrEvaluation={hrEvaluation}
      />
    </div>
  )
}
