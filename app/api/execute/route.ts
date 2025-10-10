import { NextResponse } from "next/server"

// RapidAPI Judge0 configuration
const JUDGE0_RAPIDAPI_HOST = "judge0-ce.p.rapidapi.com"
// Original API key (commented out due to usage limit)
const JUDGE0_RAPIDAPI_KEY = "eb4cd7ade4msh3e49f743a0bbcbfp154b38jsn6a20ebf0bd4f"
 
 

// Add this near the top of the file, after the imports
const DEBUG_OUTPUT_COMPARISON = true

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { language_id, source_code, stdin, multiple_test_cases } = body

    if (!language_id || !source_code) {
      return NextResponse.json({ error: "Language ID and source code are required" }, { status: 400 })
    }

    // If multiple test cases are provided, run each one
    if (multiple_test_cases && Array.isArray(multiple_test_cases)) {
      const results = []

      for (const testCase of multiple_test_cases) {
        const result = await executeCode(language_id, source_code, testCase.input, testCase.expected_output)

        // Normalize outputs for comparison
        const normalizedExpected = normalizeOutput(testCase.expected_output)
        const normalizedActual = normalizeOutput(result.stdout)

        // Add debug information if enabled
        if (DEBUG_OUTPUT_COMPARISON) {
          console.log(`Test case comparison:
          - Raw expected: "${testCase.expected_output}"
          - Raw actual: "${result.stdout}"
          - Normalized expected: "${normalizedExpected}"
          - Normalized actual: "${normalizedActual}"
          - Match: ${compareOutputs(normalizedActual, normalizedExpected)}`)
        }

        results.push({
          ...result,
          input: testCase.input,
          expected_output: testCase.expected_output,
          passed: result.status.id === 3 && compareOutputs(normalizedActual, testCase.expected_output),
          debug: DEBUG_OUTPUT_COMPARISON
            ? {
                normalizedExpected,
                normalizedActual,
                rawExpected: testCase.expected_output,
                rawActual: result.stdout,
              }
            : undefined,
        })
      }

      return NextResponse.json({
        results,
        summary: {
          total: results.length,
          passed: results.filter((r) => r.passed).length,
          failed: results.filter((r) => !r.passed).length,
        },
      })
    }

    // Single test case execution
    const result = await executeCode(language_id, source_code, stdin)
    return NextResponse.json(result)
  } catch (error) {
    console.error("Error executing code:", error)
    return NextResponse.json(
      { error: "Failed to execute code: " + (error instanceof Error ? error.message : String(error)) },
      { status: 500 },
    )
  }
}

// Helper function to normalize output strings for comparison
function normalizeOutput(output: string | null): string {
  if (output === null || output === undefined) return ""

  // Convert to string if it's not already
  let outputStr = String(output)

  // Remove carriage returns (Windows line endings)
  outputStr = outputStr.replace(/\r/g, "")

  // Remove trailing newlines
  outputStr = outputStr.replace(/\n+$/g, "")

  // Trim whitespace from both ends
  outputStr = outputStr.trim()

  // Normalize internal whitespace (replace multiple spaces, tabs, etc. with a single space)
  // Only do this for non-code outputs to preserve indentation in code
  if (!outputStr.includes("{") && !outputStr.includes(";")) {
    outputStr = outputStr.replace(/\s+/g, " ")
  }

  return outputStr
}

