const express = require("express")
const fs = require("fs")
const path = require("path")
const axios = require("axios")
const cors = require("cors")
const crypto = require("crypto")

const app = express()

// Middleware
app.use(express.json({ limit: "100mb" })) // Increased limit for large code files
app.use(
  cors({
    origin: true,
    credentials: true,
  }),
)

const PORT = 3007
const OLLAMA_API = process.env.OLLAMA_API_URL || "http://127.0.0.1:11434/api/generate"
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || "  "
const QUESTIONS_PATH = path.join(__dirname, "..", "app", "dsa-tutor", "questions.json")
const CORRECTION_RESPONSE_PATH = path.join(__dirname, "app", "storage", "CorrectionResponse.json")

// Supported languages with enhanced configuration
const LANGUAGE_CONFIG = {
  python: {
    name: "Python",
    extensions: [".py"],
    timeout: 120000,
  },
  javascript: {
    name: "JavaScript",
    extensions: [".js", ".mjs"],
    timeout: 120000,
  },
  java: {
    name: "Java",
    extensions: [".java"],
    timeout: 150000,
  },
  cpp: {
    name: "C++",
    extensions: [".cpp", ".cc", ".cxx"],
    timeout: 150000,
  },
  c: {
    name: "C",
    extensions: [".c"],
    timeout: 150000,
  },
}

const SUPPORTED_LANGUAGES = Object.keys(LANGUAGE_CONFIG)
const DEFAULT_LANGUAGE = "python"

// Cache configuration
const CACHE_DIR = path.join(__dirname, "cache", "corrections")
const CACHE_EXPIRY = 24 * 60 * 60 * 1000 // 24 hours in milliseconds

// Ensure storage and cache directories exist
function ensureDirectoriesExist() {
  const storageDir = path.join(__dirname, "app", "storage")
  if (!fs.existsSync(storageDir)) {
    console.log(`Creating storage directory: ${storageDir}`)
    fs.mkdirSync(storageDir, { recursive: true })
  }

  if (!fs.existsSync(CACHE_DIR)) {
    fs.mkdirSync(CACHE_DIR, { recursive: true })
    console.log(`Created cache directory: ${CACHE_DIR}`)
  }
}

// Load questions with enhanced error handling and caching
let questionsCache = null
let questionsCacheTime = 0

function loadQuestions() {
  const now = Date.now()

  // Use cached questions if available and not expired (5 minutes cache)
  if (questionsCache && now - questionsCacheTime < 300000) {
    return questionsCache
  }

  try {
    const possiblePaths = [
      path.join(__dirname, "..", "app", "dsa-tutor", "questions.json"),
      path.join(__dirname, "app", "dsa-tutor", "questions.json"),
      path.join(__dirname, "questions.json"),
    ]

    for (const filePath of possiblePaths) {
      if (fs.existsSync(filePath)) {
        console.log(`Loading questions from: ${filePath}`)
        const data = fs.readFileSync(filePath, "utf8")
        questionsCache = JSON.parse(data)
        questionsCacheTime = now
        console.log(`Loaded ${questionsCache.length} questions successfully`)
        return questionsCache
      }
    }

    console.error("Could not find questions.json in any expected location")
    return []
  } catch (error) {
    console.error("Error loading questions:", error.message)
    return []
  }
}

// Enhanced cache management with expiry
function getCachedCorrection(cacheKey) {
  try {
    const cachePath = path.join(CACHE_DIR, `${cacheKey}.json`)
    if (fs.existsSync(cachePath)) {
      const cachedData = JSON.parse(fs.readFileSync(cachePath, "utf8"))

      // Check if cache is expired
      if (Date.now() - cachedData.timestamp > CACHE_EXPIRY) {
        fs.unlinkSync(cachePath) // Remove expired cache
        return null
      }

      return cachedData
    }
  } catch (error) {
    console.error("Error reading cache:", error.message)
  }
  return null
}

function setCachedCorrection(cacheKey, correction) {
  try {
    const cachePath = path.join(CACHE_DIR, `${cacheKey}.json`)
    const cacheData = {
      correction,
      timestamp: Date.now(),
    }
    fs.writeFileSync(cachePath, JSON.stringify(cacheData, null, 2))
    return true
  } catch (error) {
    console.error("Error writing cache:", error.message)
    return false
  }
}

