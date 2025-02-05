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
    const { data, error } = await supabase
      .from('user_activities')
      .select(`
        *,
        activities (
          title,
          description,
          category
        )
      `)
      .eq('status', status)
      .order('planned_at', { ascending: true })

    if (error) throw error

    return new Response(JSON.stringify(data), {
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'private, s-maxage=30, stale-while-revalidate=60'
      },
    })
  } catch (error) {
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
    
    // Add user_id to the activity object
    const activityWithUser = {
      ...body,
      user_id: session?.user.id
    }

    const { data, error } = await supabase
      .from('user_activities')
      .insert([activityWithUser])
      .select()

    if (error) {
      console.error('Supabase error:', error) // Debug log
      throw error
    }

    return NextResponse.json(data[0])
  } catch (error) {
    console.error('Error in POST handler:', error) // Debug log
    return NextResponse.json(
      { error: 'Failed to create activity' },
      { status: 500 }
    )
  }
}