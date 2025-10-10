import { NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { sessionId, techStack, responses, resumeText, isPro } = body;

    // Get authenticated user using server-side Supabase client (same as middleware)
    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return cookieStore.get(name)?.value;
          },
        },
      }
    );

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      console.error('❌ Authentication error:', authError);
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const userId = user.id;
    console.log('✅ Authenticated user:', userId);

    console.log('📥 Received API request:', {
      sessionId,
      techStack,
      responseCount: responses?.length,
      isPro,
      hasResumeText: !!resumeText
    });
    
    // Log the first response to see the structure
    if (responses && responses.length > 0) {
      console.log('🔍 First response structure:', responses[0]);
    }

    if (!sessionId || !techStack || !responses || !Array.isArray(responses)) {
      console.error('❌ Missing required fields:', { sessionId, techStack, responses });
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Prepare rows for insertion
    const rows = responses.map((resp: any) => ({
      session_id: sessionId,
      tech_stack: techStack,
      question_id: resp.questionId,
      question_text: resp.questionText,
      question_type: resp.questionType,
      user_answer: resp.answer, // <-- Fix: use resp.answer
      time_spent: resp.timeSpent || 0,
      is_pro_user: isPro || false,
      resume_text: resumeText || null,
      user_id: userId, // Now always set to authenticated user
      created_at: new Date().toISOString(),
    }));

    // Insert all responses
    console.log('💾 Inserting responses into database:', rows.length, 'rows');
    const { error: insertError } = await supabase.from('user_responses').insert(rows);
    if (insertError) {
      console.error('❌ Database insertion error:', insertError);
      return NextResponse.json({ error: insertError.message }, { status: 500 });
    }
    console.log('✅ Successfully inserted responses into database');

    // INSTANT MCQ EVALUATION FOR FREE USERS
    if (!isPro) {
      console.log('🎯 Processing instant MCQ evaluation for free user');
      
      try {
        // Get MCQ responses only
        const mcqResponses = responses.filter((resp: any) => resp.questionType === 'mcq');
        console.log(`📊 Found ${mcqResponses.length} MCQ responses for evaluation`);
        
        if (mcqResponses.length > 0) {
          // Get correct answers from technical_questions table
          const questionIds = mcqResponses.map((resp: any) => resp.questionId);
          const { data: questionsData, error: questionsError } = await supabase
            .from('technical_questions')
            .select('id, correct_answer, question_text, option_a, option_b, option_c, option_d')
            .in('id', questionIds);
          
          if (questionsError) {
            console.error('❌ Error fetching questions:', questionsError);
          } else {
            console.log(`✅ Fetched ${questionsData?.length || 0} questions from database`);
            
            // Calculate MCQ scores
            let correctAnswers = 0;
            let totalMcqQuestions = mcqResponses.length;
            const mcqAnalysis = [];
            
            for (const response of mcqResponses) {
              const question = questionsData?.find((q: any) => q.id === response.questionId);
              if (question) {
                const userAnswer = String(response.answer).trim().toUpperCase();
                const correctAnswer = String(question.correct_answer).trim().toUpperCase();
                
                // User answers are now letters (A, B, C, D) from frontend
                // No need to convert from numbers to letters anymore
                let normalizedUserAnswer = userAnswer;
                
                // Handle different answer formats
                const isCorrect = normalizedUserAnswer === correctAnswer || 
                                 normalizedUserAnswer === correctAnswer.replace('OPTION_', '') ||
                                 (normalizedUserAnswer.startsWith('OPTION_') && normalizedUserAnswer === `OPTION_${correctAnswer}`) ||
                                 (correctAnswer.startsWith('OPTION_') && `OPTION_${normalizedUserAnswer}` === correctAnswer);
                
                if (isCorrect) {
                  correctAnswers++;
                }
                
                mcqAnalysis.push({
                  questionId: response.questionId,
                  questionText: response.questionText,
                  userAnswer: response.answer,
                  normalizedUserAnswer: normalizedUserAnswer,
                  correctAnswer: question.correct_answer,
                  isCorrect,
                  options: [question.option_a, question.option_b, question.option_c, question.option_d].filter(Boolean)
                });
              }
            }
            
            const mcqScore = totalMcqQuestions > 0 ? Math.round((correctAnswers / totalMcqQuestions) * 100) : 0;
            console.log(`📈 MCQ Score: ${correctAnswers}/${totalMcqQuestions} = ${mcqScore}%`);
            
            // Generate final report for free users
            const finalReport = {
              session_id: sessionId,
              tech_stack: techStack,
              mcq_marks: correctAnswers,
              user_id: userId, // Add user_id to final report
              long_short_evaluation: {
                overallScore: mcqScore,
                mcqScore: mcqScore,
                totalQuestions: totalMcqQuestions,
                correctAnswers: correctAnswers,
                mcqAnalysis: mcqAnalysis,
                strengths: correctAnswers > 0 ? [`Correctly answered ${correctAnswers} out of ${totalMcqQuestions} questions`] : ['Completed the interview'],
                weaknesses: correctAnswers < totalMcqQuestions ? ['Some questions need review', 'Consider studying the topics covered'] : [],
                recommendations: ['Review incorrect answers', 'Practice similar questions'],
                nextSteps: ['Continue learning', 'Take more practice tests'],
                passFailStatus: mcqScore >= 60 ? 'PASS' : 'FAIL'
              }
            };
            
            // Insert final report
            const { error: reportError } = await supabase.from('final_reports').insert(finalReport);
            if (reportError) {
              console.error('❌ Error inserting final report:', reportError);
            } else {
              console.log('✅ Final report created for free user');
            }
            
            // Return evaluation result for immediate display
            return NextResponse.json({ 
              success: true, 
              inserted: rows.length,
              evaluation: finalReport.long_short_evaluation,
              isInstantEvaluation: true
            });
          }
        }
      } catch (evaluationError) {
        console.error('❌ MCQ evaluation error:', evaluationError);
        // Continue with normal flow even if evaluation fails
      }
    }

    // If pro user, enqueue for AI evaluation
    if (isPro) {
      console.log('🤖 Enqueuing pro user responses for AI evaluation');
      
      // Include ALL questions (MCQ + short + long) for complete evaluation
      // MCQ options are now included in the response data
      const allQuestionsForEvaluation = responses.map((resp: any) => {
        const baseQuestion = {
          questionId: resp.questionId,
          questionText: resp.questionText,
          questionType: resp.questionType,
          userAnswer: resp.answer,
          timeSpent: resp.timeSpent || 0
        };

        // For MCQ questions, include the options that are now in the response
        if (resp.questionType === 'mcq') {
          return {
            ...baseQuestion,
            options: resp.options || [],
            option_a: resp.option_a,
            option_b: resp.option_b,
            option_c: resp.option_c,
            option_d: resp.option_d
          };
        }

        return baseQuestion;
      });

      console.log(`📊 Enqueuing ${allQuestionsForEvaluation.length} questions (${allQuestionsForEvaluation.filter(q => q.questionType === 'mcq').length} MCQ, ${allQuestionsForEvaluation.filter(q => q.questionType !== 'mcq').length} short/long)`);

      const { error: queueError } = await supabase.from('mistral_queue').insert({
        session_id: sessionId,
        tech_stack: techStack,
        long_short_answers: allQuestionsForEvaluation, // Now contains ALL questions with MCQ options
        status: 'pending',
        enqueued_at: new Date().toISOString(),
        user_id: userId, // Add user_id to queue
      });
      if (queueError) {
        console.error('❌ Queue error:', queueError);
        return NextResponse.json({ error: queueError.message }, { status: 500 });
      }
      console.log('✅ Pro user responses enqueued for AI evaluation');
    }

    return NextResponse.json({ success: true, inserted: rows.length });
  } catch (error: any) {
    console.error('Submission error:', error); // This will print the full error object
    return NextResponse.json({ error: error, message: error.message }, { status: 500 });
  }
} 