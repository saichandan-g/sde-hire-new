"use client"

import { Badge } from "@/components/ui/badge"
import { Alert, AlertCircle, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { CheckCircle, XCircle } from "lucide-react"
import type { ExecutionResult } from "../types"

interface OutputSectionProps {
  outputHeight: number
  submissionStatus: "idle" | "submitting" | "success" | "partial" | "failed"
  executionStatus: "idle" | "running" | "success" | "error"
  output: string
  submissionResult: any
  showSubmissionDetails: boolean
  toggleSubmissionDetails: () => void
  executionResult: ExecutionResult | null
  useCustomInput: boolean
  customInput: string
  currentQuestion: any
}

export function OutputSection({
  outputHeight,
  submissionStatus,
  executionStatus,
  output,
  submissionResult,
  showSubmissionDetails,
  toggleSubmissionDetails,
  executionResult,
  useCustomInput,
  customInput,
  currentQuestion,
}: OutputSectionProps) {
  return (
    <div className="border-t" style={{ height: `${outputHeight}px` }}>
      <div className="flex items-center justify-between px-4 py-2 border-b h-10 dark:border-green-500 dark:neon-border-green">
        <div className="font-medium dark:neon-text-green">Output</div>
        {submissionStatus !== "idle" ? (
          <Badge
            variant={
              submissionStatus === "submitting"
                ? "outline"
                : submissionStatus === "success"
                  ? "success"
                  : submissionStatus === "partial"
                    ? "secondary"
                    : "destructive"
            }
            className="dark:neon-border-blue"
          >
            {submissionStatus === "submitting"
              ? "Submitting..."
              : submissionStatus === "success"
                ? "All Tests Passed"
                : submissionStatus === "partial"
                  ? "Some Tests Passed"
                  : "Failed"}
          </Badge>
        ) : executionStatus !== "idle" ? (
          <Badge
            variant={
              executionStatus === "running" ? "outline" : executionStatus === "success" ? "success" : "destructive"
            }
            className="dark:neon-border-blue"
          >
            {executionStatus === "running" ? "Running..." : executionStatus === "success" ? "Success" : "Error"}
          </Badge>
        ) : null}
      </div>

      <div className="p-4 overflow-auto" style={{ height: `${outputHeight - 40}px` }}>
        {/* Submission Results */}
        {submissionResult && (
          <div className="mb-4">
            <div className="flex items-center justify-between mb-2 flex-wrap gap-2">
              <div className="font-medium text-sm">
                Test Cases: {submissionResult.summary.passed}/{submissionResult.summary.total} passed
              </div>
              <Button variant="outline" size="sm" onClick={toggleSubmissionDetails} className="text-xs">
                {showSubmissionDetails ? "Hide Details" : "Show Details"}
              </Button>
            </div>

            <div className="w-full h-2 bg-secondary rounded-full overflow-hidden mb-4">
              <div
                className="h-full bg-primary"
                style={{
                  width: `${(submissionResult.summary.passed / submissionResult.summary.total) * 100}%`,
                }}
              ></div>
            </div>

            {showSubmissionDetails && (
              <div className="space-y-4 mt-4">
                {submissionResult.results.map((result: any, index: number) => (
                  <div key={index} className="border rounded-md p-3">
                    <div className="flex items-center gap-2 mb-2">
                      {result.passed ? (
                        <CheckCircle className="h-4 w-4 text-green-500 flex-shrink-0" />
                      ) : (
                        <XCircle className="h-4 w-4 text-red-500 flex-shrink-0" />
                      )}
                      <span className="font-medium text-sm">
                        Test Case {index + 1}: {result.passed ? "Passed" : "Failed"}
                      </span>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                      <div>
                        <div className="font-medium text-muted-foreground mb-1">Input:</div>
                        <pre className="bg-muted p-2 rounded-md overflow-x-auto">
                          <code>{result.input}</code>
                        </pre>
                      </div>
                      <div>
                        <div className="font-medium text-muted-foreground mb-1">Expected Output:</div>
                        <pre className="bg-muted p-2 rounded-md overflow-x-auto">
                          <code>{result.expected_output}</code>
                        </pre>
                      </div>
                    </div>
                    {!result.passed && (
                      <div className="mt-2">
                        <div className="font-medium text-muted-foreground mb-1">Your Output:</div>
                        <pre className="bg-muted p-2 rounded-md overflow-x-auto text-xs">
                          <code>{result.stdout || result.stderr || result.compile_output || "No output"}</code>
                        </pre>

                        {/* Add debug information if available */}
                        {result.debug && (
                          <div className="mt-2 p-2 border border-dashed border-amber-500 rounded-md">
                            <details>
                              <summary className="text-xs font-medium text-amber-600 cursor-pointer">
                                Debug Information
                              </summary>
                              <div className="mt-2 text-xs space-y-1">
                                <p>
                                  <span className="font-medium">Raw Expected:</span> "{result.debug.rawExpected}"
                                </p>
                                <p>
                                  <span className="font-medium">Raw Actual:</span> "{result.debug.rawActual}"
                                </p>
                                <p>
                                  <span className="font-medium">Normalized Expected:</span> "
                                  {result.debug.normalizedExpected}"
                                </p>
                                <p>
                                  <span className="font-medium">Normalized Actual:</span> "
                                  {result.debug.normalizedActual}"
                                </p>
                                <p>
                                  <span className="font-medium">Character codes (Expected):</span>{" "}
                                  {Array.from(result.debug.normalizedExpected || "")
                                    .map((c) => c.charCodeAt(0))
                                    .join(", ")}
                                </p>
                                <p>
                                  <span className="font-medium">Character codes (Actual):</span>{" "}
                                  {Array.from(result.debug.normalizedActual || "")
                                    .map((c) => c.charCodeAt(0))
                                    .join(", ")}
                                </p>
                              </div>
                            </details>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Execution Status */}
        {executionStatus === "running" ? (
          <div className="flex items-center justify-center h-full">
            <p className="text-center">
              <span className="block mb-2 font-medium">Running your code...</span>
              <span className="block text-sm text-muted-foreground">This may take a few seconds</span>
            </p>
          </div>
        ) : executionStatus === "success" && !submissionResult ? (
          <>
            <Alert className="mb-4">
              <CheckCircle className="h-4 w-4" />
              <AlertTitle>Success!</AlertTitle>
              <AlertDescription>
                {useCustomInput
                  ? "Your code ran successfully with custom input."
                  : "Your code ran successfully and produced the expected output."}
              </AlertDescription>
            </Alert>
            <div className="mb-4">
              <div className="text-xs font-medium text-muted-foreground mb-1">
                {useCustomInput ? "Custom Input:" : "Input:"}
              </div>
              <pre className="bg-muted p-2 rounded-md overflow-x-auto mb-4 text-xs">
                <code>{useCustomInput ? customInput : currentQuestion?.sample_input}</code>
              </pre>
              <div className="text-xs font-medium text-muted-foreground mb-1">Your Output:</div>
              <pre className="font-mono whitespace-pre-wrap bg-muted p-3 rounded-md text-xs">{output}</pre>
            </div>
          </>
        ) : executionStatus === "error" && !submissionResult ? (
          <>
            <Alert variant="destructive" className="mb-4">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>There was an issue with your code. Check the details below.</AlertDescription>
            </Alert>
            <div className="mb-4">
              <div className="text-xs font-medium text-muted-foreground mb-1">
                {useCustomInput ? "Custom Input:" : "Input:"}
              </div>
              <pre className="bg-muted p-2 rounded-md overflow-x-auto mb-4 text-xs">
                <code>{useCustomInput ? customInput : currentQuestion?.sample_input}</code>
              </pre>
            </div>
            <pre className="font-mono whitespace-pre-wrap bg-muted p-3 rounded-md overflow-auto text-xs">{output}</pre>
            {executionResult && executionResult.status && (
              <div className="mt-4 p-3 bg-muted/50 rounded-md text-xs">
                <p className="font-medium">Error Details:</p>
                <p>Status: {executionResult.status.description || "Unknown"}</p>
                {executionResult.status.id === 6 && (
                  <p className="text-amber-600 mt-2">
                    Compilation error - Check your syntax and make sure your code is valid.
                  </p>
                )}
                {executionResult.status.id === 7 && (
                  <p className="text-amber-600 mt-2">
                    Runtime error - Your code compiled but crashed during execution.
                  </p>
                )}
                {executionResult.status.id === 5 && (
                  <p className="text-amber-600 mt-2">Time limit exceeded - Your code took too long to execute.</p>
                )}
              </div>
            )}
          </>
        ) : (
          <div className="text-muted-foreground text-sm">
            {useCustomInput
              ? "Enter your custom input above and run your code to see the output"
              : "Run your code to see the output"}
          </div>
        )}

        {executionResult && !submissionResult && (
          <div className="mt-4 text-xs text-muted-foreground">
            <p>Execution time: {executionResult.time || "N/A"}</p>
            <p>Memory used: {executionResult.memory || "N/A"}</p>
          </div>
        )}
      </div>
    </div>
  )
}
