import { GoogleGenerativeAI } from "@google/generative-ai"
import { createClient } from "@supabase/supabase-js"
import { cookies } from 'next/headers'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'

// Initialize the Gemini model with proper error handling
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "")

// Initialize Supabase client
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

// Set the runtime to edge for better performance
export const runtime = "edge"

const SYSTEM_PROMPT = `You are an AI assistant for a mental wellness app called Serenity AI. Your primary goal is to help users improve their mental well-being. Respond with empathy, compassion, and understanding. Offer supportive advice, coping strategies, and gentle encouragement. If a user expresses severe distress or mentions self-harm, always recommend professional help. Remember, you're not a replacement for professional mental health care, but a supportive tool for users' day-to-day emotional well-being.

You have access to the user's journal entries. Use this information to provide more personalized and context-aware responses.`

async function generateEmbedding(text: string): Promise<number[]> {
  const model = genAI.getGenerativeModel({ model: "embedding-001" })
  const result = await model.embedContent(text)
  const embedding = result.embedding.values
  return embedding
}

// Add interface for Activity type
interface Activity {
  id: string;
  title: string;
  description: string;
  category: string;
  recommended_moods: string[];
  difficulty_level: string;
  estimated_duration: number;
  tags: string[];
}

export async function POST(req: Request) {
  // Add error handling for missing API key
  if (!process.env.GEMINI_API_KEY) {
    return new Response("Missing API key", { status: 500 })
  }

  const { messages } = await req.json()

  // Get the authenticated user's session
  const cookieStore = cookies()
  const supabaseAuth = createRouteHandlerClient({ cookies: () => cookieStore })
  const { data: { session }, error: sessionError } = await supabaseAuth.auth.getSession()

  if (sessionError || !session) {
    return new Response(
      JSON.stringify({
        error: "Unauthorized",
      }),
      {
        status: 401,
        headers: {
          'Content-Type': 'application/json'
        }
      }
    )
  }

  const userId = session.user.id
  const model = genAI.getGenerativeModel({ model: "gemini-pro" })

  // Generate embedding for the latest user message
  const latestUserMessage = messages[messages.length - 1].content
  const queryEmbedding = await generateEmbedding(latestUserMessage)

  // Call the function with parameters in the correct order as defined in the function
  const { data: journalEntries, error } = await supabase.rpc('match_journals', {
    query_embedding: queryEmbedding,
    match_threshold: 0.5,
    match_count: 5,
    user_id: userId
  })

  if (error) {
    console.error("Error fetching journal entries:", error)
    return new Response(
      JSON.stringify({
        error: error,
        details: {
          queryEmbedding: queryEmbedding.length,
          parameters: {
            query_embedding: queryEmbedding,
            match_threshold: 0.5,
            match_count: 5,
            user_id: userId
          }
        }
      }), 
      { 
        status: 500,
        headers: {
          'Content-Type': 'application/json'
        }
      }
    )
  }

  // Add type safety for journal entries
  interface JournalEntry {
    id: string;
    title: string;
    content: string;
    summary: string;
    mood_tags: string[];
    tags: string[];
    keywords: string[];
    created_at: string;
    similarity?: number;
  }

  // // Prepare context from journal entries
  // console.log("================================================")
  // console.log('Raw journal entries:', journalEntries);
  // console.log("================================================")

  const journalContext = (journalEntries as JournalEntry[])
    .map(
      (entry) => {
        const formattedEntry = `Journal Entry (${new Date(entry.created_at).toLocaleDateString()}):
    Title: ${entry.title}
    Content: ${entry.content}
    Summary: ${entry.summary}
    Mood Tags: ${entry.mood_tags.join(", ")}
    Tags: ${entry.tags.join(", ")}
    Keywords: ${entry.keywords.join(", ")}`
        
        console.log('Formatted entry:', formattedEntry);
        return formattedEntry;
      }
    )
    .join("\n\n")

  console.log("================================================")
  console.log('Final journal context:', journalContext);
  console.log("Final journal context length:", journalContext.length);
  console.log("================================================")

  // After fetching journal entries, fetch activities
  const { data: activities, error: activitiesError } = await supabase
    .from('activities')
    .select('*')

  if (activitiesError) {
    console.error("Error fetching activities:", activitiesError)
    return new Response(JSON.stringify({ error: activitiesError }), { 
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    })
  }

  console.log("================================================")
  console.log('Activities:', activities);
  console.log("Activities length:", activities.length);
  console.log("================================================")

  // Format activities into a readable context
  const activitiesContext = (activities as Activity[])
    .map(activity => {
      return `Activity:
    Title: ${activity.title}
    Description: ${activity.description}
    Category: ${activity.category}
    Recommended Moods: ${activity.recommended_moods.join(", ")}
    Difficulty: ${activity.difficulty_level}
    Duration: ${activity.estimated_duration} minutes
    Tags: ${activity.tags.join(", ")}`
    })
    .join("\n\n")

  // Create messages with both journal and activities context
  const geminiMessages = [
    {
      role: "user",
      parts: [{ text: "Initialize chat" }],
    },
    {
      role: "model",
      parts: [{ text: SYSTEM_PROMPT }],
    },
    {
      role: "user",
      parts: [
        {
          text: `Here are some relevant journal entries for context:\n\n${journalContext}\n\nAnd here are all available activities you can recommend:\n\n${activitiesContext}\n\nPlease keep these in mind when responding to the user.`,
        },
      ],
    },
    {
      role: "model",
      parts: [{ text: "Understood. I'll keep this context in mind when responding to the user." }],
    },
    ...messages.map((msg: any) => ({
      role: msg.role === "user" ? "user" : "model",
      parts: [{ text: msg.content }],
    })),
  ]

  const chat = model.startChat({
    history: geminiMessages,
  })

  const result = await chat.sendMessageStream(messages[messages.length - 1].content)
  const stream = new ReadableStream({
    async start(controller) {
      try {
        for await (const chunk of result.stream) {
          const text = chunk.text()
          // Convert the string to bytes using TextEncoder
          const encoder = new TextEncoder()
          const bytes = encoder.encode(`data: ${JSON.stringify({ text })}\n\n`)
          controller.enqueue(bytes)
        }
        controller.close()
      } catch (error) {
        controller.error(error)
      }
    },
  })

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  })
}