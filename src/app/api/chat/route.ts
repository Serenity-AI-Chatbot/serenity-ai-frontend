import { GoogleGenerativeAI } from "@google/generative-ai"
import { requireAuth, supabase } from "@/lib/supabase-server"
import { parse, format } from 'date-fns'

// Initialize the Gemini model with proper error handling
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "")

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

// Add interface for journal stats
interface JournalStats {
  period_start: Date;
  entry_count: number;
  mood_distribution: Record<string, number>;
  top_keywords: string[];
}

// Add new date-related regex patterns
const datePatterns = {
  monthYear: /(?:in|during|for)\s+(?:([A-Za-z]+)\s+)?(\d{4})?/i,
  dateRange: /(?:between|from)\s+(.+?)\s+(?:to|and|until)\s+(.+)/i,
  specificDate: /(?:on\s+)?([A-Za-z]+day,\s+[A-Za-z]+\s+\d{1,2},\s+\d{4})/i
};

export async function POST(req: Request) {
  if (!process.env.GEMINI_API_KEY) {
    return new Response("Missing API key", { status: 500 })
  }

  const { messages } = await req.json()
  const { session } = await requireAuth()
  const userId = session.user.id
  const model = genAI.getGenerativeModel({ model: "gemini-pro" })
  const latestUserMessage = messages[messages.length - 1].content

  try {
    // Get journal entries based on user message
    const journalEntries = await fetchRelevantJournalEntries(userId, latestUserMessage)
    
    // Fetch and format activities
    const activities = await fetchActivities()
    
    // Format contexts
    const journalContext = formatJournalEntries(journalEntries)
    const activitiesContext = formatActivities(activities)
    
    // Prepare and send chat message
    const geminiMessages = prepareChatMessages(messages, journalContext, activitiesContext)
    return await streamChatResponse(model, geminiMessages, latestUserMessage)
  } catch (error) {
    return handleError(error)
  }
}

async function fetchRelevantJournalEntries(userId: string, userMessage: string) {
  const queryEmbedding = await generateEmbedding(userMessage)
  
  // Check for date range pattern first
  const dateRangeMatch = userMessage.match(datePatterns.dateRange)
  if (dateRangeMatch) {
    return await fetchJournalsByDateRange(userId, dateRangeMatch)
  }
  
  const monthYearMatch = userMessage.match(datePatterns.monthYear)
  if (monthYearMatch) {
    return await fetchJournalsByMonthYear(userId, monthYearMatch)
  }
  
  const dateMatch = userMessage.match(datePatterns.specificDate)
  return await fetchJournalsByDateOrSemantic(userId, dateMatch, queryEmbedding)
}

async function fetchJournalsByMonthYear(userId: string, match: RegExpMatchArray) {
  const [monthStr, yearStr] = [match[1], match[2]]
  const targetMonth = monthStr ? new Date(`${monthStr} 1, 2000`).getMonth() + 1 : null
  const targetYear = yearStr ? parseInt(yearStr) : null

  console.log("================================================")
  console.log("monthStr:", monthStr)
  console.log("yearStr:", yearStr)
  console.log("targetMonth:", targetMonth)
  console.log("targetYear:", targetYear)
  console.log("================================================")

  const response = await supabase.rpc('get_journals_by_date', {
    p_user_id: userId,
    p_year: targetYear,
    p_month: targetMonth
  })

  console.log("================================================")
  console.log("get_journals_by_date:", response)
  console.log("================================================")

  if (response.error) throw response.error
  return response.data
}

async function fetchJournalsByDateOrSemantic(userId: string, dateMatch: RegExpMatchArray | null, queryEmbedding: number[]) {
  let targetDate: string | null = null
  
  if (dateMatch) {
    const dateStr = dateMatch[1].trim()
    const parsedDate = parse(dateStr, 'EEEE, MMMM d, yyyy', new Date())
    targetDate = format(parsedDate, 'yyyy-MM-dd')
    console.log("================================================")
    console.log("dateMatch:", dateMatch)
    console.log("dateStr:", dateStr)
    console.log("parsedDate:", parsedDate)
    console.log("targetDate:", targetDate)
    console.log("================================================")
  }

  const response = await supabase.rpc('match_journals', {
    query_embedding: queryEmbedding,
    match_threshold: 0.5,
    match_count: 5,
    user_id: userId,
    target_date: targetDate
  })

  console.log("================================================")
  console.log("match_journals:", response)
  console.log("================================================")

  if (response.error) throw response.error
  return response.data
}

