import { NextResponse } from 'next/server';

// Define a type for the question structure
interface HRQuestion {
  Qid: string; // Changed from 'id' to 'Qid'
  question_type: string;
  question_text: string;
  difficulty_level: string;
  topic: string;
  focus_area: string;
}

// Define a type for user responses to initial questions
interface UserResponse {
  Qid: string;
  userResponse: string;
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const resumeAnalysis = body.resumeAnalysis || {};
    const numQuestions: number = body.numQuestions || 2; // New: number of questions to generate
  // Normalize model selector and accept "chatgpt" as an alias for "openai"
  let selectedAIModel = (body.selectedAIModel || 'mistral').toString().toLowerCase(); // Default to mistral
  if (selectedAIModel === 'chatgpt') selectedAIModel = 'openai';
  if (selectedAIModel === 'gemini') selectedAIModel = 'google'; // Normalize 'gemini' to 'google'
    const userResponses: UserResponse[] = body.userResponses || []; // New: to capture answers to fixed questions
    const encodedApiKey = body.apiKey || '';

    if (!resumeAnalysis || Object.keys(resumeAnalysis).length === 0) {
      return NextResponse.json({ error: 'Resume analysis data is required' }, { status: 400 });
    }

    console.log(`[Backend POST] Received encodedApiKey: ${encodedApiKey ? 'Provided' : 'Not Provided'}`);
    let apiKey = '';
    if (encodedApiKey) {
      try {
        // Treat API key as plain text directly, as it's sent from the frontend.
        // Remove conditional base64 decoding to prevent corruption of plain text keys.
        apiKey = encodedApiKey.trim();
        // Sanitize API key to remove any non-ASCII characters that might cause ByteString conversion errors
        apiKey = apiKey.replace(/[^\x00-\x7F]/g, '');
        // Do NOT mutate the key (no aggressive sanitization) — that can break credentials.
        console.log(`[Backend POST] Processed API Key (masked): ${apiKey ? apiKey.substring(0, 6) + '...' : 'Not Provided'}`);
      } catch (decodeError) {
        console.error(`[Backend POST] Error decoding API key: ${decodeError}`);
        apiKey = ''; // Ensure apiKey is empty if decoding fails
      }
    } else {
      console.log(`[Backend POST] No encodedApiKey received.`);
    }

    console.log(`🔍 Starting HR questions generation using model: ${selectedAIModel}...`);

    let questions: HRQuestion[] = [];

    switch (selectedAIModel) {
      case 'mistral':
        questions = await generateMistralHRQuestions(resumeAnalysis, userResponses, apiKey, numQuestions);
        break;
      case 'openai':
        questions = await generateOpenAIHRQuestions(resumeAnalysis, userResponses, apiKey, numQuestions);
        break;
      case 'google': // Handle 'google' model explicitly
        questions = await generateGoogleHRQuestions(resumeAnalysis, userResponses, apiKey, numQuestions);
        break;
      case 'grok':
        questions = await generateGrokHRQuestions(resumeAnalysis, userResponses, apiKey, numQuestions);
        break;
      default:
        console.warn(`Unknown AI model selected: ${selectedAIModel}. Falling back to Mistral.`);
        questions = await generateMistralHRQuestions(resumeAnalysis, userResponses, apiKey, numQuestions);
        break;
    }

    console.log(`✅ Generated ${questions.length} AI HR questions`);

    return NextResponse.json(questions);

  } catch (error: any) {
    console.error('Error generating HR questions:', error);
    // Fallback to default HR questions if generation fails
    const defaultQuestions = generateFallbackHRQuestions();
    return NextResponse.json(defaultQuestions);
  }
}

// Helper function to randomly select N items from an array
function getRandomSubset<T>(array: T[], n: number): T[] {
  const shuffled = array.sort(() => 0.5 - Math.random());
  return shuffled.slice(0, n);
}

