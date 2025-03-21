import { GoogleGenerativeAI } from "@google/generative-ai"
import { requireAuth, supabase } from "@/lib/supabase-server"
import { parse, format } from 'date-fns'

// Initialize the Gemini model with proper error handling
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "")

// Set the runtime to edge for better performance
export const runtime = "edge"

const SYSTEM_PROMPT = (
  "You are an AI assistant for a mental wellness app called Serenity AI. Your role is to help users improve their emotional well-being through supportive and empathetic conversation. Use the context from the user's past conversations and current chat to understand their mood and provide relevant, empathetic responses. You don't need to ask too many questions unless it's to further understand their feelings or provide a more meaningful response. Your responses should feel natural, like talking to a friend who has some context of the user's emotional state, based on the conversations you've had. Avoid giving suggestions for activities unless explicitly requested or if the user seems open to it. Your main goal is to provide emotional support, help them reflect on their feelings, and offer gentle encouragement. If the user mentions difficult feelings or distress, acknowledge those feelings and offer comfort, but always encourage seeking professional help if necessary. Remember, you're here to support them, not replace professional mental health care. Respond with empathy, compassion, and understanding, and avoid giving generic or robotic answers. You should tailor your responses based on the mood and tone you infer from both the conversation and any relevant context from previous chats."
)



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
    song: string;
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

// Add interface for mood analysis
interface MoodAnalysis {
  dominant_mood: string;
  mood_progression: Array<{
    date: string;
    moods: Record<string, number>;
  }>;
  recurring_patterns: Array<{
    trigger: string;
    associated_moods: string[];
  }>;
}

interface ChatMessage {
  id?: string;
  chat_id?: string;
  role: "user" | "model" | "assistant";
  content: string;
  created_at?: string;
}

// Interface for chat details
interface Chat {
  id?: string;
  user_id?: string;
  title: string;
  created_at?: string;
  updated_at?: string;
}

// Add interface for activity recommendation
interface ActivityRecommendation {
  activity: Activity;
  confidence_score: number;
  reasoning: string;
  past_success_rate?: number;
}

export async function POST(req: Request) {
  if (!process.env.GEMINI_API_KEY) {
    return new Response("Missing API key", { status: 500 });
  }

  const { messages, chatId }: { messages: ChatMessage[], chatId?: string } = await req.json();
  const { session } = await requireAuth();

  if (!session) {
    return new Response("Unauthorized", { status: 401 });
  }

  const userId = session.user.id;
  const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
  const latestUserMessage = messages[messages.length - 1]?.content || "";

  try {
    // Get journal entries based on user message
    const { entries, moodAnalysis, recommendations } = await fetchRelevantJournalEntries(userId, latestUserMessage);
    
    // Fetch chat history
    const chatHistory = messages.slice(0, messages.length - 1)
      .map((msg: ChatMessage) => `${msg.role}: ${msg.content}`)
      .join("\n");

    // Fetch and format activities
    const activities = await fetchActivities();

    // Format contexts
    const journalContext = formatJournalEntries(entries);
    const activitiesContext = formatActivities(activities);

    // Prepare and send chat message
    const geminiMessages = prepareChatMessages(messages, journalContext, activitiesContext, moodAnalysis, recommendations, chatHistory);
    
    // Create or update chat in database
    let currentChatId = chatId;
    
    if (!currentChatId) {
      // Create a new chat with title derived from user's first message
      const title = generateChatTitle(latestUserMessage);
      const { data: chatData, error: chatError } = await supabase
        .from('chats')
        .insert({
          user_id: userId,
          title: title
        })
        .select('id')
        .single();
      
      if (chatError) throw chatError;
      currentChatId = chatData.id;
    } else {
      // Update the existing chat's timestamp
      await supabase
        .from('chats')
        .update({ updated_at: new Date().toISOString() })
        .eq('id', currentChatId)
        .eq('user_id', userId);
    }
    
    // Save the user message to the database
    const userMessageData = {
      chat_id: currentChatId,
      role: 'user',
      content: latestUserMessage
    };
    
    await supabase.from('chat_messages').insert(userMessageData);
    
    // At this point, currentChatId is guaranteed to be a string
    return await streamChatResponseWithSave(model, geminiMessages, latestUserMessage, currentChatId as string);
  } catch (error) {
    return handleError(error);
  }
}

// Generate a title for the chat based on the first message
function generateChatTitle(message: string): string {
  // Truncate to first 30 characters if longer than 30
  let title = message.slice(0, 30);
  if (message.length > 30) {
    title += '...';
  }
  return title;
}

