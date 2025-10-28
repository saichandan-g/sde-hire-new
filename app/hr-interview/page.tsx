"use client"

import { useState, useCallback, useEffect } from "react"
import { AuthLayout } from "@/components/layout/auth-layout"
import { HRResumeUpload } from "@/components/hr-resume-upload"
import { HRModeSelection } from "@/components/hr-mode-selection"
import { HRInterviewPanel } from "@/components/hr-interview-panel"
import { HRPresenceSidebar } from "@/components/hr-presence-sidebar"
import { HRInterviewReport } from "@/components/hr-interview-report" // New import
import { AIModelSelection } from "@/components/ai-model-selection"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import "./hr-interview.css"

type HRInterviewStage =
  | "upload"
  | "analyzing"
  | "questions-ready"
  | "mode-selection"
  | "ai-model-selection"
  | "interview"
  | "report"

type InterviewMode = "pro" | "video"

interface HRResumeData {
  summary: string
  skills: string[]
  experience: string[]
  hrEvaluation?: any | null
}

interface HRQuestion {
  Qid: string; // Changed from 'id' to 'Qid'
  question_type: string;
  question_text: string;
  difficulty_level: string;
  topic: string;
  focus_area: string;
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

// New interfaces for Phase 4: Response Tracking
interface InterviewResponse {
  Qid: string; // Changed from 'questionId' to 'Qid'
  Rid: string; // New: Response ID
  questionText: string;
  questionType: string;
  questionTopic: string;
  userResponse: string;
  timestamp: string;
  responseLength: number;
  hasResponse: boolean;
}

interface ResponseStatus {
  isSaving: boolean
  lastSaved: string | null
  saveError: string | null
}

// Define the fixed first question
const FIXED_FIRST_QUESTION: HRQuestion = {
  Qid: "Q1",
  question_type: "behavioral",
  question_text: "Tell me about yourself?",
  difficulty_level: "easy",
  topic: "Self-Introduction",
  focus_area: "General Background",
};

export default function HRInterviewSimulatorPage() {
  // START FLOW at mode-selection as requested
  const [hrInterviewStage, setHRInterviewStage] = useState<HRInterviewStage>("mode-selection")
  const [hrResumeData, setHRResumeData] = useState<HRResumeData | null>(null)
  const [hrResumeAnalysis, setHRResumeAnalysis] = useState<HRResumeAnalysis | null>(null)
  const [hrInterviewQuestions, setHRInterviewQuestions] = useState<HRQuestion[]>([])
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0)
  const [interviewMode, setInterviewMode] = useState<InterviewMode>("pro")
  const [selectedAIModel, setSelectedAIModel] = useState<string>("")
  const [apiKey, setApiKey] = useState<string>("")
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [dynamicQuestions, setDynamicQuestions] = useState<HRQuestion[]>([]); // State for dynamic questions
  const [allQuestions, setAllQuestions] = useState<HRQuestion[]>([]); // Combined questions
  const [isGeneratingDynamicQuestions, setIsGeneratingDynamicQuestions] = useState(false); // New state for dynamic question generation
  // New state for Phase 4: Response Tracking
  const [interviewResponses, setInterviewResponses] = useState<InterviewResponse[]>([])
  const [responseStatus, setResponseStatus] = useState<ResponseStatus>({
    isSaving: false,
    lastSaved: null,
    saveError: null,
  })
  // Phase 4: HR Evaluation state
  const [hrEvaluation, setHrEvaluation] = useState<any>(null)
  const [isReportSaved, setIsReportSaved] = useState(false); // New state for report saving status
  const [interviewSessionId, setInterviewSessionId] = useState<string | null>(null); // New state for unique interview session ID

  // ---------------------------
  // Flow handlers (modified flow)
  // ---------------------------
  // New function to save the HR report via API
  const saveHRReport = useCallback(async () => {
    if (!hrResumeAnalysis || interviewResponses.length === 0 || !hrEvaluation || isReportSaved || !interviewSessionId) {
      console.log("[Report Save] Skipping save because required data is missing, report is already saved, or no session ID.");
      return;
    }

    try {
      const response = await fetch('/api/hr-reports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId: interviewSessionId, // Use the generated interviewSessionId
          resumeAnalysis: hrResumeAnalysis,
          interviewResponses: interviewResponses,
          hrEvaluation: hrEvaluation,
          behavioralMetrics: null, // Not implemented yet
        }),
      });