async function generateMistralHRQuestions(resumeAnalysis: any, userResponses: UserResponse[], apiKey?: string, numQuestions: number = 2): Promise<HRQuestion[]> {
  try {
    const mistralApiKey = apiKey || process.env.MISTRAL_API_KEY;
    const mistralUrl = 'https://api.mistral.ai/v1/chat/completions';
    
    if (!mistralApiKey || mistralApiKey.trim() === '') {
      console.error('Mistral API key not found or is empty after processing.');
      throw new Error('Mistral API key not configured or invalid.');
    }
    
    console.log(`[Mistral API] Using API Key (masked, length ${mistralApiKey.length}): ${mistralApiKey.substring(0, 6) + '...'}`);
    
    const randomSeed = Math.floor(Math.random() * 1000);
    const currentTime = new Date().toISOString();

    const userResponsesText = userResponses.length > 0 
      ? `\n\nCANDIDATE'S ANSWERS TO PREVIOUS QUESTIONS:\n${userResponses.map((res, index) => `Q${index + 1} Answer: ${res.userResponse}`).join('\n')}`
      : '';
    
    // Extract technical skills from resumeAnalysis and randomly select a few
    const technicalSkills = resumeAnalysis.skills
      ?.filter((s: any) => s.category === 'Technical Skills')
      .map((s: any) => s.name) || [];
    
    const randomTechnicalSkills = getRandomSubset(technicalSkills, Math.min(technicalSkills.length, 3)); // Select up to 3 random skills
    const technicalSkillsPrompt = randomTechnicalSkills.length > 0
      ? `\nRANDOM TECHNICAL FOCUS FOR THIS QUESTION: ${randomTechnicalSkills.join(', ')}`
      : '';

    const prompt = `You are a senior HR interviewer with expertise in creating professional, industry-standard HR interview questions. Based on the comprehensive resume analysis below, and considering the candidate's previous answers (if provided), generate 2 HIGH-QUALITY HR questions that match professional interview standards.

COMPREHENSIVE RESUME ANALYSIS:
${JSON.stringify(resumeAnalysis, null, 2)}
${userResponsesText}


QUESTION FOCUS AREAS (based on analysis):
- Leadership Questions: ${resumeAnalysis.recommendedQuestionFocus?.leadership_questions ? 'Include' : 'Skip'}
- Behavioral Questions: ${resumeAnalysis.recommendedQuestionFocus?.behavioral_questions ? 'Include' : 'Skip'}
- Situational Questions: ${resumeAnalysis.recommendedQuestionFocus?.situational_questions ? 'Include' : 'Skip'}
- Teamwork Questions: ${resumeAnalysis.recommendedQuestionFocus?.teamwork_questions ? 'Include' : 'Skip'}
- Communication Questions: ${resumeAnalysis.recommendedQuestionFocus?.communication_questions ? 'Include' : 'Skip'}
- Problem Solving Questions: ${resumeAnalysis.recommendedQuestionFocus?.problem_solving_questions ? 'Include' : 'Skip'}
- Results Questions: ${resumeAnalysis.recommendedQuestionFocus?.results_questions ? 'Include' : 'Skip'}
- Culture Fit Questions: ${resumeAnalysis.recommendedQuestionFocus?.culture_fit_questions ? 'Include' : 'Skip'}
- Career Goals Questions: ${resumeAnalysis.recommendedQuestionFocus?.career_goals_questions ? 'Include' : 'Skip'}

CANDIDATE PROFILE:
- Experience Level: ${resumeAnalysis.experienceLevel || 'mid-level'}
- Primary Strengths: ${resumeAnalysis.hrProfile?.primaryStrengths?.join(', ') || 'Technical Skills'}
- Industry Experience: ${resumeAnalysis.industryExperience?.join(', ') || 'General'}
- Leadership Experience: ${resumeAnalysis.hrProfile?.hasLeadershipExperience ? 'Yes' : 'No'}
- Communication Skills: ${resumeAnalysis.hrProfile?.hasStrongCommunication ? 'Strong' : 'Standard'}

GENERATE QUESTIONS FOLLOWING THESE PROFESSIONAL STANDARDS:

QUESTION QUALITY REQUIREMENTS:
- Questions must be specific, practical, and test real-world soft skills
- Focus on behavioral and situational scenarios relevant to the candidate's background
- Include questions that test leadership, communication, teamwork, and problem-solving
- Questions should be suitable for a ${resumeAnalysis.experienceLevel || 'mid-level'} professional role
- Mix of behavioral, situational, and culture-fit questions
- CRITICAL: If user responses are provided, ensure the new questions build upon or delve deeper into those responses, or explore related areas.
- CRITICAL: For technical questions, focus on the skills listed in "RANDOM TECHNICAL FOCUS FOR THIS QUESTION" below. Frame technical questions in a behavioral or situational context where possible.

QUESTION DISTRIBUTION (2 questions total):
- 1 Behavioral question (past experiences)
- 1 Situational/Technical/Career Goals/Culture Fit question (choose based on resume/responses)

${technicalSkillsPrompt}

Behavioral Example:
"Tell me about a time when you had to work with a difficult team member. How did you handle the situation and what was the outcome?"

Situational Example:
"If you were given a project with an unrealistic deadline, how would you approach it and communicate with stakeholders?"

Leadership Example:
"Describe a situation where you had to lead a team through a major change or challenge. What was your approach and what did you learn?"

Teamwork Example:
"Tell me about a time when you had to collaborate with people from different departments or backgrounds. How did you ensure effective communication?"

Career Goals Example:
"Where do you see yourself in 3-5 years, and how does this role align with your career objectives?"

TECHNICAL FOCUS AREAS (based on resume):
- Leadership and management experience
- Communication and presentation skills
- Team collaboration and cross-functional work
- Problem-solving and decision-making
- Project management and delivery
- Client/stakeholder management
- Innovation and creativity
- Results and impact measurement

SESSION UNIQUENESS: ${randomSeed}-${currentTime}

FORMAT REQUIREMENTS - Return valid JSON array:
[
  {
    "Qid": "Q3",
    "question_type": "behavioral",
    "question_text": "Professional HR question text here related to candidate's background",
    "difficulty_level": "medium",
    "topic": "Leadership/Teamwork/Communication/etc",
    "focus_area": "Specific focus area based on resume analysis"
  },
  {
    "Qid": "Q4",
    "question_type": "situational",
    "question_text": "Professional situational question testing soft skills",
    "difficulty_level": "medium",
    "topic": "Problem Solving/Decision Making",
    "focus_area": "Specific focus area based on resume analysis"
  }
]

CRITICAL: Questions must be professional-grade, relevant to the candidate's background, and test real-world soft skills they would encounter in their role. Focus on behavioral scenarios and situational challenges.`;

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
            content: 'You are a senior HR interviewer and question designer with 15+ years of experience. You create professional-grade HR interview questions that match industry standards. CRITICAL: You must respond with ONLY a valid JSON array, no markdown formatting, no code blocks, no additional text or explanations. Start your response directly with [ and end with ]. Do not use ```json``` or any other formatting.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.9, // Increased for more variation
        max_tokens: 2000, // Sufficient for 8 questions
        top_p: 0.95,
        random_seed: randomSeed // Add randomness
      })
    });

    if (!response.ok) {
      if (response.status === 429) {
        throw new Error('Mistral API rate limit exceeded. Please check your plan and usage.');
      }
      throw new Error(`Mistral API error: ${response.status}`);
    }

    const result = await response.json();
    const questionsText = result.choices[0]?.message?.content;
    
    // Clean the response to extract JSON
    const cleanedJson = extractJsonFromResponse(questionsText);
    
    // Parse the JSON response
    const questions = JSON.parse(cleanedJson);
    
    // Validate and return questions
    if (Array.isArray(questions) && questions.length > 0) {
      // Validate each question has required fields
      const validatedQuestions = questions.filter((q: HRQuestion) => 
        q.Qid && // Changed from 'id' to 'Qid'
        q.question_type && 
        q.question_text && 
        q.difficulty_level && 
        q.topic
      );
      
      if (validatedQuestions.length > 0) {
        const finalQuestions = validatedQuestions.slice(0, 2);
        console.log(`Successfully generated and sliced ${finalQuestions.length} valid HR questions`);
        return finalQuestions;
      } else {
        throw new Error('AI did not return any valid questions');
      }
    } else {
      throw new Error('AI did not return a valid questions array');
    }
    
  } catch (error: any) {
    console.error('Error generating HR questions with AI:', error);
    console.error('Error details:', {
      name: error.name,
      message: error.message,
      stack: error.stack
    });
    
    // If it's a JSON parsing error, log the raw response for debugging
    if (error.name === 'SyntaxError' && error.message.includes('JSON')) {
      console.error('Raw AI response that failed to parse:', error.responseText || 'No response text available');
    }
    
    // Fallback to default questions if AI fails
    console.log('Falling back to default HR questions due to AI error');
    return generateFallbackHRQuestions();
  }
}

