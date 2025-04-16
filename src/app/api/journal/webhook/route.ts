import { supabase } from "@/lib/supabase-server"
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

  const result = await model.embedContent(textForEmbedding)
  const embedding = result.embedding.values
  return embedding
}

export async function POST(request: Request) {
  try {
    console.log('📥 Webhook received from Flask API');
    const flaskData = await request.json()
    console.log('📥 Flask data received:', JSON.stringify(flaskData).substring(0, 200) + '...');
    
    const journalId = flaskData.journal_id
    console.log(`📥 Processing journal ID: ${journalId}`);

    if (!journalId) {
      console.error('❌ Missing journal_id in the webhook payload');
      return NextResponse.json(
        { error: 'Missing journal_id in the webhook payload' },
        { status: 400 }
      )
    }

    // Fetch the existing journal entry
    console.log(`📥 Fetching journal with ID: ${journalId} from database`);
    const { data: journal, error: fetchError } = await supabase
      .from('journals')
      .select('*')
      .eq('id', journalId)
      .single()

    if (fetchError || !journal) {
      console.error('❌ Error fetching journal:', fetchError);
      return NextResponse.json(
        { error: `Journal with id ${journalId} not found` },
        { status: 404 }
      )
    }

    console.log(`📥 Found journal: "${journal.title}"`);

    // Prepare the updated journal data
    console.log('📥 Preparing updated journal data with Flask API results');
    const updatedJournalData = {
      summary: flaskData.summary,
      mood_tags: flaskData.predictions,
      keywords: flaskData.keywords,
      song: flaskData.song || 'https://www.youtube.com/watch?v=F-6qLrgbjKo',
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
      is_processing: false
    }

    // Generate embedding using the complete journal data
    const completeJournalData = {
      ...journal,
      ...updatedJournalData,
    }
    
    console.log('📥 Generating embedding for complete journal data');
    const embedding = await generateEmbedding(completeJournalData)
    completeJournalData.embedding = embedding

    // Update the journal in Supabase
    console.log(`📥 Updating journal in database`);
    const { data, error } = await supabase
      .from('journals')
      .update(completeJournalData)
      .eq('id', journalId)
      .select()
      .single()

    if (error) {
      console.error('❌ Error updating journal:', error);
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      )
    }

    console.log(`✅ Journal successfully updated, processing complete`);
    return NextResponse.json({
      status: 'success',
      message: 'Journal updated successfully',
      data
    })
  } catch (error) {
    console.error('❌ Webhook processing error:', error);
    return NextResponse.json(
      { error: 'Failed to process webhook data' },
      { status: 500 }
    )
  }
} 