// Validate and normalize language
function validateLanguage(language) {
  if (!language) return DEFAULT_LANGUAGE

  const normalizedLang = language.toLowerCase()
  return SUPPORTED_LANGUAGES.includes(normalizedLang) ? normalizedLang : DEFAULT_LANGUAGE
}

// Get comprehensive I/O examples for each language
function getIOExamples(language, question) {
  const sampleInput = question.sample_input || "5"
  const sampleOutput = question.sample_output || "120"

  switch (language) {
    case "python":
      return `
# Complete Python solution template with I/O handling:

def solve():
    # Read input
    n = int(input().strip())
    
    # Your solution logic here
    result = your_algorithm(n)
    
    # Output result
    print(result)

def your_algorithm(n):
    # Implement your solution here
    # This is where the main logic should go
    pass

# Execute the solution
if __name__ == "__main__":
    solve()

# Sample Input: ${sampleInput}
# Expected Output: ${sampleOutput}

# Common Python I/O patterns:
# Single integer: n = int(input())
# Multiple integers on one line: a, b, c = map(int, input().split())
# List of integers: arr = list(map(int, input().split()))
# Multiple lines of input: 
# for _ in range(n):
#     line = input().strip()
      `.trim()

    case "javascript":
      return `
// Complete JavaScript solution template with I/O handling:

const readline = require('readline');

function solve(input) {
    const lines = input.trim().split('\\n');
    const n = parseInt(lines[0]);
    
    // Your solution logic here
    const result = yourAlgorithm(n);
    
    // Output result
    console.log(result);
}

function yourAlgorithm(n) {
    // Implement your solution here
    // This is where the main logic should go
}

// I/O handling
const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

let input = '';
rl.on('line', (line) => {
    input += line + '\\n';
});

rl.on('close', () => {
    solve(input);
});

// Sample Input: ${sampleInput}
// Expected Output: ${sampleOutput}

// Common JavaScript I/O patterns:
// Single integer: const n = parseInt(lines[0]);
// Multiple integers: const [a, b, c] = lines[0].split(' ').map(Number);
// Array of integers: const arr = lines[0].split(' ').map(Number);
      `.trim()

    case "java":
      return `
// Complete Java solution template with I/O handling:

import java.util.*;
import java.io.*;

public class Main {
    public static void main(String[] args) throws IOException {
        BufferedReader br = new BufferedReader(new InputStreamReader(System.in));
        
        // Read input
        int n = Integer.parseInt(br.readLine().trim());
        
        // Your solution logic here
        long result = yourAlgorithm(n);
        
        // Output result
        System.out.println(result);
        
        br.close();
    }
    
    public static long yourAlgorithm(int n) {
        // Implement your solution here
        // This is where the main logic should go
        return 0;
    }
}

// Sample Input: ${sampleInput}
// Expected Output: ${sampleOutput}

// Common Java I/O patterns:
// Single integer: int n = Integer.parseInt(br.readLine());
// Multiple integers: String[] parts = br.readLine().split(" ");
//                   int a = Integer.parseInt(parts[0]);
// Array of integers: int[] arr = Arrays.stream(br.readLine().split(" "))
//                              .mapToInt(Integer::parseInt).toArray();
      `.trim()

    case "cpp":
      return `
// Complete C++ solution template with I/O handling:

#include <iostream>
#include <vector>
#include <string>
#include <algorithm>
#include <cmath>
using namespace std;

long long yourAlgorithm(int n) {
    // Implement your solution here
    // This is where the main logic should go
    return 0;
}

int main() {
    ios_base::sync_with_stdio(false);
    cin.tie(NULL);
    
    // Read input
    int n;
    cin >> n;
    
    // Your solution logic here
    long long result = yourAlgorithm(n);
    
    // Output result
    cout << result << endl;
    
    return 0;
}

// Sample Input: ${sampleInput}
// Expected Output: ${sampleOutput}

// Common C++ I/O patterns:
// Single integer: int n; cin >> n;
// Multiple integers: int a, b, c; cin >> a >> b >> c;
// Vector of integers: vector<int> arr(n); 
//                    for(int i = 0; i < n; i++) cin >> arr[i];
// String input: string s; cin >> s; or getline(cin, s);
      `.trim()

    case "c":
      return `
// Complete C solution template with I/O handling:

#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <math.h>

long long yourAlgorithm(int n) {
    // Implement your solution here
    // This is where the main logic should go
    return 0;
}

int main() {
    // Read input
    int n;
    scanf("%d", &n);
    
    // Your solution logic here
    long long result = yourAlgorithm(n);
    
    // Output result
    printf("%lld\\n", result);
    
    return 0;
}

// Sample Input: ${sampleInput}
// Expected Output: ${sampleOutput}

// Common C I/O patterns:
// Single integer: scanf("%d", &n);
// Multiple integers: scanf("%d %d %d", &a, &b, &c);
// Array of integers: int arr[n]; 
//                   for(int i = 0; i < n; i++) scanf("%d", &arr[i]);
// String input: char str[1000]; scanf("%s", str);
      `.trim()

    default:
      return ""
  }
}

