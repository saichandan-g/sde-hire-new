import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET(
  request: Request,
  { params }: { params: { sessionId: string } }
) {
  try {
    const { sessionId } = params;

    if (!sessionId) {
      return NextResponse.json(
        { error: 'Session ID is required' },
        { status: 400 }
      );
    }

    console.log(`🔍 Fetching results for session: ${sessionId}`);

    // Check if final report exists
    const { data: finalReport, error: reportError } = await supabase
      .from('final_reports')
      .select('*')
      .eq('session_id', sessionId)
      .single();

    if (reportError) {
      if (reportError.code === 'PGRST116') {
        // No results found yet - check queue status
        const { data: queueStatus, error: queueError } = await supabase
          .from('mistral_queue')
          .select('status, created_at, updated_at')
          .eq('session_id', sessionId)
          .single();

        if (queueError) {
          return NextResponse.json(
            { 
              error: 'Session not found',
              message: 'No interview session found with this ID'
            },
            { status: 404 }
          );
        }

        // Return queue status
        return NextResponse.json({
          success: true,
          status: 'processing',
          queueStatus: queueStatus.status,
          message: 'Evaluation in progress',
          createdAt: queueStatus.created_at,
          updatedAt: queueStatus.updated_at
        });
      }

      return NextResponse.json(
        { error: 'Failed to fetch results', details: reportError.message },
        { status: 500 }
      );
    }

    // Results found - return the evaluation
    console.log(`✅ Results found for session: ${sessionId}`);
    
    return NextResponse.json({
      success: true,
      status: 'completed',
      sessionId,
      techStack: finalReport.tech_stack,
      mcqMarks: finalReport.mcq_marks,
      evaluation: finalReport.long_short_evaluation,
      createdAt: finalReport.created_at
    });

  } catch (error: any) {
    console.error('Results API error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}