function generateFallbackHRQuestions(): HRQuestion[] { // Added return type
  console.log('🔄 Generating fallback HR questions...');
  
  const fallbackQuestions: HRQuestion[] = [
    {
      Qid: "Q3",
      question_type: "behavioral",
      question_text: "Tell me about a time you faced a significant challenge in a project. How did you overcome it?",
      difficulty_level: "medium",
      topic: "Problem Solving",
      focus_area: "Resilience"
    },
    {
      Qid: "Q4",
      question_type: "situational",
      question_text: "Describe a situation where you had to adapt to a sudden change in project requirements or team dynamics. How did you handle it?",
      difficulty_level: "medium",
      topic: "Adaptability",
      focus_area: "Change Management"
    }
  ];
  
  console.log(`✅ Generated ${fallbackQuestions.length} fallback HR questions`);
  return fallbackQuestions;
}

function extractJsonFromResponse(responseText: string): string { // Added type for responseText
  if (!responseText) {
    throw new Error('Empty response from AI');
  }

  // Trim and remove common wrappers or markdown fences
  let cleanedText = responseText.trim();
  cleanedText = cleanedText.replace(/^\uFEFF/, ''); // remove BOM
  cleanedText = cleanedText.replace(/```(?:json)?\s*/g, '').replace(/```\s*$/g, '');

  // First, try direct JSON parse (fast path)
  try {
    const direct = JSON.parse(cleanedText);
    const arr = Array.isArray(direct) ? direct : [direct];
    const normalized = arr.map(normalizeQuestionObject);
    return JSON.stringify(normalized);
  } catch {
    // continue to extraction attempts
  }

  // Try to extract a JSON array substring by locating first '[' and matching last ']'
  const firstArrayStart = cleanedText.indexOf('[');
  const lastArrayEnd = cleanedText.lastIndexOf(']');
  if (firstArrayStart !== -1 && lastArrayEnd !== -1 && firstArrayStart < lastArrayEnd) {
    const candidate = cleanedText.substring(firstArrayStart, lastArrayEnd + 1);
    try {
      const parsed = JSON.parse(candidate);
      const arr = Array.isArray(parsed) ? parsed : [parsed];
      const normalized = arr.map(normalizeQuestionObject);
      return JSON.stringify(normalized);
    } catch (e) {
      // fallthrough to object extraction
    }
  }

  // If no array found, try to find the last JSON object and wrap in array
  const firstObj = cleanedText.indexOf('{');
  const lastObj = cleanedText.lastIndexOf('}');
  if (firstObj !== -1 && lastObj !== -1 && firstObj < lastObj) {
    const candidate = cleanedText.substring(firstObj, lastObj + 1);
    try {
      const parsed = JSON.parse(candidate);
      const arr = Array.isArray(parsed) ? parsed : [parsed];
      const normalized = arr.map(normalizeQuestionObject);
      return JSON.stringify(normalized);
    } catch (e) {
      // give up
    }
  }

  // If we reach here, provide helpful debug info
  throw new Error(`No valid JSON found in AI response. Raw response start: ${cleanedText.substring(0, 300)}`);
}

