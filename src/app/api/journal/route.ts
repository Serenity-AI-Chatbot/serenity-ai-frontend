import {  requireAuth, supabase } from "@/lib/supabase-server"
import { NextResponse } from "next/server"
import { GoogleGenerativeAI } from "@google/generative-ai"

// Initialize the Gemini model
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "")

// Helper function for generating embeddings - updated to take full journal entry
async function generateEmbedding(journalEntry: any): Promise<number[]> {
  const model = genAI.getGenerativeModel({ model: "embedding-001" })
  // Combine relevant fields into a single text for embedding
  const textForEmbedding = `
    Title: ${journalEntry.title}
    Content: ${journalEntry.content}
    Summary: ${journalEntry.summary}
    Mood Tags: ${journalEntry.mood_tags?.join(', ')}
    Keywords: ${journalEntry.keywords?.join(', ')}
    Song: ${journalEntry.song}
    Tags: ${journalEntry.tags?.join(', ')}
  `.trim()
  
  console.log("================================================")
  console.log("textForEmbedding", textForEmbedding)
  console.log("================================================")

  const result = await model.embedContent(textForEmbedding)
  const embedding = result.embedding.values
  return embedding
}

// Helper function for generating tags
async function generateTags(content: string): Promise<string[]> {
  const model = genAI.getGenerativeModel({ model: "gemini-pro" })
  const prompt = `Generate 3-5 relevant tags for this journal entry. Return ONLY a JSON array of strings, with no markdown formatting or explanation. Example: ["tag1", "tag2", "tag3"]. For this content: ${content}`
  const result = await model.generateContent(prompt)
  const response = await result.response
  const text = response.text()
  
  // Clean up the response text
  const cleanJson = text
    .replace(/```json\n?/g, '') // Remove ```json
    .replace(/```\n?/g, '')     // Remove closing ```
    .trim()                     // Remove whitespace
  
  try {
    return JSON.parse(cleanJson)
  } catch (error) {
    console.error('Failed to parse tags:', text)
    // Return empty array as fallback
    return []
  }
}

export async function GET() {
  try {
    // Get authenticated user
    const { session } = await requireAuth()
    
    if (!session) {
      return new Response("Unauthorized", { status: 401 })
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
    const { session } = await requireAuth()

    // Get request body
    const { title, content } = await request.json()

    // Call Flask API to process the journal content
    const flaskResponse = await fetch(`${process.env.NEXT_PUBLIC_FLASK_API_URL}/journal`, {
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
    
    // Use our new parsing function
    const flaskData = JSON.parse(rawResponse)
    // const flaskData = await parseFlaskResponse(rawResponse);
    // console.log('Parsed Flask API Data:', flaskData);

    // Generate tags using the helper function
    const tags = await generateTags(content)
    console.log('Tags:', tags)

    // First prepare the journal data without embedding
    const journalData = {
      user_id: session?.user.id,
      title,
      content,
      summary: flaskData.summary,
      mood_tags: flaskData.predictions,
      keywords: flaskData.keywords,
      tags,
      song: flaskData.song || 'https://www.youtube.com/watch?v=F-6qLrgbjKo',
      created_at: new Date().toISOString(),
    }

    // Generate embedding using the complete journal data
    const embedding = await generateEmbedding(journalData)
    
    // Add embedding and remaining fields to journal data
    const completeJournalData = {
      ...journalData,
      embedding,
      latest_articles: { articles: flaskData.latest_articles.map((article: any) => ({
        link: article.link,
        title: article.title,
        snippet: article.snippet
      }))},
      nearby_places: { places: flaskData.nearby_places.map((place: any) => ({
        name: place.name,
        types: place.types,
        rating: place.rating,
        address: place.address,
        image_url: place.image,
        user_ratings_total: place.user_ratings_total
      }))},
      sentences: flaskData.sentences,
    }
    console.log('Complete Journal Data:', completeJournalData)

    // Insert journal into Supabase
    console.log('Inserting journal into Supabase...')
    const { data, error } = await supabase
      .from('journals')
      .insert([completeJournalData])
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

async function parseFlaskResponse(rawResponse: string): Promise<any> {
  try {
    // First try direct JSON parse
    try {
      return JSON.parse(rawResponse);
    } catch (e) {
      // If direct parse fails, continue with cleanup
      console.log("Direct parse failed, attempting cleanup...");
    }

    // Remove any leading/trailing quotes if they exist
    let cleanResponse = rawResponse.trim();
    if (cleanResponse.startsWith('"') && cleanResponse.endsWith('"')) {
      cleanResponse = cleanResponse.slice(1, -1);
    }

    // Handle escaped JSON string
    cleanResponse = cleanResponse
      // Handle double-escaped quotes
      .replace(/\\"/g, '"')
      // Handle escaped newlines and carriage returns
      .replace(/\\n/g, ' ')
      .replace(/\\r/g, ' ')
      // Handle unicode escapes
      .replace(/\\u([0-9a-fA-F]{4})/g, (_, code) => 
        String.fromCharCode(parseInt(code, 16)))
      // Remove any remaining unnecessary escapes
      .replace(/\\/g, '');

    // Try parsing the cleaned response
    return JSON.parse(cleanResponse);
  } catch (error) {
    console.error('Failed to parse Flask response:', error);
    throw new Error('Invalid response format from Flask API');
  }
}