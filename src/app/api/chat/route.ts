import { GoogleGenerativeAI } from "@google/generative-ai"
import { createClient } from "@supabase/supabase-js"

// Initialize the Gemini model with proper error handling
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "")

// Initialize Supabase client
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

// Set the runtime to edge for better performance
export const runtime = "edge"

const SYSTEM_PROMPT = `You are an AI assistant for a mental wellness app called Serenity AI. Your primary goal is to help users improve their mental well-being. Respond with empathy, compassion, and understanding. Offer supportive advice, coping strategies, and gentle encouragement. If a user expresses severe distress or mentions self-harm, always recommend professional help. Remember, you're not a replacement for professional mental health care, but a supportive tool for users' day-to-day emotional well-being.

You have access to the user's journal entries. Use this information to provide more personalized and context-aware responses. However, don't explicitly mention that you're using their journal entries unless they ask about it.`

async function generateEmbedding(text: string): Promise<number[]> {
  const model = genAI.getGenerativeModel({ model: "embedding-001" })
  const result = await model.embedContent(text)
  const embedding = result.embedding.values
  return embedding
}

export async function POST(req: Request) {
  // Add error handling for missing API key
  if (!process.env.GEMINI_API_KEY) {
    return new Response("Missing API key", { status: 500 })
  }

  const { messages, userId } = await req.json()

  const model = genAI.getGenerativeModel({ model: "gemini-pro" })

  // Generate embedding for the latest user message
  const latestUserMessage = messages[messages.length - 1].content
  const queryEmbedding = await generateEmbedding(latestUserMessage)

  // Fetch relevant journal entries with parameters in the correct order
  const { data: journalEntries, error } = await supabase.rpc("match_journals", {
    query_embedding: queryEmbedding,
    match_threshold: 0.5,
    match_count: 5,
    user_id: userId
  })

  if (error) {
    console.error("Error fetching journal entries:", error)
    return new Response(`Error fetching journal entries: ${JSON.stringify(error)}`, { status: 500 })
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
  }

  // Prepare context from journal entries
  const journalContext = (journalEntries as JournalEntry[])
    .map(
      (entry) =>
        `Journal Entry (${new Date(entry.created_at).toLocaleDateString()}):
    Title: ${entry.title}
    Content: ${entry.content}
    Summary: ${entry.summary}
    Mood Tags: ${entry.mood_tags.join(", ")}
    Tags: ${entry.tags.join(", ")}
    Keywords: ${entry.keywords.join(", ")}`,
    )
    .join("\n\n")

  // Create messages with the correct format, including journal context
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
          text: `Here are some relevant journal entries for context:\n\n${journalContext}\n\nPlease keep these in mind when responding to the user.`,
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
          // Ensure we're sending the chunks in the correct format for the useChat hook
          controller.enqueue(`data: ${JSON.stringify({ text })}\n\n`)
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