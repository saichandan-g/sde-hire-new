import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { 
      interviewResponses, 
      resumeAnalysis, 
      sessionId 
    } = body

    // Validate required fields
    if (!interviewResponses || !Array.isArray(interviewResponses) || interviewResponses.length === 0) {
      return NextResponse.json({ error: 'Interview responses are required' }, { status: 400 })
    }

    if (!resumeAnalysis || Object.keys(resumeAnalysis).length === 0) {
      return NextResponse.json({ error: 'Resume analysis is required' }, { status: 400 })
    }

    console.log('🔍 Starting HR Q&A evaluation...')
    console.log(`📊 Evaluating ${interviewResponses.length} responses`)

    // Generate AI evaluation using Mistral API
    const evaluation = await generateHREvaluation(interviewResponses, resumeAnalysis)
    
    console.log('✅ HR Q&A evaluation completed')
    
    return NextResponse.json({
      success: true,
      evaluation,
      sessionId: sessionId || null
    })
    
  } catch (error) {
    console.error('Error in HR evaluation:', error)
    
    // Return fallback evaluation if AI fails
    const fallbackEvaluation = generateFallbackEvaluation((await request.json()).interviewResponses || [])
    
    return NextResponse.json({
      success: true,
      evaluation: fallbackEvaluation,
      fallback: true,
      error: error instanceof Error ? error.message : 'Unknown error'
    })
  }
}

async function generateHREvaluation(interviewResponses: any[], resumeAnalysis: any) {
  try {
    const mistralApiKey = process.env.MISTRAL_API_KEY
    const mistralUrl = 'https://api.mistral.ai/v1/chat/completions'
    
    if (!mistralApiKey) {
      console.error('Mistral API key not found')
      throw new Error('Mistral API key not configured')
    }

    // Prepare Q&A data for evaluation
    const qaData = interviewResponses.map((response, index) => ({
      questionNumber: index + 1,
      question: response.questionText || response.question || 'Question not available',
      questionType: response.questionType || 'unknown',
      questionTopic: response.questionTopic || 'general',
      candidateResponse: response.userResponse || response.transcription || 'No response provided',
      responseLength: response.responseLength || (response.userResponse?.length || 0),
      hasResponse: response.hasResponse !== false
    }))

    const prompt = `You are a senior HR interviewer with 15+ years of experience evaluating candidate responses. Based on the resume analysis and interview responses below, provide a comprehensive evaluation.

CANDIDATE RESUME ANALYSIS:
${JSON.stringify(resumeAnalysis, null, 2)}

INTERVIEW Q&A DATA:
${qaData.map(qa => `
Question ${qa.questionNumber} (${qa.questionType} - ${qa.questionTopic}):
"${qa.question}"

Candidate Response:
"${qa.candidateResponse}"

Response Length: ${qa.responseLength} characters
Has Response: ${qa.hasResponse}
`).join('\n---\n')}

EVALUATION CRITERIA:
1. Relevance: How well does the response address the question?
2. Depth: Does the response show thoughtful consideration and detail?
3. Communication: Is the response clear, structured, and professional?
4. Examples: Does the candidate provide specific examples and experiences?
5. Alignment: How well does the response align with their resume background?
6. Professionalism: Is the tone and language appropriate for a professional setting?

SCORING SCALE:
- Excellent (9-10): Outstanding response with specific examples, clear communication, and strong alignment
- Good (7-8): Solid response with good examples and clear communication
- Average (5-6): Adequate response but may lack depth or specific examples
- Below Average (3-4): Response addresses question but lacks depth or clarity
- Poor (1-2): Response doesn't adequately address the question or is unclear

FORMAT REQUIREMENTS - Return valid JSON object:
{
  "overallScore": 7.5,
  "overallFeedback": "Overall assessment of the candidate's performance",
  "strengths": ["Strength 1", "Strength 2", "Strength 3"],
  "areasForImprovement": ["Area 1", "Area 2", "Area 3"],
  "questionEvaluations": [
    {
      "questionNumber": 1,
      "questionType": "behavioral",
      "questionTopic": "leadership",
      "score": 8.0,
      "feedback": "Specific feedback for this response",
      "strengths": ["What they did well"],
      "improvements": ["What could be better"]
    }
  ],
  "recommendations": {
    "hireRecommendation": "Strong Hire/Hire/Consider/No Hire",
    "confidence": "High/Medium/Low",
    "nextSteps": "Specific recommendations for next steps"
  }
}

CRITICAL: You must respond with ONLY a valid JSON object, no markdown formatting, no code blocks, no additional text or explanations. Start your response directly with { and end with }.`

    const response = await fetch(mistralUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${mistralApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'mistral-small-latest',
        messages: [
          {
            role: 'system',
            content: 'You are a senior HR interviewer and evaluator with 15+ years of experience. You provide professional, fair, and constructive evaluations of candidate responses. CRITICAL: You must respond with ONLY a valid JSON object, no markdown formatting, no code blocks, no additional text or explanations. Start your response directly with { and end with }.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.7, // Balanced creativity and consistency
        max_tokens: 3000,
        top_p: 0.9
      })
    })

    if (!response.ok) {
      throw new Error(`Mistral API error: ${response.status}`)
    }

    const result = await response.json()
    const evaluationText = result.choices[0]?.message?.content
    
    console.log('AI Evaluation Response:', evaluationText)
    
    // Clean and parse the JSON response
    const cleanedJson = extractJsonFromResponse(evaluationText)
    const evaluation = JSON.parse(cleanedJson)
    
    // Validate the evaluation structure
    if (!evaluation.overallScore || !evaluation.overallFeedback) {
      throw new Error('Invalid evaluation structure from AI')
    }
    
    return evaluation
    
  } catch (error) {
    console.error('Error generating HR evaluation:', error)
    throw error
  }
}