// Create a new endpoint for fetching user's chats
export async function GET(req: Request) {
  const { session } = await requireAuth();
  
  if (!session) {
    return new Response("Unauthorized", { status: 401 });
  }
  
  const userId = session.user.id;
  
  try {
    const { data, error } = await supabase
      .rpc('get_user_chats', { p_user_id: userId });
      
    if (error) throw error;
    
    return new Response(JSON.stringify(data), {
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    return handleError(error);
  }
}


async function fetchRelevantJournalEntries(userId: string, userMessage: string) {
  const queryEmbedding = await generateEmbedding(userMessage);

  try {
    // Check for date range pattern first
    const dateRangeMatch = userMessage.match(datePatterns.dateRange);
    if (dateRangeMatch) {
      const result = await fetchJournalsByDateRange(userId, dateRangeMatch);
      return {
        entries: Array.isArray(result) ? result : [],
        moodAnalysis: await analyzeMoodPatterns(userId, userMessage),
        recommendations: [],
      };
    }

    const monthYearMatch = userMessage.match(datePatterns.monthYear);
    if (monthYearMatch) {
      const result = await fetchJournalsByMonthYear(userId, monthYearMatch);
      return {
        entries: Array.isArray(result) ? result : [],
        moodAnalysis: await analyzeMoodPatterns(userId, userMessage),
        recommendations: [],
      };
    }

    const dateMatch = userMessage.match(datePatterns.specificDate);
    
    if (dateMatch) {
      const result = await fetchJournalsByDateOrSemantic(userId, dateMatch, queryEmbedding);
      return {
        entries: Array.isArray(result) ? result : [],
        moodAnalysis: await analyzeMoodPatterns(userId, userMessage),
        recommendations: [],
      };
    }

    // If no date is found, fetch the latest 3 journals
    const latestJournals = await fetchLatestJournals(userId, 3);
    return {
      entries: Array.isArray(latestJournals) ? latestJournals : [],
      moodAnalysis: await analyzeMoodPatterns(userId, userMessage),
      recommendations: [],
    };
  } catch (error) {
    console.error("Error fetching journal entries:", error);
    return {
      entries: [],
      moodAnalysis: await analyzeMoodPatterns(userId, userMessage),
      recommendations: [],
    };
  }
}


async function fetchLatestJournals(userId: string, limit: number) {
  const { data, error } = await supabase
    .from("journals")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    console.error("Error fetching latest journals:", error);
    return [];
  }
  return data;
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

function formatJournalEntries(entries: JournalEntry[] | null | undefined) {
  // Check if entries exists and is an array
  if (!entries || !Array.isArray(entries)) {
    console.log("No entries found or invalid entries format:", entries);
    return "No journal entries found.";
  }

  // Check if array is empty
  if (entries.length === 0) {
    return "No journal entries found.";
  }

  const formattedEntries = entries
    .map(entry => `Journal Entry (${new Date(entry.created_at).toLocaleDateString()}):
    Title: ${entry.title || 'Untitled'}
    Content: ${entry.content || 'No content'}
    Summary: ${entry.summary || 'No summary'}
    Mood Tags: ${(entry.mood_tags || []).join(", ") || 'No mood tags'}
    Tags: ${(entry.tags || []).join(", ") || 'No tags'}
    Keywords: ${(entry.keywords || []).join(", ") || 'No keywords'}
    Song: ${entry.song || 'No song'}`)
    .join("\n\n");

  console.log("================================================")
  console.log("formatJournalEntries:", formattedEntries)
  console.log("================================================")

  return formattedEntries;
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

function formatMoodProgression(moodProgression: Array<{ date: string; moods: Record<string, number> }>) {
  return moodProgression.map(entry => {
    const date = new Date(entry.date).toLocaleDateString();
    const moodsList = Object.entries(entry.moods)
      .map(([mood, count]) => `${mood}(${count})`)
      .join(', ');
    return `${date}: ${moodsList}`;
  }).join('\n');
}

function prepareChatMessages(
  messages: any[], 
  journalContext: string, 
  activitiesContext: string, 
  moodAnalysis: MoodAnalysis, 
  recommendations: ActivityRecommendation[], 
  chatHistory: string
) {
  const enhancedContext = `
    Journal Context:
    ${journalContext}
    
    Mood Analysis:
    - Dominant Mood: ${moodAnalysis.dominant_mood}
    - Recent Mood Progression:
    ${formatMoodProgression(moodAnalysis.mood_progression)}
    
    Patterns Identified:
    ${moodAnalysis.recurring_patterns.map(pattern => 
      `- ${pattern.trigger}: ${pattern.associated_moods.join(', ')}`
    ).join('\n')}
    
    Personalized Activity Recommendations:
    ${formatRecommendations(recommendations)}
    
    Available Activities:
    ${activitiesContext}
    
    Chat History:
    ${chatHistory}
  `

  return [
    { role: "user", parts: [{ text: "Initialize chat" }] },
    { role: "model", parts: [{ text: SYSTEM_PROMPT }] },
    {
      role: "user",
      parts: [{
        text: enhancedContext
      }]
    },
    { role: "model", parts: [{ text: "Understood. I'll keep this context in mind when responding to the user." }] },
    ...messages.map(msg => ({
      role: msg.role === "user" ? "user" : "model",
      parts: [{ text: msg.content }],
    })),
  ]
}


async function streamChatResponseWithSave(model: any, geminiMessages: any[], userMessage: string, chatId: string) {
  if (!chatId) {
    throw new Error("Chat ID is required");
  }
  
  const chat = model.startChat({ history: geminiMessages })
  const result = await chat.sendMessageStream(userMessage)
  
  const stream = new ReadableStream({
    async start(controller) {
      try {
        let completeAssistantMessage = '';
        
        for await (const chunk of result.stream) {
          const chunkText = chunk.text();
          completeAssistantMessage += chunkText;
          
          const encoder = new TextEncoder()
          const bytes = encoder.encode(`data: ${JSON.stringify({ text: chunkText, chatId })}\n\n`)
          controller.enqueue(bytes)
        }
        
        // Save the complete assistant message to the database
        await supabase.from('chat_messages').insert({
          chat_id: chatId,
          role: 'assistant',
          content: completeAssistantMessage
        });
        
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

async function analyzeMoodPatterns(userId: string, timeframe: string): Promise<MoodAnalysis> {
  try {
    const { data, error } = await supabase.rpc('get_mood_trends', {
      p_user_id: userId
    })
    
    if (error) throw error
    if (!data) {
      return {
        dominant_mood: "neutral",
        mood_progression: [],
        recurring_patterns: []
      }
    }
    
    // Format the mood progression data
    const moodProgression = data.map((entry: any) => ({
      date: new Date(entry.entry_date).toISOString().split('T')[0],
      moods: entry.moods || {}
    }))

    // Calculate dominant mood
    const allMoods = data.flatMap((entry: any) => Object.entries(entry.moods || {}));
    const moodCounts = allMoods.reduce((acc: Record<string, number>, [mood, count]: [string, number]) => {
      acc[mood] = (acc[mood] || 0) + (typeof count === 'number' ? count : 0);
      return acc;
    }, {} as Record<string, number>);
    
    const dominantMood = Object.entries(moodCounts)
      .sort(([,a], [,b]) => (b as number) - (a as number))[0]?.[0] || "neutral";

    // Format patterns
    const patterns = data
      .filter((entry: any) => Object.keys(entry.moods || {}).length > 0)
      .map((entry: any) => ({
        trigger: `Entry on ${new Date(entry.entry_date).toLocaleDateString()}`,
        associated_moods: Object.keys(entry.moods || {})
      }))
      .slice(0, 5);

    console.log("================================================")
    console.log("analyzeMoodPatterns:", {
      dominant_mood: dominantMood,
      mood_progression: moodProgression,
      recurring_patterns: patterns
    })
    console.log("================================================")

    return {
      dominant_mood: dominantMood,
      mood_progression: moodProgression,
      recurring_patterns: patterns
    }
  } catch (error) {
    console.error("Error in analyzeMoodPatterns:", error)
    return {
      dominant_mood: "neutral",
      mood_progression: [],
      recurring_patterns: []
    }
  }
}

function formatRecommendations(recommendations: ActivityRecommendation[]): string {
  return recommendations.map(recommendation => {
    const activity = recommendation.activity;
    const confidence = recommendation.confidence_score.toFixed(2);
    const reasoning = recommendation.reasoning;
    const pastSuccessRate = recommendation.past_success_rate ? `(${recommendation.past_success_rate.toFixed(2)}%)` : "";
    return `${activity.title} - Confidence: ${confidence} - Reasoning: ${reasoning} - Past Success Rate: ${pastSuccessRate}`;
  }).join("\n");
}