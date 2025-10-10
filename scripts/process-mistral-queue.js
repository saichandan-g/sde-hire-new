// scripts/process-mistral-queue.js
require('dotenv').config();
console.log('SUPABASE_URL:', process.env.NEXT_PUBLIC_SUPABASE_URL);
console.log('SUPABASE_ANON_KEY:', process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? 'Loaded' : 'Missing');
console.log('MISTRAL_API_KEY:', process.env.MISTRAL_API_KEY ? 'Loaded' : 'Missing');
const { createClient } = require('@supabase/supabase-js');
// Remove node-fetch import - Node.js v20+ has built-in fetch

// Use the main app's Supabase configuration
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL, 
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);
const MISTRAL_API_KEY = process.env.MISTRAL_API_KEY;
const MISTRAL_URL = 'https://api.mistral.ai/v1/chat/completions';

console.log('🚀 Starting Mistral Queue Processor...');
console.log('📊 Supabase URL:', process.env.NEXT_PUBLIC_SUPABASE_URL ? 'Configured' : 'Missing');
console.log('🔑 Mistral API Key:', MISTRAL_API_KEY ? 'Configured' : 'Missing');

async function callMistralAPI(allQuestions, techStack) {
  console.log(`🤖 Calling Mistral API for ${techStack} with ${allQuestions.length} questions`);
  
  // Separate questions by type
  const mcqQuestions = allQuestions.filter(q => q.questionType === 'mcq');
  const longShortQuestions = allQuestions.filter(q => q.questionType !== 'mcq');
  
  console.log(`📊 Question breakdown: ${mcqQuestions.length} MCQ, ${longShortQuestions.length} short/long`);
  
  // First, evaluate MCQs using AI to generate correct answers
  let mcqEvaluation = null;
  if (mcqQuestions.length > 0) {
    console.log('🔍 Evaluating MCQ questions...');
    mcqEvaluation = await evaluateMCQs(mcqQuestions, techStack);
  }
  
  // Then evaluate long/short questions
  let longShortEvaluation = null;
  if (longShortQuestions.length > 0) {
    console.log('📝 Evaluating long/short questions...');
    longShortEvaluation = await evaluateLongShortQuestions(longShortQuestions, techStack);
  }
  
  // Combine evaluations
  const combinedEvaluation = combineEvaluations(mcqEvaluation, longShortEvaluation, allQuestions.length);
  
  return combinedEvaluation;
}