// helper to normalize different field names to the expected HRQuestion shape
function normalizeQuestionObject(raw: any) {
  const obj: any = { ...raw };

  // Common variants -> normalize to Qid
  if (!obj.Qid) {
    if (obj.qId) obj.Qid = obj.qId;
    else if (obj.id) obj.Qid = obj.id;
    else if (obj.question_id) obj.Qid = obj.question_id;
  }

  // Normalize question text field
  if (!obj.question_text) {
    if (obj.question) obj.question_text = obj.question;
    else if (obj.text) obj.question_text = obj.text;
    else if (obj.content) obj.question_text = obj.content;
  }

  // Ensure minimal fields exist with safe defaults
  obj.Qid = obj.Qid ?? 'Q?';
  obj.question_type = obj.question_type ?? (obj.type ?? 'behavioral');
  obj.question_text = obj.question_text ?? 'No question_text provided by AI';
  obj.difficulty_level = obj.difficulty_level ?? (obj.difficulty ?? 'medium');
  obj.topic = obj.topic ?? (obj.category ?? 'General');
  obj.focus_area = obj.focus_area ?? (obj.focusArea ?? 'General');

  return obj;
}

async function generateOpenAIHRQuestions(resumeAnalysis: any, userResponses: UserResponse[], apiKey: string, numQuestions: number = 2): Promise<HRQuestion[]> {
  try {
    let finalOpenAIApiKey = apiKey; // Prioritize API key from request body
    const openaiUrl = 'https://api.openai.com/v1/chat/completions';

    if (!finalOpenAIApiKey) {
      finalOpenAIApiKey = process.env.OPENAI_API_KEY || ''; // Fallback to environment variable
    }

    // Temporarily bypass OpenAI API call if dummy key is provided for testing
    if (finalOpenAIApiKey === 'sk-dummykey') {
      console.log('[Backend OpenAI] Dummy API key detected. Returning test questions.');
      return [
        {
          Qid: "Q3",
          question_type: "test_behavioral",
          question_text: "This is a TEST behavioral question for dummy key. Describe a time you used a dummy key.",
          difficulty_level: "easy",
          topic: "Testing",
          focus_area: "Debugging"
        },
        {
          Qid: "Q4",
          question_type: "test_situational",
          question_text: "This is a TEST situational question for dummy key. How would you handle a missing API key?",
          difficulty_level: "easy",
          topic: "Testing",
          focus_area: "Error Handling"
        }
      ];
    }

    // Original API key check (now only for actual API calls)
    if (!finalOpenAIApiKey) {
      console.error('OpenAI API key not found');
      throw new Error('OpenAI API key not configured');
    }

    console.log(`OpenAI API Key (from request): ${apiKey ? 'Provided' : 'Not Provided'}`);
    console.log(`OpenAI API Key (from .env): ${process.env.OPENAI_API_KEY ? 'Provided' : 'Not Provided'}`);
    console.log(`Final OpenAI API Key used (truncated): ${finalOpenAIApiKey ? finalOpenAIApiKey.substring(0, 5) + '...' : 'Not Configured'}`);

    // Add randomness to prompt to avoid same questions
    const randomSeed = Math.floor(Math.random() * 1000);
    const currentTime = new Date().toISOString();

    // Incorporate user responses into the prompt for dynamic questions
    const userResponsesText = userResponses.length > 0
      ? `\n\nCANDIDATE'S ANSWERS TO PREVIOUS QUESTIONS:\n${userResponses.map((res, index) => `Q${index + 1} Answer: ${res.userResponse}`).join('\n')}`
      : '';

    // Extract technical skills from resumeAnalysis and randomly select a few
    const technicalSkills = resumeAnalysis.skills
      ?.filter((s: any) => s.category === 'Technical Skills')
      .map((s: any) => s.name) || [];

    const randomTechnicalSkills = getRandomSubset(technicalSkills, Math.min(technicalSkills.length, 3)); // Select up to 3 random skills
    const technicalSkillsPrompt = randomTechnicalSkills.length > 0
      ? `\nRANDOM TECHNICAL FOCUS FOR THIS QUESTION: ${randomTechnicalSkills.join(', ')}`
      : '';

    const prompt = `You are a senior HR interviewer with expertise in creating professional, industry-standard HR interview questions. Based on the comprehensive resume analysis below, and considering the candidate's previous answers (if provided), generate 2 HIGH-QUALITY HR questions that match professional interview standards.

COMPREHENSIVE RESUME ANALYSIS:
${JSON.stringify(resumeAnalysis, null, 2)}
${userResponsesText}

QUESTION FOCUS AREAS (based on analysis):
- Leadership Questions: ${resumeAnalysis.recommendedQuestionFocus?.leadership_questions ? 'Include' : 'Skip'}
- Behavioral Questions: ${resumeAnalysis.recommendedQuestionFocus?.behavioral_questions ? 'Include' : 'Skip'}
- Situational Questions: ${resumeAnalysis.recommendedQuestionFocus?.situational_questions ? 'Include' : 'Skip'}
- Teamwork Questions: ${resumeAnalysis.recommendedQuestionFocus?.teamwork_questions ? 'Include' : 'Skip'}
- Communication Questions: ${resumeAnalysis.recommendedQuestionFocus?.communication_questions ? 'Include' : 'Skip'}
- Problem Solving Questions: ${resumeAnalysis.recommendedQuestionFocus?.problem_solving_questions ? 'Include' : 'Skip'}
- Results Questions: ${resumeAnalysis.recommendedQuestionFocus?.results_questions ? 'Include' : 'Skip'}
- Culture Fit Questions: ${resumeAnalysis.recommendedQuestionFocus?.culture_fit_questions ? 'Include' : 'Skip'}
- Career Goals Questions: ${resumeAnalysis.recommendedQuestionFocus?.career_goals_questions ? 'Include' : 'Skip'}

CANDIDATE PROFILE:
- Experience Level: ${resumeAnalysis.experienceLevel || 'mid-level'}
- Primary Strengths: ${resumeAnalysis.hrProfile?.primaryStrengths?.join(', ') || 'Technical Skills'}
- Industry Experience: ${resumeAnalysis.industryExperience?.join(', ') || 'General'}
- Leadership Experience: ${resumeAnalysis.hrProfile?.hasLeadershipExperience ? 'Yes' : 'No'}
- Communication Skills: ${resumeAnalysis.hrProfile?.hasStrongCommunication ? 'Strong' : 'Standard'}

GENERATE QUESTIONS FOLLOWING THESE PROFESSIONAL STANDARDS:

QUESTION QUALITY REQUIREMENTS:
- Questions must be specific, practical, and test real-world soft skills
- Focus on behavioral and situational scenarios relevant to the candidate's background
- Include questions that test leadership, communication, teamwork, and problem-solving
- Questions should be suitable for a ${resumeAnalysis.experienceLevel || 'mid-level'} professional role
- Mix of behavioral, situational, and culture-fit questions
- CRITICAL: If user responses are provided, ensure the new questions build upon or delve deeper into those responses, or explore related areas.
- CRITICAL: For technical questions, focus on the skills listed in "RANDOM TECHNICAL FOCUS FOR THIS QUESTION" below. Frame technical questions in a behavioral or situational context where possible.

QUESTION DISTRIBUTION (2 questions total):
- 1 Behavioral question (past experiences)
- 1 Situational/Technical/Career Goals/Culture Fit question (choose based on resume/responses)

${technicalSkillsPrompt}

EXAMPLES OF PROFESSIONAL HR QUESTION QUALITY:

Behavioral Example:
"Tell me about a time when you had to work with a difficult team member. How did you handle the situation and what was the outcome?"

Situational Example:
"If you were given a project with an unrealistic deadline, how would you approach it and communicate with stakeholders?"

Leadership Example:
"Describe a situation where you had to lead a team through a major change or challenge. What was your approach and what did you learn?"

Teamwork Example:
"Tell me about a time when you had to collaborate with people from different departments or backgrounds. How did you ensure effective communication?"

Career Goals Example:
"Where do you see yourself in 3-5 years, and how does this role align with your career objectives?"

TECHNICAL FOCUS AREAS (based on resume):
- Leadership and management experience
- Communication and presentation skills
- Team collaboration and cross-functional work
- Problem-solving and decision-making
- Project management and delivery
- Client/stakeholder management
- Innovation and creativity
- Results and impact measurement

SESSION UNIQUENESS: ${randomSeed}-${currentTime}

FORMAT REQUIREMENTS - Return valid JSON array:
[
  {
    "Qid": "Q3",
    "question_type": "behavioral",
    "question_text": "Professional HR question text here related to candidate's background",
    "difficulty_level": "medium",
    "topic": "Leadership/Teamwork/Communication/etc",
    "focus_area": "Specific focus area based on resume analysis"
  },
  {
    "Qid": "Q4",
    "question_type": "situational",
    "question_text": "Professional situational question testing soft skills",
    "difficulty_level": "medium",
    "topic": "Problem Solving/Decision Making",
    "focus_area": "Specific focus area based on resume analysis"
  }
]

CRITICAL: Questions must be professional-grade, relevant to the candidate's background, and test real-world soft skills they would encounter in their role. Focus on behavioral scenarios and situational challenges.`;

    const response = await fetch(openaiUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${finalOpenAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        messages: [
          { role: 'system', content: 'You are a senior HR interviewer...' },
          { role: 'user', content: prompt }
        ],
        temperature: 0.9,
        max_tokens: 2000,
        top_p: 0.95,
      })
    });

    if (!response.ok) {
      if (response.status === 429) {
        throw new Error('OpenAI API rate limit exceeded. Please check your plan and usage.');
      }
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const result = await response.json();
    const questionsText = result.choices[0]?.message?.content;
    const cleanedJson = extractJsonFromResponse(questionsText);
    const questions = JSON.parse(cleanedJson);

    if (Array.isArray(questions) && questions.length > 0) {
      const validatedQuestions = questions.filter((q: HRQuestion) => 
        q.Qid &&
        q.question_type && 
        q.question_text && 
        q.difficulty_level && 
        q.topic
      );
      
      if (validatedQuestions.length > 0) {
        const finalQuestions = validatedQuestions.slice(0, 2);
        console.log(`Successfully generated and sliced ${finalQuestions.length} valid HR questions`);
        return finalQuestions;
      } else {
        throw new Error('AI did not return any valid questions');
      }
    } else {
      throw new Error('OpenAI did not return a valid questions array');
    }
  } catch (error: any) {
    console.error('Error generating HR questions with OpenAI:', error);
    return generateFallbackHRQuestions();
  }
}