      if (!response.ok) {
        console.error('Failed to save HR report:', await response.json());
      } else {
        console.log('✅ HR report saved successfully!');
        setIsReportSaved(true);
      }
    } catch (error) {
      console.error('Error saving HR report:', error);
    }
  }, [hrResumeAnalysis, interviewResponses, hrEvaluation, isReportSaved, interviewSessionId]);

  // Mode selection is now the first screen.
  // If pro -> go to AI model selection first (per new flow).
  // If video -> go straight to interview (unchanged).
  const handleModeSelection = (mode: InterviewMode) => {
    // Clear setup completion flag when starting new interview
    localStorage.removeItem("hr_interview_setup_completed")
    console.log("[Mode Selection] Cleared setup completion flag for new interview")

    // Clear stored resume analysis to prevent stale data issues
    sessionStorage.removeItem("hrResumeAnalysis")
    console.log("[Mode Selection] Cleared stored resume analysis to prevent stale data")

    // Generate a unique session ID for this interview
    const newSessionId = `hr_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    setInterviewSessionId(newSessionId);
    console.log("[Mode Selection] Generated new interview session ID:", newSessionId);

    setInterviewMode(mode)

    if (mode === "pro") {
      // PRO flow: ModeSelection -> AI Model Selection -> Upload -> Analyzing -> Questions Ready -> Interview -> Report
      setHRInterviewStage("ai-model-selection")
      console.log("[Mode Selection] PRO selected — moving to AI model selection")
    } else {
      // VIDEO flow: ModeSelection -> Interview (no resume required)
      setHRInterviewStage("interview")
      console.log("[Mode Selection] VIDEO selected — moving to interview")
    }
  }

  // Called when a resume file is uploaded by user (Pro mode)
  const handleHRResumeUpload = async (file: File) => {
    try {
      setIsLoading(true)
      setError(null)
      setHRInterviewStage("analyzing")

      // Read the file content
      const text = await file.text()

      // Step 1: Analyze resume
      const formData = new FormData();
      formData.append('resume', file); // Append the actual File object

      const analysisResponse = await fetch("/api/hr-resume-analysis", {
        method: "POST",
        // No 'Content-Type' header needed for FormData, browser sets it automatically
        body: formData,
      })

      if (!analysisResponse.ok) {
        throw new Error("Failed to analyze resume")
      }

      const analysis = await analysisResponse.json()
      setHRResumeAnalysis(analysis)

      // Save the analysis to sessionStorage
      try {
        sessionStorage.setItem("hrResumeAnalysis", JSON.stringify(analysis))
        console.log("[Resume Upload] Saved resume analysis to sessionStorage")
      } catch (e) {
        console.error("[Resume Upload] Failed to save to sessionStorage:", e)
      }

      // Step 2: Generate dynamic questions based on resume analysis, including the fixed first question
      console.log("[Resume Upload] Analysis complete — generating AI questions.");
      await generateDynamicQuestions(analysis);

    } catch (err) {
      console.error("Error processing resume:", err)
      setError(err instanceof Error ? err.message : "Failed to process resume")
      setHRInterviewStage("upload")
    } finally {
      setIsLoading(false)
    }
  }

  // Modified function to generate all 4 questions, but Q3/Q4 will be regenerated after Q2
  const generateDynamicQuestions = async (currentResumeAnalysis: HRResumeAnalysis | null) => {
    try {
      setIsGeneratingDynamicQuestions(true);
      setError(null);
      setHRInterviewStage("analyzing"); // Show analyzing stage for question generation

      // FORCE CLEAR ANY CACHED QUESTIONS - Don't load from sessionStorage
      setAllQuestions([]); // Clear existing questions
      setDynamicQuestions([]); // Clear dynamic questions cache

      console.log(`[Frontend] FORCED CACHE CLEAR - Not using cached questions`);
      console.log(`[Frontend] API Key before encoding: ${apiKey ? 'Provided' : 'Not Provided'}`);

      // Start with the fixed first question
      const fixedQ1: HRQuestion = FIXED_FIRST_QUESTION;
      const allGeneratedQuestions: HRQuestion[] = [fixedQ1];

      // Prepare responses for the first dynamic question (Q2)
      const q1ResponseForFollowUp = [{
        Qid: fixedQ1.Qid,
        userResponse: "", // Response for Q1 is not available yet
      }];

      console.log(`[Frontend] Generating Q2 based on resume analysis and Q1 context.`);

      // HARD FORCE: Clear ALL cached data and ensure fresh API calls
      console.log(`[Frontend API] ----- HARD CACHE CLEAR BEFORE API CALLS -----`);
      localStorage.clear(); // Clear ALL localStorage
      sessionStorage.clear(); // Clear ALL sessionStorage
      console.log(`[Frontend API] All storage cleared`);

      // API call for Q2
      console.log(`[Frontend API] Making request to /api/hr-questions for Q2...`);
      console.log(`[Frontend API] Models: ${selectedAIModel}, API Key Provided: ${!!apiKey}`);
      console.log(`[Frontend API] Resume Analysis industries:`, currentResumeAnalysis?.industryExperience);
      const q2Response = await fetch("/api/hr-questions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          resumeAnalysis: currentResumeAnalysis,
          selectedAIModel: selectedAIModel,
          userResponses: q1ResponseForFollowUp, // Pass Q1 as context
          apiKey: apiKey,
          numQuestions: 1, // Request only 1 question (Q2)
        }),
      });

      if (!q2Response.ok) {
        const errorData = await q2Response.json();
        throw new Error(errorData.error || "Failed to generate Q2");
      }

      const q2Data = await q2Response.json();
      const parsedQ2: HRQuestion[] = Array.isArray(q2Data)
        ? q2Data
        : q2Data?.questions || q2Data?.data || [];

      if (parsedQ2.length === 0) {
        throw new Error("No Q2 generated.");
      }

      // Assign Qid for Q2
      const q2 = { ...parsedQ2[0], Qid: `Q2` };
      allGeneratedQuestions.push(q2);

      // Generate Q3 and Q4 with empty responses initially (will be regenerated after Q2)
      const q1AndQ2ResponsesForFollowUp = [
        { Qid: fixedQ1.Qid, userResponse: "" }, // Q1 context
        { Qid: q2.Qid, userResponse: "" },      // Q2 context
      ];

      console.log(`[Frontend] Generating Q3 and Q4 with empty responses (will be regenerated after Q2).`);

      // API call for Q3 and Q4
      const q3q4Response = await fetch("/api/hr-questions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          resumeAnalysis: currentResumeAnalysis,
          selectedAIModel: selectedAIModel,
          userResponses: q1AndQ2ResponsesForFollowUp, // Pass Q1 and Q2 as context
          apiKey: apiKey,
          numQuestions: 2, // Request 2 questions (Q3, Q4)
        }),
      });

      if (!q3q4Response.ok) {
        const errorData = await q3q4Response.json();
        throw new Error(errorData.error || "Failed to generate Q3 and Q4");
      }

      const q3q4Data = await q3q4Response.json();
      const parsedQ3Q4: HRQuestion[] = Array.isArray(q3q4Data)
        ? q3q4Data
        : q3q4Data?.questions || q3q4Data?.data || [];

      if (parsedQ3Q4.length < 2) {
        throw new Error("Not enough questions generated for Q3 and Q4.");
      }

      // Assign Qids for Q3 and Q4
      const q3 = { ...parsedQ3Q4[0], Qid: `Q3` };
      const q4 = { ...parsedQ3Q4[1], Qid: `Q4` };
      allGeneratedQuestions.push(q3, q4);

      setDynamicQuestions(allGeneratedQuestions);
      setAllQuestions(allGeneratedQuestions); // Update allQuestions with all 4 questions
      setHRInterviewQuestions(allGeneratedQuestions); // Update for display
      console.log(`[Debug] After all dynamic questions generation: allQuestions.length=${allGeneratedQuestions.length}`);

      setHRInterviewStage("questions-ready"); // Move to questions-ready after all 4 are generated
    } catch (err) {
      console.error(`Error generating dynamic questions:`, err);
      setError(err instanceof Error ? err.message : `Failed to generate dynamic questions`);
      setHRInterviewStage("upload"); // Go back to upload if generation fails
    } finally {
      setIsGeneratingDynamicQuestions(false); // Ensure loading state is reset
    }
  };

  // New function to regenerate Q3 and Q4 after Q1 & Q2 responses
  const generateRemainingQuestions = async (q1Response: string, q2Response: string) => {
    try {
      console.log(`[Frontend] Regenerating Q3 and Q4 based on actual Q1 and Q2 responses.`);
      
      const q1AndQ2Responses = [
        { Qid: "Q1", userResponse: q1Response },
        { Qid: "Q2", userResponse: q2Response },
      ];

      console.log(`[Frontend API] Making request to /api/hr-questions for Q3 and Q4...`);
      console.log(`[Frontend API] Q1 Response length: ${q1Response.length}`);
      console.log(`[Frontend API] Q2 Response length: ${q2Response.length}`);

      const q3q4Response = await fetch("/api/hr-questions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          resumeAnalysis: hrResumeAnalysis,
          selectedAIModel: selectedAIModel,
          userResponses: q1AndQ2Responses,
          apiKey: apiKey,
          numQuestions: 2, // Request 2 questions (Q3, Q4)
        }),
      });

      if (!q3q4Response.ok) {
        const errorData = await q3q4Response.json();
        throw new Error(errorData.error || "Failed to generate Q3 and Q4");
      }

      const q3q4Data = await q3q4Response.json();
      const parsedQ3Q4: HRQuestion[] = Array.isArray(q3q4Data)
        ? q3q4Data
        : q3q4Data?.questions || q3q4Data?.data || [];

      if (parsedQ3Q4.length < 2) {
        throw new Error("Not enough questions generated for Q3 and Q4.");
      }

      // Assign Qids for Q3 and Q4
      const q3 = { ...parsedQ3Q4[0], Qid: `Q3` };
      const q4 = { ...parsedQ3Q4[1], Qid: `Q4` };

      // Update existing Q3 and Q4 in the questions array
      const updatedQuestions = [...allQuestions];
      updatedQuestions[2] = q3; // Replace Q3
      updatedQuestions[3] = q4; // Replace Q4
      
      setAllQuestions(updatedQuestions);
      setHRInterviewQuestions(updatedQuestions);
      
      console.log(`[Frontend] Successfully regenerated Q3 and Q4 with actual responses.`);
      
      // Update the interview responses array for Q3 and Q4
      const updatedResponses = [...interviewResponses];
      updatedResponses[2] = {
        ...updatedResponses[2],
        questionText: q3.question_text,
        questionType: q3.question_type,
        questionTopic: q3.topic,
      };
      updatedResponses[3] = {
        ...updatedResponses[3],
        questionText: q4.question_text,
        questionType: q4.question_type,
        questionTopic: q4.topic,
      };
      setInterviewResponses(updatedResponses);

    } catch (err) {
      console.error('Error regenerating remaining questions:', err);
      // Don't set error state, just log it - we don't want to break the flow
    }
  };

  // AI model selection handler in PRO flow:
  // Previously selected model jumped to interview — now it should proceed to upload step.
  const handleAIModelSelection = (model: string, apiKey: string) => {
    setSelectedAIModel(model)
    setApiKey(apiKey)
    console.log("[AI Model Selection] Selected model:", model)
    // After selecting model, PRO flow requires resume upload next
    setHRInterviewStage("upload")
  }

  const handleBackToModeSelection = () => {
    // If user backs out from AI selection, go to mode selection
    setHRInterviewStage("mode-selection")
  }

  const handleAIModelDialogClose = () => {
    // This handles when the dialog is closed via X button or clicking outside
    // We'll return user to mode selection to avoid stuck states
    setHRInterviewStage("mode-selection")
  }

  // ---------------------------
  // Navigation within interview
  // ---------------------------
  const handleHRNextQuestion = async () => {
    // 1. Always save current response before potentially moving or finishing
    const currentResponse = interviewResponses[currentQuestionIndex];
    if (currentResponse && currentResponse.hasResponse && interviewSessionId) {
      console.log(`[Question Navigation] Saving response for Qid ${currentResponse.Qid} before moving/finishing`);
      localStorage.setItem(`hr_interview_responses_${interviewSessionId}`, JSON.stringify(interviewResponses));
    }

    // 2. Check if we need to regenerate Q3 and Q4 after Q2
    if (currentQuestionIndex === 1 && allQuestions.length === 4) {
      // User just finished Q2, regenerate Q3 and Q4 based on Q1 and Q2 responses
      const q1Response = interviewResponses[0]?.userResponse || "";
      const q2Response = interviewResponses[1]?.userResponse || "";
      
      if (q1Response && q2Response) {
        console.log(`[Question Navigation] Q2 completed, regenerating Q3 and Q4 based on responses`);
        // Regenerate Q3 and Q4 in the background (no loading screen)
        generateRemainingQuestions(q1Response, q2Response);
      }
    }

    // 3. If there are more questions (all 4 dynamic questions are already generated)
    if (currentQuestionIndex < allQuestions.length - 1) {
      const nextIndex = currentQuestionIndex + 1;
      console.log(`[Question Navigation] Moving from Qid ${allQuestions[currentQuestionIndex].Qid} to Qid ${allQuestions[nextIndex].Qid}`);
      setCurrentQuestionIndex(nextIndex);
      // Load any existing response for the next question
      if (nextIndex < interviewResponses.length) {
        const nextResponse = interviewResponses[nextIndex];
        console.log(`[Question Navigation] Moving to Qid ${allQuestions[nextIndex].Qid}, has existing response:`, nextResponse?.hasResponse);
      }
    } else { // 4. This is the absolute final question (after all 4 dynamic questions have been answered)
      console.log("[Question Navigation] Absolute final question reached, generating HR evaluation...");

      // Show summary of all responses
      const answeredCount = interviewResponses.filter((r) => r.hasResponse).length;
      const totalCount = allQuestions.length;
      console.log(`[Report Generation] Summary: ${answeredCount}/${totalCount} questions answered`);

      // Save to localStorage
      if (interviewSessionId) {
        localStorage.setItem(`hr_interview_responses_${interviewSessionId}`, JSON.stringify(interviewResponses));
      }

      // Generate HR evaluation immediately after interview completion
      let hrEvaluationLocal = null;
      if (interviewResponses && interviewResponses.length > 0 && hrResumeAnalysis) {
        try {
          console.log("🔍 Generating HR Q&A evaluation after interview completion...");
          const evaluationResponse = await fetch("/api/hr-evaluation", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              interviewResponses,
              resumeAnalysis: hrResumeAnalysis,
              sessionId: interviewSessionId, // Use the generated interviewSessionId
            }),
          });

          if (!evaluationResponse.ok) {
            console.warn("⚠️ HR evaluation failed, proceeding without it");
          } else {
            const evaluationResult = await evaluationResponse.json();
            hrEvaluationLocal = evaluationResult.evaluation;
            console.log("✅ HR Q&A evaluation completed after interview:", hrEvaluationLocal);
          }
        } catch (evaluationError) {
          console.error("Error generating HR evaluation after interview:", evaluationError);
          // Continue without evaluation - don't fail the entire process
        }
      }

      // Store the evaluation in separate state to pass to report component
      setHrEvaluation(hrEvaluationLocal);
      console.log("📊 Storing HR evaluation in separate state:", {
        hasEvaluation: !!hrEvaluationLocal,
        evaluationScore: hrEvaluationLocal?.overallScore,
        evaluationType: typeof hrEvaluationLocal,
      });

      // Save the current interviewSessionId to sessionStorage for the report page
      if (interviewSessionId) {
        sessionStorage.setItem("currentInterviewSessionId", interviewSessionId);
        console.log("[Report Transition] Saved currentInterviewSessionId to sessionStorage:", interviewSessionId);
      }

      // Move to final report stage
      setHRInterviewStage("report");
      // Save the report
      saveHRReport();
    }
  };

  const handleStartNewInterview = () => {
    // Final save before resetting
    try {
      if (interviewResponses.length > 0 && interviewSessionId) {
        localStorage.setItem(`hr_interview_responses_${interviewSessionId}`, JSON.stringify(interviewResponses))
        console.log("[Reset] Final save completed before starting new interview")
      }
    } catch (e) {
      console.error("[Reset] Final save failed:", e)
    }

    // Clear setup completion flag for new interview
    localStorage.removeItem("hr_interview_setup_completed")
    console.log("[Reset] Cleared setup completion flag for new interview")

    // Clear stored resume analysis to prevent stale data in new interviews
    sessionStorage.removeItem("hrResumeAnalysis")
    console.log("[Reset] Cleared stored resume analysis for new interview")

    // Clear the specific interview responses from localStorage
    if (interviewSessionId) {
      localStorage.removeItem(`hr_interview_responses_${interviewSessionId}`);
      console.log(`[Reset] Cleared responses for session ID: ${interviewSessionId}`);
    }

    setHRResumeData(null)
    setHRResumeAnalysis(null)
    setHRInterviewQuestions([])
    setCurrentQuestionIndex(0)
    setInterviewMode("pro")
    setSelectedAIModel("")
    setHRInterviewStage("mode-selection")
    setError(null)
    setInterviewResponses([])
    setResponseStatus({
      isSaving: false,
      lastSaved: null,
      saveError: null,
    })
    setHrEvaluation(null)
    setDynamicQuestions([]);
    setAllQuestions([]);
    setInterviewSessionId(null); // Clear the session ID
  }

  // ---------------------------
  // Response tracking (Phase 4)
  // ---------------------------
  const initializeResponses = useCallback((questionsToInitialize: HRQuestion[]) => {
    if (questionsToInitialize.length > 0 && interviewSessionId) {
      const initialResponses = questionsToInitialize.map((question) => ({
        Qid: question.Qid,
        Rid: `R${question.Qid.substring(1)}`, // Generate Rid from Qid
        questionText: question.question_text,
        questionType: question.question_type,
        questionTopic: question.topic,
        userResponse: "",
        timestamp: "",
        responseLength: 0,
        hasResponse: false,
      }));
      console.log(
        "[Response Tracking] Initializing responses:",
        initialResponses.map((r) => `${r.Qid}: "${r.questionText.substring(0, 30)}..."`),
      );
      setInterviewResponses(initialResponses);

      // Also try to load any existing responses from localStorage for this session
      try {
        const storedResponses = localStorage.getItem(`hr_interview_responses_${interviewSessionId}`);
        if (storedResponses) {
          const parsed = JSON.parse(storedResponses);
          if (Array.isArray(parsed) && parsed.length === questionsToInitialize.length) {
            console.log("[Response Tracking] Loading stored responses from localStorage:", parsed.length);
            setInterviewResponses(parsed);
          }
        }
      } catch (e) {
        console.error("[Response Tracking] Failed to load from localStorage:", e);
      }
    }
  }, [interviewSessionId]);

  const updateResponse = useCallback(
    async (questionIndex: number, response: string) => {
      if (questionIndex >= 0 && questionIndex < allQuestions.length && interviewSessionId) {
        setResponseStatus((prev) => ({ ...prev, isSaving: true, saveError: null }));

        try {
          const updatedResponses = interviewResponses.map((existingResponse, index) => {
            if (index === questionIndex) {
              return {
                ...existingResponse,
                userResponse: response,
                timestamp: new Date().toISOString(),
                responseLength: response.length,
                hasResponse: response.trim().length > 0,
              };
            }
            return existingResponse;
          });

          setInterviewResponses(updatedResponses);
          localStorage.setItem(`hr_interview_responses_${interviewSessionId}`, JSON.stringify(updatedResponses));

          setResponseStatus((prev) => ({
            ...prev,
            isSaving: false,
            lastSaved: new Date().toLocaleTimeString(),
          }));

          console.log(`[Response Tracking] Updated ${allQuestions[questionIndex].Qid}: ${response.length} chars`);
          console.log(
            `[Response Tracking] All responses:`,
            updatedResponses.map((r) => ({
              Qid: r.Qid,
              hasResponse: r.hasResponse,
              responseLength: r.responseLength,
              userResponse: r.userResponse?.substring(0, 50) + "...",
            })),
          );
        } catch (error) {
          setResponseStatus((prev) => ({
            ...prev,
            isSaving: false,
            saveError: "Failed to save response",
          }));
          console.error("Error saving response:", error);
        }
      }
    },
    [allQuestions, interviewResponses, interviewSessionId],
  );

  const getCurrentResponse = useCallback(
    (questionIndex: number) => {
      return interviewResponses[questionIndex] || null;
    },
    [interviewResponses],
  );

  // Initialize responses when allQuestions are updated
  useEffect(() => {
    if (hrInterviewStage === "questions-ready" && allQuestions.length > 0 && interviewSessionId) {
      initializeResponses(allQuestions);
      console.log("[Response Tracking] Initialized responses for all questions:", allQuestions.length);
    }
  }, [hrInterviewStage, allQuestions.length, initializeResponses, interviewSessionId]);


  // Recover responses from localStorage only once when starting interview
  useEffect(() => {
    if (hrInterviewStage === "interview" && allQuestions.length > 0 && interviewResponses.length === 0 && interviewSessionId) {
      try {
        const storedResponses = localStorage.getItem(`hr_interview_responses_${interviewSessionId}`);
        if (storedResponses) {
          const parsed = JSON.parse(storedResponses);
          if (Array.isArray(parsed) && parsed.length === allQuestions.length) {
            console.log("[Response Recovery] Initial recovery from localStorage:", parsed.length);
            setInterviewResponses(parsed);
          }
        }
      } catch (e) {
        console.error("[Response Recovery] Failed to recover from localStorage:", e);
      }
    }
  }, [hrInterviewStage, allQuestions, interviewResponses.length, interviewSessionId]);

  // Recover resume analysis from sessionStorage ONLY during the current interview session (page refreshes)
  // But clear it when starting a new interview session
  useEffect(() => {
    // Only recover if we're in the middle of an interview (not on mode-selection)
    if (hrInterviewStage !== "mode-selection" && !hrResumeAnalysis) {
      try {
        const storedResumeAnalysis = sessionStorage.getItem("hrResumeAnalysis");
        if (storedResumeAnalysis) {
          const parsed = JSON.parse(storedResumeAnalysis);
          console.log("[Resume Recovery] Restoring resume analysis from current session");
          setHRResumeAnalysis(parsed);
        }
      } catch (e) {
        console.error("[Resume Recovery] Failed to recover resume analysis from sessionStorage:", e);
      }
    }
  }, []);

  // Manual refresh function for responses
  const refreshResponsesFromStorage = useCallback(() => {
    if (!interviewSessionId) return false;
    try {
      const storedResponses = localStorage.getItem(`hr_interview_responses_${interviewSessionId}`);
      if (storedResponses) {
        const parsed = JSON.parse(storedResponses);
        if (Array.isArray(parsed) && parsed.length === allQuestions.length) {
          console.log("[Manual Refresh] Refreshing responses from localStorage:", parsed.length);
          setInterviewResponses(parsed);
          return true;
        }
      }
    } catch (e) {
      console.error("[Manual Refresh] Failed to refresh from localStorage:", e);
    }
    return false;
  }, [allQuestions.length, interviewSessionId]);

  // Debug: Log only important changes
  useEffect(() => {
    if (hrInterviewStage === "report" && interviewSessionId) {
      console.log("[Report Stage] Final responses state:", {
        totalResponses: interviewResponses.length,
        responsesWithContent: interviewResponses.filter((r) => r.hasResponse).length,
        allResponses: interviewResponses.map((r) => ({
          Qid: r.Qid,
          hasResponse: r.hasResponse,
          responseLength: r.responseLength,
          userResponse: r.userResponse?.substring(0, 50) + "...",
        })),
      });
    }
  }, [hrInterviewStage, interviewResponses, interviewSessionId]);

  // Monitor currentQuestionIndex changes
  useEffect(() => {
    console.log("[Main Page] currentQuestionIndex changed to:", currentQuestionIndex);
  }, [currentQuestionIndex]);

  // Effect to save the report and stop media when the stage is set to "report"
  useEffect(() => {
    if (hrInterviewStage === "report") {
      saveHRReport();
      // Explicitly stop media stream when transitioning to report stage
      if (window.__hrStopMedia) {
        console.log("[Report Stage] Stopping media stream via __hrStopMedia()");
        window.__hrStopMedia();
      }
    }
  }, [hrInterviewStage, saveHRReport]);

  // Effect to stop media when the component unmounts (user navigates away)
  useEffect(() => {
    return () => {
      if (window.__hrStopMedia) {
        console.log("[Cleanup] Stopping media stream on component unmount via __hrStopMedia()");
        window.__hrStopMedia();
      }
    };
  }, []);

  // ---------------------------
  // Render UI by stage
  // ---------------------------
  return (
    <AuthLayout>
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-50 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900 flex flex-col">
        <main className="flex-1 p-4 container mx-auto max-w-7xl">
          {/* AI MODEL SELECTION (first for PRO flow) */}
          {hrInterviewStage === "ai-model-selection" && (
            <div className="flex items-center justify-center min-h-[calc(100vh-200px)] p-4">
              <AIModelSelection
                isOpen={true}
                onModelSelected={handleAIModelSelection}
                onClose={handleAIModelDialogClose}
                onBack={handleBackToModeSelection}
              />
            </div>
          )}

          {/* MODE SELECTION (first screen fallback) */}
          {hrInterviewStage === "mode-selection" && (
            <div className="flex items-center justify-center min-h-[calc(100vh-200px)] p-4">
              <HRModeSelection onModeSelected={handleModeSelection} />
            </div>
          )}

          {/* QUESTIONS UPLOAD (for Pro flow) */}
          {hrInterviewStage === "upload" && (
            <div className="flex items-center justify-center min-h-[calc(100vh-200px)] p-4">
              <div className="w-full max-w-md">
                {error && (
                  <Card className="mb-4 border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-950 animate-fade-in">
                    <CardContent className="pt-6">
                      <div className="flex items-start space-x-3">
                        <div className="flex-shrink-0">
                          <svg className="w-5 h-5 text-red-600 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                          </svg>
                        </div>
                        <div className="flex-1">
                          <h3 className="text-sm font-medium text-red-800 dark:text-red-200 mb-1">
                            Something went wrong
                          </h3>
                          <p className="text-sm text-red-700 dark:text-red-300 mb-3">
                            {error}
                          </p>
                          <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-2">
                            <Button
                              onClick={() => setError(null)}
                              variant="outline"
                              size="sm"
                              className="text-red-600 border-red-300 hover:bg-red-50 dark:text-red-400 dark:border-red-700 dark:hover:bg-red-950"
                            >
                              Dismiss
                            </Button>
                            <Button
                              onClick={() => window.location.reload()}
                              variant="outline"
                              size="sm"
                              className="text-red-600 border-red-300 hover:bg-red-50 dark:text-red-400 dark:border-red-700 dark:hover:bg-red-950"
                            >
                              Retry
                            </Button>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}
                <div className="animate-fade-in">
                  <HRResumeUpload onFileUpload={handleHRResumeUpload} />
                </div>
                <div className="mt-4">
                  <Button variant="ghost" onClick={handleBackToModeSelection}>
                    ← Back to Mode
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* ANALYZING (keeps user informed) */}
          {(hrInterviewStage === "analyzing" || isGeneratingDynamicQuestions) && (
            <div className="flex items-center justify-center min-h-[calc(100vh-200px)] p-4">
              <Card className="w-full max-w-lg animate-fade-in">
                <CardHeader>
                  <CardTitle className="text-center text-xl">
                    {isGeneratingDynamicQuestions ? "Generating Personalized Questions" : "Analyzing Your Resume"}
                  </CardTitle>
                </CardHeader>
                <CardContent className="text-center">
                  {/* Enhanced Loading Animation */}
                  <div className="relative mb-6">
                    <div className="animate-spin rounded-full h-16 w-16 border-4 border-blue-200 border-t-blue-600 mx-auto"></div>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="w-8 h-8 bg-blue-600 rounded-full animate-pulse"></div>
                    </div>
                  </div>

                  {/* Progress Steps */}
                  <div className="space-y-3 mb-6">
                    <div className="flex items-center justify-center space-x-2">
                      <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" aria-label="Step completed"></div>
                      <span className="text-sm text-green-600 dark:text-green-400">Resume uploaded successfully</span>
                    </div>
                    <div className="flex items-center justify-center space-x-2">
                      <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" aria-label="Step in progress"></div>
                      <span className="text-sm text-blue-600 dark:text-blue-400">
                        {isGeneratingDynamicQuestions ? "Generating personalized questions" : "Analyzing skills and experience"}
                      </span>
                    </div>
                    <div className="flex items-center justify-center space-x-2">
                      <div className="w-2 h-2 bg-gray-300 rounded-full" aria-label="Step pending"></div>
                      <span className="text-sm text-gray-500">Preparing for interview</span>
                    </div>
                  </div>

                  <p className="text-gray-600 dark:text-gray-400 text-sm leading-relaxed">
                    {isGeneratingDynamicQuestions
                      ? "AI is crafting personalized questions based on your resume analysis and previous questions. Please wait a moment."
                      : "We're carefully analyzing your resume to understand your background, skills, and experience. This helps us create relevant interview questions tailored specifically for you."}
                  </p>

                  {/* Estimated Time */}
                  <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-950 rounded-lg">
                    <p className="text-xs text-blue-600 dark:text-blue-400">⏱️ This usually takes 10-15 seconds</p>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* QUESTIONS GENERATED (user proceeds to Interview next) */}
          {hrInterviewStage === "questions-ready" && (
            <div className="flex items-center justify-center min-h-[calc(100vh-200px)] p-4">
              <Card className="w-full max-w-lg animate-fade-in">
                <CardHeader>
                  <CardTitle className="text-center text-xl text-green-600 dark:text-green-400">
                    🎉 Questions Generated Successfully!
                  </CardTitle>
                </CardHeader>
                <CardContent className="text-center">
                  {/* Success Animation */}
                  <div className="mb-6">
                    <div className="w-16 h-16 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center mx-auto mb-4 animate-bounce">
                      <svg className="w-8 h-8 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                  </div>

                  {/* Analysis Summary */}
                  <div className="space-y-4 mb-6">
                    <div className="p-4 bg-green-50 dark:bg-green-950 rounded-lg border border-green-200 dark:border-green-800">
                      <p className="text-green-700 dark:text-green-300 font-medium mb-2">✓ Resume Analysis Complete</p>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                        <div className="text-left">
                          <span className="font-medium text-gray-700 dark:text-gray-300">Experience Level:</span>
                          <span className="ml-2 text-gray-600 dark:text-gray-400 capitalize">{hrResumeAnalysis?.experienceLevel || "Mid-level"}</span>
                        </div>
                        <div className="text-left">
                          <span className="font-medium text-gray-700 dark:text-gray-300">Questions Generated:</span>
                          <span className="ml-2 text-gray-600 dark:text-gray-400">4 personalized questions</span>
                        </div>
                      </div>
                    </div>

                    {/* Primary Strengths */}
                    <div className="p-4 bg-blue-50 dark:bg-blue-950 rounded-lg border border-blue-200 dark:border-blue-800">
                      <p className="font-medium text-blue-700 dark:text-blue-300 mb-2">Primary Strengths Identified:</p>
                      <div className="flex flex-wrap gap-2 justify-center">
                        {hrResumeAnalysis?.hrProfile?.primaryStrengths?.map((strength, index) => (
                          <span key={index} className="px-3 py-1 bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 rounded-full text-sm font-medium animate-fade-in" style={{ animationDelay: `${index * 100}ms` }} role="listitem" aria-label={`Strength: ${strength}`}>
                            {strength}
                          </span>
                        )) || (
                          <span className="px-3 py-1 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-full text-sm">Technical Skills</span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Action Button: proceed to Interview (PRO flow) */}
                  <Button
                    onClick={() => {
                      // Proceed directly to interview (per requested flow)
                      setHRInterviewStage("interview")
                      console.log("[Questions Ready] Proceeding to interview")
                    }}
                    className="w-full bg-green-600 hover:bg-green-700 text-white font-medium py-3 text-lg transition-all duration-200 transform hover:scale-105"
                  >
                    Start Interview
                  </Button>

                  {/* Additional Info */}
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-3">Your personalized questions are ready and tailored to your background</p>
                </CardContent>
              </Card>
            </div>
          )}

          {/* INTERVIEW (main flow) */}
          {hrInterviewStage === "interview" && allQuestions.length > 0 && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 h-[calc(100vh-200px)] hr-layout">
              <div className="lg:col-span-1 hr-sidebar">
                <HRPresenceSidebar interviewMode={interviewMode} currentQuestionIndex={currentQuestionIndex} totalQuestions={allQuestions.length} />
              </div>
              <div className="lg:col-span-2 hr-main-panel">
                <HRInterviewPanel
                  key={`question-${currentQuestionIndex}`}
                  question={allQuestions[currentQuestionIndex]?.question_text || ""}
                  onNextQuestion={handleHRNextQuestion}
                  isLastQuestion={currentQuestionIndex === allQuestions.length - 1}
                  interviewMode={interviewMode}
                  selectedAIModel={selectedAIModel} // Pass selected AI model
                  currentQuestionIndex={currentQuestionIndex}
                  onUpdateResponse={updateResponse}
                  getCurrentResponse={getCurrentResponse}
                  responseStatus={responseStatus}
                  hrInterviewQuestions={allQuestions} // Pass all questions
                />
              </div>
            </div>
          )}

          {/* INTERVIEW (Video mode without questions generated) */}
          {/* INTERVIEW (Video mode without questions generated) - This path is now less relevant for Pro flow */}
          {hrInterviewStage === "interview" && allQuestions.length === 0 && interviewMode === "video" && (
            <div className="flex flex-col items-center justify-center min-h-[calc(100vh-200px)]">
              <Card className="max-w-xl w-full text-center p-6">
                <CardHeader>
                  <CardTitle>No personalized questions</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground mb-4">You chose Video mode. If you'd like personalized HR questions, choose Pro mode and upload a resume.</p>
                  <div className="flex justify-center gap-2">
                    <Button onClick={() => setHRInterviewStage("mode-selection")}>Back to Mode Selection</Button>
                    <Button onClick={() => {
                      // For video mode, if no questions are generated, provide a fallback set
                      const genericQuestions: HRQuestion[] = [
                        { Qid: "Q1", question_type: "behavioral", question_text: "Tell me about a time you demonstrated strong teamwork skills.", difficulty_level: "medium", topic: "Teamwork", focus_area: "Collaboration" },
                        { Qid: "Q2", question_type: "situational", question_text: "How do you handle tight deadlines and pressure?", difficulty_level: "medium", topic: "Stress Management", focus_area: "Resilience" },
                      ];
                      setAllQuestions(genericQuestions);
                      setHRInterviewQuestions(genericQuestions);
                      initializeResponses(genericQuestions);
                      setHRInterviewStage("interview");
                    }}>Start Generic Video Interview</Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* REPORT */}
          {hrInterviewStage === "report" && (() => {
            // Phase 5: Final save and debug - Log data being passed to report
            // Ensure all responses are saved before generating report
            try {
              if (interviewSessionId) {
                localStorage.setItem(`hr_interview_responses_${interviewSessionId}`, JSON.stringify(interviewResponses))
                console.log("[Report Stage] Final save completed")
              }
            } catch (e) {
              console.error("[Report Stage] Final save failed:", e)
            }

            console.log("[Report Stage] Data being passed:", {
              stage: hrInterviewStage,
              responsesLength: interviewResponses.length,
              responses: interviewResponses.map((r, i) => ({
                q: i + 1,
                hasResponse: r.hasResponse,
                responseLength: r.responseLength,
                userResponse: r.userResponse?.substring(0, 30) + '...',
              }))
            })

            return (
              <div className="flex items-center justify-center min-h-[calc(100vh-200px)]">
                <HRInterviewReport
                  onStartNewInterview={handleStartNewInterview}
                  resumeAnalysis={hrResumeAnalysis}
                  interviewResponses={interviewResponses}
                  onRefreshResponses={refreshResponsesFromStorage}
                  hrEvaluation={hrEvaluation}
                  interviewSessionId={interviewSessionId} // Pass the session ID
                />
              </div>
            )
          })()}
        </main>
      </div>
    </AuthLayout>
  )
}
