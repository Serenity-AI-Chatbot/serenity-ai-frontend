import { requireAuth, supabase } from "@/lib/supabase-server"
import { NextResponse } from "next/server"

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    // Get authenticated user
    const { session } = await requireAuth()
    
    if (!session) {
      return new Response("Unauthorized", { status: 401 })
    }

    const { id } = await params
    const journalId = id
    console.log(`📖 Fetching journal with ID: ${journalId}`)

    // Fetch the journal entry
    const { data, error } = await supabase
      .from("journals")
      .select(`
        id,
        user_id,
        title,
        content,
        summary,
        mood_tags,
        keywords,
        latest_articles,
        nearby_places,
        sentences,
        created_at,
        tags,
        is_processing,
        song,
        location
      `)
      .eq('id', journalId)
      .eq('user_id', session.user.id)
      .single()

    if (error) {
      console.error('❌ Error fetching journal:', error)
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      )
    }

    if (!data) {
      return NextResponse.json(
        { error: 'Journal not found' },
        { status: 404 }
      )
    }

    // Format the journal data for the frontend
    const formattedJournal = {
      id: data.id,
      title: data.title,
      entry: data.content,
      date: data.created_at,
      mood: data.mood_tags?.[0] || null,
      summary: data.summary,
      keywords: data.keywords || [],
      song: data.song,
      is_processing: data.is_processing,
      nearbyPlaces: data.nearby_places || { places: [] },
      latestArticles: data.latest_articles || { articles: [] },
      location: data.location
    }

    console.log(`📖 Successfully fetched journal: "${data.title}"`)
    return NextResponse.json(formattedJournal)
  } catch (error) {
    console.error('❌ Error fetching journal:', error)
    return NextResponse.json(
      { error: 'Failed to fetch journal' },
      { status: 500 }
    )
  }
}