async function evaluateMCQs(mcqQuestions, techStack) {
  const mcqPrompt = `You are a technical interviewer evaluating MCQ responses. For each question, determine the correct answer and evaluate the candidate's response.

MCQ QUESTIONS AND CANDIDATE RESPONSES:
${mcqQuestions.map((q, idx) => `
Question ${idx + 1}: ${q.questionText}
Options:
A) ${q.option_a || 'Not provided'}
B) ${q.option_b || 'Not provided'}
C) ${q.option_c || 'Not provided'}
D) ${q.option_d || 'Not provided'}
Candidate's Answer: ${q.userAnswer}
Time Spent: ${q.timeSpent} seconds
`).join('\n')}

EVALUATION REQUIREMENTS:
1. For each MCQ, determine the correct answer based on technical knowledge
2. Evaluate if the candidate's answer is correct
3. Provide brief explanation for incorrect answers
4. Calculate overall MCQ score

RESPOND IN THIS JSON FORMAT:
{
  "mcqScore": <0-100 percentage>,
  "correctAnswers": <number of correct answers>,
  "totalMCQs": ${mcqQuestions.length},
  "mcqAnalysis": [
    {
      "questionNumber": 1,
      "questionText": "question text",
      "userAnswer": "user's answer",
      "correctAnswer": "correct answer (A, B, C, or D)",
      "isCorrect": true/false,
      "explanation": "brief explanation if wrong"
    }
  ]
}`;

  try {
    const response = await fetch(MISTRAL_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${MISTRAL_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'mistral-large-latest',
        messages: [
          {
            role: 'system',
            content: 'You are a technical interviewer evaluating MCQ responses. Provide accurate technical assessments and always respond with valid JSON.'
          },
          {
            role: 'user',
            content: mcqPrompt
          }
        ],
        temperature: 0.1,
        max_tokens: 2000
      })
    });
    
    if (!response.ok) {
      throw new Error(`Mistral API error: ${response.status}`);
    }
    
    const result = await response.json();
    const evaluationText = result.choices[0]?.message?.content;
    
    // Parse JSON response
    const cleanedJson = evaluationText.replace(/^```json\s*/i, '').replace(/\s*```\s*$/i, '').trim();
    const jsonStart = cleanedJson.indexOf('{');
    const jsonEnd = cleanedJson.lastIndexOf('}') + 1;
    const jsonContent = cleanedJson.substring(jsonStart, jsonEnd);
    
    return JSON.parse(jsonContent);
  } catch (error) {
    console.error('❌ MCQ evaluation failed:', error);
    // Return fallback MCQ evaluation
    return {
      mcqScore: 0,
      correctAnswers: 0,
      totalMCQs: mcqQuestions.length,
      mcqAnalysis: mcqQuestions.map((q, idx) => ({
        questionNumber: idx + 1,
        questionText: q.questionText,
        userAnswer: q.userAnswer,
        correctAnswer: "Evaluation failed",
        isCorrect: false,
        explanation: "Could not evaluate this question"
      }))
    };
  }
}

async function evaluateLongShortQuestions(longShortQuestions, techStack) {
  const questionsWithAnswers = longShortQuestions.map((resp, idx) => 
    `Question ${idx + 1} (${resp.questionType}):\nQ: ${resp.questionText}\nCandidate's Answer: "${resp.userAnswer}"\nTime Spent: ${resp.timeSpent} seconds`
  ).join('\n\n');
  
  const evaluationPrompt = `You are a strict technical interviewer evaluating a ${techStack} developer's interview performance. 

CANDIDATE RESPONSES:
${questionsWithAnswers}

EVALUATION REQUIREMENTS:
1. Be STRICT and REALISTIC in your assessment
2. Evaluate technical accuracy, depth, and completeness of answers
3. Consider if answers demonstrate practical knowledge vs just theoretical understanding
4. Score based on actual answer quality, not just length or effort

PROVIDE EVALUATION IN THIS EXACT JSON FORMAT:
{
  "longShortScore": <0-100 score for short/long answers>,
  "totalLongShort": ${longShortQuestions.length},
  "strengths": [<array of specific strengths demonstrated>],
  "weaknesses": [<array of specific areas needing improvement>],
  "technicalAccuracy": <1-10 rating>,
  "practicalKnowledge": <1-10 rating>,
  "communicationClarity": <1-10 rating>,
  "detailedFeedback": {
    "questionAnalysis": [<array of analysis for each question>],
    "recommendations": [<specific learning recommendations>],
    "nextSteps": [<career/skill development suggestions>]
  }
}

BE STRICT: Empty, wrong, or nonsensical answers should receive low scores. Only reward actual technical knowledge.`;

  try {
    const response = await fetch(MISTRAL_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${MISTRAL_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'mistral-large-latest',
        messages: [
          {
            role: 'system',
            content: 'You are a strict technical interviewer and evaluator. You provide honest, realistic assessments based on actual technical knowledge demonstrated. Always respond with valid JSON only.'
          },
          {
            role: 'user',
            content: evaluationPrompt
          }
        ],
        temperature: 0.1,
        max_tokens: 3000
      })
    });
    
    if (!response.ok) {
      throw new Error(`Mistral API error: ${response.status} - ${response.statusText}`);
    }
    
    const result = await response.json();
    const evaluationText = result.choices[0]?.message?.content;
    
    // Parse JSON response
      const cleanedJson = evaluationText.replace(/^```json\s*/i, '').replace(/\s*```\s*$/i, '').trim();
      const jsonStart = cleanedJson.indexOf('{');
      const jsonEnd = cleanedJson.lastIndexOf('}') + 1;
      const jsonContent = cleanedJson.substring(jsonStart, jsonEnd);
      
    return JSON.parse(jsonContent);
  } catch (error) {
    console.error('❌ Long/short evaluation failed:', error);
      // Return fallback evaluation
      return {
        longShortScore: 50,
      totalLongShort: longShortQuestions.length,
        strengths: ["Attempted all questions"],
        weaknesses: ["Answers need more technical detail"],
        technicalAccuracy: 3,
        practicalKnowledge: 3,
        communicationClarity: 4,
        detailedFeedback: {
        questionAnalysis: longShortQuestions.map((_, idx) => `Question ${idx + 1}: Answer provided but needs technical review`),
          recommendations: ["Study fundamental concepts", "Practice technical explanations"],
          nextSteps: ["Review technology documentation", "Practice coding examples"]
      }
    };
  }
}