function generateFallbackEvaluation(interviewResponses: any[]) {
  // Simple fallback evaluation based on response length and presence
  const totalResponses = interviewResponses.length
  const responsesWithContent = interviewResponses.filter(r => 
    (r.userResponse || r.transcription) && 
    (r.userResponse || r.transcription).trim().length > 10
  ).length
  
  const averageResponseLength = interviewResponses.reduce((sum, r) => {
    const response = r.userResponse || r.transcription || ''
    return sum + response.length
  }, 0) / totalResponses
  
  // Calculate basic score based on response quality
  let baseScore = 5.0
  if (responsesWithContent === totalResponses) baseScore += 2.0
  if (averageResponseLength > 100) baseScore += 1.5
  if (averageResponseLength > 200) baseScore += 1.0
  
  const overallScore = Math.min(10, Math.max(1, baseScore))
  
  return {
    overallScore: overallScore,
    overallFeedback: `Candidate provided ${responsesWithContent}/${totalResponses} substantial responses with an average length of ${Math.round(averageResponseLength)} characters. ${overallScore >= 7 ? 'Good engagement and communication.' : overallScore >= 5 ? 'Adequate responses with room for improvement.' : 'Responses need more depth and detail.'}`,
    strengths: [
      responsesWithContent === totalResponses ? 'Answered all questions' : 'Attempted to answer questions',
      averageResponseLength > 100 ? 'Provided detailed responses' : 'Engaged with questions'
    ],
    areasForImprovement: [
      averageResponseLength < 100 ? 'Provide more detailed responses' : 'Continue providing detailed responses',
      responsesWithContent < totalResponses ? 'Ensure all questions are answered' : 'Maintain consistent response quality'
    ],
    questionEvaluations: interviewResponses.map((response, index) => ({
      questionNumber: index + 1,
      questionType: response.questionType || 'unknown',
      questionTopic: response.questionTopic || 'general',
      score: response.userResponse || response.transcription ? 
        Math.min(10, Math.max(1, 5 + (response.userResponse || response.transcription).length / 50)) : 1,
      feedback: response.userResponse || response.transcription ? 
        'Response provided with adequate detail' : 'No response provided',
      strengths: response.userResponse || response.transcription ? ['Engaged with question'] : [],
      improvements: response.userResponse || response.transcription ? 
        ['Could provide more specific examples'] : ['Provide a response to the question']
    })),
    recommendations: {
      hireRecommendation: overallScore >= 7 ? 'Consider' : overallScore >= 5 ? 'Consider with reservations' : 'No Hire',
      confidence: 'Medium',
      nextSteps: 'Review responses and consider follow-up questions for areas needing clarification'
    },
    fallback: true
  }
}

function extractJsonFromResponse(text: string): string {
  if (!text) return '{}'
  
  // Remove any markdown formatting
  let cleaned = text.replace(/```json\n?/g, '').replace(/```\n?/g, '')
  
  // Find the first { and last }
  const firstBrace = cleaned.indexOf('{')
  const lastBrace = cleaned.lastIndexOf('}')
  
  if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
    cleaned = cleaned.substring(firstBrace, lastBrace + 1)
  }
  
  return cleaned
}
