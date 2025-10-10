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
import fixedQuestionsData from './fixed-questions.json'; // Import fixed questions

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
  const [fixedQuestions, setFixedQuestions] = useState<HRQuestion[]>([]); // State for fixed questions
  const [dynamicQuestions, setDynamicQuestions] = useState<HRQuestion[]>([]); // State for dynamic questions
  const [allQuestions, setAllQuestions] = useState<HRQuestion[]>([]); // Combined questions
  const [isGeneratingDynamicQuestions, setIsGeneratingDynamicQuestions] = useState(false); // New state for dynamic question generation
  const [shouldGenerateDynamicQuestions, setShouldGenerateDynamicQuestions] = useState(false); // New state to trigger dynamic question generation

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

  // ---------------------------
  // Flow handlers (modified flow)
  // ---------------------------
  // New function to save the HR report via API
  const saveHRReport = useCallback(async () => {
    if (!hrResumeAnalysis || interviewResponses.length === 0 || !hrEvaluation || isReportSaved) {
      console.log("[Report Save] Skipping save because required data is missing or report is already saved.");
      return;
    }

    try {
      const sessionId = `hr_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const response = await fetch('/api/hr-reports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId,
          resumeAnalysis: hrResumeAnalysis,
          interviewResponses: interviewResponses,
          hrEvaluation: hrEvaluation,
          behavioralMetrics: null, // Not implemented yet
        }),
      });

      if (response.ok) {
        console.log('✅ HR report saved successfully!');
        setIsReportSaved(true);
      } else {
        console.error('Failed to save HR report:', await response.json());
      }
    } catch (error) {
      console.error('Error saving HR report:', error);
    }
  }, [hrResumeAnalysis, interviewResponses, hrEvaluation, isReportSaved]);

  // Mode selection is now the first screen.
  // If pro -> go to AI model selection first (per new flow).
  // If video -> go straight to interview (unchanged).
  const handleModeSelection = (mode: InterviewMode) => {
    // Clear setup completion flag when starting new interview
    localStorage.removeItem("hr_interview_setup_completed")
    console.log("[Mode Selection] Cleared setup completion flag for new interview")

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
      const analysisResponse = await fetch("/api/hr-resume-analysis", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ resumeText: text }),
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

      // Step 2: Load fixed questions
      const loadedFixedQuestions: HRQuestion[] = fixedQuestionsData.map((q, index) => ({
        ...q,
        Qid: `Q${index + 1}`, // Ensure Qid is string
      }));
      setFixedQuestions(loadedFixedQuestions);
      setAllQuestions(loadedFixedQuestions); // Initialize allQuestions with fixed questions
      setHRInterviewQuestions(loadedFixedQuestions); // Also set for initial display
      console.log(`[Debug] After fixed questions load: fixedQuestions.length=${loadedFixedQuestions.length}, allQuestions.length=${loadedFixedQuestions.length}`);

      // Move to questions-ready stage after fixed questions are loaded
      setHRInterviewStage("questions-ready");
      console.log("[Resume Upload] Analysis complete — fixed questions loaded");

    } catch (err) {
      console.error("Error processing resume:", err)
      setError(err instanceof Error ? err.message : "Failed to process resume")
      setHRInterviewStage("upload")
    } finally {
      setIsLoading(false)
    }
  }

  // New function to generate dynamic questions after fixed questions are answered
  const generateDynamicQuestions = async (currentResponses: InterviewResponse[]) => {
    try {
      setIsLoading(true);
      setError(null);
      setHRInterviewStage("analyzing"); // Show analyzing stage again for dynamic questions

      console.log(`[Frontend] API Key before encoding: ${apiKey ? 'Provided' : 'Not Provided'}`);
      const dynamicQuestionsResponse = await fetch("/api/hr-questions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          resumeAnalysis: hrResumeAnalysis,
          selectedAIModel: selectedAIModel,
          userResponses: currentResponses.slice(0, 2).map(res => ({ Qid: res.Qid, userResponse: res.userResponse })), // Pass only answers to fixed questions
          apiKey: apiKey, // Send as plain text for debugging
        }),
      });

      console.log('[Frontend] Raw response from /api/hr-questions:', dynamicQuestionsResponse);

      if (!dynamicQuestionsResponse.ok) {
        const errorData = await dynamicQuestionsResponse.json();
        console.error('[Frontend] Error response data:', errorData);
        throw new Error(errorData.error || "Failed to generate dynamic questions");
      }

      const dynamicQ = await dynamicQuestionsResponse.json();
      console.log('[Frontend] Parsed dynamic questions response:', dynamicQ);
      const parsedDynamicQuestions: HRQuestion[] = Array.isArray(dynamicQ)
        ? dynamicQ
        : dynamicQ?.questions || dynamicQ?.data || [];

      setDynamicQuestions(parsedDynamicQuestions);
      setAllQuestions([...fixedQuestions, ...parsedDynamicQuestions]); // Combine fixed and dynamic
      setHRInterviewQuestions([...fixedQuestions, ...parsedDynamicQuestions]); // Update for display
      console.log(`[Debug] After dynamic questions generation: fixedQuestions.length=${fixedQuestions.length}, dynamicQuestions.length=${parsedDynamicQuestions.length}, allQuestions.length=${fixedQuestions.length + parsedDynamicQuestions.length}`);

      setHRInterviewStage("questions-ready");
    } catch (err) {
      console.error("Error generating dynamic questions:", err);
      setError(err instanceof Error ? err.message : "Failed to generate dynamic questions");
      setHRInterviewStage("interview"); // Go back to interview if dynamic generation fails
    } finally {
      setIsLoading(false);
      setIsGeneratingDynamicQuestions(false); // Ensure loading state is reset
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
    if (currentResponse && currentResponse.hasResponse) {
      console.log(`[Question Navigation] Saving response for Qid ${currentResponse.Qid} before moving/finishing`);
      localStorage.setItem("hr_interview_responses", JSON.stringify(interviewResponses));
    }

    // 2. Check if it's the point to generate dynamic questions (after last fixed question)
    if (currentQuestionIndex === fixedQuestions.length - 1 && dynamicQuestions.length === 0 && !isGeneratingDynamicQuestions) {
      setShouldGenerateDynamicQuestions(true);
      return; // Exit to prevent further navigation until dynamic questions are ready
    }

    // 3. If there are more questions (either fixed or dynamic)
    if (currentQuestionIndex < allQuestions.length - 1) {
      const nextIndex = currentQuestionIndex + 1;
      console.log(`[Question Navigation] Moving from Qid ${allQuestions[currentQuestionIndex].Qid} to Qid ${allQuestions[nextIndex].Qid}`);
      setCurrentQuestionIndex(nextIndex);
      // Load any existing response for the next question
      if (nextIndex < interviewResponses.length) {
        const nextResponse = interviewResponses[nextIndex];
        console.log(`[Question Navigation] Moving to Qid ${allQuestions[nextIndex].Qid}, has existing response:`, nextResponse?.hasResponse);
      }
    } else { // 4. This is the absolute final question (after all dynamic questions have been generated and answered)
      console.log("[Question Navigation] Absolute final question reached, generating HR evaluation...");

      // Show summary of all responses
      const answeredCount = interviewResponses.filter((r) => r.hasResponse).length;
      const totalCount = allQuestions.length;
      console.log(`[Report Generation] Summary: ${answeredCount}/${totalCount} questions answered`);

      // Save to localStorage
      localStorage.setItem("hr_interview_responses", JSON.stringify(interviewResponses));

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
              sessionId: `hr_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
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

      // Move to final report stage
      setHRInterviewStage("report");
      // Save the report
      saveHRReport();
    }
  };

  const handleStartNewInterview = () => {
    // Final save before resetting
    try {
      if (interviewResponses.length > 0) {
        localStorage.setItem("hr_interview_responses", JSON.stringify(interviewResponses))
        console.log("[Reset] Final save completed before starting new interview")
      }
    } catch (e) {
      console.error("[Reset] Final save failed:", e)
    }

    // Clear setup completion flag for new interview
    localStorage.removeItem("hr_interview_setup_completed")
    console.log("[Reset] Cleared setup completion flag for new interview")

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
    setFixedQuestions([]);
    setDynamicQuestions([]);
    setAllQuestions([]);
  }

  // ---------------------------
  // Response tracking (Phase 4)
  // ---------------------------
  const initializeResponses = useCallback((questionsToInitialize: HRQuestion[]) => {
    if (questionsToInitialize.length > 0) {
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

      // Also try to load any existing responses from localStorage
      try {
        const storedResponses = localStorage.getItem("hr_interview_responses");
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
  }, []);

  const updateResponse = useCallback(
    async (questionIndex: number, response: string) => {
      if (questionIndex >= 0 && questionIndex < allQuestions.length) {
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
          localStorage.setItem("hr_interview_responses", JSON.stringify(updatedResponses));

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
    [allQuestions, interviewResponses],
  );

  const getCurrentResponse = useCallback(
    (questionIndex: number) => {
      return interviewResponses[questionIndex] || null;
    },
    [interviewResponses],
  );

  // Initialize responses when fixed questions are ready
  useEffect(() => {
    if (hrInterviewStage === "questions-ready" && fixedQuestions.length > 0 && allQuestions.length === fixedQuestions.length) {
      initializeResponses(fixedQuestions);
      console.log("[Response Tracking] Initialized responses for fixed questions:", fixedQuestions.length);
    }
  }, [hrInterviewStage, fixedQuestions, allQuestions.length, initializeResponses]);

  // Append responses for dynamic questions without re-initializing
  useEffect(() => {
    if (hrInterviewStage === "questions-ready" && dynamicQuestions.length > 0 && allQuestions.length === (fixedQuestions.length + dynamicQuestions.length)) {
      // Create new response objects only for the new dynamic questions
      const newDynamicResponses = dynamicQuestions.map((question) => ({
        Qid: question.Qid,
        Rid: `R${question.Qid.substring(1)}`,
        questionText: question.question_text,
        questionType: question.question_type,
        questionTopic: question.topic,
        userResponse: "",
        timestamp: "",
        responseLength: 0,
        hasResponse: false,
      }));

      // Append new responses to the existing ones
      console.log(`[Debug] Inside useEffect for dynamic responses: fixedQuestions.length=${fixedQuestions.length}, dynamicQuestions.length=${dynamicQuestions.length}, allQuestions.length=${allQuestions.length}`);
      setInterviewResponses(prevResponses => {
        // Make sure we don't add duplicates
        const existingQids = new Set(prevResponses.map(r => r.Qid));
        const filteredNewResponses = newDynamicResponses.filter(r => !existingQids.has(r.Qid));
        
        if (filteredNewResponses.length > 0) {
          console.log("[Response Tracking] Appending new responses for dynamic questions:", filteredNewResponses.length);
          return [...prevResponses, ...filteredNewResponses];
        }
        return prevResponses;
      });

      // After dynamic questions are ready, if we were waiting, move to interview stage
      if (isGeneratingDynamicQuestions === false) { // Only if generation just completed
        setHRInterviewStage("interview");
        setCurrentQuestionIndex(fixedQuestions.length); // Start from the first dynamic question
      }
    }
  }, [hrInterviewStage, dynamicQuestions, fixedQuestions.length, allQuestions.length, isGeneratingDynamicQuestions]);

  // Recover responses from localStorage only once when starting interview
  useEffect(() => {
    if (hrInterviewStage === "interview" && allQuestions.length > 0 && interviewResponses.length === 0) {
      try {
        const storedResponses = localStorage.getItem("hr_interview_responses");
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
  }, [hrInterviewStage, allQuestions, interviewResponses.length]);

  // Manual refresh function for responses
  const refreshResponsesFromStorage = useCallback(() => {
    try {
      const storedResponses = localStorage.getItem("hr_interview_responses");
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
  }, [allQuestions.length]);

  // Debug: Log only important changes
  useEffect(() => {
    if (hrInterviewStage === "report") {
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
  }, [hrInterviewStage, interviewResponses]);

  // Monitor currentQuestionIndex changes
  useEffect(() => {
    console.log("[Main Page] currentQuestionIndex changed to:", currentQuestionIndex);
  }, [currentQuestionIndex]);

  // Effect to trigger dynamic question generation
  useEffect(() => {
    if (shouldGenerateDynamicQuestions && !isGeneratingDynamicQuestions && fixedQuestions.length > 0) {
      setIsGeneratingDynamicQuestions(true); // Set loading state
      setShouldGenerateDynamicQuestions(false); // Reset trigger immediately

      // Call the async function
      const generate = async () => {
        await generateDynamicQuestions(interviewResponses);
      };
      generate();
    }
  }, [shouldGenerateDynamicQuestions, isGeneratingDynamicQuestions, fixedQuestions.length, generateDynamicQuestions, interviewResponses]);

  // Effect to save the report when the stage is set to "report"
  useEffect(() => {
    if (hrInterviewStage === "report") {
      saveHRReport();
    }
  }, [hrInterviewStage, saveHRReport]);

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
                    {isGeneratingDynamicQuestions ? "Generating Dynamic Questions" : "Analyzing Your Resume"}
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
                        {isGeneratingDynamicQuestions ? "Generating personalized follow-up questions" : "Analyzing skills and experience"}
                      </span>
                    </div>
                    <div className="flex items-center justify-center space-x-2">
                      <div className="w-2 h-2 bg-gray-300 rounded-full" aria-label="Step pending"></div>
                      <span className="text-sm text-gray-500">Preparing for interview</span>
                    </div>
                  </div>

                  <p className="text-gray-600 dark:text-gray-400 text-sm leading-relaxed">
                    {isGeneratingDynamicQuestions
                      ? "AI is crafting follow-up questions based on your previous answers and resume analysis. Please wait a moment."
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
                      const genericQuestions = fixedQuestionsData.map((q, index) => ({
                        ...q,
                        Qid: `Q${index + 1}`,
                      }));
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
              localStorage.setItem('hr_interview_responses', JSON.stringify(interviewResponses))
              console.log("[Report Stage] Final save completed")
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
                />
              </div>
            )
          })()}
        </main>
      </div>
    </AuthLayout>
  )
}