// Get language-specific correction guidelines
function getLanguageGuidelines(language) {
  switch (language) {
    case "python":
      return `
PYTHON-SPECIFIC CORRECTION GUIDELINES:
- Ensure proper indentation (4 spaces per level)
- Include necessary imports at the top
- Use appropriate data types (int, float, str, list, dict)
- Handle input parsing with int(), float(), input().strip(), input().split()
- Use proper exception handling with try/except when needed
- Follow PEP 8 naming conventions for variables and functions
- Use list comprehensions and built-in functions when appropriate
- Ensure proper string formatting and output
- Handle edge cases like empty input or zero values
- Use efficient algorithms and data structures
      `.trim()

    case "javascript":
      return `
JAVASCRIPT-SPECIFIC CORRECTION GUIDELINES:
- Use proper variable declarations (const, let, var appropriately)
- Include readline module for input handling
- Use parseInt(), parseFloat() for number conversion
- Handle arrays with proper methods (map, filter, reduce)
- Use proper error handling with try/catch
- Follow camelCase naming conventions
- Use template literals for string formatting
- Handle asynchronous operations correctly if needed
- Ensure proper scope and closure handling
- Use modern ES6+ features when appropriate
      `.trim()

    case "java":
      return `
JAVA-SPECIFIC CORRECTION GUIDELINES:
- MANDATORY: Use 'Main' as the class name regardless of original name
- Include proper imports (java.util.*, java.io.*)
- Use BufferedReader or Scanner for input
- Declare proper data types (int, long, double, String)
- Handle exceptions with throws IOException or try/catch
- Follow camelCase for variables and methods, PascalCase for classes
- Use proper access modifiers (public, private, static)
- Ensure all braces are properly matched
- Use appropriate collection classes (ArrayList, HashMap, etc.)
- Handle large numbers with long or BigInteger when needed
      `.trim()

    case "cpp":
      return `
C++-SPECIFIC CORRECTION GUIDELINES:
- Include necessary headers (#include <iostream>, <vector>, etc.)
- Use 'using namespace std;' or std:: prefix
- Use proper data types (int, long long, double, string)
- Handle input/output with cin/cout
- Use vectors instead of arrays when possible
- Include ios_base::sync_with_stdio(false) for faster I/O
- Use proper memory management (avoid memory leaks)
- Follow snake_case or camelCase consistently
- Use STL algorithms and containers when appropriate
- Handle large numbers with long long
      `.trim()

    case "c":
      return `
C-SPECIFIC CORRECTION GUIDELINES:
- Include necessary headers (#include <stdio.h>, <stdlib.h>, etc.)
- Use proper data types (int, long long, double, char*)
- Handle input/output with scanf/printf
- Use proper format specifiers (%d, %lld, %f, %s)
- Manage memory with malloc/free when needed
- Use proper array declarations and bounds checking
- Follow snake_case naming convention
- Handle string operations with string.h functions
- Ensure proper null termination for strings
- Use appropriate loop constructs and conditions
      `.trim()

    default:
      return ""
  }
}

