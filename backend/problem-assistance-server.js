// ProblemAssistanceServer.js
const express = require("express")
const fs = require("fs")
const path = require("path")
const axios = require("axios")
const cors = require("cors")
const app = express()

// Middleware
app.use(express.json())
app.use(
  cors({
    origin: true,
    credentials: true,
  }),
) // Use the cors package with more permissive settings

const PORT = 3005
const OLLAMA_API = process.env.OLLAMA_API_URL || "http://127.0.0.1:11434/api/generate"
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || "codestral:latest"
const RESPONSE_STORAGE_PATH = path.join(__dirname, "app", "storage", "PAResponse.json")

// Ensure storage directory exists
function ensureStorageDirectoryExists() {
  const storageDir = path.join(__dirname, "app", "storage")
  if (!fs.existsSync(storageDir)) {
    console.log(`Creating storage directory: ${storageDir}`)
    fs.mkdirSync(storageDir, { recursive: true })
  }
}

// Load questions helper function with error handling
function loadQuestions() {
  try {
    // Try multiple paths to find the questions.json file
    const possiblePaths = [
      path.join(__dirname, "..", "app", "dsa-tutor", "questions.json"),
      path.join(__dirname, "app", "dsa-tutor", "questions.json"),
      path.join(__dirname, "questions.json"),
    ]

    for (const filePath of possiblePaths) {
      if (fs.existsSync(filePath)) {
        console.log(`Found questions.json at: ${filePath}`)
        const data = fs.readFileSync(filePath, "utf8")
        return JSON.parse(data)
      }
    }

    console.error("Could not find questions.json in any of the expected locations")
    return []
  } catch (error) {
    console.error("Error loading questions:", error.message)
    return []
  }
}

// Add a health check endpoint
app.get("/health", (req, res) => {
  res.status(200).send({
    status: "ok",
    timestamp: new Date().toISOString(),
  })
})

// Prepare prompt
function buildPrompt(q) {
  return `
You are an expert computer science educator.
Read the following problem carefully and explain it using EXACTLY the following structure with these EXACT section headings:

SECTION 1: Problem Explanation
- Provide a comprehensive and clear explanation of the problem
- Break down the problem into smaller parts
- Use beginner-friendly language to describe the key task
- Explain the input and output formats
- Provide examples to illustrate the problem
- Make sure a complete beginner can understand what needs to be done

SECTION 2: Key DSA Topic and Explanation
- Identify the main Data Structures and Algorithms (DSA) topic involved in this problem
- Explain this DSA topic in depth, including its core concepts and principles
- Explain why this DSA topic is relevant to solving this specific problem
- Use analogies and real-world examples to explain complex DSA concepts
- Focus on theoretical understanding, not implementation

CRITICAL INSTRUCTIONS:
1. DO NOT INCLUDE ANY CODE EXAMPLES OR SNIPPETS in your response
2. DO NOT use markdown code blocks (backticks) anywhere in your response
3. DO NOT provide implementation ideas or code-related strategies
4. DO NOT include solution strategies or hints toward the answer
5. Strictly adhere to the given format with these EXACT section headings
6. Only follow the 2 sections above
7. Keep the explanation educational and focused only on problem understanding and DSA concept explanation
8. NEVER include any code, pseudocode, or code-like syntax in your response

Problem Title:
${q.title}
Difficulty:
${q.difficulty}
Problem Statement:
${q.question}
Input Format:
${q.input_format}
Output Format:
${q.output_format}
Constraints:
${q.constraints}
Hint:
${q.hint}
Sample Input:
${q.sample_input}
Sample Output:
${q.sample_output}
`
}

// Load stored response from JSON file
function loadStoredResponse() {
  try {
    ensureStorageDirectoryExists()
    if (fs.existsSync(RESPONSE_STORAGE_PATH)) {
      const data = fs.readFileSync(RESPONSE_STORAGE_PATH, "utf8")
      return JSON.parse(data)
    }
    return null
  } catch (error) {
    console.error("Error loading stored response:", error.message)
    return null
  }
}

