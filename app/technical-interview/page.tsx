"use client"

import type React from "react"
import { useState, useEffect, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { AuthLayout } from "@/components/layout/auth-layout"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Textarea } from "@/components/ui/textarea"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Separator } from "@/components/ui/separator"
import {
  Upload,
  Lock,
  Play,
  Pause,
  RotateCcw,
  CheckCircle,
  XCircle,
  Clock,
  FileText,
  Zap,
  Crown,
  Volume2,
  AlertCircle,
  Lightbulb,
  Download,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { VoiceAnimation } from "@/components/voice-animation"
import { useProgress } from "@/lib/context/progress-context"
// Remove react-tts import
// import ReactTTS from "react-tts"
import mammoth from "mammoth";
import { Document, Packer } from "docx";
import jsPDF from 'jspdf'
import html2canvas from 'html2canvas'

// Types
interface Question {
  id: number
  type: "mcq" | "short" | "long"
  question: string
  options?: string[]
  correctAnswer?: string | number
  difficulty: "easy" | "medium" | "hard"
  category: string
}

interface UserAnswer {
  questionId: number
  questionText: string
  questionType: "mcq" | "short" | "long"
  answer: string
  timeSpent: number
  // Add MCQ options for proper evaluation
  options?: string[]
  option_a?: string
  option_b?: string
  option_c?: string
  option_d?: string
}

interface MockFeedback {
  score: number
  totalQuestions: number
  strengths: string[]
  improvements: string[]
  resumeInsights?: {
    matchScore: number
    missingSkills: string[]
    recommendations: string[]
  }
}

// Mock Data
const mockQuestions: Record<string, Question[]> = {
  react: [
    {
      id: 1,
      type: "mcq",
      question: "What is the purpose of useEffect hook in React?",
      options: [
        "To manage component state",
        "To perform side effects in functional components",
        "To create custom hooks",
        "To handle form submissions",
      ],
      correctAnswer: 1,
      difficulty: "medium",
      category: "Hooks",
    },
    {
      id: 2,
      type: "short",
      question: "Explain the difference between props and state in React.",
      difficulty: "easy",
      category: "Fundamentals",
    },
    {
      id: 3,
      type: "long",
      question:
        "Describe how you would optimize a React application for performance. Include specific techniques and tools you would use.",
      difficulty: "hard",
      category: "Performance",
    },
  ],
  nodejs: [
    {
      id: 1,
      type: "mcq",
      question: "Which of the following is NOT a core module in Node.js?",
      options: ["fs", "http", "express", "path"],
      correctAnswer: 2,
      difficulty: "easy",
      category: "Core Modules",
    },
    {
      id: 2,
      type: "short",
      question: "What is the event loop in Node.js and why is it important?",
      difficulty: "medium",
      category: "Architecture",
    },
  ],
  python: [
    {
      id: 1,
      type: "mcq",
      question: "What is the output of: print(type([]))?",
      options: ["<class 'array'>", "<class 'list'>", "<class 'tuple'>", "<class 'dict'>"],
      correctAnswer: 1,
      difficulty: "easy",
      category: "Data Types",
    },
    {
      id: 2,
      type: "long",
      question: "Explain the concept of decorators in Python with examples.",
      difficulty: "hard",
      category: "Advanced Features",
    },
  ],
}

const mockFeedback: MockFeedback = {
  score: 85,
  totalQuestions: 3,
  strengths: [
    "Strong understanding of React hooks",
    "Good grasp of performance optimization concepts",
    "Clear and concise explanations",
  ],
  improvements: [
    "Could elaborate more on state management patterns",
    "Consider mentioning more specific optimization tools",
    "Practice explaining complex concepts in simpler terms",
  ],
  resumeInsights: {
    matchScore: 92,
    missingSkills: ["GraphQL", "Docker", "AWS"],
    recommendations: [
      "Add GraphQL experience to strengthen full-stack profile",
      "Consider learning containerization with Docker",
      "AWS certification would complement your backend skills",
    ],
  },
}

function mapApiQuestionToFrontend(q: any): Question {
  return {
    id: q.id,
    type: q.question_type === 'mcq' ? 'mcq' : q.question_type === 'short_answer' ? 'short' : 'long',
    question: q.question_text,
    options: q.question_type === 'mcq' ? [q.option_a, q.option_b, q.option_c, q.option_d].filter(Boolean) : undefined,
    correctAnswer: q.correct_answer,
    difficulty: (q.difficulty_level || '').toLowerCase(),
    category: q.topic || q.tech_stack || '',
  };
}

export default function TechnicalInterviewSimulator() {
  const [techStacks, setTechStacks] = useState<{ value: string; label: string; icon?: string }[]>([])

  // Fetch tech stacks from backend on mount
  useEffect(() => {
    const fetchTechStacks = async () => {
      try {
        const res = await fetch('/api/questions?listTechStacks=true')
        const data = await res.json()
        if (Array.isArray(data)) {
          setTechStacks(data.map((stack: string) => ({ value: stack, label: stack })))
        }
      } catch (err) {
        setTechStacks([])
      }
    }
    fetchTechStacks()
  }, [])

  // State Management
  const [isPro, setIsPro] = useState(false)
  const [techStack, setTechStack] = useState("")
  const [resumeFile, setResumeFile] = useState<File | null>(null)
  const [resumeText, setResumeText] = useState<string>("")
  const [isExtracting, setIsExtracting] = useState(false)
  const [questions, setQuestions] = useState<Question[]>([])
  const [currentQuestion, setCurrentQuestion] = useState(0)
  const [timer, setTimer] = useState(60)
  
  // Function to get timer duration based on question type
  const getTimerDuration = (questionType: string) => {
    switch (questionType) {
      case 'mcq':
        return 90  // 1.5 minutes for MCQ
      case 'short_answer':
        return 180 // 3 minutes for short answers
      case 'long_answer':
        return 300 // 5 minutes for long answers
      default:
        return 60  // fallback
    }
  }
  const [isTimerRunning, setIsTimerRunning] = useState(false)
  const [userAnswers, setUserAnswers] = useState<UserAnswer[]>([])
  const [currentAnswer, setCurrentAnswer] = useState("")
  const [showResults, setShowResults] = useState(false)
  const [isInterviewStarted, setIsInterviewStarted] = useState(false)
  const [isSpeaking, setIsSpeaking] = useState(false)
  const [selectedVoice, setSelectedVoice] = useState<SpeechSynthesisVoice | null>(null)
  const [availableVoices, setAvailableVoices] = useState<SpeechSynthesisVoice[]>([])
  const [isLoadingQuestions, setIsLoadingQuestions] = useState(false)
  const [fetchError, setFetchError] = useState<string | null>(null)
  const [isSubmittingResponses, setIsSubmittingResponses] = useState(false)
  const [hasSubmitted, setHasSubmitted] = useState(false)
  const [evaluationResult, setEvaluationResult] = useState<any>(null)
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null)
  const [isPollingResults, setIsPollingResults] = useState(false)
  const [evaluationStatus, setEvaluationStatus] = useState<'processing' | 'completed' | 'error'>('processing')

  // Progress Context
  const { addInterview } = useProgress()

  // Timer Effect
  useEffect(() => {
    let interval: NodeJS.Timeout
    if (isTimerRunning && timer > 0) {
      interval = setInterval(() => {
        setTimer((prev) => prev - 1)
      }, 1000)
    } else if (timer === 0) {
      handleNextQuestion()
    }
    return () => clearInterval(interval)
  }, [isTimerRunning, timer])

  // Load available voices
  useEffect(() => {
    const loadVoices = () => {
      const voices = speechSynthesis.getVoices()
      console.log("Available voices detected:", voices.length, voices)
      const englishVoices = voices.filter(
        (voice) =>
          voice.lang.startsWith("en") &&
          (voice.name.includes("Google") || voice.name.includes("Microsoft") || voice.name.includes("Apple")),
      )
      setAvailableVoices(englishVoices)

      const preferredVoice =
        englishVoices.find(
          (voice) =>
            voice.name.includes("Google UK English Female") ||
            voice.name.includes("Microsoft Zira") ||
            voice.name.includes("Samantha") ||
            voice.name.includes("Karen") ||
            voice.name.includes("Moira"),
        ) || englishVoices[0]

      setSelectedVoice(preferredVoice)
      console.log("Selected voice for TTS:", preferredVoice?.name)
    }

    // Call loadVoices immediately and add event listener
    loadVoices()
    speechSynthesis.addEventListener("voiceschanged", loadVoices)

    return () => {
      speechSynthesis.removeEventListener("voiceschanged", loadVoices)
    }
  }, [])

  // Automatically trigger TTS when a new question appears and interview is started
  useEffect(() => {
    if (isInterviewStarted && questions.length > 0) {
      toggleSpeech();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentQuestion, isInterviewStarted]);

  // Handlers
  const handleTechStackChange = async (value: string) => {
    if (isPro) return; // Pro users do not use tech stack selector
    setTechStack(value)
    setIsLoadingQuestions(true)
    setFetchError(null)
    setQuestions([])
    setCurrentQuestion(0)
    setUserAnswers([])
    setShowResults(false)
    setIsInterviewStarted(false)
    try {
      const res = await fetch(`/api/questions?techStack=${encodeURIComponent(value)}`)
      if (!res.ok) throw new Error('Failed to fetch questions')
      const data = await res.json()
      if (Array.isArray(data) && data.length > 0) {
        setQuestions(data.map(mapApiQuestionToFrontend))
      } else {
        setQuestions([])
      }
    } catch (err) {
      setFetchError('Could not load questions from server.')
      setQuestions([])
    } finally {
      setIsLoadingQuestions(false)
    }
  }

  // For Pro users, generate questions after resume upload
  useEffect(() => {
    if (isPro && resumeText) {
      const fetchProQuestions = async () => {
        setIsLoadingQuestions(true);
        setFetchError(null);
        setQuestions([]);
        setCurrentQuestion(0);
        setUserAnswers([]);
        setShowResults(false);
        setIsInterviewStarted(false);
        try {
          const res = await fetch(`/api/questions?resumeAnalysis=true`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ resumeText })
          });
          if (!res.ok) throw new Error('Failed to generate questions from resume');
          const data = await res.json();
          if (Array.isArray(data) && data.length > 0) {
            const mappedQuestions = data.map(mapApiQuestionToFrontend);
            setQuestions(mappedQuestions);
            // Auto-set tech stack for Pro users from the first question
            if (data[0]?.tech_stack) {
              setTechStack(data[0].tech_stack);
            }
            // Optional: Auto-start interview for Pro users (can be commented out if not desired)
            // setTimeout(() => {
            //   if (mappedQuestions.length > 0) {
            //     startInterview();
            //   }
            // }, 1000);
          } else {
            setQuestions([]);
          }
        } catch (err) {
          console.error('Error loading Pro questions:', err);
          setFetchError('Failed to generate personalized questions. Please check your internet connection and try uploading your resume again.');
          setQuestions([]);
        } finally {
          setIsLoadingQuestions(false);
        }
      };
      fetchProQuestions();
    }
  }, [isPro, resumeText]);

  // Helper: Sanitize text to remove problematic Unicode sequences
  const sanitizeText = (text: string): string => {
    if (!text) return '';
    
    // Remove null characters and other problematic control characters
    let sanitized = text.replace(/\x00/g, '');
    
    // Remove or replace problematic Unicode escape sequences
    sanitized = sanitized.replace(/\\u[0-9a-fA-F]{4}/g, (match) => {
      try {
        return String.fromCharCode(parseInt(match.slice(2), 16));
      } catch (e) {
        return ''; // Remove invalid sequences
      }
    });
    
    // Remove other escape sequences that might cause issues
    sanitized = sanitized.replace(/\\[nrtbfav]/g, ' ');
    
    // Replace multiple whitespace with single space
    sanitized = sanitized.replace(/\s+/g, ' ');
    
    // Remove any remaining problematic characters
    sanitized = sanitized.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');
    
    // Remove problematic quotes that might break JSON
    sanitized = sanitized.replace(/[\u2018\u2019]/g, "'"); // Smart single quotes
    sanitized = sanitized.replace(/[\u201C\u201D]/g, '"'); // Smart double quotes
    sanitized = sanitized.replace(/[\u2013\u2014]/g, '-'); // En/em dashes
    
    return sanitized.trim();
  };

  // Helper: Safe JSON stringify with error handling
  const safeJSONStringify = (obj: any): string => {
    try {
      return JSON.stringify(obj);
    } catch (error) {
      console.error('JSON stringify error:', error);
      // Create a safer version of the object
      const safeObj = { ...obj };
      if (safeObj.extractedText) {
        safeObj.extractedText = sanitizeText(safeObj.extractedText);
      }
      return JSON.stringify(safeObj);
    }
  };

  // Helper: Extract text from PDF
  const extractTextFromPDF = async (file: File): Promise<string> => {
    // Dynamically import pdfjs-dist only in the browser
    // @ts-ignore
    const pdfjsLib = await import("pdfjs-dist/legacy/build/pdf.min.mjs");
    pdfjsLib.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    let text = "";
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const content = await page.getTextContent();
      text += content.items.map((item: any) => item.str).join(" ") + "\n";
    }
    return sanitizeText(text);
  };

  // Helper: Extract text from DOCX
  const extractTextFromDOCX = async (file: File): Promise<string> => {
    const arrayBuffer = await file.arrayBuffer();
    const { value } = await mammoth.extractRawText({ arrayBuffer });
    return sanitizeText(value);
  };

  // Helper: Extract text from DOC (best effort, limited support)
  const extractTextFromDOC = async (file: File): Promise<string> => {
    // DOC extraction in browser is very limited; fallback to showing unsupported
    return "DOC file extraction is not supported in this browser. Please upload PDF or DOCX.";
  };

  // Helper: Get file extension
  const getFileExtension = (file: File) => file.name.split('.').pop()?.toLowerCase() || '';

  // Helper: Cache resume text in localStorage
  const cacheResumeText = (fileName: string, text: string) => {
    try {
      const sanitizedText = sanitizeText(text);
      localStorage.setItem(`resumeText:${fileName}`, sanitizedText);
    } catch (error) {
      console.error('Failed to cache resume text:', error);
    }
  };
  
  const getCachedResumeText = (fileName: string) => {
    try {
      return localStorage.getItem(`resumeText:${fileName}`) || '';
    } catch (error) {
      console.error('Failed to retrieve cached resume text:', error);
      return '';
    }
  };

  // Modified handler for resume upload
  const handleResumeUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && isPro) {
      setResumeFile(file);
      setIsExtracting(true);
      setResumeText("");
      // Check cache first
      const cached = getCachedResumeText(file.name);
      if (cached) {
        setResumeText(cached);
        setIsExtracting(false);
        return;
      }
      let text = "";
      let errorMsg = "";
      try {
        const ext = getFileExtension(file);
        if (ext === "pdf") {
          text = await extractTextFromPDF(file);
        } else if (ext === "docx") {
          text = await extractTextFromDOCX(file);
        } else {
          errorMsg = "Unsupported file type. Please upload PDF or DOCX.";
        }
      } catch (err: any) {
        errorMsg = "Failed to extract text from resume: " + (err?.message || String(err));
      }
      if (text && !errorMsg) {
        setResumeText(text);
        cacheResumeText(file.name, text);
        // Export as JSON and send to backend resumes table
        try {
          // Validate text length and content
          if (text.length === 0) {
            setFetchError('No text content found in the uploaded file');
            return;
          }
          
          if (text.length > 100000) {
            setFetchError('Resume text is too long. Please use a shorter document.');
            return;
          }
          
          // You may want to generate or retrieve a sessionId/userId here
          const sessionId = undefined; // Set if available
          const userId = undefined; // Set if available
          
          console.log('📤 Saving resume:', {
            fileName: file.name,
            textLength: text.length,
            preview: text.substring(0, 100) + '...'
          });
          
          const response = await fetch('/api/responses/resume', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: safeJSONStringify({ fileName: file.name, extractedText: text, sessionId, userId })
          });
          
          if (!response.ok) {
            const errJson = await response.json();
            console.error('Resume save error:', errJson);
            setFetchError('Failed to save resume: ' + (errJson?.error || response.statusText));
          } else {
            const result = await response.json();
            console.log('✅ Resume saved successfully:', result);
            // Optional: Show success message
            // setFetchError('Resume saved successfully!');
          }
        } catch (err: any) {
          console.error('Resume save exception:', err);
          setFetchError('Failed to save resume: ' + (err?.message || String(err)));
        }
      } else {
        setResumeText(errorMsg);
      }
      setIsExtracting(false);
    }
  };

  const startInterview = () => {
    if (questions.length > 0) {
      setIsInterviewStarted(true)
      setTimer(getTimerDuration(questions[0].type))
      setIsTimerRunning(true)
      setCurrentAnswer("")
    }
  }

  const handleNextQuestion = useCallback(() => {
    // Save current answer - ALWAYS save, even if empty
      const currentQuestionTimer = getTimerDuration(questions[currentQuestion].type)
    const currentQ = questions[currentQuestion];
    
      const newAnswer: UserAnswer = {
      questionId: currentQ.id,
      questionText: currentQ.question,
      questionType: currentQ.type,
      answer: currentAnswer.trim() || '', // Save empty string if no answer
        timeSpent: currentQuestionTimer - timer,
      }
    
    // Add MCQ options if this is an MCQ question
    if (currentQ.type === 'mcq' && currentQ.options) {
      newAnswer.options = currentQ.options;
      // Also add individual options for backend compatibility
      if (currentQ.options.length >= 1) newAnswer.option_a = currentQ.options[0];
      if (currentQ.options.length >= 2) newAnswer.option_b = currentQ.options[1];
      if (currentQ.options.length >= 3) newAnswer.option_c = currentQ.options[2];
      if (currentQ.options.length >= 4) newAnswer.option_d = currentQ.options[3];
    }
    
    // Check if this is the last question
    const isLastQuestion = currentQuestion === questions.length - 1;
    
    setUserAnswers((prev) => {
      const updatedAnswers = [...prev, newAnswer];
      console.log(`📝 Saved answer for question ${currentQuestion + 1}/${questions.length}. Total answers: ${updatedAnswers.length}`);
      
      // If this is the last question, submit immediately with the updated answers
      if (isLastQuestion) {
        console.log('🏁 Last question completed, submitting with all answers');
        // Submit immediately with the updated answers to avoid double submission
        submitResponsesToAPI(updatedAnswers);
      }
      
      return updatedAnswers;
    })

    // Move to next question or show results
    if (!isLastQuestion) {
      setCurrentQuestion((prev) => prev + 1)
      setCurrentAnswer("")
      setTimer(getTimerDuration(questions[currentQuestion + 1].type))
    } else {
      setIsTimerRunning(false)
      setShowResults(true)
      // Don't call submitResponsesToAPI here - it's called in the setUserAnswers callback
    }
  }, [currentAnswer, currentQuestion, questions, timer])

  // Polling function to check for results
  const pollForResults = useCallback(async (sessionId: string) => {
    try {
      console.log(`🔄 Polling for results: ${sessionId}`);
      const response = await fetch(`/api/results/${sessionId}`);
      
      if (!response.ok) {
        console.log('⚠️ Results not ready yet');
        return false;
      }
      
      const data = await response.json();
      console.log('📊 Poll result:', data);
      
      if (data.status === 'completed' && data.evaluation) {
        console.log('✅ Results found! Setting evaluation result');
        setEvaluationResult(data.evaluation);
        setEvaluationStatus('completed');
        setIsPollingResults(false);
        
        // Add interview to progress context for pro users
        // Get sessionId and techStack from localStorage if currentSessionId is null
        const sessionIdToUse = currentSessionId || data.sessionId;
        const techStackToUse = techStack || data.techStack || localStorage.getItem('currentTechStack');
        
        if (sessionIdToUse && techStackToUse) {
          try {
            const interviewData = {
              sessionId: sessionIdToUse,
              techStack: techStackToUse,
              mcqMarks: data.evaluation.overallScore || data.evaluation.mcqScore || 0,
              totalQuestions: data.evaluation.totalQuestions || userAnswers.length,
              avgTimePerQuestion: userAnswers.length > 0 
                ? Math.round(userAnswers.reduce((sum, answer) => sum + answer.timeSpent, 0) / userAnswers.length)
                : 0,
              completedAt: new Date().toISOString(),
              evaluationData: data.evaluation
            };
            
            console.log('📊 Adding pro user interview to progress context:', interviewData);
            
            // Prevent duplicate submissions for pro users too
            const processedSessions = JSON.parse(localStorage.getItem('processedInterviewSessions') || '[]');
            if (!processedSessions.includes(sessionIdToUse)) {
              addInterview(interviewData);
              console.log('✅ Pro user interview added to progress successfully');
              
              // Mark this session as processed
              processedSessions.push(sessionIdToUse);
              localStorage.setItem('processedInterviewSessions', JSON.stringify(processedSessions));
            } else {
              console.log('⚠️ Pro user interview session already processed, skipping:', sessionIdToUse);
            }
          } catch (error) {
            console.error('❌ Error adding pro user interview to progress:', error);
          }
        } else {
          console.log('⚠️ Missing sessionId or techStack for pro user interview:', { 
            currentSessionId, 
            techStack, 
            dataSessionId: data.sessionId, 
            dataTechStack: data.techStack,
            sessionIdToUse, 
            techStackToUse 
          });
        }
        
        return true;
      } else if (data.status === 'processing') {
        console.log('⏳ Still processing...');
        return false;
      } else {
        console.log('❌ Evaluation failed');
        setEvaluationStatus('error');
        setIsPollingResults(false);
        return true;
      }
    } catch (error) {
      console.error('❌ Error polling for results:', error);
      return false;
    }
  }, []);

  // Start polling for pro users
  const startPolling = useCallback((sessionId: string) => {
    if (!isPro) return;
    
    console.log('🔄 Starting result polling for pro user');
    setIsPollingResults(true);
    setEvaluationStatus('processing');
    
    const pollInterval = setInterval(async () => {
      const completed = await pollForResults(sessionId);
      if (completed) {
        clearInterval(pollInterval);
      }
    }, 10000); // Poll every 10 seconds
    
    // Clear interval after 5 minutes to avoid infinite polling
    setTimeout(() => {
      clearInterval(pollInterval);
      if (isPollingResults) {
        setIsPollingResults(false);
        setEvaluationStatus('error');
        console.log('⏰ Polling timeout after 5 minutes - please check manually');
      }
    }, 300000); // 5 minutes
  }, [isPro, pollForResults, isPollingResults]);

  const submitResponsesToAPI = async (answersToSubmit?: UserAnswer[]) => {
    const answers = answersToSubmit || userAnswers;
    
    if (answers.length === 0) return;
    
    // Prevent double submission
    if (isSubmittingResponses || hasSubmitted) {
      console.log('⚠️ Already submitted or submitting, skipping duplicate submission');
      return;
    }

    console.log(`📊 Submitting ${answers.length} answers for ${questions.length} questions`);

    setIsSubmittingResponses(true);
    setHasSubmitted(true);
    try {
      const sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      // Store sessionId and techStack for polling results
      setCurrentSessionId(sessionId);
      localStorage.setItem('currentSessionId', sessionId);
      localStorage.setItem('currentTechStack', techStack);
      
      const requestData = {
        sessionId,
        techStack,
        responses: answers,
        resumeText: resumeText ? sanitizeText(resumeText) : null,
        isPro,
        evaluateWithMistral: isPro // Only Pro users get Mistral evaluation
      };
      
      console.log('🚀 Submitting responses to API:', requestData);
      
      let requestBody;
      try {
        requestBody = safeJSONStringify(requestData);
        console.log('✅ JSON stringified successfully');
      } catch (stringifyError) {
        console.error('❌ JSON stringify error:', stringifyError);
        throw new Error('Failed to serialize request data');
      }
      
      console.log('🌐 Making API call to /api/responses...');
      const response = await fetch('/api/responses', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: requestBody
      });

      console.log('📡 API Response status:', response.status);
      
      if (!response.ok) {
        let errorData;
        try {
          errorData = await response.json();
        } catch (parseError) {
          // If response is not JSON, try to get text
          try {
            const errorText = await response.text();
            errorData = { error: errorText };
          } catch (textError) {
            errorData = { error: 'Unknown error occurred' };
          }
        }
        console.error('❌ API Error:', errorData);
        throw new Error(`Failed to submit responses: ${response.status}`);
      }

      const result = await response.json();
      console.log('✅ API Result:', result);
      
      if (result.evaluation) {
        console.log('🎯 Setting evaluation result:', result.evaluation);
        console.log('🔍 Evaluation structure:', JSON.stringify(result.evaluation, null, 2));
        setEvaluationResult(result.evaluation);
        setEvaluationStatus('completed');
        
        // Add interview to progress context
        const sessionIdToUse = sessionId;
        
        if (sessionIdToUse && techStack) {
          try {
            const interviewData = {
              sessionId: sessionIdToUse,
              techStack: techStack,
              mcqMarks: result.evaluation.overallScore || result.evaluation.mcqScore || 0,
              totalQuestions: result.evaluation.totalQuestions || userAnswers.length,
              avgTimePerQuestion: userAnswers.length > 0 
                ? Math.round(userAnswers.reduce((sum, answer) => sum + answer.timeSpent, 0) / userAnswers.length)
                : 0,
              completedAt: new Date().toISOString(),
              evaluationData: result.evaluation
            };
            
            // Prevent duplicate submissions by checking if this session was already processed
            const processedSessions = JSON.parse(localStorage.getItem('processedInterviewSessions') || '[]');
            if (!processedSessions.includes(sessionIdToUse)) {
              console.log('📊 Adding interview to progress context:', interviewData);
              addInterview(interviewData);
              console.log('✅ Interview added to progress successfully');
              
              // Mark this session as processed
              processedSessions.push(sessionIdToUse);
              localStorage.setItem('processedInterviewSessions', JSON.stringify(processedSessions));
            } else {
              console.log('⚠️ Interview session already processed, skipping:', sessionIdToUse);
            }
          } catch (error) {
            console.error('❌ Error adding interview to progress:', error);
          }
        } else {
          console.log('⚠️ Cannot add to progress - missing sessionId or techStack');
          console.log('⚠️ sessionIdToUse:', sessionIdToUse);
          console.log('⚠️ techStack:', techStack);
        }
        
        // If it's an instant evaluation (free user), show success message
        if (result.isInstantEvaluation) {
          console.log('✅ Instant MCQ evaluation completed for free user');
        }
      } else {
        console.log('⚠️ No evaluation in result');
        // For pro users, start polling for results
        if (isPro) {
          console.log('⏳ Pro user evaluation queued for AI processing - starting polling');
          startPolling(sessionId);
        }
      }
      
      if (result.warning) {
        console.warn('Warning:', result.warning);
      }
      
      console.log('Responses submitted successfully:', result);
    } catch (error) {
      console.error('Error submitting responses:', error);
    } finally {
      setIsSubmittingResponses(false);
    }
  };

  const resetInterview = () => {
    setCurrentQuestion(0)
    setUserAnswers([])
    setCurrentAnswer("")
    setTimer(questions.length > 0 ? getTimerDuration(questions[0].type) : 60)
    setIsTimerRunning(false)
    setShowResults(false)
    setIsInterviewStarted(false)
    setEvaluationResult(null)
    setHasSubmitted(false)
    setCurrentSessionId(null)
    setIsPollingResults(false)
    setEvaluationStatus('processing')
    localStorage.removeItem('currentSessionId')
    localStorage.removeItem('currentTechStack')
  }

  // Restore toggleSpeech function, ensure it only runs on client
  const toggleSpeech = () => {
    if (typeof window === "undefined" || typeof window.speechSynthesis === "undefined") return;
    if (isSpeaking) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
    } else {
      const questionText = questions[currentQuestion]?.question;
      if (!questionText) return;
      let voiceToUse: SpeechSynthesisVoice | null = null;
      if (isPro && selectedVoice) {
        voiceToUse = selectedVoice;
      } else {
        // Prefer 'Microsoft Zira - English (United States)' for free users if available
        voiceToUse =
          availableVoices.find(
            (v) => v.name === "Microsoft Zira - English (United States)" && v.lang === "en-US"
          ) || availableVoices[0] || null;
      }
      if (!voiceToUse) return;
      const utterance = new window.SpeechSynthesisUtterance(questionText);
      utterance.voice = voiceToUse;
      utterance.rate = 0.9;
      utterance.pitch = 1.1;
      utterance.volume = 0.8;
      utterance.onstart = () => setIsSpeaking(true);
      utterance.onend = () => setIsSpeaking(false);
      utterance.onerror = () => setIsSpeaking(false);
      window.speechSynthesis.speak(utterance);
    }
  };

  // PDF Download function for evaluation results
  const downloadPDF = async () => {
    if (!evaluationResult) return;
    
    try {
      // Create a temporary div to render the report content
      const reportDiv = document.createElement('div');
      reportDiv.style.width = '800px';
      reportDiv.style.padding = '40px';
      reportDiv.style.backgroundColor = 'white';
      reportDiv.style.color = 'black';
      reportDiv.style.fontFamily = 'Arial, sans-serif';
      reportDiv.style.position = 'absolute';
      reportDiv.style.left = '-9999px';
      reportDiv.style.top = '0';
      
      // Generate the report HTML
      reportDiv.innerHTML = `
        <div style="text-align: center; margin-bottom: 30px;">
          <h1 style="color: #1e40af; font-size: 28px; margin-bottom: 10px;">Technical Interview Report</h1>
          <p style="color: #6b7280; font-size: 16px;">${techStack} • Pro User Evaluation</p>
          <p style="color: #6b7280; font-size: 14px;">Generated on ${new Date().toLocaleDateString()}</p>
        </div>
        
        <div style="margin-bottom: 30px; text-align: center;">
          <div style="font-size: 48px; font-weight: bold; color: ${evaluationResult.overallScore >= 60 ? '#059669' : '#dc2626'}; margin-bottom: 10px;">
            ${evaluationResult.overallScore}%
          </div>
          <div style="font-size: 18px; font-weight: bold; color: ${evaluationResult.passFailStatus === 'PASS' ? '#059669' : '#dc2626'}; margin-bottom: 20px;">
            ${evaluationResult.passFailStatus === 'PASS' ? 'PASSED' : 'NEEDS IMPROVEMENT'}
          </div>
          <p style="color: #6b7280;">Overall Performance Score</p>
        </div>
        
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 30px;">
          <div style="background: #f3f4f6; padding: 20px; border-radius: 8px;">
            <h3 style="color: #1e40af; margin-bottom: 10px;">MCQ Score</h3>
            <div style="font-size: 24px; font-weight: bold; color: #059669;">${evaluationResult.mcqScore || 0}%</div>
          </div>
          <div style="background: #f3f4f6; padding: 20px; border-radius: 8px;">
            <h3 style="color: #1e40af; margin-bottom: 10px;">Written Answers</h3>
            <div style="font-size: 24px; font-weight: bold; color: #059669;">${evaluationResult.longShortScore || 0}%</div>
          </div>
        </div>
        
        ${evaluationResult.strengths && evaluationResult.strengths.length > 0 ? `
        <div style="margin-bottom: 30px;">
          <h3 style="color: #059669; font-size: 20px; margin-bottom: 15px;">Strengths</h3>
          <ul style="list-style: none; padding: 0;">
            ${evaluationResult.strengths.map((strength: string) => `
              <li style="margin-bottom: 8px; padding-left: 20px; position: relative;">
                <span style="position: absolute; left: 0; color: #059669;">✓</span>
                ${strength}
              </li>
            `).join('')}
          </ul>
        </div>
        ` : ''}
        
        ${evaluationResult.weaknesses && evaluationResult.weaknesses.length > 0 ? `
        <div style="margin-bottom: 30px;">
          <h3 style="color: #dc2626; font-size: 20px; margin-bottom: 15px;">Areas for Improvement</h3>
          <ul style="list-style: none; padding: 0;">
            ${evaluationResult.weaknesses.map((weakness: string) => `
              <li style="margin-bottom: 8px; padding-left: 20px; position: relative;">
                <span style="position: absolute; left: 0; color: #dc2626;">⚠</span>
                ${weakness}
              </li>
            `).join('')}
          </ul>
        </div>
        ` : ''}
        
        ${evaluationResult.recommendations && evaluationResult.recommendations.length > 0 ? `
        <div style="margin-bottom: 30px;">
          <h3 style="color: #1e40af; font-size: 20px; margin-bottom: 15px;">Recommendations</h3>
          <ul style="list-style: none; padding: 0;">
            ${evaluationResult.recommendations.map((rec: string) => `
              <li style="margin-bottom: 8px; padding-left: 20px; position: relative;">
                <span style="position: absolute; left: 0; color: #1e40af;">💡</span>
                ${rec}
              </li>
            `).join('')}
          </ul>
        </div>
        ` : ''}
        
        <div style="margin-top: 40px; padding-top: 20px; border-top: 2px solid #e5e7eb; text-align: center; color: #6b7280; font-size: 12px;">
          <p>Generated by Technical Interview Simulator</p>
          <p>Session ID: ${currentSessionId}</p>
        </div>
      `;
      
      document.body.appendChild(reportDiv);
      
      // Convert to canvas and then to PDF
      const canvas = await html2canvas(reportDiv, {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#ffffff'
      });
      
      document.body.removeChild(reportDiv);
      
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const imgWidth = 210;
      const pageHeight = 295;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      let heightLeft = imgHeight;
      
      let position = 0;
      
      pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;
      
      while (heightLeft >= 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;
      }
      
      // Download the PDF
      const fileName = `interview-report-${techStack}-${new Date().toISOString().split('T')[0]}.pdf`;
      pdf.save(fileName);
      
    } catch (error) {
      console.error('Error generating PDF:', error);
      alert('Failed to generate PDF. Please try again.');
    }
  };

  const currentQ = questions[currentQuestion]
  const currentQuestionTimer = questions.length > 0 ? getTimerDuration(questions[currentQuestion]?.type || 'mcq') : 60
  const progressPercentage = ((currentQuestionTimer - timer) / currentQuestionTimer) * 100

  return (
    <AuthLayout>
    <div className="min-h-screen bg-background">
      <div className="p-6">
        {/* Header with Pro Toggle */}
        <div className="flex justify-between items-center mb-8">
          <div className="flex items-center gap-3">
            <div>
              <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100">Technical Interview Simulator</h1>
              <p className="text-slate-600 dark:text-slate-400 text-sm">
                Practice coding interviews with AI-powered feedback
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Label htmlFor="pro-toggle" className="text-sm font-medium">
              Free
            </Label>
            <Switch
              id="pro-toggle"
              checked={isPro}
              onCheckedChange={setIsPro}
              className="data-[state=checked]:bg-blue-600"
            />
            <Label htmlFor="pro-toggle" className="text-sm font-medium flex items-center gap-1">
              <Crown className="w-4 h-4 text-yellow-500" />
              Pro
            </Label>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Panel - Setup */}
          <div className="lg:col-span-1 space-y-6">
            {/* Tech Stack Selector - only for non-Pro users */}
            {!isPro && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Select Technology</CardTitle>
                  <CardDescription>Choose your interview focus area</CardDescription>
                </CardHeader>
                <CardContent>
                  <Select value={techStack} onValueChange={handleTechStackChange}>
                    <SelectTrigger>
                      <SelectValue placeholder="Choose technology..." />
                    </SelectTrigger>
                    <SelectContent>
                      {techStacks.map((stack) => (
                        <SelectItem key={stack.value} value={stack.value}>
                          {stack.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-slate-500">Pro users can select from premium voices</p>
                </CardContent>
              </Card>
            )}
            {/* Resume Analysis - Pro Only */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  Resume Analysis
                  {!isPro && <Lock className="w-4 h-4 text-slate-400" />}
                </CardTitle>
                <CardDescription>
                  {isPro ? "Upload your resume for personalized insights" : "Upgrade to Pro for resume analysis"}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {isPro ? (
                  <div className="space-y-4">
                    <div className="border-2 border-dashed border-slate-300 dark:border-slate-600 rounded-lg p-6 text-center hover:border-blue-400 transition-colors">
                      <input
                        type="file"
                        accept=".pdf,.doc,.docx"
                        onChange={handleResumeUpload}
                        className="hidden"
                        id="resume-upload"
                      />
                      <label htmlFor="resume-upload" className="cursor-pointer">
                        <Upload className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                        <p className="text-sm text-slate-600 dark:text-slate-400">Click to upload or drag and drop</p>
                        <p className="text-xs text-slate-500 mt-1">PDF, DOC, DOCX up to 10MB</p>
                      </label>
                    </div>
                    {isExtracting && (
                      <div className="text-sm text-blue-600">Extracting resume text...</div>
                    )}
                    {resumeFile && !isExtracting && (
                      <div className="flex flex-col gap-2 p-2 bg-green-50 dark:bg-green-900/20 rounded">
                        <div className="flex items-center gap-2">
                          <FileText className="w-4 h-4 text-green-600" />
                          <span className="text-sm text-green-700 dark:text-green-400">{resumeFile.name}</span>
                        </div>
                        <div className="max-h-40 overflow-y-auto text-xs text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-800 rounded p-2 mt-2 border border-slate-200 dark:border-slate-700">
                          {resumeText ? resumeText.slice(0, 1000) + (resumeText.length > 1000 ? '...' : '') : 'No text extracted.'}
                        </div>
                      </div>
                    )}
                    {isLoadingQuestions && (
                      <div className="flex items-center gap-2 p-3 bg-blue-50 dark:bg-blue-900/20 rounded">
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                        <span className="text-sm text-blue-700 dark:text-blue-400">Generating personalized questions based on your resume...</span>
                      </div>
                    )}
                    {fetchError && (
                      <div className="text-red-600 text-xs mt-2 p-2 bg-red-50 dark:bg-red-900/20 rounded">{fetchError}</div>
                    )}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <Lock className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                    <p className="text-sm text-slate-500 mb-3">
                      Resume analysis is a Pro feature
                    </p>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setIsPro(true)}
                      className="border-blue-200 text-blue-700 hover:bg-blue-50"
                    >
                      Upgrade to Pro
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Interview Stats */}
            {(techStack || (isPro && isLoadingQuestions)) && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Interview Details</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {isLoadingQuestions && isPro ? (
                    <div className="flex items-center gap-2">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                      <span className="text-sm text-slate-600 dark:text-slate-400">Preparing interview questions...</span>
                    </div>
                  ) : (
                    <>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-slate-600 dark:text-slate-400">Questions:</span>
                        <span className="text-sm font-medium">{questions.length}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-slate-600 dark:text-slate-400">Time per question:</span>
                        <span className="text-sm font-medium">60 seconds</span>
                      </div>
                      <div className="flex flex-wrap items-center gap-x-2">
                        <span className="text-sm text-slate-600 dark:text-slate-400">Difficulty:</span>
                        <div className="flex flex-wrap gap-1 flex-1 min-w-0">
                          {questions.map((q) => (
                            <Badge
                              key={q.id}
                              variant={
                                q.difficulty === "easy"
                                  ? "secondary"
                                  : q.difficulty === "medium"
                                    ? "default"
                                    : "destructive"
                              }
                              className="text-xs"
                            >
                              {q.difficulty}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>
            )}
          </div>

          {/* Right Panel - Interview */}
          <div className="lg:col-span-2">
            {!isInterviewStarted && !showResults ? (
              /* Start Screen */
              <Card className="h-full">
                <CardContent className="flex flex-col items-center justify-center h-96 text-center">
                  <div className="w-20 h-20 bg-blue-600 rounded-full flex items-center justify-center mb-6">
                    {isLoadingQuestions && isPro ? (
                      <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-white"></div>
                    ) : (
                      <Play className="w-10 h-10 text-white" />
                    )}
                  </div>
                  <h2 className="text-2xl font-bold mb-4">
                    {isLoadingQuestions && isPro ? "Generating Questions..." : "Ready to Start?"}
                  </h2>
                  <p className="text-slate-600 dark:text-slate-400 mb-6 max-w-md">
                    {isLoadingQuestions && isPro 
                      ? "AI is analyzing your resume and creating personalized interview questions. This may take a moment..."
                      : isPro && questions.length > 0
                      ? `You'll answer ${questions.length} personalized questions based on your resume. MCQ questions (1.5 min), short answers (3 min), and long answers (5 min).`
                      : techStack
                      ? `You'll answer ${questions.length} ${techStack} questions. MCQ questions (1.5 min), short answers (3 min), and long answers (5 min).`
                      : isPro 
                      ? "Upload your resume to generate personalized interview questions."
                      : "Select a technology stack to begin your interview simulation."}
                  </p>
                  <Button
                    onClick={startInterview}
                    disabled={isPro ? (questions.length === 0 || isLoadingQuestions) : (!techStack || questions.length === 0)}
                    size="lg"
                    className="bg-blue-600 hover:bg-blue-700"
                  >
                    {isLoadingQuestions && isPro ? "Generating Questions..." : "Start Interview"}
                  </Button>
                </CardContent>
              </Card>
            ) : showResults ? (
              /* Results Screen */
              <div className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-xl flex items-center gap-2">
                      {isSubmittingResponses ? (
                        <>
                          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                          Analyzing Responses...
                        </>
                      ) : (
                        <>
                          <CheckCircle className="w-6 h-6 text-green-600" />
                          Interview Complete!
                        </>
                      )}
                    </CardTitle>
                    <CardDescription>
                      {isPro && evaluationResult 
                        ? "AI-powered answer corrections and explanations" 
                        : isPro && isSubmittingResponses 
                          ? "AI is analyzing your responses..." 
                          : "Here's your performance summary"
                      }
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="text-center">
                      {isSubmittingResponses ? (
                        <div className="flex items-center justify-center gap-2">
                          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                          <span className="text-slate-600 dark:text-slate-400">Submitting your responses...</span>
                        </div>
                      ) : evaluationResult ? (
                        /* Real Evaluation Results */
                        <div className="space-y-6">
                          {/* Score Display */}
                          <div className="text-center">
                            <div className="text-4xl font-bold text-green-600 mb-2">
                              {evaluationResult.overallScore}%
                          </div>
                            <div className="flex items-center justify-center gap-2 mb-4">
                                                              <Badge variant={evaluationResult.passFailStatus === 'PASS' ? 'default' : 'destructive'} 
                                       className={evaluationResult.passFailStatus === 'PASS' 
                                         ? 'bg-green-600' 
                                         : 'bg-red-600'}>
                                {evaluationResult.passFailStatus === 'PASS' ? (
                                  <>
                                    <CheckCircle className="w-3 h-3 mr-1" />
                                    PASSED
                                  </>
                                ) : (
                                  <>
                                    <XCircle className="w-3 h-3 mr-1" />
                                    NEEDS IMPROVEMENT
                                  </>
                                )}
                            </Badge>
                          </div>
                          <p className="text-slate-600 dark:text-slate-400">
                              {evaluationResult.correctAnswers} out of {evaluationResult.totalQuestions} questions correct
                          </p>
                        </div>

                        {/* MCQ Analysis */}
                          {evaluationResult.mcqAnalysis && (
                            <div className="space-y-4">
                              <h3 className="text-lg font-semibold text-center">Question Analysis</h3>
                            <div className="space-y-3">
                                {evaluationResult.mcqAnalysis.map((question: any, index: number) => (
                                  <div key={index} className="p-4 border rounded-lg bg-slate-50 dark:bg-slate-800">
                                    <div className="flex items-start justify-between mb-2">
                                      <span className="font-medium text-sm">Question {index + 1}</span>
                                      <Badge variant={question.isCorrect ? 'default' : 'destructive'} 
                                             className={question.isCorrect ? 'bg-green-600' : 'bg-red-600'}>
                                        {question.isCorrect ? '✓ Correct' : '✗ Incorrect'}
                                      </Badge>
                          </div>
                                    <p className="text-sm text-slate-700 dark:text-slate-300 mb-2">
                                      {question.questionText}
                                    </p>
                                    <div className="text-xs text-slate-600 dark:text-slate-400">
                                      <span className="font-medium">Your answer:</span> {question.userAnswer || 'No answer'}
                            </div>
                                    {!question.isCorrect && (
                                      <div className="text-xs text-slate-600 dark:text-slate-400 mt-1">
                                        <span className="font-medium">Correct answer:</span> {question.correctAnswer}
                        </div>
                      )}
                    </div>
                              ))}
                          </div>
                          </div>
                        )}

                          {/* Feedback */}
                            <div className="space-y-4">
                            {evaluationResult.strengths && evaluationResult.strengths.length > 0 && (
                          <div>
                                <h3 className="text-lg font-semibold text-green-700 dark:text-green-400 mb-2">Strengths</h3>
                            <ul className="space-y-1">
                                  {evaluationResult.strengths.map((strength: string, index: number) => (
                                    <li key={index} className="flex items-center gap-2 text-sm">
                                      <CheckCircle className="w-4 h-4 text-green-600" />
                                      {strength}
                                </li>
                              ))}
                            </ul>
                          </div>
                            )}

                            {evaluationResult.weaknesses && evaluationResult.weaknesses.length > 0 && (
                          <div>
                                <h3 className="text-lg font-semibold text-orange-700 dark:text-orange-400 mb-2">Areas for Improvement</h3>
                            <ul className="space-y-1">
                                  {evaluationResult.weaknesses.map((weakness: string, index: number) => (
                                    <li key={index} className="flex items-center gap-2 text-sm">
                                      <AlertCircle className="w-4 h-4 text-orange-600" />
                                      {weakness}
                                </li>
                              ))}
                            </ul>
                          </div>
                            )}

                            {evaluationResult.recommendations && evaluationResult.recommendations.length > 0 && (
                              <div>
                                <h3 className="text-lg font-semibold text-blue-700 dark:text-blue-400 mb-2">Recommendations</h3>
                                <ul className="space-y-1">
                                  {evaluationResult.recommendations.map((rec: string, index: number) => (
                                    <li key={index} className="flex items-center gap-2 text-sm">
                                      <Lightbulb className="w-4 h-4 text-blue-600" />
                                      {rec}
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            )}
                            
                            {/* Download PDF Button - Only for Pro users with results */}
                            {isPro && evaluationResult && (
                              <div className="pt-6 border-t border-slate-200 dark:border-slate-700">
                                <div className="text-center">
                                  <Button 
                                    onClick={downloadPDF}
                                    className="bg-blue-600 hover:bg-blue-700 text-white"
                                  >
                                    <Download className="w-4 h-4 mr-2" />
                                    Download Report (PDF)
                                  </Button>
                                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">
                                    Get a detailed PDF report of your evaluation
                                  </p>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      ) : isPro ? (
                        /* Pro User - Different states based on evaluation status */
                            <div className="space-y-4">
                          <div className="text-4xl font-bold text-blue-600 mb-2">
                            🎉 Interview Complete!
                                  </div>
                                  
                          {evaluationStatus === 'processing' && (
                            <>
                              <div className="flex items-center justify-center gap-2">
                                <Badge variant="default" className="bg-blue-600">
                                  <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white mr-1"></div>
                                  {isPollingResults ? 'AI Evaluation in Progress' : 'Queued for AI Evaluation'}
                                </Badge>
                                    </div>
                              <p className="text-slate-600 dark:text-slate-400 text-lg">
                                {isPollingResults 
                                  ? 'Your responses are being analyzed by AI. Results will appear automatically when ready.' 
                                  : 'Your responses have been queued for AI evaluation. Results will be available soon.'}
                              </p>
                              {isPollingResults && (
                                <div className="text-xs text-slate-500 dark:text-slate-400 text-center">
                                  ⏱️ Checking for results every 10 seconds...
                                    </div>
                                  )}
                            </>
                          )}
                          
                                                    {evaluationStatus === 'error' && (
                            <>
                              <div className="flex items-center justify-center gap-2">
                                <Badge variant="default" className="bg-gradient-to-r from-orange-600 to-yellow-600">
                                  <Clock className="w-3 h-3 mr-1" />
                                  Evaluation in Progress
                                </Badge>
                              </div>
                              <p className="text-slate-600 dark:text-slate-400 text-lg text-center">
                                Thank you for your patience! The evaluation is taking longer than expected. 
                                Once completed, your results will be reflected on your dashboard.
                              </p>
                              <div className="text-sm text-slate-500 dark:text-slate-400 text-center">
                                <div className="mb-2">🎉 <strong>Interview Completed Successfully!</strong></div>
                                <div className="text-xs">Session ID: {currentSessionId}</div>
                              </div>
                            </>
                          )}
                          
                          <div className="text-sm text-slate-500 dark:text-slate-400">
                            {userAnswers.length} questions answered • {techStack} • Pro User
                              </div>
                      </div>
                    ) : (
                        /* Fallback for any issues */
                        <div className="space-y-4">
                          <div className="text-4xl font-bold text-green-600 mb-2">
                            🎉 Interview Complete!
                        </div>
                          <div className="flex items-center justify-center gap-2">
                            <Badge variant="default" className="bg-gradient-to-r from-green-600 to-blue-600">
                              <CheckCircle className="w-3 h-3 mr-1" />
                              Successfully Submitted
                            </Badge>
                          </div>
                          <p className="text-slate-600 dark:text-slate-400 text-lg">
                            Your interview has been completed successfully.
                          </p>
                          <div className="text-sm text-slate-500 dark:text-slate-400">
                            {userAnswers.length} questions answered • {techStack} • {isPro ? 'Pro User' : 'Free User'}
                        </div>
                      </div>
                    )}
                    </div>

                    <Button onClick={resetInterview} className="w-full">
                      <RotateCcw className="w-4 h-4 mr-2" />
                      Take Another Interview
                    </Button>
                  </CardContent>
                </Card>


              </div>
            ) : (
              /* Interview Screen */
              <div className="space-y-4">
                {/* Interview Details Card */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Interview Details</CardTitle>
                    <CardDescription>Current session information</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                      <div className="space-y-1 min-w-0">
                        <p className="text-sm text-muted-foreground">Tech Stack</p>
                        <p className="font-medium text-sm break-words overflow-wrap-anywhere">
                          {techStack || 'Not selected'}
                        </p>
                      </div>
                      <div className="space-y-1 min-w-0">
                        <p className="text-sm text-muted-foreground">Questions</p>
                        <p className="font-medium text-sm break-words">
                          {questions.length} total
                        </p>
                      </div>
                      <div className="space-y-1 min-w-0">
                        <p className="text-sm text-muted-foreground">Progress</p>
                        <p className="font-medium text-sm break-words">
                          {currentQuestion + 1} of {questions.length}
                        </p>
                      </div>
                      <div className="space-y-1 min-w-0">
                        <p className="text-sm text-muted-foreground">Mode</p>
                        <p className="font-medium text-sm break-words">
                          {isPro ? 'Pro' : 'Basic'}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Question Card */}
                <Card className="h-full">
                  <CardHeader>
                    <div className="flex justify-between items-start">
                      <div>
                        <CardTitle className="text-lg">
                          Question {currentQuestion + 1} of {questions.length}
                        </CardTitle>
                        <CardDescription className="flex items-center gap-2 mt-1">
                          <Badge
                            variant={
                              currentQ?.difficulty === "easy"
                                ? "secondary"
                                : currentQ?.difficulty === "medium"
                                  ? "default"
                                  : "destructive"
                            }
                          >
                            {currentQ?.difficulty}
                          </Badge>
                          <span>•</span>
                          <span>{currentQ?.category}</span>
                        </CardDescription>
                      </div>
                      <div className="flex items-center gap-3">
                        {/* Voice Animation and TTS Button */}
                        <div className="relative flex items-center">
                          <VoiceAnimation isActive={isSpeaking} size="sm" />
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={toggleSpeech}
                            className="rounded-full bg-transparent hover:bg-transparent"
                            title={isSpeaking ? "Stop reading" : `Read question aloud${!isPro ? " (Basic voice)" : ""}`}
                          >
                            <span className="sr-only">{isSpeaking ? "Stop reading" : "Read question aloud"}</span>
                            <Volume2 className="w-5 h-5 text-blue-600" />
                          </Button>
                        </div>

                        <div className="flex items-center gap-2 text-sm">
                          <Clock className="w-4 h-4" />
                          <span className={cn("font-mono", timer <= 10 && "text-red-600")}>
                            {Math.floor(timer / 60)}:{(timer % 60).toString().padStart(2, "0")}
                          </span>
                        </div>
                      </div>
                    </div>
                    <Progress value={progressPercentage} className="mt-4" />
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="bg-slate-50 dark:bg-slate-800 p-4 rounded-lg">
                      <p className="text-lg leading-relaxed">{currentQ?.question}</p>
                    </div>

                    {currentQ?.type === "mcq" && currentQ.options && (
                      <RadioGroup value={currentAnswer} onValueChange={setCurrentAnswer}>
                        {currentQ.options.map((option, index) => {
                          // Convert index to letter (0->A, 1->B, 2->C, 3->D)
                          const letterValue = String.fromCharCode(65 + index); // 65 is ASCII for 'A'
                          return (
                          <div key={index} className="flex items-center space-x-2">
                              <RadioGroupItem value={letterValue} id={`option-${index}`} />
                            <Label htmlFor={`option-${index}`} className="flex-1 cursor-pointer">
                              {option}
                            </Label>
                          </div>
                          );
                        })}
                      </RadioGroup>
                    )}

                    {currentQ?.type === "short" && (
                      <Textarea
                        placeholder="Type your answer here..."
                        value={currentAnswer}
                        onChange={(e) => setCurrentAnswer(e.target.value)}
                        className="min-h-[120px]"
                      />
                    )}

                    {currentQ?.type === "long" && (
                      <Textarea
                        placeholder="Provide a detailed explanation..."
                        value={currentAnswer}
                        onChange={(e) => setCurrentAnswer(e.target.value)}
                        className="min-h-[200px]"
                      />
                    )}

                    <div className="flex justify-between">
                      <Button variant="outline" onClick={() => setIsTimerRunning(!isTimerRunning)}>
                        {isTimerRunning ? <Pause className="w-4 h-4 mr-2" /> : <Play className="w-4 h-4 mr-2" />}
                        {isTimerRunning ? "Pause" : "Resume"}
                      </Button>
                      <Button onClick={handleNextQuestion} disabled={!currentAnswer.trim()}>
                        {currentQuestion === questions.length - 1 ? "Finish Interview" : "Next Question"}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
    </AuthLayout>
  );
}