async function fetchJournalsByDateRange(userId: string, match: RegExpMatchArray) {
  const startDateStr = match[1].trim()
  const endDateStr = match[2].trim()
  
  try {
    const startDate = parse(startDateStr, 'MMMM d, yyyy', new Date())
    const endDate = parse(endDateStr, 'MMMM d, yyyy', new Date())

    console.log("================================================") 
    console.log("startDateStr:", startDateStr)
    console.log("endDateStr:", endDateStr)
    console.log("startDate:", startDate)
    console.log("endDate:", endDate)
    console.log("================================================")

    const { data, error } = await supabase.rpc('get_journal_stats_by_period', {
      p_user_id: userId,
      p_start_date: format(startDate, 'yyyy-MM-dd'),
      p_end_date: format(endDate, 'yyyy-MM-dd')
    });

    console.log("================================================")
    console.log("get_journal_stats_by_period:", data)
    console.log("================================================")

    if (error) throw error
    if (!data) return []

    // Process the entries to ensure all required fields are present
    return data.map((entry: JournalEntry) => ({
      ...entry,
      mood_tags: entry.mood_tags || [],
      tags: entry.tags || [],
      keywords: entry.keywords || []
    }));

  } catch (error) {
    console.error("Error fetching date range:", error)
    throw error
  }
}

async function fetchActivities() {
  const { data, error } = await supabase.from('activities').select('*')
  if (error) throw error
  return data
}

function formatJournalEntries(entries: JournalEntry[]) {
  const formattedEntries = entries
    .map(entry => `Journal Entry (${new Date(entry.created_at).toLocaleDateString()}):
    Title: ${entry.title}
    Content: ${entry.content}
    Summary: ${entry.summary}
    Mood Tags: ${entry.mood_tags.join(", ")}
    Tags: ${entry.tags.join(", ")}
    Keywords: ${entry.keywords.join(", ")}`)
    .join("\n\n")

  console.log("================================================")
  console.log("formatJournalEntries:", formattedEntries)
  console.log("================================================")

  return formattedEntries
}

function formatActivities(activities: Activity[]) {
  return activities
    .map(activity => `Activity:
    Title: ${activity.title}
    Description: ${activity.description}
    Category: ${activity.category}
    Recommended Moods: ${activity.recommended_moods.join(", ")}
    Difficulty: ${activity.difficulty_level}
    Duration: ${activity.estimated_duration} minutes
    Tags: ${activity.tags.join(", ")}`)
    .join("\n\n")
}

function prepareChatMessages(messages: any[], journalContext: string, activitiesContext: string) {
  return [
    { role: "user", parts: [{ text: "Initialize chat" }] },
    { role: "model", parts: [{ text: SYSTEM_PROMPT }] },
    {
      role: "user",
      parts: [{
        text: `Here are some relevant journal entries for context:\n\n${journalContext}\n\nAnd here are all available activities you can recommend:\n\n${activitiesContext}\n\nPlease keep these in mind when responding to the user.`,
      }],
    },
    { role: "model", parts: [{ text: "Understood. I'll keep this context in mind when responding to the user." }] },
    ...messages.map(msg => ({
      role: msg.role === "user" ? "user" : "model",
      parts: [{ text: msg.content }],
    })),
  ]
}

async function streamChatResponse(model: any, geminiMessages: any[], userMessage: string) {
  const chat = model.startChat({ history: geminiMessages })
  const result = await chat.sendMessageStream(userMessage)
  
  const stream = new ReadableStream({
    async start(controller) {
      try {
        for await (const chunk of result.stream) {
          const encoder = new TextEncoder()
          const bytes = encoder.encode(`data: ${JSON.stringify({ text: chunk.text() })}\n\n`)
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

function handleError(error: any) {
  console.error("Error:", error)
  return new Response(
    JSON.stringify({ error: error.message || "An error occurred" }), 
    { 
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    }
  )
}