// Build comprehensive correction prompt
function buildCorrectionPrompt(code, language, question) {
  const langConfig = LANGUAGE_CONFIG[language]
  const langName = langConfig ? langConfig.name : "Unknown"

  return `
You are an expert ${langName} developer and code reviewer. Your task is to analyze and fix the provided code to solve the given programming problem correctly.

PROBLEM CONTEXT:
=================
Title: ${question.title}
Difficulty: ${question.difficulty}

Problem Statement:
${question.question}

Input Format:
${question.input_format}

Output Format:
${question.output_format}

Constraints:
${question.constraints}

${question.hint ? `Hint: ${question.hint}` : ""}

Sample Input:
${question.sample_input}

Sample Output:
${question.sample_output}

USER'S CODE TO CORRECT:
=======================
\`\`\`${language}
${code}
\`\`\`

I/O TEMPLATE AND EXAMPLES:
==========================
${getIOExamples(language, question)}

LANGUAGE-SPECIFIC GUIDELINES:
=============================
${getLanguageGuidelines(language)}

CORRECTION REQUIREMENTS:
========================
1. PRESERVE ORIGINAL INTENT: Maintain the user's original variable names, function names, and overall code structure as much as possible
2. FIX LOGICAL ERRORS: Correct any algorithmic mistakes or logical flaws
3. FIX SYNTAX ERRORS: Resolve compilation/runtime errors, missing imports, incorrect syntax
4. OPTIMIZE I/O HANDLING: Ensure proper input reading and output formatting
5. HANDLE EDGE CASES: Add necessary checks for boundary conditions
6. MAINTAIN EFFICIENCY: Keep or improve the time/space complexity
7. FOLLOW CONVENTIONS: Apply language-specific best practices and naming conventions
8. COMPLETE SOLUTION: Ensure the code is a complete, runnable program
9. EXACT OUTPUT: Make sure output matches the expected format exactly (no extra text, proper formatting)
${language === "java" ? "10. JAVA SPECIFIC: Change class name to 'Main' regardless of original name" : ""}

CORRECTION STRATEGY:
===================
1. Analyze the user's approach and identify what they were trying to accomplish
2. Preserve their core algorithm if it's correct, only fixing implementation issues
3. If the algorithm is fundamentally wrong, implement the correct approach while maintaining their variable naming style
4. Ensure all necessary imports and boilerplate code are included
5. Test the logic against the sample input/output
6. Verify edge cases are handled properly

OUTPUT INSTRUCTIONS:
===================
Provide ONLY the corrected code without any explanations, comments, or markdown formatting.
The code should be immediately executable and solve the problem correctly.
Do not include any text before or after the code.

CORRECTED CODE:
`.trim()
}

// Clean and extract code from LLM response
function cleanCodeResponse(response) {
  // Remove markdown code blocks
  let cleaned = response.replace(/```[\w]*\n?/g, "").replace(/```$/g, "")

  // Remove any leading/trailing whitespace
  cleaned = cleaned.trim()

  // Remove any explanatory text that might appear before or after code
  const lines = cleaned.split("\n")
  let codeStartIndex = 0
  let codeEndIndex = lines.length - 1

  // Find the actual start of code (skip explanatory text)
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim()
    if (
      line.includes("import ") ||
      line.includes("#include") ||
      line.includes("def ") ||
      line.includes("function ") ||
      line.includes("public class") ||
      line.includes("int main")
    ) {
      codeStartIndex = i
      break
    }
  }

  // Find the actual end of code
  for (let i = lines.length - 1; i >= 0; i--) {
    const line = lines[i].trim()
    if (line && !line.startsWith("//") && !line.startsWith("#") && !line.startsWith("/*")) {
      codeEndIndex = i
      break
    }
  }

  return lines.slice(codeStartIndex, codeEndIndex + 1).join("\n")
}

// Health check endpoint
app.get("/health", (req, res) => {
  res.status(200).json({
    status: "ok",
    timestamp: new Date().toISOString(),
    supportedLanguages: SUPPORTED_LANGUAGES,
    cacheDir: CACHE_DIR,
  })
})

