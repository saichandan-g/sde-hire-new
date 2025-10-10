import { NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

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
    const body = await request.json() as { sessionIds: string[] };
    const { sessionIds } = body;

    if (!sessionIds || !Array.isArray(sessionIds)) {
      return NextResponse.json({ error: 'Session IDs array is required' }, { status: 400 });
    }

    console.log('✅ Fetching evaluation data for user:', userId, 'sessions:', sessionIds);

    // Fetch evaluation data from final_reports table
    const { data: evaluations, error: evalError } = await supabase
      .from('final_reports')
      .select('session_id, long_short_evaluation')
      .eq('user_id', userId)
      .in('session_id', sessionIds);

    if (evalError) {
      console.error('❌ Error fetching evaluations:', evalError);
      return NextResponse.json({ error: 'Failed to fetch evaluations' }, { status: 500 });
    }

    // Convert array to object with session_id as key
    const evaluationsMap: Record<string, any> = {};
    evaluations?.forEach(evaluation => {
      evaluationsMap[evaluation.session_id] = evaluation.long_short_evaluation;
    });

    console.log('✅ Evaluation data fetched successfully');

    return NextResponse.json({
      success: true,
      evaluations: evaluationsMap,
    });

  } catch (error: any) {
    console.error('❌ Interview evaluations API error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}
