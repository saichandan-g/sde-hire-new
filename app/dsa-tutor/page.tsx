"use client"

import { useEffect, useState, useRef, useLayoutEffect } from "react"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Card } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { AuthLayout } from "@/components/layout/auth-layout"
import { supabase } from "@/lib/supabase"
import {
  Panel,
  PanelGroup,
  PanelResizeHandle,
} from "react-resizable-panels";
import { useSearchParams } from "next/navigation"

import { ProblemHeader } from "./components/problem-header"
import { CodeActions } from "./components/code-actions"
import { ChallengeDescription } from "./components/challenge-description"
import { CodeAssistance } from "./components/code-assistance"
import { CodeEditorSection } from "./components/code-editor-section"
import { OutputSection } from "./components/output-section"
import { useProgress } from "@/lib/context/progress-context"
import "./dsa-tutor.css"
import { languages } from "./languages"
import type { Question, ExecutionResult, ProblemAssistance } from "./types"

// Error boundary for ResizeObserver errors
const errorHandler = (e: ErrorEvent) => {
  if (e.message.includes("ResizeObserver") || e.error?.message?.includes("ResizeObserver")) {
    e.stopImmediatePropagation()
  }
}

interface TestCaseResult {
  passed: boolean
  input: string
  expected_output: string
  stdout: string | null
  stderr: string | null
  compile_output: string | null
  status: {
    id: number
    description: string
  }
  time: string
  memory: string
}

interface SubmissionResult {
  results: TestCaseResult[]
  summary: {
    total: number
    passed: number
    failed: number
  }
}