// Streaming endpoint for code correction
app.post("/correct-stream", async (req, res) => {
  const startTime = Date.now()

  try {
    const { code, language, index } = req.body

    if (!code || code.trim().length === 0) {
      return res.status(400).json({ error: "No code provided" })
    }

    if (!language) {
      return res.status(400).json({ error: "No language provided" })
    }

    const validatedLanguage = validateLanguage(language)
    const questions = loadQuestions()

    console.log(`=== Code Correction Request ===`)
    console.log(`Language: ${validatedLanguage}`)
    console.log(`Problem Index: ${index !== undefined ? index : "Not provided"}`)
    console.log(`Code length: ${code.length} characters`)
    console.log(`Request timestamp: ${new Date().toISOString()}`)

    // Get problem details
    let question = null
    if (index !== undefined && questions[index]) {
      question = questions[index]
      console.log(`Problem: ${question.title} (${question.difficulty})`)
    } else {
      console.log("No problem context available - using generic correction")
      // Create a generic question object for cases without context
      question = {
        title: "Code Correction",
        difficulty: "Unknown",
        question: "Fix the provided code to work correctly",
        input_format: "Standard input",
        output_format: "Standard output",
        constraints: "None specified",
        sample_input: "Sample input",
        sample_output: "Expected output",
      }
    }

    // Generate cache key
    const cacheKey = crypto.createHash("sha256").update(`${code}-${validatedLanguage}-${index}-v2`).digest("hex")

    // Check cache
    const cachedCorrection = getCachedCorrection(cacheKey)
    if (cachedCorrection) {
      console.log(`Cache hit for correction request`)

      // Set SSE headers
      res.setHeader("Content-Type", "text/event-stream")
      res.setHeader("Cache-Control", "no-cache")
      res.setHeader("Connection", "keep-alive")

      // Send cached response
      res.write(`event: metadata\ndata: ${JSON.stringify({ fromCache: true, language: validatedLanguage })}\n\n`)
      res.write(`event: data\ndata: ${JSON.stringify({ correction: cachedCorrection.correction })}\n\n`)
      res.write(`event: complete\ndata: ${JSON.stringify({ processingTime: Date.now() - startTime })}\n\n`)

      return res.end()
    }

    // Set SSE headers
    res.setHeader("Content-Type", "text/event-stream")
    res.setHeader("Cache-Control", "no-cache")
    res.setHeader("Connection", "keep-alive")

    // Send metadata
    res.write(`event: metadata\ndata: ${JSON.stringify({ fromCache: false, language: validatedLanguage })}\n\n`)

    console.log(`Using Ollama API: ${OLLAMA_API}`)
    console.log(`Using Model: ${OLLAMA_MODEL}`)

    // Build comprehensive prompt
    const prompt = buildCorrectionPrompt(code, validatedLanguage, question)
    console.log(`Generated correction prompt (${prompt.length} characters)`)

    // Make request to Ollama
    const timeout = LANGUAGE_CONFIG[validatedLanguage]?.timeout || 120000
    const response = await axios.post(
      OLLAMA_API,
      {
        model: OLLAMA_MODEL,
        prompt: prompt,
        stream: true,
        options: {
          temperature: 0.1, // Lower temperature for more consistent corrections
          top_p: 0.9,
          num_predict: -1, // No limit on response length
        },
      },
      {
        headers: { "Content-Type": "application/json" },
        responseType: "stream",
        timeout: timeout,
      },
    )

    let fullResponse = ""
    let jsonBuffer = ""

    // Process streaming response
    response.data.on("data", (chunk) => {
      const chunkStr = chunk.toString()
      jsonBuffer += chunkStr

      try {
        const lines = jsonBuffer.split("\n")

        for (let i = 0; i < lines.length - 1; i++) {
          if (lines[i].trim()) {
            const parsedChunk = JSON.parse(lines[i])
            if (parsedChunk.response) {
              fullResponse += parsedChunk.response

              // Send chunk to client
              res.write(`event: data\ndata: ${JSON.stringify({ correction: parsedChunk.response })}\n\n`)

              // Log progress (without truncation)
              process.stdout.write(parsedChunk.response)
            }
          }
        }

        jsonBuffer = lines[lines.length - 1]
      } catch (e) {
        console.log("Continuing to accumulate streaming data...")
      }
    })

    response.data.on("end", () => {
      // Process final buffer
      try {
        if (jsonBuffer.trim()) {
          const parsedChunk = JSON.parse(jsonBuffer)
          if (parsedChunk.response) {
            fullResponse += parsedChunk.response
            res.write(`event: data\ndata: ${JSON.stringify({ correction: parsedChunk.response })}\n\n`)
          }
        }
      } catch (e) {
        console.log("Final chunk processing complete")
      }

      console.log(`\nCorrection complete. Response length: ${fullResponse.length} characters`)

      // Clean and cache the response
      const cleanedCode = cleanCodeResponse(fullResponse)
      setCachedCorrection(cacheKey, cleanedCode)

      const processingTime = Date.now() - startTime
      console.log(`Total processing time: ${processingTime}ms`)

      // Send completion event
      res.write(`event: complete\ndata: ${JSON.stringify({ processingTime })}\n\n`)
      res.end()
    })

    response.data.on("error", (err) => {
      console.error("Stream error:", err.message)
      res.write(`event: error\ndata: ${JSON.stringify({ error: err.message })}\n\n`)
      res.end()
    })
  } catch (error) {
    console.error("Correction error:", error.message)
    res.write(`event: error\ndata: ${JSON.stringify({ error: error.message })}\n\n`)
    res.end()
  }
})

