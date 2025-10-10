import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function POST(request: NextRequest) {
  try {
    // Get authenticated user using server-side Supabase client (same as middleware)
    const cookieStore = await cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return cookieStore.get(name)?.value
          },
        },
      }
    )

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { 
      sessionId, 
      resumeAnalysis, 
      interviewResponses, 
      hrEvaluation, 
      behavioralMetrics 
    } = body

    // Debug: Log the received data
    console.log('📊 HR Reports API - Received data:', {
      sessionId: !!sessionId,
      resumeAnalysis: !!resumeAnalysis,
      interviewResponses: interviewResponses ? interviewResponses.length : 0,
      hrEvaluation: !!hrEvaluation,
      behavioralMetrics: !!behavioralMetrics
    })

    if (hrEvaluation) {
      console.log('✅ HR Evaluation data received:', {
        overallScore: hrEvaluation.overallScore,
        hasStrengths: !!hrEvaluation.strengths,
        hasQuestionEvaluations: !!hrEvaluation.questionEvaluations,
        evaluationType: typeof hrEvaluation,
        evaluationKeys: Object.keys(hrEvaluation)
      })
    } else {
      console.log('⚠️ No HR evaluation data received')
      console.log('🔍 Raw body hrEvaluation field:', body.hrEvaluation)
    }

    // Validate required fields
    if (!sessionId) {
      return NextResponse.json({ error: 'Session ID is required' }, { status: 400 })
    }

    // Insert HR report into database
    const { data: reportData, error: insertError } = await supabase
      .from('hr_interview_reports')
      .insert({
        user_id: user.id,
        session_id: sessionId,
        resume_analysis: resumeAnalysis || null,
        interview_responses: interviewResponses || null,
        hr_evaluation: hrEvaluation || null,
        behavioral_metrics: behavioralMetrics || null
      })
      .select()
      .single()

    if (insertError) {
      console.error('Error inserting HR report:', insertError)
      return NextResponse.json({ error: 'Failed to save HR report' }, { status: 500 })
    }

    // Increment user's HR interview count
    // First get current count
    const { data: userData, error: fetchUserError } = await supabase
      .from('users')
      .select('hr_interview_count')
      .eq('id', user.id)
      .single()

    if (!fetchUserError && userData) {
      const { error: updateError } = await supabase
        .from('users')
        .update({ 
          hr_interview_count: (userData.hr_interview_count || 0) + 1
        })
        .eq('id', user.id)

      if (updateError) {
        console.error('Error updating HR interview count:', updateError)
        // Don't fail the request if count update fails
      }
    }

    return NextResponse.json({ 
      success: true, 
      reportId: reportData.id,
      message: 'HR report saved successfully' 
    })

  } catch (error) {
    console.error('HR Reports API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  try {
    // Get authenticated user using server-side Supabase client (same as middleware)
    const cookieStore = await cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return cookieStore.get(name)?.value
          },
        },
      }
    )

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Fetch user's HR reports
    const { data: reports, error: fetchError } = await supabase
      .from('hr_interview_reports')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })

    if (fetchError) {
      console.error('Error fetching HR reports:', fetchError)
      return NextResponse.json({ error: 'Failed to fetch HR reports' }, { status: 500 })
    }

    return NextResponse.json({ reports })

  } catch (error) {
    console.error('HR Reports GET API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
