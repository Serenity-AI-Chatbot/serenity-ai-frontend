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
  const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" })
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
        sentences,
        created_at,
        tags,
        is_processing
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
    console.log('📝 Journal creation started');
    // Get authenticated user
    const { session } = await requireAuth()

    // Get request body
    const { title, content, location } = await request.json()
    console.log(`📝 Received journal request: title="${title}", content length=${content.length} chars`);
    if (location) {
      console.log(`📝 Location data received: ${JSON.stringify(location)}`);
    } else {
      console.log(`📝 No location data provided`);
    }

    // Generate tags using the helper function
    console.log('📝 Generating tags...');
    const tags = await generateTags(content)
    console.log(`📝 Generated tags: ${JSON.stringify(tags)}`);
    
    // Create initial journal with processing status
    const initialJournalData = {
      user_id: session?.user.id,
      title,
      content,
      tags,
      is_processing: true,
      location: location ? JSON.stringify(location) : null,
      created_at: new Date().toISOString(),
    }
    console.log('📝 Creating initial journal entry with processing status');

    // Insert initial journal into Supabase
    const { data: journal, error: insertError } = await supabase
      .from('journals')
      .insert([initialJournalData])
      .select()
      .single()

    if (insertError) {
      console.error('❌ Supabase insert error:', insertError)
      return NextResponse.json(
        { error: insertError.message },
        { status: 500 }
      )
    }

    console.log(`📝 Initial journal created with ID: ${journal.id}`);

    // Get the webhook URL (base URL + webhook path)
    let webhookUrl
    if (process.env.NODE_ENV === 'development') {
      webhookUrl = `https://serenity-ai-frontend-2.vercel.app/api/journal/webhook`
    }
    else{
      const protocol = process.env.NODE_ENV === 'production' ? 'https' : 'http'
      const host = request.headers.get('host') || 'localhost:3000'
      webhookUrl = `${protocol}://${host}/api/journal/webhook`
    }
    console.log(`📝 Webhook URL: ${webhookUrl}`);
    
    // Call Flask API to process the journal content asynchronously
    console.log(`📝 Sending request to Flask API: ${process.env.NEXT_PUBLIC_FLASK_API_URL}/journal-async`);
    fetch(`${process.env.NEXT_PUBLIC_FLASK_API_URL}/journal-async`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ 
        text: content,
        journal_id: journal.id,
        webhook_url: webhookUrl,
        location: location ? location.placeName || `pune` : null
      })
    }).then(response => {
      console.log(`📝 Flask API responded with status: ${response.status}`);
      return response.text();
    }).then(text => {
      console.log(`📝 Flask API response: ${text.substring(0, 100)}${text.length > 100 ? '...' : ''}`);
    }).catch(err => {
      console.error('❌ Error sending request to Flask API:', err)
    });

    console.log(`📝 Journal creation completed, returning response to client`);
    return NextResponse.json({
      ...journal,
      status: 'processing',
      message: 'Journal created. Content is being processed.'
    })
  } catch (error) {
    console.error('❌ Journal creation error:', error)
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