async function generateGoogleHRQuestions(resumeAnalysis: any, userResponses: UserResponse[], apiKey: string, numQuestions: number = 2): Promise<HRQuestion[]> {
  try {
    const googleApiKey = apiKey || process.env.GOOGLE_API_KEY;
    const googleUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent`; // Updated model to gemini-2.5-flash

    if (!googleApiKey) {
      console.error('Google AI API key not found');
      throw new Error('Google AI API key not configured');
    }

    console.log(`[Backend Google] Google API URL: ${googleUrl}`);
    console.log(`[Backend Google] Google API Key (masked): ${googleApiKey ? googleApiKey.substring(0, 6) + '...' : 'Not Configured'}`);

    // Add randomness to prompt to avoid same questions
    const randomSeed = Math.floor(Math.random() * 1000);
    const currentTime = new Date().toISOString();

    // Incorporate user responses into the prompt for dynamic questions
    const userResponsesText = userResponses.length > 0
      ? `\n\nCANDIDATE'S ANSWERS TO PREVIOUS QUESTIONS:\n${userResponses.map((res, index) => `Q${index + 1} Answer: ${res.userResponse}`).join('\n')}`
      : '';

    // Extract technical skills from resumeAnalysis and randomly select a few
    const technicalSkills = resumeAnalysis.skills
      ?.filter((s: any) => s.category === 'Technical Skills')
      .map((s: any) => s.name) || [];

    const randomTechnicalSkills = getRandomSubset(technicalSkills, Math.min(technicalSkills.length, 3)); // Select up to 3 random skills
    const technicalSkillsPrompt = randomTechnicalSkills.length > 0
      ? `\nRANDOM TECHNICAL FOCUS FOR THIS QUESTION: ${randomTechnicalSkills.join(', ')}`
      : '';

    const prompt = `You are a senior HR interviewer with expertise in creating professional, industry-standard HR interview questions. Based on the comprehensive resume analysis below, and considering the candidate's previous answers (if provided), generate 2 HIGH-QUALITY HR questions that match professional interview standards.

COMPREHENSIVE RESUME ANALYSIS:
${JSON.stringify(resumeAnalysis, null, 2)}
${userResponsesText}

QUESTION FOCUS AREAS (based on analysis):
- Leadership Questions: ${resumeAnalysis.recommendedQuestionFocus?.leadership_questions ? 'Include' : 'Skip'}
- Behavioral Questions: ${resumeAnalysis.recommendedQuestionFocus?.behavioral_questions ? 'Include' : 'Skip'}
- Situational Questions: ${resumeAnalysis.recommendedQuestionFocus?.situational_questions ? 'Include' : 'Skip'}
- Teamwork Questions: ${resumeAnalysis.recommendedQuestionFocus?.teamwork_questions ? 'Include' : 'Skip'}
- Communication Questions: ${resumeAnalysis.recommendedQuestionFocus?.communication_questions ? 'Include' : 'Skip'}
- Problem Solving Questions: ${resumeAnalysis.recommendedQuestionFocus?.problem_solving_questions ? 'Include' : 'Skip'}
- Results Questions: ${resumeAnalysis.recommendedQuestionFocus?.results_questions ? 'Include' : 'Skip'}
- Culture Fit Questions: ${resumeAnalysis.recommendedQuestionFocus?.culture_fit_questions ? 'Include' : 'Skip'}
- Career Goals Questions: ${resumeAnalysis.recommendedQuestionFocus?.career_goals_questions ? 'Include' : 'Skip'}

CANDIDATE PROFILE:
- Experience Level: ${resumeAnalysis.experienceLevel || 'mid-level'}
- Primary Strengths: ${resumeAnalysis.hrProfile?.primaryStrengths?.join(', ') || 'Technical Skills'}
- Industry Experience: ${resumeAnalysis.industryExperience?.join(', ') || 'General'}
- Leadership Experience: ${resumeAnalysis.hrProfile?.hasLeadershipExperience ? 'Yes' : 'No'}
- Communication Skills: ${resumeAnalysis.hrProfile?.hasStrongCommunication ? 'Strong' : 'Standard'}

GENERATE QUESTIONS FOLLOWING THESE PROFESSIONAL STANDARDS:

QUESTION QUALITY REQUIREMENTS:
- Questions must be specific, practical, and test real-world soft skills
- Focus on behavioral and situational scenarios relevant to the candidate's background
- Include questions that test leadership, communication, teamwork, and problem-solving
- Questions should be suitable for a ${resumeAnalysis.experienceLevel || 'mid-level'} professional role
- Mix of behavioral, situational, and culture-fit questions
- CRITICAL: If user responses are provided, ensure the new questions build upon or delve deeper into those responses, or explore related areas.
- CRITICAL: For technical questions, focus on the skills listed in "RANDOM TECHNICAL FOCUS FOR THIS QUESTION" below. Frame technical questions in a behavioral or situational context where possible.

QUESTION DISTRIBUTION (2 questions total):
- 1 Behavioral question (past experiences)
- 1 Situational/Technical/Career Goals/Culture Fit question (choose based on resume/responses)

${technicalSkillsPrompt}

EXAMPLES OF PROFESSIONAL HR QUESTION QUALITY:

Behavioral Example:
"Tell me about a time when you had to work with a difficult team member. How did you handle the situation and what was the outcome?"

Situational Example:
"If you were given a project with an unrealistic deadline, how would you approach it and communicate with stakeholders?"

Leadership Example:
"Describe a situation where you had to lead a team through a major change or challenge. What was your approach and what did you learn?"

Teamwork Example:
"Tell me about a time when you had to collaborate with people from different departments or backgrounds. How did you ensure effective communication?"

Career Goals Example:
"Where do you see yourself in 3-5 years, and how does this role align with your career objectives?"

TECHNICAL FOCUS AREAS (based on resume):
- Leadership and management experience
- Communication and presentation skills
- Team collaboration and cross-functional work
- Problem-solving and decision-making
- Project management and delivery
- Client/stakeholder management
- Innovation and creativity
- Results and impact measurement

SESSION UNIQUENESS: ${randomSeed}-${currentTime}

FORMAT REQUIREMENTS - Return valid JSON array:
[
  {
    "Qid": "Q3",
    "question_type": "behavioral",
    "question_text": "Professional HR question text here related to candidate's background",
    "difficulty_level": "medium",
    "topic": "Leadership/Teamwork/Communication/etc",
    "focus_area": "Specific focus area based on resume analysis"
  },
  {
    "Qid": "Q4",
    "question_type": "situational",
    "question_text": "Professional situational question testing soft skills",
    "difficulty_level": "medium",
    "topic": "Problem Solving/Decision Making",
    "focus_area": "Specific focus area based on resume analysis"
  }
]

CRITICAL: Questions must be professional-grade, relevant to the candidate's background, and test real-world soft skills they would encounter in their role. Focus on behavioral scenarios and situational challenges.`;

    const response = await fetch(googleUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': googleApiKey, // Added API key to header
      },
      body: JSON.stringify({
        contents: [{
          parts: [{ text: prompt }]
        }]
      })
    });

    if (!response.ok) {
      throw new Error(`Google AI API error: ${response.status}`);
    }

    const result = await response.json();
    const questionsText = result.candidates[0]?.content.parts[0].text;
    const cleanedJson = extractJsonFromResponse(questionsText);
    const questions = JSON.parse(cleanedJson);

    if (Array.isArray(questions) && questions.length > 0) {
      const validatedQuestions = questions.filter((q: HRQuestion) => 
        q.Qid &&
        q.question_type && 
        q.question_text && 
        q.difficulty_level && 
        q.topic
      );
      
      if (validatedQuestions.length > 0) {
        const finalQuestions = validatedQuestions.slice(0, 2);
        console.log(`Successfully generated and sliced ${finalQuestions.length} valid HR questions`);
        return finalQuestions;
      } else {
        throw new Error('AI did not return any valid questions');
      }
    } else {
      throw new Error('Google AI did not return a valid questions array');
    }
  } catch (error: any) {
    console.error('Error generating HR questions with Google AI:', error);
    return generateFallbackHRQuestions();
  }
}