export default function DSATutorPage() {
  const searchParams = useSearchParams()
  const [questions, setQuestions] = useState<Question[]>([])
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0)
  const [selectedLanguage, setSelectedLanguage] = useState(languages[0])
  const [code, setCode] = useState("")
  const [output, setOutput] = useState("")
  const [isRunning, setIsRunning] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [executionResult, setExecutionResult] = useState<ExecutionResult | null>(null)
  const [executionStatus, setExecutionStatus] = useState<"idle" | "running" | "success" | "error">("idle")
  const [submissionResult, setSubmissionResult] = useState<SubmissionResult | null>(null)
  const [submissionStatus, setSubmissionStatus] = useState<"idle" | "submitting" | "success" | "partial" | "failed">(
    "idle",
  )
  const [showSubmissionDetails, setShowSubmissionDetails] = useState(false)
  const [editorHasFocus, setEditorHasFocus] = useState(false)
  const editorRef = useRef<any>(null)
  const [windowHeight, setWindowHeight] = useState(0)
  const [windowWidth, setWindowWidth] = useState(0)
  // New states for timer and error count
  const [solveTime, setSolveTime] = useState(0)
  const [errorCount, setErrorCount] = useState(0)
  const timerRef = useRef<NodeJS.Timeout | null>(null)

  // Custom test case states
  const [useCustomInput, setUseCustomInput] = useState(false)
  const [customInput, setCustomInput] = useState("")
  const [showCustomInput, setShowCustomInput] = useState(false)

  // Responsive layout state
  const [isMobile, setIsMobile] = useState(false)
  const [isTablet, setIsTablet] = useState(false)

  // Problem assistance state
  const [problemAssistance, setProblemAssistance] = useState<ProblemAssistance>({
    explaining: "",
    solution: "",
    stepByStep: "",
    isLoading: false,
    fromCache: false,
  })

  const [collapse, setCollapse] = useState({
    challenge: false,
    assistance: false,
    editor: false,
    output: false,
  })

  // User mode state for free/pro toggle
  const [isProUser, setIsProUser] = useState(true)

  // Set initial question index based on URL parameter
  useEffect(() => {
    const problemId = searchParams.get("problem")
    if (problemId && questions.length > 0) {
      const id = parseInt(problemId, 10)
      const index = questions.findIndex((q) => q.id === id)
      if (index !== -1) {
        setCurrentQuestionIndex(index)
      }
    }
  }, [searchParams, questions])

  // Add error handler for ResizeObserver errors
  useEffect(() => {
    window.addEventListener("error", errorHandler)
    return () => {
      window.removeEventListener("error", errorHandler)
    }
  }, [])

  // Get window dimensions for responsive layout
  useLayoutEffect(() => {
    const updateDimensions = () => {
      const width = window.innerWidth
      const height = window.innerHeight

      setWindowWidth(width)
      setWindowHeight(height)
      setIsMobile(width < 768)
      setIsTablet(width >= 768 && width < 1024)
    }

    updateDimensions()
    window.addEventListener("resize", updateDimensions)
    return () => window.removeEventListener("resize", updateDimensions)
  }, [])

  // Fetch problems from Supabase
  useEffect(() => {
    const fetchProblems = async () => {
      const { data, error } = await supabase
        .from("problems")
        .select("id, title, description, difficulty, input_format, output_format, constraints, hint, tags, test_cases, metadata")
        .order("id", { ascending: true })

      if (error) {
        console.error("Error fetching problems:", error)
      } else {
        setQuestions(data)
      }
    }

    fetchProblems()
  }, [])

  // Timer logic: Start on editor focus or problem load
  useEffect(() => {
    // Start timer when editor gains focus for the first time or problem changes
    if (editorHasFocus || questions.length > 0) {
      if (timerRef.current) {
        clearInterval(timerRef.current)
      }
      timerRef.current = setInterval(() => {
        setSolveTime((prev) => prev + 1)
      }, 1000)
    }

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current)
      }
    }
  }, [editorHasFocus, currentQuestionIndex, questions.length])

  // Reset editor state and timer when changing questions
  useEffect(() => {
    if (questions.length > 0) {
      setCode("")
      setEditorHasFocus(false)
      setSubmissionResult(null)
      setSubmissionStatus("idle")
      setShowSubmissionDetails(false)
      setCustomInput("")
      setUseCustomInput(false)
      setSolveTime(0) // Reset timer
      setErrorCount(0) // Reset error count
      if (timerRef.current) {
        clearInterval(timerRef.current)
      }

      // Reset problem assistance
      setProblemAssistance({
        explaining: "",
        solution: "",
        stepByStep: "",
        isLoading: false,
        fromCache: false,
      })
    }
  }, [questions, currentQuestionIndex])

  // Function to calculate code length (non-empty, non-comment lines)
  const calculateCodeLength = (sourceCode: string): number => {
    const lines = sourceCode.split('\n').filter((line) => {
      const trimmed = line.trim()
      // Exclude empty lines and common comment patterns
      return trimmed.length > 0 && !trimmed.startsWith('//') && !trimmed.startsWith('#') && !trimmed.startsWith('/*') && !trimmed.startsWith('*')
    })
    return lines.length
  }

  // Function to fetch problem assistance
  const fetchProblemAssistance = async (forceRefresh = false) => {
    if (questions.length === 0) return

    setProblemAssistance((prev) => ({
      ...prev,
      isLoading: true,
      error: undefined,
      streamingText: "",
    }))

    try {
      const url = forceRefresh
        ? `http://localhost:3005/explain-stream?index=${currentQuestionIndex}&refresh=true&language=${selectedLanguage.name}`
        : `http://localhost:3005/explain-stream?index=${currentQuestionIndex}&language=${selectedLanguage.name}`

      console.log(`Requesting problem assistance with language: ${selectedLanguage.name} (${selectedLanguage.label})`)

      const eventSource = new EventSource(url)

      let accumulatedText = ""

      eventSource.addEventListener("metadata", (event) => {
        try {
          const data = JSON.parse(event.data)
          console.log("Received metadata:", data)
          setProblemAssistance((prev) => ({
            ...prev,
            fromCache: data.fromCache || false,
          }))
        } catch (error) {
          console.error("Error parsing metadata:", error)
        }
      })

      eventSource.addEventListener("data", (event) => {
        try {
          const data = JSON.parse(event.data)
          if (data.text) {
            accumulatedText += data.text
            setProblemAssistance((prev) => ({
              ...prev,
              streamingText: accumulatedText,
            }))
          }
        } catch (error) {
          console.error("Error parsing data chunk:", error)
        }
      })

      eventSource.addEventListener("complete", (event) => {
        try {
          console.log("Stream complete")
          const sections = parseResponseIntoSections(accumulatedText)
          setProblemAssistance({
            explaining: sections.explaining || "No explanation available.",
            solution: sections.solution || "No solution strategy available.",
            stepByStep: sections.stepByStep || "No step-by-step approach available.",
            isLoading: false,
            fromCache: false,
            streamingText: "",
          })
          eventSource.close()
        } catch (error) {
          console.error("Error handling completion:", error)
        }
      })

      eventSource.addEventListener("error", (event) => {
        console.error("SSE Error:", event)
        setProblemAssistance((prev) => ({
          ...prev,
          isLoading: false,
          error: "Error receiving streaming response. Please try again.",
          streamingText: "",
        }))
        eventSource.close()
      })

      return () => {
        eventSource.close()
      }
    } catch (error) {
      console.error("Error setting up SSE:", error)
      setProblemAssistance((prev) => ({
        ...prev,
        isLoading: false,
        error: error instanceof Error ? error.message : "Error setting up streaming connection",
        streamingText: "",
      }))
    }
  }

  const refreshExplanation = () => {
    fetchProblemAssistance(true)
  }

  const parseResponseIntoSections = (text: string) => {
    const result = {
      explaining: "",
      solution: "",
      stepByStep: "",
    }

    const explainMatch = text.match(/SECTION 1: Problem Explanation([\s\S]*?)(?=SECTION 2:|$)/i)
    if (explainMatch && explainMatch[1]) {
      result.explaining = explainMatch[1].trim()
    } else {
      const oldExplainMatch = text.match(/Explaining the Problem:([\s\S]*?)(?=Solution:|SECTION 2:|$)/i)
      if (oldExplainMatch && oldExplainMatch[1]) {
        result.explaining = oldExplainMatch[1].trim()
      }
    }

    const dsaTopicsMatch = text.match(/SECTION 2: Key DSA Topic and Explanation([\s\S]*?)(?=$)/i)
    if (dsaTopicsMatch && dsaTopicsMatch[1]) {
      result.solution = dsaTopicsMatch[1].trim()
    } else {
      const oldSolutionMatch = text.match(/DSA Topics Involved:([\s\S]*?)(?=Step-by-Step Approach:|SECTION 3:|$)/i)
      if (oldSolutionMatch && oldSolutionMatch[1]) {
        result.solution = oldSolutionMatch[1].trim()
      }
    }

    return result
  }

  const normalizeOutput = (output: string | null): string => {
    if (output === null || output === undefined) return ""
    let outputStr = String(output)
    outputStr = outputStr.replace(/\r/g, "")
    outputStr = outputStr.replace(/\n+$/g, "")
    outputStr = outputStr.trim()
    if (!outputStr.includes("{") && !outputStr.includes(";")) {
      outputStr = outputStr.replace(/\s+/g, " ")
    }
    return outputStr
  }

  const compareOutputs = (actual: string, expected: string | number | boolean): boolean => {
    const expectedStr = expected !== null && expected !== undefined ? String(expected) : ""
    if (actual === expectedStr) return true
    if (actual.toLowerCase() === expectedStr.toLowerCase()) return true
    if (typeof expected === "number" || !isNaN(Number(expected))) {
      const numActual = Number(actual)
      const numExpected = typeof expected === "number" ? expected : Number(expected)
      if (!isNaN(numActual)) {
        return numActual === numExpected
      }
    }
    const boolActual = actual.toLowerCase().trim()
    const boolExpected = expectedStr.toLowerCase().trim()
    if ((boolActual === "true" || boolActual === "false") && (boolExpected === "true" || boolExpected === "false")) {
      return boolActual === boolExpected
    }
    const noWhitespaceActual = actual.replace(/\s+/g, "")
    const noWhitespaceExpected = expectedStr.replace(/\s+/g, "")
    if (noWhitespaceActual === noWhitespaceExpected) return true
    return false
  }

  const handleLanguageChange = (value: string) => {
    const language = languages.find((lang) => lang.value === value) || languages[0]
    setSelectedLanguage(language)
    if (!editorHasFocus) {
      setCode(getPlaceholderComment(language))
    } else {
      const currentQuestion = questions[currentQuestionIndex]
      if (currentQuestion) {
        const templateCode = getLanguageTemplate(language, currentQuestion.id)
        if (templateCode && code === "") {
          setCode(templateCode)
        }
      }
    }
    if (editorRef.current) {
      try {
        const editor = editorRef.current
        const model = editor.getModel()
        if (model && model._monaco) {
          const options = getLanguageEditorOptions(language.name)
          editor.updateOptions(options)
          model._monaco.editor.setModelLanguage(model, language.name)
        }
      } catch (error) {
        console.error("Error updating editor language:", error)
      }
    }
  }

  const getLanguageEditorOptions = (languageName: string) => {
    const baseOptions = {
      minimap: { enabled: window.innerWidth >= 1024 },
      scrollBeyondLastLine: false,
      fontSize: window.innerWidth < 768 ? 12 : 14,
      lineNumbers: window.innerWidth < 768 ? "off" : "on",
      wordWrap: "on",
      automaticLayout: true,
      renderLineHighlight: "all",
    }
    switch (languageName) {
      case "python":
        return { ...baseOptions, tabSize: 4, insertSpaces: true }
      case "java":
        return { ...baseOptions, tabSize: 4, insertSpaces: true }
      case "cpp":
        return { ...baseOptions, tabSize: 2, insertSpaces: true }
      case "javascript":
        return { ...baseOptions, tabSize: 2, insertSpaces: true }
      default:
        return baseOptions
    }
  }

  const getLanguageTemplate = (language: any, questionId: number): string => {
    if (language.name === "python") {
      return getPythonTemplate(questionId)
    } else if (language.name === "java") {
      return getJavaTemplate(questionId)
    } else if (language.name === "cpp") {
      return getCppTemplate(questionId)
    } else if (language.name === "c") {
      return getCTemplate(questionId)
    } else if (language.name === "javascript") {
      return getJavaScriptTemplate(questionId)
    }
    return language.defaultCode
  }

  const getCTemplate = (questionId: number): string => {
    const template = languages.find((lang) => lang.name === "c")?.defaultCode || ""
    return template
  }

  const getPythonTemplate = (questionId: number): string => {
    const template = languages.find((lang) => lang.name === "python")?.defaultCode || ""
    return template
  }

  const getJavaTemplate = (questionId: number): string => {
    const template = languages.find((lang) => lang.name === "java")?.defaultCode || ""
    return template
  }

  const getCppTemplate = (questionId: number): string => {
    const template = languages.find((lang) => lang.name === "cpp")?.defaultCode || ""
    return template
  }

  const getJavaScriptTemplate = (questionId: number): string => {
    const template = languages.find((lang) => lang.name === "javascript")?.defaultCode || ""
    return template
  }

  const getPlaceholderComment = (language = selectedLanguage) => {
    if (editorHasFocus) return ""
    switch (language.name) {
      case "python":
        return "# Write your function here"
      case "javascript":
        return "// Write your function here"
      case "java":
        return "// Write your function here"
      case "cpp":
        return "// Write your function here"
      default:
        return "// Write your function here"
    }
  }

  const handleRunCode = async () => {
    if (!editorRef.current) return

    if (!editorHasFocus && code === getPlaceholderComment()) {
      setExecutionStatus("error")
      setOutput("Please write your code first before running.")
      return
    }

    if (useCustomInput && !customInput.trim()) {
      setExecutionStatus("error")
      setOutput("Please provide custom input before running.")
      return
    }

    setIsRunning(true)
    setExecutionStatus("running")
    setOutput("")
    setExecutionResult(null)

    const currentQuestion = questions[currentQuestionIndex]
    const inputToUse = useCustomInput ? customInput : currentQuestion.test_cases.sample_input

    setOutput(
      `Compiling and running your ${selectedLanguage.label} code with the following input:\n\n${inputToUse}\n\nPlease wait...`,
    )

    try {
      const sourceCode = editorRef.current.getValue()
      const response = await fetch("/api/execute", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          language_id: selectedLanguage.id,
          source_code: sourceCode,
          stdin: inputToUse,
        }),
      })

      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(`API error: ${response.status} ${errorText}`)
      }

      const result = await response.json()
      console.log("Execution result:", result)
      console.log("Execution status:", result.status ? `${result.status.id} - ${result.status.description}` : "Unknown")
      setExecutionResult(result)

      if (result.status && result.status.id === 3) {
        if (useCustomInput) {
          setExecutionStatus("success")
          setOutput(result.stdout || "")
        } else {
          const expectedOutput = currentQuestion.test_cases.sample_output
          const actualOutput = result.stdout || ""
          const normalizedExpected = normalizeOutput(expectedOutput)
          const normalizedActual = normalizeOutput(actualOutput)

          if (compareOutputs(normalizedActual, normalizedExpected)) {
            setExecutionStatus("success")
            setOutput(result.stdout || "")
          } else {
            setExecutionStatus("error")
            setOutput(
              `Your code compiled and ran successfully, but the output doesn't match the expected output.\n\nExpected Output:\n${expectedOutput}\n\nYour Output:\n${actualOutput}`,
            )
            setErrorCount((prev) => prev + 1) // Increment error count for wrong answer
          }
        }
      } else if (result.status && result.status.id === 4) {
        if (useCustomInput) {
          setExecutionStatus("success")
          setOutput(result.stdout || "")
        } else {
          const expectedOutput = currentQuestion.test_cases.sample_output
          const actualOutput = result.stdout || ""
          const normalizedExpected = normalizeOutput(expectedOutput)
          const normalizedActual = normalizeOutput(actualOutput)

          if (compareOutputs(normalizedActual, normalizedExpected)) {
            setExecutionStatus("success")
            setOutput(result.stdout || "")
          } else {
            setExecutionStatus("error")
            setOutput(
              `Your code compiled and ran successfully, but produced the wrong answer.\n\nExpected Output:\n${expectedOutput}\n\nYour Output:\n${actualOutput}`,
            )
            setErrorCount((prev) => prev + 1) // Increment error count for wrong answer
          }
        }
      } else {
        setExecutionStatus("error")
        let errorMessage = ""
        if (result.stderr) {
          errorMessage += `Runtime Error:\n${result.stderr}\n\n`
        }
        if (result.compile_output) {
          errorMessage += `Compilation Error:\n${result.compile_output}\n\n`
        }
        if (result.status && result.status.description) {
          errorMessage += `Status: ${result.status.description}\n\n`
        }
        if (result.message) {
          errorMessage += `Message: ${result.message}\n\n`
        }
        if (!errorMessage) {
          errorMessage = "An error occurred during execution."
        }
        setOutput(errorMessage)
        setErrorCount((prev) => prev + 1) // Increment error count for compilation/runtime errors
      }
    } catch (error) {
      console.error("Error running code:", error)
      setExecutionStatus("error")
      setOutput(`Failed to execute code: ${error instanceof Error ? error.message : String(error)}`)
      setErrorCount((prev) => prev + 1) // Increment error count for API errors
    } finally {
      setIsRunning(false)
    }
  }

  const { markProblemSolved, markProblemAttempted } = useProgress()

  const handleSubmitCode = async () => {
    if (!editorRef.current) return

    if (!editorHasFocus && code === getPlaceholderComment()) {
      setExecutionStatus("error")
      setOutput("Please write your code first before submitting.")
      return
    }

    setIsSubmitting(true)
    setSubmissionStatus("submitting")
    setSubmissionResult(null)
    setShowSubmissionDetails(false)

    try {
      const currentQuestion = questions[currentQuestionIndex]
      const sourceCode = editorRef.current.getValue()
      const codeLength = calculateCodeLength(sourceCode) // Calculate code length

      markProblemAttempted(currentQuestion.id, errorCount) // Pass current error count

      const testCases = [
        {
          input: String(currentQuestion.test_cases.sample_input),
          expected_output: String(currentQuestion.test_cases.sample_output),
        },
        ...currentQuestion.test_cases.hidden_inputs.map((input: string, index: number) => ({
          input: String(input),
          expected_output: String(currentQuestion.test_cases.hidden_outputs[index]),
        })),
      ]

      const response = await fetch("/api/execute", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          language_id: selectedLanguage.id,
          source_code: sourceCode,
          multiple_test_cases: testCases,
        }),
      })

      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(`API error: ${response.status} ${errorText}`)
      }

      const result = (await response.json()) as SubmissionResult
      setSubmissionResult(result)

      if (result.summary.passed === result.summary.total) {
        setSubmissionStatus("success")
        markProblemSolved(currentQuestion.id, codeLength, solveTime, errorCount) // Pass metrics
        setOutput("All test cases passed successfully!")
        setExecutionStatus("success")
      } else if (result.summary.passed > 0) {
        setSubmissionStatus("partial")
        setErrorCount((prev) => prev + 1) // Increment error count for partial failure
        const failedTestCase = result.results.find((r) => !r.passed)
        if (failedTestCase) {
          setExecutionStatus("error")
          setOutput(
            `Test Case Failed:\n\nInput:\n${failedTestCase.input}\n\nExpected Output:\n${
              failedTestCase.expected_output
            }\n\nYour Output:\n${failedTestCase.stdout || ""}`,
          )
        }
      } else {
        setSubmissionStatus("failed")
        setErrorCount((prev) => prev + 1) // Increment error count for complete failure
        const failedTestCase = result.results.find((r) => !r.passed)
        if (failedTestCase) {
          setExecutionStatus("error")
          setOutput(
            `Test Case Failed:\n\nInput:\n${failedTestCase.input}\n\nExpected Output:\n${
              failedTestCase.expected_output
            }\n\nYour Output:\n${failedTestCase.stdout || ""}`,
          )
        }
      }
    } catch (error) {
      console.error("Error submitting code:", error)
      setSubmissionStatus("failed")
      setOutput(
        "An error occurred while trying to submit your code: " +
          (error instanceof Error ? error.message : String(error)),
      )
      setErrorCount((prev) => prev + 1) // Increment error count for API errors
    } finally {
      setIsSubmitting(false)
    }
  }

  const toggleSubmissionDetails = () => {
    setShowSubmissionDetails(!showSubmissionDetails)
  }

  const toggleCustomInput = () => {
    setUseCustomInput(!useCustomInput)
    setShowCustomInput(!useCustomInput)
  }

  const resetCustomInput = () => {
    setCustomInput("")
  }

  const currentQuestion = questions[currentQuestionIndex]

  const headerHeight = 56
  const footerHeight = 64
  const mainHeight = windowHeight - headerHeight - footerHeight - 20

  let leftPanelWidth = "45%"
  let rightPanelWidth = "55%"

  if (isMobile) {
    leftPanelWidth = "100%"
    rightPanelWidth = "100%"
  } else if (isTablet) {
    leftPanelWidth = "40%"
    rightPanelWidth = "60%"
  }

  const challengeHeight = isMobile ? Math.min(400, mainHeight * 0.4) : Math.floor(mainHeight / 2)
  const assistanceHeight = isMobile ? Math.min(400, mainHeight * 0.4) : mainHeight - challengeHeight
  const editorHeight = showCustomInput ? Math.floor(mainHeight * 0.5) : Math.floor(mainHeight * 0.7)
  const customInputHeight = Math.floor(mainHeight * 0.2)
  const outputHeight = showCustomInput ? mainHeight - editorHeight - customInputHeight : mainHeight - editorHeight

  useEffect(() => {
    if (!editorHasFocus) {
      setCode(getPlaceholderComment())
    }
  }, [selectedLanguage])

  return (
    <AuthLayout>
      <div className="flex flex-col h-screen ">
        <div className="border-b h-14 px-4 flex items-center justify-between bg-background sticky top-0 z-10">
          <ProblemHeader
            questions={questions}
            currentQuestionIndex={currentQuestionIndex}
            setCurrentQuestionIndex={setCurrentQuestionIndex}
            currentQuestion={currentQuestion}
            isMobile={isMobile}
            selectedLanguage={selectedLanguage}
            handleLanguageChange={handleLanguageChange}
            isProUser={isProUser}
            setIsProUser={setIsProUser}
          />
        </div>

        <div className="flex flex-1 overflow-hidden dsa-layout">
          {questions.length > 0 && currentQuestion ? (
            <PanelGroup direction="horizontal" className="flex flex-1">
              <Panel defaultSize={45} minSize={40} maxSize={70}>
                <div className="w-full h-full border-r dsa-left-panel">
                  <PanelGroup direction="vertical" className="h-full" key={isProUser ? 'pro' : 'free'}>
                    <Panel defaultSize={isProUser ? 50 : 100} minSize={20}>
                      <div className="h-full">
                        <ChallengeDescription
                          currentQuestion={currentQuestion}
                          currentQuestionIndex={currentQuestionIndex}
                          challengeHeight={isProUser ? challengeHeight : mainHeight}
                        />
                      </div>
                    </Panel>
                    {isProUser && (
                      <>
                        <PanelResizeHandle className="h-1 bg-muted hover:bg-primary transition cursor-row-resize" />
                        <Panel defaultSize={50} minSize={60}>
                          <div className="h-full flex flex-col">
                            <CodeAssistance
                              assistanceHeight={assistanceHeight}
                              problemAssistance={problemAssistance}
                              fetchProblemAssistance={fetchProblemAssistance}
                              refreshExplanation={refreshExplanation}
                              currentQuestionIndex={currentQuestionIndex}
                              selectedLanguage={selectedLanguage}
                              setCode={setCode}
                              code={code}
                              executionStatus={executionStatus}
                            />
                          </div>
                        </Panel>
                      </>
                    )}
                  </PanelGroup>
                </div>
              </Panel>

              <PanelResizeHandle className="w-1 bg-muted hover:bg-primary transition cursor-col-resize" />
              <Panel defaultSize={55} minSize={30}>
                <div className="flex-1 flex flex-col dsa-right-panel">
                  <div className="border-b px-4 py-2 flex items-center justify-between h-10">
                    <div className="flex items-center gap-2">
                      <CodeActions
                        selectedLanguage={selectedLanguage}
                        handleLanguageChange={handleLanguageChange}
                        handleRunCode={handleRunCode}
                        isRunning={isRunning}
                        handleSubmitCode={handleSubmitCode}
                        isSubmitting={isSubmitting}
                        isMobile={isMobile}
                        solveTime={solveTime}
                        currentQuestion={currentQuestion}
                      />
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="flex items-center space-x-2">
                        <Switch id="custom-input" checked={useCustomInput} onCheckedChange={toggleCustomInput} />
                        <Label htmlFor="custom-input">Custom Input</Label>
                      </div>
                    </div>
                  </div>

                  <div className="flex-1 flex flex-col">
                    <CodeEditorSection
                      editorHeight={editorHeight}
                      customInputHeight={customInputHeight}
                      showCustomInput={showCustomInput}
                      selectedLanguage={selectedLanguage}
                      code={code}
                      editorHasFocus={editorHasFocus}
                      setEditorHasFocus={setEditorHasFocus}
                      setCode={setCode}
                      editorRef={editorRef}
                      customInput={customInput}
                      setCustomInput={setCustomInput}
                      resetCustomInput={resetCustomInput}
                    />

                    <OutputSection
                      outputHeight={outputHeight}
                      submissionStatus={submissionStatus}
                      executionStatus={executionStatus}
                      output={output}
                      submissionResult={submissionResult}
                      showSubmissionDetails={showSubmissionDetails}
                      toggleSubmissionDetails={toggleSubmissionDetails}
                      executionResult={executionResult}
                      useCustomInput={useCustomInput}
                      customInput={customInput}
                      currentQuestion={currentQuestion}
                    />
                  </div>
                </div>
              </Panel>
            </PanelGroup>
          ) : (
            <div className="flex items-center justify-center w-full">
              <Card className="w-[400px]">
                <div className="p-6">
                  <h3 className="text-lg font-semibold mb-2">Loading Questions</h3>
                  <p className="text-muted-foreground mb-4">Please wait while we load the DSA problems...</p>
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-[250px]" />
                    <Skeleton className="h-4 w-[200px]" />
                    <Skeleton className="h-4 w-[300px]" />
                  </div>
                </div>
              </Card>
            </div>
          )}
        </div>
      </div>
    </AuthLayout>
  )
}