function combineEvaluations(mcqEvaluation, longShortEvaluation, totalQuestions) {
  const mcqScore = mcqEvaluation?.mcqScore || 0;
  const longShortScore = longShortEvaluation?.longShortScore || 0;
  const mcqWeight = mcqEvaluation ? (mcqEvaluation.totalMCQs / totalQuestions) : 0;
  const longShortWeight = longShortEvaluation ? (longShortEvaluation.totalLongShort / totalQuestions) : 0;
  
  const overallScore = Math.round((mcqScore * mcqWeight) + (longShortScore * longShortWeight));
  
  return {
    overallScore,
    mcqScore,
    longShortScore,
    totalQuestions,
    mcqEvaluation,
    longShortEvaluation,
    strengths: [
      ...(mcqEvaluation?.strengths || []),
      ...(longShortEvaluation?.strengths || [])
    ],
    weaknesses: [
      ...(mcqEvaluation?.weaknesses || []),
      ...(longShortEvaluation?.weaknesses || [])
    ],
    technicalAccuracy: longShortEvaluation?.technicalAccuracy || 5,
    practicalKnowledge: longShortEvaluation?.practicalKnowledge || 5,
    communicationClarity: longShortEvaluation?.communicationClarity || 5,
    detailedFeedback: {
      mcqAnalysis: mcqEvaluation?.mcqAnalysis || [],
      longShortAnalysis: longShortEvaluation?.detailedFeedback?.questionAnalysis || [],
      recommendations: longShortEvaluation?.detailedFeedback?.recommendations || [],
      nextSteps: longShortEvaluation?.detailedFeedback?.nextSteps || []
    },
    passFailStatus: overallScore >= 60 ? "PASS" : "FAIL"
  };
}

