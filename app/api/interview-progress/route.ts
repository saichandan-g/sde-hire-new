import { NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

// GET /api/interview-progress - Get user's interview progress
export async function GET(request: Request) {
  try {
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
    console.log('✅ Getting interview progress for user:', userId);

    // Get user's interview progress from progress_technicalinterview column
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('progress_technicalinterview')
      .eq('id', userId)
      .single();

    if (userError) {
      console.error('❌ Error fetching user progress:', userError);
      return NextResponse.json({ error: 'Failed to fetch progress' }, { status: 500 });
    }

    const interviewProgress = userData?.progress_technicalinterview || {};
    
    // Get recent interviews from final_reports for additional data
    const { data: recentInterviews, error: interviewsError } = await supabase
      .from('final_reports')
      .select('session_id, tech_stack, mcq_marks, created_at, long_short_evaluation')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(10);

    if (interviewsError) {
      console.error('❌ Error fetching recent interviews:', interviewsError);
    }

    // Calculate statistics
    const interviews = Object.values(interviewProgress as Record<string, any>);
    const totalInterviews = interviews.length;
    const averageScore = totalInterviews > 0 
      ? interviews.reduce((sum: number, interview: any) => sum + (interview.mcqMarks || 0), 0) / totalInterviews 
      : 0;
    const lastInterviewDate = totalInterviews > 0 
      ? interviews.sort((a: any, b: any) => new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime())[0].completedAt 
      : null;

    return NextResponse.json({
      success: true,
      progress: interviewProgress,
      statistics: {
        totalInterviews,
        averageScore: Math.round(averageScore),
        lastInterviewDate,
      },
      recentInterviews: recentInterviews || [],
    });

  } catch (error: any) {
    console.error('❌ Interview progress API error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}

// POST /api/interview-progress - Add or update interview progress
export async function POST(request: Request) {
  try {
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
    const body = await request.json() as { interview: any };
    const { interview } = body;

    if (!interview || !interview.sessionId) {
      return NextResponse.json({ error: 'Interview data is required' }, { status: 400 });
    }

    console.log('✅ Adding interview progress for user:', userId, 'session:', interview.sessionId);

    // Get current progress
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('progress_technicalinterview')
      .eq('id', userId)
      .single();

    if (userError) {
      console.error('❌ Error fetching user progress:', userError);
      return NextResponse.json({ error: 'Failed to fetch progress' }, { status: 500 });
    }

    const currentProgress = userData?.progress_technicalinterview || {};
    
    // Add new interview to progress
    const updatedProgress = {
      ...currentProgress,
      [interview.sessionId]: interview
    };

    // Update user's interview progress
    const { error: updateError } = await supabase
      .from('users')
      .update({
        progress_technicalinterview: updatedProgress,
        updated_at: new Date().toISOString(),
      })
      .eq('id', userId);

    if (updateError) {
      console.error('❌ Error updating interview progress:', updateError);
      return NextResponse.json({ error: 'Failed to update progress' }, { status: 500 });
    }

    console.log('✅ Interview progress updated successfully');

    return NextResponse.json({
      success: true,
      message: 'Interview progress updated',
      progress: updatedProgress,
    });

  } catch (error: any) {
    console.error('❌ Interview progress API error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}
