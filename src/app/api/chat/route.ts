import { requireAuth, supabase } from "@/lib/supabase-server";
import { getGeminiModel } from "@/lib/ai/client";
import { ChatMessage } from "@/lib/ai/types";
import { fetchRelevantJournalEntries } from "@/lib/ai/journals";
import { fetchActivities } from "@/lib/ai/activities";
import { formatJournalEntries } from "@/lib/ai/journals";
import { formatActivities } from "@/lib/ai/activities";
import { prepareChatMessages, streamChatResponseWithSave, generateChatTitle, saveUserMessage, handleError } from "@/lib/ai/chat";
import { fetchRelevantUserContext, formatUserContext } from "@/lib/ai/user-context";
import { extractUserContext } from "@/lib/ai/user-context-function-calling";

// Set the runtime to edge for better performance
export const runtime = "edge";

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

    // Extract and save user context
    await extractUserContext(userId, latestUserMessage);

    // Fetch relevant user context (including any newly extracted context)
    const userContextItems = await fetchRelevantUserContext(userId, latestUserMessage);
    console.log("User context items:", userContextItems);

    // // Format contexts
    const journalContext = formatJournalEntries(entries);
    const activitiesContext = formatActivities(activities);
    const userContext = formatUserContext(userContextItems);

    console.log("User context:", userContext);

    // // Create or update chat in database
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
    
    // Ensure we have a valid chat ID before proceeding
    if (!currentChatId) {
      throw new Error("Failed to create or retrieve chat ID");
    }
    
    // Save the user message to the database
    await saveUserMessage(currentChatId, latestUserMessage);
    
    // Now proceed with the regular chat process with enhanced context
    const geminiMessagesForChat = prepareChatMessages(
      messages, 
      journalContext, 
      activitiesContext, 
      moodAnalysis, 
      recommendations, 
      chatHistory,
      userContext
    );
    
    const regularModel = getGeminiModel("gemini-2.0-flash");
    
    // Stream the response back to the client
    return await streamChatResponseWithSave(regularModel, geminiMessagesForChat, latestUserMessage, currentChatId);
  } catch (error) {
    return handleError(error);
  }
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