async function processQueue() {
  console.log('🔍 Fetching pending jobs from mistral_queue...');
  
  const { data: jobs, error } = await supabase
    .from('mistral_queue')
    .select('*')
    .eq('status', 'pending')
    .limit(5);
    
  if (error) {
    console.error('❌ Error fetching queue:', error);
    return;
  }
  
  if (!jobs || jobs.length === 0) {
    console.log('✅ No pending jobs found');
    return;
  }
  
  console.log(`📋 Found ${jobs.length} pending jobs`);
  
  for (const job of jobs) {
    console.log(`\n🔄 Processing job ${job.id} for session ${job.session_id}`);
    
    try {
      // Update status to processing
      await supabase.from('mistral_queue').update({ 
        status: 'processing', 
        updated_at: new Date().toISOString() 
      }).eq('id', job.id);
      
      console.log(`📝 Job ${job.id} status updated to 'processing'`);
      
      // Call Mistral API with all questions (MCQ + short + long)
      const evaluationText = await callMistralAPI(job.long_short_answers, job.tech_stack);
      
      // Parse and structure the evaluation
      const evaluationData = {
        evaluation: evaluationText,
        rawEvaluation: evaluationText,
        processed_at: new Date().toISOString(),
        model: 'mistral-large-latest'
      };
      
      console.log(`💾 Storing evaluation data for session ${job.session_id}`);
      
      // Store in response_evaluations
      const { error: evalError } = await supabase.from('response_evaluations').insert({
        session_id: job.session_id,
        tech_stack: job.tech_stack,
        evaluation_data: evaluationData,
        user_id: job.user_id, // Add user_id from queue job
        created_at: new Date().toISOString()
      });
      
      if (evalError) {
        console.error('❌ Error storing evaluation:', evalError);
        throw evalError;
      }
      
      console.log(`✅ Evaluation stored in response_evaluations`);
      
      // Generate comprehensive final report
      const finalReport = {
        session_id: job.session_id,
        tech_stack: job.tech_stack,
        mcq_marks: evaluationText.mcqEvaluation?.correctAnswers || 0,
        user_id: job.user_id, // Add user_id from queue job
        long_short_evaluation: {
          overallScore: evaluationText.overallScore,
          mcqScore: evaluationText.mcqScore,
          longShortScore: evaluationText.longShortScore,
          totalQuestions: evaluationText.totalQuestions,
          mcqAnalysis: evaluationText.mcqEvaluation?.mcqAnalysis || [],
          longShortAnalysis: evaluationText.detailedFeedback?.longShortAnalysis || [],
          strengths: evaluationText.strengths,
          weaknesses: evaluationText.weaknesses,
          recommendations: evaluationText.detailedFeedback?.recommendations || [],
          nextSteps: evaluationText.detailedFeedback?.nextSteps || [],
          technicalAccuracy: evaluationText.technicalAccuracy,
          practicalKnowledge: evaluationText.practicalKnowledge,
          communicationClarity: evaluationText.communicationClarity,
          passFailStatus: evaluationText.passFailStatus
        }
      };
      
      // Insert or update final_reports
      try {
        // First check if a report already exists for this session
        const { data: existingReport } = await supabase
          .from('final_reports')
          .select('id')
          .eq('session_id', job.session_id)
          .single();
        
        if (existingReport) {
          // Update existing report
          const { error: reportError } = await supabase
            .from('final_reports')
            .update(finalReport)
          .eq('session_id', job.session_id);
          
        if (reportError) {
            console.warn('⚠️ Could not update final_reports:', reportError.message);
          } else {
            console.log(`✅ Final report updated with MCQ marks: ${finalReport.mcq_marks}`);
          }
        } else {
          // Insert new report
          const { error: reportError } = await supabase
            .from('final_reports')
            .insert(finalReport);
            
          if (reportError) {
            console.warn('⚠️ Could not insert final_reports:', reportError.message);
          } else {
            console.log(`✅ Final report created with MCQ marks: ${finalReport.mcq_marks}`);
          }
        }
      } catch (reportUpdateError) {
        console.warn('⚠️ Final reports update skipped:', reportUpdateError.message);
      }
      
      // Mark as done
      await supabase.from('mistral_queue').update({ 
        status: 'done', 
        updated_at: new Date().toISOString() 
      }).eq('id', job.id);
      
      console.log(`✅ Job ${job.id} completed successfully`);
      
    } catch (err) {
      console.error(`❌ Error processing job ${job.id}:`, err.message);
      
      await supabase.from('mistral_queue').update({ 
        status: 'error', 
        updated_at: new Date().toISOString() 
      }).eq('id', job.id);
      
      console.error(`❌ Job ${job.id} marked as 'error'`);
    }
  }
}

// Main execution
processQueue().then(() => {
  console.log('\n🎉 Queue processing complete.');
  process.exit(0);
}).catch((error) => {
  console.error('\n💥 Queue processing failed:', error);
  process.exit(1);
}); 