import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { NextResponse } from "next/server"

export async function GET() {
  try {
    // Get authenticated user
    const cookieStore = cookies()
    const supabase = createRouteHandlerClient({ cookies: () => cookieStore })
    const { data: { session } } = await supabase.auth.getSession()

    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Fetch journals with all relevant fields
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
        tags
      `)
      .eq('user_id', session.user.id)
      .order("created_at", { ascending: false })

    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      )
    }

    return NextResponse.json(data, {
      headers: {
        'Cache-Control': 'private, s-maxage=30, stale-while-revalidate=60'
      }
    })
  } catch (error) {
    console.error('Journal fetch error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch journals' },
      { status: 500 }
    )
  }
}

export async function POST(request: Request) {
  try {
    // Get authenticated user
    const cookieStore = cookies()
    const supabase = createRouteHandlerClient({ cookies: () => cookieStore })
    const { data: { session } } = await supabase.auth.getSession()

    console.log('Session:', session)

    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Get request body
    const { title, content } = await request.json()
    console.log('Received data:', { title, content })

    // Call Flask API to process the journal content
    console.log('Calling Flask API...')
    const flaskResponse = await fetch('http://0.0.0.0:8000/journal', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ text: content })
    })

    if (!flaskResponse.ok) {
      console.error('Flask API error:', await flaskResponse.text())
      throw new Error('Failed to process journal content')
    }

    const flaskData = await flaskResponse.json()
    console.log('Flask API response:', flaskData)

    // Prepare journal data for Supabase with proper type checking
    const journalData = {
      user_id: session.user.id,
      title,
      content,
      summary: flaskData.summary || null,
      mood_tags: Array.isArray(flaskData.predictions) ? flaskData.predictions : null,
      keywords: Array.isArray(flaskData.keywords) ? flaskData.keywords : null,
      latest_articles: Array.isArray(flaskData.latest_articles) ? flaskData.latest_articles : null,
      nearby_places: Array.isArray(flaskData.nearby_places) ? flaskData.nearby_places : null,
      sentences: Array.isArray(flaskData.sentences) ? flaskData.sentences : null,
      created_at: new Date().toISOString()
    }

    console.log('Prepared journal data:', journalData)

    // Insert journal into Supabase
    console.log('Inserting into Supabase...')
    const { data, error } = await supabase
      .from('journals')
      .insert([journalData])
      .select()
      .single()

    if (error) {
      console.error('Supabase error:', error)
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      )
    }

    console.log('Successfully saved journal:', data)
    return NextResponse.json(data)
  } catch (error) {
    console.error('Journal creation error:', error)
    return NextResponse.json(
      { error: 'Failed to create journal' },
      { status: 500 }
    )
  }
}