// Update the compareOutputs function to better handle different data types
function compareOutputs(actual: string, expected: string | number | boolean): boolean {
  // Convert expected to string if it's not already
  const expectedStr = expected !== null && expected !== undefined ? String(expected) : ""

  // Log the comparison for debugging
  console.log(`Comparing outputs:
  - Actual (${typeof actual}): "${actual}"
  - Expected (${typeof expected}): "${expectedStr}"
  - Original expected type: ${typeof expected}
  - Length: actual=${actual.length}, expectedStr=${expectedStr.length}
  - Character codes: actual=${Array.from(actual).map((c) => c.charCodeAt(0))}, expected=${Array.from(expectedStr).map((c) => c.charCodeAt(0))}`)

  // Try direct string comparison first
  if (actual === expectedStr) {
    console.log("Direct string comparison: MATCH")
    return true
  }

  // Try case-insensitive comparison
  if (actual.toLowerCase() === expectedStr.toLowerCase()) {
    console.log("Case-insensitive comparison: MATCH")
    return true
  }

  // Try numeric comparison if expected is a number or can be parsed as a number
  if (typeof expected === "number" || !isNaN(Number(expected))) {
    const numActual = Number(actual)
    const numExpected = typeof expected === "number" ? expected : Number(expected)

    if (!isNaN(numActual)) {
      const numMatch = numActual === numExpected
      console.log(`Numeric comparison (${numActual} vs ${numExpected}): ${numMatch ? "MATCH" : "NO MATCH"}`)
      return numMatch
    }
  }

  // Try boolean comparison
  const boolActual = actual.toLowerCase().trim()
  const boolExpected = expectedStr.toLowerCase().trim()

  if ((boolActual === "true" || boolActual === "false") && (boolExpected === "true" || boolExpected === "false")) {
    const boolMatch = boolActual === boolExpected
    console.log(`Boolean comparison: ${boolMatch ? "MATCH" : "NO MATCH"}`)
    return boolMatch
  }

  // Try comparing after removing all whitespace
  const noWhitespaceActual = actual.replace(/\s+/g, "")
  const noWhitespaceExpected = expectedStr.replace(/\s+/g, "")

  if (noWhitespaceActual === noWhitespaceExpected) {
    console.log("No-whitespace comparison: MATCH")
    return true
  }

  // Try comparing after normalizing line endings and trimming each line
  const normalizedActual = actual
    .split(/\r?\n/)
    .map((line) => line.trim())
    .join("\n")
  const normalizedExpected = expectedStr
    .split(/\r?\n/)
    .map((line) => line.trim())
    .join("\n")

  if (normalizedActual === normalizedExpected) {
    console.log("Normalized line-by-line comparison: MATCH")
    return true
  }

  // If we get here, the outputs don't match
  console.log("All comparison methods failed: NO MATCH")
  return false
}

async function executeCode(
  language_id: string | number,
  source_code: string,
  stdin?: string,
  expected_output?: string,
) {
  console.log("Creating submission with Judge0 API via RapidAPI...")

  // Create submission
  const createResponse = await fetch(`https://${JUDGE0_RAPIDAPI_HOST}/submissions?base64_encoded=true&wait=false`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-RapidAPI-Key": JUDGE0_RAPIDAPI_KEY,
      "X-RapidAPI-Host": JUDGE0_RAPIDAPI_HOST,
    },
    body: JSON.stringify({
      language_id: Number.parseInt(language_id.toString()),
      source_code: Buffer.from(source_code).toString("base64"),
      stdin: stdin ? Buffer.from(stdin).toString("base64") : "",
      expected_output: expected_output !== undefined ? Buffer.from(String(expected_output)).toString("base64") : "",
    }),
  })

  if (!createResponse.ok) {
    const errorText = await createResponse.text()
    console.error(`Judge0 API error: ${errorText}`)
    throw new Error(`Judge0 API error: ${errorText}`)
  }

  const submission = await createResponse.json()
  const token = submission.token

  if (!token) {
    throw new Error("No token received from Judge0 API")
  }

  // Wait for the submission to be processed
  console.log(`Submission created with token: ${token}. Waiting for results...`)

  // Poll for results
  let result = null
  let attempts = 0
  const maxAttempts = 10
  let delay = 1000 // Start with 1 second delay

  while (attempts < maxAttempts) {
    await new Promise((resolve) => setTimeout(resolve, delay))
    attempts++

    // Get the submission result
    const resultResponse = await fetch(`https://${JUDGE0_RAPIDAPI_HOST}/submissions/${token}?base64_encoded=true`, {
      method: "GET",
      headers: {
        "X-RapidAPI-Key": JUDGE0_RAPIDAPI_KEY,
        "X-RapidAPI-Host": JUDGE0_RAPIDAPI_HOST,
      },
    })

    if (!resultResponse.ok) {
      const errorText = await resultResponse.text()
      console.error(`Judge0 API error: ${errorText}`)
      throw new Error(`Judge0 API error: ${errorText}`)
    }

    result = await resultResponse.json()

    // Check if the code has finished executing
    if (result.status && result.status.id > 2) {
      // Status > 2 means finished
      console.log(`Execution completed with status: ${result.status.description}`)
      break
    }

    console.log(`Status: ${result.status ? result.status.description : "Processing"}`)

    // Exponential backoff
    delay = Math.min(delay * 1.5, 5000) // Increase delay but cap at 5 seconds
  }

  if (!result || attempts >= maxAttempts) {
    console.error("Timed out waiting for code execution result")
    throw new Error("Timed out waiting for code execution result")
  }

  // Process the result
  return {
    stdout: result.stdout ? Buffer.from(result.stdout, "base64").toString() : null,
    stderr: result.stderr ? Buffer.from(result.stderr, "base64").toString() : null,
    compile_output: result.compile_output ? Buffer.from(result.compile_output, "base64").toString() : null,
    message: result.message,
    status: result.status,
    time: result.time,
    memory: result.memory,
  }
}
