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
  const [interviewSessionId, setInterviewSessionId] = useState<string | null>(null); // New state for session ID

  useEffect(() => {
    try {
      const storedAnalysis = sessionStorage.getItem("hrResumeAnalysis")
      if (storedAnalysis) {
        setHRResumeAnalysis(JSON.parse(storedAnalysis))
      }

      // Retrieve the interviewSessionId from sessionStorage or URL if available
      const currentSessionId = sessionStorage.getItem("currentInterviewSessionId");
      if (currentSessionId) {
        setInterviewSessionId(currentSessionId);
        console.log("[ReportPage] Loaded interviewSessionId from sessionStorage:", currentSessionId);

        const storedResponses = localStorage.getItem(`hr_interview_responses_${currentSessionId}`);
        if (storedResponses) {
          setInterviewResponses(JSON.parse(storedResponses));
          console.log("[ReportPage] Loaded interview responses for session:", currentSessionId);
        } else {
          console.log("[ReportPage] No responses found for session:", currentSessionId);
          setInterviewResponses([]); // Ensure it's empty if no responses for this session
        }
      } else {
        console.warn("[ReportPage] No currentInterviewSessionId found in sessionStorage.");
        // Optionally, try to load a generic one or show a message
        setInterviewResponses([]);
      }
    } catch (e) {
      console.error("Failed to load data from storage:", e)
    }
  }, [])

  const handleStartNewInterview = () => {
    // Clear specific session responses if an ID exists
    if (interviewSessionId) {
      localStorage.removeItem(`hr_interview_responses_${interviewSessionId}`);
      console.log(`[ReportPage] Cleared responses for session ID: ${interviewSessionId}`);
    }
    sessionStorage.removeItem("hrResumeAnalysis")
    sessionStorage.removeItem("currentInterviewSessionId"); // Clear the session ID from sessionStorage
    router.push("/hr-interview/hr-mode-selection")
  }

  const refreshResponsesFromStorage = useCallback(() => {
    if (!interviewSessionId) {
      console.warn("[Manual Refresh] No interviewSessionId available to refresh responses.");
      return false;
    }
    try {
      const storedResponses = localStorage.getItem(`hr_interview_responses_${interviewSessionId}`);
      if (storedResponses) {
        const parsed = JSON.parse(storedResponses);
        if (Array.isArray(parsed)) {
          setInterviewResponses(parsed);
          console.log(`[Manual Refresh] Refreshed responses for session ID: ${interviewSessionId}`);
          return true;
        }
      }
    } catch (e) {
      console.error("[Manual Refresh] Failed to refresh from localStorage:", e);
    }
    return false;
  }, [interviewSessionId]);


  return (
    <div className="flex items-center justify-center min-h-[calc(100vh-200px)]">
      <HRInterviewReport
        onStartNewInterview={handleStartNewInterview}
        resumeAnalysis={hrResumeAnalysis}
        interviewResponses={interviewResponses}
        onRefreshResponses={refreshResponsesFromStorage}
        hrEvaluation={hrEvaluation}
        interviewSessionId={interviewSessionId} // Pass the session ID to the report component
      />
    </div>
  )
}
