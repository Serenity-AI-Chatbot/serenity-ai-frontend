import { requireAuth, supabase } from "@/lib/supabase-server"
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const status = searchParams.get('status')
  const { session } = await requireAuth()

  if (!session) {
    return new Response("Unauthorized", { status: 401 })
  } 
  
  try {
    // Get the current user's ID from the session
    const userId = session.user.id;
    console.log(`Fetching activities for user: ${userId}, status: ${status}`);

    const { data, error } = await supabase
      .from('user_activities')
      .select(`
        *,
        activities (
          title,
          description,
          category,
          estimated_duration
        )
      `)
      .eq('status', status)
      .eq('user_id', userId) // Filter by the current user's ID
      .order('planned_at', { ascending: true })

    if (error) {
      console.error('[USER_ACTIVITIES_GET] Error:', error);
      throw error;
    }

    console.log(`[USER_ACTIVITIES_GET] Found ${data?.length || 0} activities`);
    
    return new Response(JSON.stringify(data), {
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
        'Surrogate-Control': 'no-store'
      },
    })
  } catch (error) {
    console.error('[USER_ACTIVITIES_GET] Unhandled error:', error);
    return new Response(JSON.stringify({ error: 'Failed to fetch user activities' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    
    // Initialize Supabase client with route handler
    const { session } = await requireAuth()
    
    if (!session) {
      console.log("[USER_ACTIVITIES_POST] Unauthorized - no session");
      return new Response("Unauthorized", { status: 401 })
    }
    
    // Add user_id to the activity object
    const activityWithUser = {
      ...body,
      user_id: session.user.id
    }

    const { data, error } = await supabase
      .from('user_activities')
      .insert([activityWithUser])
      .select()

    if (error) {
      console.error('[USER_ACTIVITIES_POST] Supabase error:', error) // Debug log
      throw error
    }

    return NextResponse.json(data[0])
  } catch (error) {
    console.error('[USER_ACTIVITIES_POST] Error in POST handler:', error) // Debug log
    return NextResponse.json(
      { error: 'Failed to create activity' },
      { status: 500 }
    )
  }
}