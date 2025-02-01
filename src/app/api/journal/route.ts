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

    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Get request body
    const { title, content } = await request.json()

    // Call Flask API to process the journal content
    const flaskResponse = await fetch('http://0.0.0.0:8000/journal', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ text: content })
    })

    if (!flaskResponse.ok) {
      throw new Error('Failed to process journal content')
    }

    // Get raw response and parse it safely
    const rawResponse = await flaskResponse.text()
    console.log('Raw Flask API response:', rawResponse)
    // Extract the JSON content from the response
    // This handles the case where the response is wrapped in quotes
    const jsonMatch = rawResponse.match(/\{[\s\S]*\}/)
    if (!jsonMatch) {
      throw new Error('Invalid JSON response format')
    }
    
    let jsonStr = jsonMatch[0]
      .replace(/\\n/g, '') // Remove escaped newlines
      .replace(/\\r/g, '') // Remove escaped carriage returns
      .replace(/\\/g, '') // Remove remaining backslashes
      .replace(/"\{/g, '{') // Remove leading quote before curly brace
      .replace(/\}"/g, '}') // Remove trailing quote after curly brace
      .replace(/\\u([0-9a-fA-F]{4})/g, (_, code) => String.fromCharCode(parseInt(code, 16))) // Handle unicode escapes
    
    // Parse the cleaned JSON
    const flaskData = JSON.parse(jsonStr)
    console.log('Flask API Processed Data:', flaskData)
    // Prepare journal data for Supabase
    const journalData = {
      user_id: session.user.id,
      title,
      content,
      summary: flaskData.summary,
      mood_tags: flaskData.predictions,
      keywords: flaskData.keywords,
      latest_articles: flaskData.latest_articles,
      nearby_places: flaskData.nearby_places,
      sentences: flaskData.sentences,
      created_at: new Date().toISOString()
    }
    console.log('Prepared journal data:', journalData)

    // Insert journal into Supabase
    console.log('Inserting journal into Supabase...')
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

    return NextResponse.json(data)
  } catch (error) {
    console.error('Journal creation error:', error)
    return NextResponse.json(
      { error: 'Failed to create journal' },
      { status: 500 }
    )
  }
}