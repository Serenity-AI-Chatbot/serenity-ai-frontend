import { supabase } from "@/lib/supabase-server";
import { getGeminiModel } from "@/lib/ai/client";
import { ChatMessage } from "@/lib/ai/types";
import { fetchRelevantJournalEntries } from "@/lib/ai/journals";
import { fetchActivities } from "@/lib/ai/activities";
import { formatJournalEntries } from "@/lib/ai/journals";
import { formatActivities } from "@/lib/ai/activities";
import { prepareChatMessages, streamChatResponseWithSave, generateChatTitle, saveUserMessage, handleError } from "@/lib/ai/chat";

// Set the runtime to edge for better performance
export const runtime = "edge";

export async function POST(req: Request) {
  if (!process.env.GEMINI_API_KEY) {
    return new Response("Missing API key", { status: 500 });
  }

  try {
    const { message, from, username } = await req.json();
    console.log("message", message);
    console.log("from", from);
    console.log("username", username);
    
    if (!message || !from || !username) {
      return new Response(JSON.stringify({ error: "Missing required fields" }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Find the user_id from telegram_users table
    const { data: telegramUser, error: telegramError } = await supabase
      .from('telegram_users')
      .select('user_id')
      .eq('telegram_id', username)
      .single();

    if (telegramError || !telegramUser) {
      return new Response(JSON.stringify({ error: "User not found" }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const userId = telegramUser.user_id;
    const model = getGeminiModel("gemini-2.0-flash");
    
    // Store message in telegram_messages table
    await supabase.from('telegram_messages').insert({
      telegram_chat_id: from,
      telegram_user_id: username,
      content: message,
      is_bot: false
    });

    // Create a single message for the AI
    const messages: ChatMessage[] = [
      { role: "user", content: message }
    ];

    // Get journal entries based on user message
    const { entries, moodAnalysis, recommendations } = await fetchRelevantJournalEntries(userId, message);
    
    // Fetch and format activities
    const activities = await fetchActivities();

    // Format contexts
    const journalContext = formatJournalEntries(entries);
    const activitiesContext = formatActivities(activities);

    // Prepare chat message
    const geminiMessages = prepareChatMessages(
      messages, 
      journalContext, 
      activitiesContext, 
      moodAnalysis, 
      recommendations, 
      "" // No chat history for Telegram
    );
    
    // Process with AI and get response
    const chat = model.startChat({ history: geminiMessages });
    const result = await chat.sendMessage(message);
    const aiResponse = result.response.text();
    
    // Save the bot's response to telegram_messages
    await supabase.from('telegram_messages').insert({
      telegram_chat_id: from,
      telegram_user_id: username,
      content: aiResponse,
      is_bot: true
    });
    
    return new Response(JSON.stringify({ 
      response: aiResponse 
    }), {
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    return handleError(error);
  }
}
