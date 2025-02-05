import { requireAuth, supabase } from "@/lib/supabase-server"

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const moodTags = JSON.parse(searchParams.get('mood_tags') || '["neutral"]')

  try {
    // Create authenticated Supabase client using awaited cookies
    const { session } = await requireAuth()
    
    const { data, error } = await supabase.rpc('get_recommended_activities', {
      p_user_id: session.user.id,
      p_current_mood_tags: moodTags
    })

    if (error) throw error

    return new Response(JSON.stringify(data), {
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'private, s-maxage=60, stale-while-revalidate=120'
      },
    })
  } catch (error) {
    console.error('Recommended activities error:', error);
    return new Response(JSON.stringify({ 
      error: 'Failed to fetch recommended activities', 
      details: error instanceof Error ? error.message : String(error)
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }
}