// Cache management endpoints
app.delete("/clear-cache", (req, res) => {
  try {
    const files = fs.readdirSync(CACHE_DIR)
    let deletedCount = 0

    for (const file of files) {
      if (file.endsWith(".json")) {
        fs.unlinkSync(path.join(CACHE_DIR, file))
        deletedCount++
      }
    }

    res.status(200).json({
      message: `Cache cleared successfully. Deleted ${deletedCount} files.`,
      deletedCount,
    })
  } catch (error) {
    console.error("Error clearing cache:", error.message)
    res.status(500).json({ error: `Failed to clear cache: ${error.message}` })
  }
})

app.get("/cache-stats", (req, res) => {
  try {
    const files = fs.readdirSync(CACHE_DIR)
    const cacheFiles = files.filter((f) => f.endsWith(".json"))

    let totalSize = 0
    let oldestFile = null
    let newestFile = null

    for (const file of cacheFiles) {
      const filePath = path.join(CACHE_DIR, file)
      const stats = fs.statSync(filePath)
      totalSize += stats.size

      if (!oldestFile || stats.mtime < oldestFile.mtime) {
        oldestFile = { name: file, mtime: stats.mtime }
      }
      if (!newestFile || stats.mtime > newestFile.mtime) {
        newestFile = { name: file, mtime: stats.mtime }
      }
    }

    res.status(200).json({
      totalFiles: cacheFiles.length,
      totalSizeBytes: totalSize,
      totalSizeMB: (totalSize / (1024 * 1024)).toFixed(2),
      oldestFile: oldestFile?.name,
      newestFile: newestFile?.name,
      cacheDir: CACHE_DIR,
    })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

// Start server
app.listen(PORT, () => {
  ensureDirectoriesExist()

  console.log(`
=======================================
   Code Correction Server Started
=======================================
Port: ${PORT}
Health Check: http://localhost:${PORT}/health
Correction Endpoint: http://localhost:${PORT}/correct-stream
Cache Stats: http://localhost:${PORT}/cache-stats
Clear Cache: DELETE http://localhost:${PORT}/clear-cache

Configuration:
- Ollama API: ${OLLAMA_API}
- Ollama Model: ${OLLAMA_MODEL}
- Supported Languages: ${SUPPORTED_LANGUAGES.join(", ")}
- Cache Directory: ${CACHE_DIR}
- Cache Expiry: ${CACHE_EXPIRY / (60 * 60 * 1000)} hours

Performance Optimizations:
- No prompt length limitations
- Enhanced caching with expiry
- Language-specific timeouts
- Comprehensive I/O templates
- Optimized streaming responses
=======================================
  `)
})