async function generateGrokHRQuestions(resumeAnalysis: any, userResponses: UserResponse[], apiKey: string, numQuestions: number = 2): Promise<HRQuestion[]> {
  try {
    const grokApiKey = apiKey || process.env.GROK_API_KEY;
    // NOTE: The Grok API endpoint is not publicly available yet. This is a placeholder.
    const grokUrl = 'https://api.x.ai/v1/chat/completions';

    if (!grokApiKey || grokApiKey.trim() === '') {
      console.error('Grok API key not found or is empty after processing.');
      throw new Error('Grok API key not configured or invalid.');
    }

    console.log(`[Grok API] Using API Key (masked, length ${grokApiKey.length}): ${grokApiKey.substring(0, 6) + '...'}`);
    // console.log(`[Grok API] Full Authorization header being sent: Bearer ${grokApiKey}`);

    // Add randomness to prompt to avoid same questions
    const randomSeed = Math.floor(Math.random() * 1000);
    const currentTime = new Date().toISOString();

    // Incorporate user responses into the prompt for dynamic questions
    const userResponsesText = userResponses.length > 0
      ? `\n\nCANDIDATE'S ANSWERS TO PREVIOUS QUESTIONS:\n${userResponses.map((res, index) => `Q${index + 1} Answer: ${res.userResponse}`).join('\n')}`
      : '';

    // Extract technical skills from resumeAnalysis and randomly select a few
    const technicalSkills = resumeAnalysis.skills
      ?.filter((s: any) => s.category === 'Technical Skills')
      .map((s: any) => s.name) || [];

    const randomTechnicalSkills = getRandomSubset(technicalSkills, Math.min(technicalSkills.length, 3)); // Select up to 3 random skills
    const technicalSkillsPrompt = randomTechnicalSkills.length > 0
      ? `\nRANDOM TECHNICAL FOCUS FOR THIS QUESTION: ${randomTechnicalSkills.join(', ')}`
      : '';

    const prompt = `You are a senior HR interviewer with expertise in creating professional, industry-standard HR interview questions. Based on the comprehensive resume analysis below, and considering the candidate's previous answers (if provided), generate 2 HIGH-QUALITY HR questions that match professional interview standards.

COMPREHENSIVE RESUME ANALYSIS:
${JSON.stringify(resumeAnalysis, null, 2)}
${userResponsesText}

QUESTION FOCUS AREAS (based on analysis):
- Leadership Questions: ${resumeAnalysis.recommendedQuestionFocus?.leadership_questions ? 'Include' : 'Skip'}
- Behavioral Questions: ${resumeAnalysis.recommendedQuestionFocus?.behavioral_questions ? 'Include' : 'Skip'}
- Situational Questions: ${resumeAnalysis.recommendedQuestionFocus?.situational_questions ? 'Include' : 'Skip'}
- Teamwork Questions: ${resumeAnalysis.recommendedQuestionFocus?.teamwork_questions ? 'Include' : 'Skip'}
- Communication Questions: ${resumeAnalysis.recommendedQuestionFocus?.communication_questions ? 'Include' : 'Skip'}
- Problem Solving Questions: ${resumeAnalysis.recommendedQuestionFocus?.problem_solving_questions ? 'Include' : 'Skip'}
- Results Questions: ${resumeAnalysis.recommendedQuestionFocus?.results_questions ? 'Include' : 'Skip'}
- Culture Fit Questions: ${resumeAnalysis.recommendedQuestionFocus?.culture_fit_questions ? 'Include' : 'Skip'}
- Career Goals Questions: ${resumeAnalysis.recommendedQuestionFocus?.career_goals_questions ? 'Include' : 'Skip'}

CANDIDATE PROFILE:
- Experience Level: ${resumeAnalysis.experienceLevel || 'mid-level'}
- Primary Strengths: ${resumeAnalysis.hrProfile?.primaryStrengths?.join(', ') || 'Technical Skills'}
- Industry Experience: ${resumeAnalysis.industryExperience?.join(', ') || 'General'}
- Leadership Experience: ${resumeAnalysis.hrProfile?.hasLeadershipExperience ? 'Yes' : 'No'}
- Communication Skills: ${resumeAnalysis.hrProfile?.hasStrongCommunication ? 'Strong' : 'Standard'}

GENERATE QUESTIONS FOLLOWING THESE PROFESSIONAL STANDARDS:

QUESTION QUALITY REQUIREMENTS:
- Questions must be specific, practical, and test real-world soft skills
- Focus on behavioral and situational scenarios relevant to the candidate's background
- Include questions that test leadership, communication, teamwork, and problem-solving
- Questions should be suitable for a ${resumeAnalysis.experienceLevel || 'mid-level'} professional role
- Mix of behavioral, situational, and culture-fit questions
- CRITICAL: If user responses are provided, ensure the new questions build upon or delve deeper into those responses, or explore related areas.
- CRITICAL: For technical questions, focus on the skills listed in "RANDOM TECHNICAL FOCUS FOR THIS QUESTION" below. Frame technical questions in a behavioral or situational context where possible.

QUESTION DISTRIBUTION (2 questions total):
- 1 Behavioral question (past experiences)
- 1 Situational/Technical/Career Goals/Culture Fit question (choose based on resume/responses)

${technicalSkillsPrompt}

EXAMPLES OF PROFESSIONAL HR QUESTION QUALITY:

Behavioral Example:
"Tell me about a time when you had to work with a difficult team member. How did you handle the situation and what was the outcome?"

Situational Example:
"If you were given a project with an unrealistic deadline, how would you approach it and communicate with stakeholders?"

Leadership Example:
"Describe a situation where you had to lead a team through a major change or challenge. What was your approach and what did you learn?"

Teamwork Example:
"Tell me about a time when you had to collaborate with people from different departments or backgrounds. How did you ensure effective communication?"

Career Goals Example:
"Where do you see yourself in 3-5 years, and how does this role align with your career objectives?"

TECHNICAL FOCUS AREAS (based on resume):
- Leadership and management experience
- Communication and presentation skills
- Team collaboration and cross-functional work
- Problem-solving and decision-making
- Project management and delivery
- Client/stakeholder management
- Innovation and creativity
- Results and impact measurement

SESSION UNIQUENESS: ${randomSeed}-${currentTime}

FORMAT REQUIREMENTS - Return valid JSON array:
[
  {
    "Qid": "Q3",
    "question_type": "behavioral",
    "question_text": "Professional HR question text here related to candidate's background",
    "difficulty_level": "medium",
    "topic": "Leadership/Teamwork/Communication/etc",
    "focus_area": "Specific focus area based on resume analysis"
  },
  {
    "Qid": "Q4",
    "question_type": "situational",
    "question_text": "Professional situational question testing soft skills",
    "difficulty_level": "medium",
    "topic": "Problem Solving/Decision Making",
    "focus_area": "Specific focus area based on resume analysis"
  }
]

CRITICAL: Questions must be professional-grade, relevant to the candidate's background, and test real-world soft skills they would encounter in their role. Focus on behavioral scenarios and situational challenges.`;

    const response = await fetch(grokUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${grokApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'grok-1',
        messages: [
          { role: 'system', content: 'You are a senior HR interviewer...' },
          { role: 'user', content: prompt }
        ],
        temperature: 0.9,
        max_tokens: 2000,
        top_p: 0.95,
      })
    });

    if (!response.ok) {
      if (response.status === 429) {
        throw new Error('Grok API rate limit exceeded. Please check your plan and usage.');
      }
      throw new Error(`Grok API error: ${response.status}`);
    }

    const result = await response.json();
    const questionsText = result.choices[0]?.message?.content;
    const cleanedJson = extractJsonFromResponse(questionsText);
    const questions = JSON.parse(cleanedJson);

    if (Array.isArray(questions) && questions.length > 0) {
      const validatedQuestions = questions.filter((q: HRQuestion) => 
        q.Qid &&
        q.question_type && 
        q.question_text && 
        q.difficulty_level && 
        q.topic
      );
      
      if (validatedQuestions.length > 0) {
        const finalQuestions = validatedQuestions.slice(0, 2);
        console.log(`Successfully generated and sliced ${finalQuestions.length} valid HR questions`);
        return finalQuestions;
      } else {
        throw new Error('AI did not return any valid questions');
      }
    } else {
      throw new Error('Grok AI did not return a valid questions array');
    }
  } catch (error: any) {
    console.error('Error generating HR questions with Grok AI:', error);
    return generateFallbackHRQuestions();
  }
}