// Function to clean response text and remove any code blocks
function cleanResponseText(text) {
  // Remove any markdown code blocks (\`\`\`...\`\`\`)
  let cleaned = text.replace(/```[\s\S]*?```/g, "")

  // Remove any inline code blocks (`...`)
  cleaned = cleaned.replace(/`[^`]*`/g, "")

  // Remove any lines that look like code (indented by 2+ spaces or tabs and contain common code patterns)
  const codePatterns = [
    /^\s{2,}.*[;{}=()].*$/gm, // Lines with 2+ spaces that contain code symbols
    /^\t+.*[;{}=()].*$/gm, // Lines with tabs that contain code symbols
    /^def\s+\w+\s*$$.*$$:/gm, // Python function definitions
    /^import\s+\w+/gm, // Import statements
    /^from\s+\w+\s+import/gm, // From import statements
    /^class\s+\w+/gm, // Class definitions
    /^if\s+.*:/gm, // If statements
    /^for\s+.*:/gm, // For loops
    /^while\s+.*:/gm, // While loops
    /^return\s+.*/gm, // Return statements
    /^\s*[a-zA-Z_][a-zA-Z0-9_]*\s*=\s*.*/gm, // Variable assignments
  ]

  for (const pattern of codePatterns) {
    cleaned = cleaned.replace(pattern, "")
  }

  return cleaned
}

// Function to limit response to 500 words while maintaining section structure
function limitResponseLength(text, wordLimit = 500) {
  // Split the text into sections
  const sections = text.split(/SECTION \d+: /)
  const sectionHeaders = text.match(/SECTION \d+: [^\n]+/g) || []

  // If no sections found, just limit the whole text
  if (sections.length <= 1) {
    const words = text.split(/\s+/)
    if (words.length <= wordLimit) return text
    return words.slice(0, wordLimit).join(" ") + "... (truncated to 500 words)"
  }

  // Remove the first empty element if it exists
  if (sections[0].trim() === "") sections.shift()

  let result = ""
  let wordCount = 0

  // Process each section
  for (let i = 0; i < sections.length && wordCount < wordLimit; i++) {
    // Add section header
    if (sectionHeaders[i]) {
      result += (i > 0 ? "\n\n" : "") + sectionHeaders[i] + "\n"
    }

    // Count words in this section
    const sectionWords = sections[i].split(/\s+/)
    const wordsToAdd = Math.min(sectionWords.length, wordLimit - wordCount)

    // Add words from this section
    result += sectionWords.slice(0, wordsToAdd).join(" ")
    wordCount += wordsToAdd

    // If we couldn't add all words from this section, add truncation notice
    if (wordsToAdd < sectionWords.length) {
      result += "... (truncated to 500 words)"
      break
    }
  }

  return result
}

// Save response to JSON file
function saveResponse(questionIndex, title, responseText) {
  try {
    ensureStorageDirectoryExists()

    // Clean the response text to remove any code blocks
    const cleanedResponse = cleanResponseText(responseText)

    // Limit the response to 500 words
    const limitedResponse = limitResponseLength(cleanedResponse)

    const responseData = {
      questionIndex,
      title,
      response: limitedResponse,
      timestamp: new Date().toISOString(),
    }

    fs.writeFileSync(RESPONSE_STORAGE_PATH, JSON.stringify(responseData, null, 2), "utf8")
    console.log(`Response for question ${questionIndex} saved to storage`)
    return true
  } catch (error) {
    console.error("Error saving response:", error.message)
    return false
  }
}

// Generate a fallback response when Ollama is unavailable
function generateFallbackResponse(question) {
  return `SECTION 1: Problem Explanation
- The AI Mentor is not available right now. Please try again later.
- This problem is about ${question.title} with a difficulty of ${question.difficulty}.
- The problem asks you to ${question.question.substring(0, 100)}...
- Please read the problem statement carefully to understand what is required.

SECTION 2: Key DSA Topic and Explanation
- The AI Mentor will extract DSA-related keywords directly from the question and identify the Data Structures and Algorithms (DSA) topic strictly based on those keywords.
- It will explain only the DSA concept explicitly indicated by the question's wording—no assumptions or additional topics will be introduced.
- The explanation will focus on the essential principles and usage of that topic, keeping it entirely relevant to solving the given problem.`
}

// NEW: Server-Sent Events endpoint for streaming responses
app.get("/explain-stream", async (req, res) => {
  try {
    // Set headers for SSE
    res.setHeader("Content-Type", "text/event-stream")
    res.setHeader("Cache-Control", "no-cache")
    res.setHeader("Connection", "keep-alive")

    // Load the latest questions data on each request
    const questions = loadQuestions()

    if (questions.length === 0) {
      res.write(`event: error\ndata: ${JSON.stringify({ error: "Failed to load questions data" })}\n\n`)
      return res.end()
    }

    // Get question index from query parameter or default to 0
    const index = req.query.index ? Number.parseInt(req.query.index) : 0
    // Check if refresh is requested
    const forceRefresh = req.query.refresh === "true"

    console.log(
      `Requested streaming for question index: ${index}, Total questions: ${questions.length}, Force refresh: ${forceRefresh}`,
    )

    const question = questions[index]

    if (!question) {
      res.write(`event: error\ndata: ${JSON.stringify({ error: `Question not found at index ${index}` })}\n\n`)
      return res.end()
    }

    // Check if we have a stored response for this question
    const storedResponse = loadStoredResponse()

    // If we have a stored response for this exact question index and no refresh is requested, return it
    if (!forceRefresh && storedResponse && storedResponse.questionIndex === index) {
      console.log(`Using stored response for question index ${index}`)

      // Send initial metadata
      res.write(
        `event: metadata\ndata: ${JSON.stringify({
          title: question.title,
          fromCache: true,
        })}\n\n`,
      )

      // Send the full cached response
      res.write(`event: data\ndata: ${JSON.stringify({ text: storedResponse.response })}\n\n`)

      // Send completion event
      res.write(`event: complete\ndata: ${JSON.stringify({ complete: true })}\n\n`)

      return res.end()
    }

    // Otherwise, generate a new response
    const prompt = buildPrompt(question)

    try {
      // Send initial metadata
      res.write(
        `event: metadata\ndata: ${JSON.stringify({
          title: question.title,
          fromCache: false,
        })}\n\n`,
      )

      // Make the request with responseType: 'stream'
      const response = await axios.post(
        OLLAMA_API,
        {
          model: OLLAMA_MODEL,
          prompt: prompt,
          stream: true,
        },
        {
          headers: { "Content-Type": "application/json" },
          responseType: "stream",
          timeout: 150000, // 5 minute timeout
        },
      )

      let fullResponse = ""
      let jsonBuffer = ""

      // Handle the streaming response
      response.data.on("data", (chunk) => {
        const chunkStr = chunk.toString()
        jsonBuffer += chunkStr

        // Process complete JSON objects
        try {
          // Split by newlines to handle multiple JSON objects in the buffer
          const lines = jsonBuffer.split("\n")

          // Process all complete lines except possibly the last one
          for (let i = 0; i < lines.length - 1; i++) {
            if (lines[i].trim()) {
              const parsedChunk = JSON.parse(lines[i])
              if (parsedChunk.response) {
                fullResponse += parsedChunk.response

                // Send the chunk to the client
                res.write(`event: data\ndata: ${JSON.stringify({ text: parsedChunk.response })}\n\n`)

                // Optionally log progress
                process.stdout.write(parsedChunk.response)
              }
            }
          }

          // Keep the last line in the buffer if it's incomplete
          jsonBuffer = lines[lines.length - 1]
        } catch (e) {
          // If we can't parse, just keep accumulating data
          console.log("Error parsing chunk, continuing to accumulate data")
        }
      })

      response.data.on("end", () => {
        // Process any remaining data in the buffer
        try {
          if (jsonBuffer.trim()) {
            const parsedChunk = JSON.parse(jsonBuffer)
            if (parsedChunk.response) {
              fullResponse += parsedChunk.response

              // Send the final chunk
              res.write(`event: data\ndata: ${JSON.stringify({ text: parsedChunk.response })}\n\n`)
            }
          }
        } catch (e) {
          console.log("Error parsing final chunk")
        }

        console.log("\nStream ended, total response length:", fullResponse.length)

        // Clean and limit the response
        const cleanedResponse = cleanResponseText(fullResponse)
        const limitedResponse = limitResponseLength(cleanedResponse)

        // Save the limited response to storage
        saveResponse(index, question.title, limitedResponse)

        // Send completion event
        res.write(`event: complete\ndata: ${JSON.stringify({ complete: true })}\n\n`)

        res.end()
      })

      response.data.on("error", (err) => {
        console.error("Stream error:", err)
        res.write(`event: error\ndata: ${JSON.stringify({ error: err.message })}\n\n`)
        res.end()
      })
    } catch (apiError) {
      console.error("Ollama API error:", apiError.message)

      // Provide a fallback response instead of an error
      const fallbackResponse = generateFallbackResponse(question)

      // Save the fallback response to storage
      saveResponse(index, question.title, fallbackResponse)

      // Send the fallback response
      res.write(`event: data\ndata: ${JSON.stringify({ text: fallbackResponse, fallback: true })}\n\n`)

      // Send completion event
      res.write(`event: complete\ndata: ${JSON.stringify({ complete: true })}\n\n`)

      res.end()
    }
  } catch (err) {
    console.error("Server error:", err.message)
    res.write(`event: error\ndata: ${JSON.stringify({ error: err.message })}\n\n`)
    res.end()
  }
})

// Keep the original endpoint for backward compatibility
app.get("/explain", async (req, res) => {
  try {
    // Load the latest questions data on each request
    const questions = loadQuestions()

    if (questions.length === 0) {
      return res.status(500).send("Failed to load questions data")
    }

    // Get question index from query parameter or default to 0
    const index = req.query.index ? Number.parseInt(req.query.index) : 0
    // Check if refresh is requested
    const forceRefresh = req.query.refresh === "true"

    console.log(
      `Requested question index: ${index}, Total questions: ${questions.length}, Force refresh: ${forceRefresh}`,
    )

    const question = questions[index]

    if (!question) {
      return res.status(404).send(`Question not found at index ${index}. Total questions: ${questions.length}`)
    }

    // Check if we have a stored response for this question
    const storedResponse = loadStoredResponse()

    // If we have a stored response for this exact question index and no refresh is requested, return it
    if (!forceRefresh && storedResponse && storedResponse.questionIndex === index) {
      console.log(`Using stored response for question index ${index}`)
      return res.send({
        title: question.title,
        response: storedResponse.response,
        fromCache: true, // Flag to indicate this is a cached response
      })
    }

    // Otherwise, generate a new response
    const prompt = buildPrompt(question)

    try {
      // Get streaming response from Ollama
      console.log("Requesting streaming response from Ollama...")

      // Make the request with responseType: 'stream'
      const response = await axios.post(
        OLLAMA_API,
        {
          model: OLLAMA_MODEL,
          prompt: prompt,
          stream: true,
        },
        {
          headers: { "Content-Type": "application/json" },
          responseType: "stream",
          timeout: 150000, // 5 minute timeout
        },
      )

      let fullResponse = ""
      let jsonBuffer = ""

      // Handle the streaming response
      response.data.on("data", (chunk) => {
        const chunkStr = chunk.toString()
        jsonBuffer += chunkStr

        // Process complete JSON objects
        try {
          // Split by newlines to handle multiple JSON objects in the buffer
          const lines = jsonBuffer.split("\n")

          // Process all complete lines except possibly the last one
          for (let i = 0; i < lines.length - 1; i++) {
            if (lines[i].trim()) {
              const parsedChunk = JSON.parse(lines[i])
              if (parsedChunk.response) {
                fullResponse += parsedChunk.response
                // Optionally log progress
                process.stdout.write(parsedChunk.response)
              }
            }
          }

          // Keep the last line in the buffer if it's incomplete
          jsonBuffer = lines[lines.length - 1]
        } catch (e) {
          // If we can't parse, just keep accumulating data
          console.log("Error parsing chunk, continuing to accumulate data")
        }
      })

      return new Promise((resolve, reject) => {
        response.data.on("end", () => {
          // Process any remaining data in the buffer
          try {
            if (jsonBuffer.trim()) {
              const parsedChunk = JSON.parse(jsonBuffer)
              if (parsedChunk.response) {
                fullResponse += parsedChunk.response
              }
            }
          } catch (e) {
            console.log("Error parsing final chunk")
          }

          console.log("\nStream ended, total response length:", fullResponse.length)
          console.log("Received complete response from Ollama")

          // Clean and limit the response
          const cleanedResponse = cleanResponseText(fullResponse)
          const limitedResponse = limitResponseLength(cleanedResponse)

          // Save the limited response to storage
          saveResponse(index, question.title, limitedResponse)

          res.send({
            title: question.title,
            response: limitedResponse,
          })
          resolve()
        })

        response.data.on("error", (err) => {
          console.error("Stream error:", err)
          reject(err)
        })
      })
    } catch (apiError) {
      console.error("Ollama API error:", apiError.message)

      // Provide a fallback response instead of an error
      const fallbackResponse = generateFallbackResponse(question)

      // Save the fallback response to storage
      saveResponse(index, question.title, fallbackResponse)

      res.send({
        title: question.title,
        response: fallbackResponse,
        fallback: true, // Flag to indicate this is a fallback response
      })
    }
  } catch (err) {
    console.error("Server error:", err.message)
    res.status(500).send(`Server error: ${err.message}`)
  }
})

// Add an endpoint to clear the cached response
app.delete("/clear-cache", (req, res) => {
  try {
    if (fs.existsSync(RESPONSE_STORAGE_PATH)) {
      // Reset the response file to empty state
      const emptyResponse = {
        questionIndex: -1,
        title: "",
        response: "",
        timestamp: new Date().toISOString(),
      }

      fs.writeFileSync(RESPONSE_STORAGE_PATH, JSON.stringify(emptyResponse, null, 2), "utf8")
      res.status(200).send({ message: "Response cache cleared successfully" })
    } else {
      res.status(404).send({ message: "No cache file found" })
    }
  } catch (error) {
    console.error("Error clearing cache:", error.message)
    res.status(500).send({ error: `Failed to clear cache: ${error.message}` })
  }
})

// Start the server
app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`)
  console.log(`Health check available at http://localhost:${PORT}/health`)
  console.log(`Response storage path: ${RESPONSE_STORAGE_PATH}`)

  // Ensure storage directory exists on startup
  ensureStorageDirectoryExists()
})
