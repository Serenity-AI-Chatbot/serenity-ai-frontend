import { requireAuth, supabase } from "@/lib/supabase-server";
import { getGeminiModel } from "@/lib/ai/client";
import { ChatMessage } from "@/lib/ai/types";
import { fetchRelevantJournalEntries } from "@/lib/ai/journals";
import { fetchActivities } from "@/lib/ai/activities";
import { formatJournalEntries } from "@/lib/ai/journals";
import { formatActivities } from "@/lib/ai/activities";
import { prepareChatMessages, streamChatResponseWithSave, generateChatTitle, saveUserMessage, handleError } from "@/lib/ai/chat";
import { fetchRelevantUserContext, formatUserContext } from "@/lib/ai/user-context";

// Set the runtime to edge for better performance
export const runtime = "edge";

export async function POST(req: Request) {
  if (!process.env.GEMINI_API_KEY) {
    return new Response("Missing API key", { status: 500 });
  }

  console.log("Chat route: Processing new request");
  const { messages, chatId }: { messages: ChatMessage[], chatId?: string } = await req.json();
  const { session } = await requireAuth();

  if (!session) {
    console.log("Chat route: Unauthorized request");
    return new Response("Unauthorized", { status: 401 });
  }

  const userId = session.user.id;
  const latestUserMessage = messages[messages.length - 1]?.content || "";
  console.log("Chat route: Processing message from user:", userId);
  console.log("Chat route: Latest message:", latestUserMessage.substring(0, 100) + (latestUserMessage.length > 100 ? "..." : ""));

  try {
    console.log("Chat route: Fetching relevant journal entries and extracting user context");
    // Get journal entries based on user message
    // Note: This now also handles user context extraction internally
    const { entries, moodAnalysis, recommendations } = await fetchRelevantJournalEntries(userId, latestUserMessage);
    console.log(`Chat route: Found ${entries.length} relevant journal entries`);
    console.log("Chat route: Mood analysis:", JSON.stringify(moodAnalysis).substring(0, 200) + "...");
    
    // Fetch chat history
    console.log("Chat route: Preparing chat history");
    const chatHistory = messages.slice(0, messages.length - 1)
      .map((msg: ChatMessage) => `${msg.role}: ${msg.content}`)
      .join("\n");

    // Fetch and format activities
    console.log("Chat route: Fetching activities");
    const activities = await fetchActivities();
    console.log(`Chat route: Found ${activities.length} activities`);

    // No need to call extractUserContext separately as it's now handled in fetchRelevantJournalEntries
    // Removed: await extractUserContext(userId, latestUserMessage);

    // Fetch relevant user context (including any newly extracted context from the journal entries function)
    console.log("Chat route: Fetching relevant user context");
    const userContextItems = await fetchRelevantUserContext(userId, latestUserMessage);
    console.log(`Chat route: Found ${userContextItems.length} user context items:`, 
      userContextItems.map(item => item.entity_name).join(", "));

    // Format contexts
    console.log("Chat route: Formatting contexts for AI input");
    const journalContext = formatJournalEntries(entries);
    const activitiesContext = formatActivities(activities);
    const userContext = formatUserContext(userContextItems);

    // Create or update chat in database
    let currentChatId = chatId;
    console.log("Chat route: Managing chat session", chatId ? "existing chat" : "new chat");
    
    if (!currentChatId) {
      // Create a new chat with title derived from user's first message
      const title = generateChatTitle(latestUserMessage);
      console.log("Chat route: Creating new chat with title:", title);
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
      console.log("Chat route: Created new chat with ID:", currentChatId);
    } else {
      // Update the existing chat's timestamp
      console.log("Chat route: Updating existing chat:", currentChatId);
      await supabase
        .from('chats')
        .update({ updated_at: new Date().toISOString() })
        .eq('id', currentChatId)
        .eq('user_id', userId);
    }
    
    // Ensure we have a valid chat ID before proceeding
    if (!currentChatId) {
      console.error("Chat route: Failed to create or retrieve chat ID");
      throw new Error("Failed to create or retrieve chat ID");
    }
    
    // Save the user message to the database
    console.log("Chat route: Saving user message to database");
    await saveUserMessage(currentChatId, latestUserMessage);
    
    // Now proceed with the regular chat process with enhanced context
    console.log("Chat route: Preparing Gemini messages with context");
    const geminiMessagesForChat = prepareChatMessages(
      messages, 
      journalContext, 
      activitiesContext, 
      moodAnalysis, 
      recommendations, 
      chatHistory,
      userContext
    );
    
    console.log("Chat route: Initializing Gemini model");
    const regularModel = getGeminiModel("gemini-2.0-flash");
    
    // Stream the response back to the client
    console.log("Chat route: Streaming response to client");
    return await streamChatResponseWithSave(regularModel, geminiMessagesForChat, latestUserMessage, currentChatId);
  } catch (error) {
    console.error("Chat route: Error processing request", error);
    return handleError(error);
  }
}

// Create a new endpoint for fetching user's chats
export async function GET(req: Request) {
  console.log("Chat route: Fetching user chats");
  const { session } = await requireAuth();
  
  if (!session) {
    console.log("Chat route: Unauthorized request");
    return new Response("Unauthorized", { status: 401 });
  }
  
  const userId = session.user.id;
  console.log("Chat route: Fetching chats for user:", userId);
  
  try {
    const { data, error } = await supabase
      .rpc('get_user_chats', { p_user_id: userId });
      
    if (error) throw error;
    
    console.log(`Chat route: Found ${data.length} chats for user`);
    return new Response(JSON.stringify(data), {
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error("Chat route: Error fetching chats", error);
    return handleError(error);
  }
} 