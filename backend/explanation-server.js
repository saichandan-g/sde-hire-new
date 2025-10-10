const express = require("express")
const cors = require("cors")
const fs = require("fs")
const path = require("path")
const crypto = require("crypto")

// Create Express app
const app = express()
const PORT = 3006

// Enable CORS for all routes
app.use(cors())
app.use(express.json())

// Create storage directory if it doesn't exist
const STORAGE_DIR = path.join(__dirname, "app", "storage", "explanations")
if (!fs.existsSync(STORAGE_DIR)) {
  fs.mkdirSync(STORAGE_DIR, { recursive: true })
}

// Health check endpoint
app.get("/health", (req, res) => {
  console.log("Health check request received")
  res.json({ status: "ok", message: "Explanation server is running" })
})

// Function to generate a cache key based on code and language
function generateCacheKey(code, language) {
  const hash = crypto.createHash("md5").update(`${code}-${language}`).digest("hex")
  return hash
}

// Function to check if explanation is cached
function checkCache(cacheKey) {
  const cachePath = path.join(STORAGE_DIR, `${cacheKey}.json`)
  if (fs.existsSync(cachePath)) {
    try {
      const cacheData = JSON.parse(fs.readFileSync(cachePath, "utf8"))
      console.log(`Cache hit for key: ${cacheKey}`)
      return cacheData
    } catch (error) {
      console.error("Error reading cache:", error)
    }
  }
  console.log(`Cache miss for key: ${cacheKey}`)
  return null
}

// Function to save explanation to cache
function saveToCache(cacheKey, explanation) {
  const cachePath = path.join(STORAGE_DIR, `${cacheKey}.json`)
  try {
    fs.writeFileSync(
      cachePath,
      JSON.stringify({
        explanation,
        timestamp: Date.now(),
      }),
    )
    console.log(`Saved explanation to cache with key: ${cacheKey}`)
  } catch (error) {
    console.error("Error saving to cache:", error)
  }
}

// Endpoint to explain code with streaming response
app.post("/explain-stream", async (req, res) => {
  // Set headers for SSE
  res.setHeader("Content-Type", "text/event-stream")
  res.setHeader("Cache-Control", "no-cache")
  res.setHeader("Connection", "keep-alive")

  try {
    const { code, language } = req.body

    console.log(`\n=== Explanation Request ===`)
    console.log(`Language: ${language}`)
    console.log(`Code snippet (first 100 chars): ${code.substring(0, 100)}...`)

    if (!code || !language) {
      console.error("Error: Code and language are required")
      res.write(`event: error\ndata: ${JSON.stringify({ error: "Code and language are required" })}\n\n`)
      res.end()
      return
    }

    // Generate cache key
    const cacheKey = generateCacheKey(code, language)

    // Check cache
    const cachedExplanation = checkCache(cacheKey)

    if (cachedExplanation) {
      console.log("Using cached explanation")
      // Send metadata event with cache info
      res.write(`event: metadata\ndata: ${JSON.stringify({ fromCache: true })}\n\n`)

      // Send the cached explanation in chunks to simulate streaming
      const chunks = cachedExplanation.explanation.match(/.{1,100}/g) || []

      for (const chunk of chunks) {
        res.write(`event: data\ndata: ${JSON.stringify({ explanation: chunk })}\n\n`)
        // Small delay to simulate streaming
        await new Promise((resolve) => setTimeout(resolve, 10))
      }

      console.log("Sent cached explanation to client")
      // Send completion event
      res.write(`event: complete\ndata: {}\n\n`)
      res.end()
      return
    }

    // Send metadata event
    res.write(`event: metadata\ndata: ${JSON.stringify({ fromCache: false })}\n\n`)

    // Import environment variables
    const OLLAMA_API_URL = process.env.OLLAMA_API_URL || "http://127.0.0.1:11434"
    const OLLAMA_MODEL = process.env.OLLAMA_MODEL || "codestral:latest"

    console.log(`Using Ollama API at: ${OLLAMA_API_URL}`)
    console.log(`Using model: ${OLLAMA_MODEL}`)

    // Prepare the prompt for code explanation
    const prompt = `
You are an expert programming tutor. Please explain the following ${language} code in detail:

\`\`\`${language}
${code}
\`\`\`

Provide a comprehensive explanation with the following sections:

1. Overview: A high-level summary of what the code does
2. Code Breakdown: Line-by-line or section-by-section explanation
3. Time and Space Complexity: Analysis of the algorithm's efficiency
4. Potential Improvements: Suggestions for optimizing or improving the code

Format your response in a clear, educational manner suitable for a student learning programming.
`

    console.log("Sending request to Ollama API...")
    console.log(`Prompt (first 150 chars): ${prompt.substring(0, 150)}...`)

    // Call Ollama API
    const response = await fetch(`${OLLAMA_API_URL}/api/generate`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: OLLAMA_MODEL,
        prompt: prompt,
        stream: true,
      }),
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error(`Ollama API error: ${response.statusText}`)
      console.error(`Error details: ${errorText}`)
      throw new Error(`Ollama API error: ${response.statusText}`)
    }

    console.log("Ollama API response received, streaming to client...")

    // Process the streaming response
    const reader = response.body.getReader()
    const decoder = new TextDecoder()
    let accumulatedExplanation = ""

    while (true) {
      const { done, value } = await reader.read()

      if (done) {
        console.log("Stream complete")
        break
      }

      // Decode the chunk
      const chunk = decoder.decode(value)

      // Parse the JSON responses (Ollama sends multiple JSON objects)
      const jsonLines = chunk.split("\n").filter((line) => line.trim())

      for (const line of jsonLines) {
        try {
          const parsedLine = JSON.parse(line)

          if (parsedLine.response) {
            // Log the response chunk (first 50 chars)
            const responseChunk = parsedLine.response
            console.log(`Response chunk: ${responseChunk.substring(0, 50)}${responseChunk.length > 50 ? "..." : ""}`)

            // Send the chunk to the client
            res.write(`event: data\ndata: ${JSON.stringify({ explanation: responseChunk })}\n\n`)

            // Accumulate the explanation
            accumulatedExplanation += responseChunk
          }
        } catch (error) {
          console.error("Error parsing JSON line:", error)
        }
      }
    }

    console.log("Explanation complete")
    console.log(`Total explanation length: ${accumulatedExplanation.length} characters`)
    console.log(`Final explanation (first 200 chars): ${accumulatedExplanation.substring(0, 200)}...`)

    // Save to cache
    saveToCache(cacheKey, accumulatedExplanation)

    // Send completion event
    res.write(`event: complete\ndata: {}\n\n`)
    res.end()
  } catch (error) {
    console.error("Error generating explanation:", error)
    res.write(`event: error\ndata: ${JSON.stringify({ error: error.message })}\n\n`)
    res.end()
  }
})

// Start the server
app.listen(PORT, () => {
  console.log(`\n=== Explanation Server ===`)
  console.log(`Server running on port ${PORT}`)
  console.log(`Health check: http://localhost:${PORT}/health`)
  console.log(`Explanation endpoint: http://localhost:${PORT}/explain-stream`)
  console.log(`Cache directory: ${STORAGE_DIR}`)
  console.log(`Ready to receive explanation requests\n`)
})  